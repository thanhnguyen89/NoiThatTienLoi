import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { BATCH_SIZE, COMMENT_STYLES, FREE_USER_MAX_WORDS } from '@/lib/facebook-comment/options';
import { parseCommentList } from '@/lib/facebook-comment/parser';
import type {
  CommentBatchEvent,
  CommentDoneEvent,
  CommentErrorEvent,
} from '@/lib/facebook-comment/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STYLE_INSTRUCTIONS: Record<string, string> = {
  funny: 'Vui ve, hai huoc nhe. Co the dung emoji vua phai.',
  shorten: 'Rat ngan, toi da 1-2 cau. Di thang vao y chinh.',
  creative: 'Sang tao, co goc nhin moi, khong lap lai.',
  friendly: 'Than thien, am ap, ung ho.',
  casual: 'Tu nhien nhu ban be noi chuyen hang ngay.',
  professional: 'Chuyen nghiep, gon, sach, co chieu sau.',
};

const generateSchema = z.object({
  postContent: z.string().trim().min(5).max(10000),
  language: z.string().trim().min(1).default('Vietnamese'),
  style: z.enum([
    'funny',
    'shorten',
    'creative',
    'friendly',
    'casual',
    'professional',
  ]).default('friendly'),
  count: z.number().int().min(1).max(50).default(5),
  includeEmojis: z.boolean().default(true),
});

function buildPrompt(params: {
  postContent: string;
  language: string;
  style: string;
  count: number;
  includeEmojis: boolean;
}) {
  const styleNote = STYLE_INSTRUCTIONS[params.style] ?? STYLE_INSTRUCTIONS.friendly;
  const styleLabel = COMMENT_STYLES.find((item) => item.value === params.style)?.label ?? params.style;
  const emojiRule = params.includeEmojis
    ? 'Use Facebook-style emojis naturally when helpful, maximum 1 emoji per comment. Do not force emojis in every comment.'
    : 'Do not use emojis in the generated comments.';

  return `
You are an AI that writes natural Facebook comments.

Post content:
${params.postContent}

Requirements:
- Create exactly ${params.count} different comments.
- Language: ${params.language}
- Style: ${styleLabel} - ${styleNote}
- Each comment should feel like a real human comment.
- Keep it short and natural, usually 1-3 sentences.
- ${emojiRule}
- Do not add headings, explanations, markdown, or labels.
- Do not repeat the same idea in multiple comments.

Output format:
1. comment text
2. comment text
3. comment text
...
${params.count}. comment text

Return only the numbered list.
`.trim();
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  payload: CommentBatchEvent | CommentDoneEvent | CommentErrorEvent,
) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`));
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return new Response(JSON.stringify({ type: 'error', message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = generateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          type: 'error',
          message: parsed.error.errors[0]?.message || 'Payload khong hop le',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        },
      );
    }

    const { postContent, language, style, count, includeEmojis } = parsed.data;
    const wordCount = postContent.trim().split(/\s+/).filter(Boolean).length;

    if (wordCount > FREE_USER_MAX_WORDS) {
      return new Response(
        JSON.stringify({
          type: 'error',
          message: `Noi dung vuot qua ${FREE_USER_MAX_WORDS} tu (hien tai: ${wordCount} tu).`,
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        },
      );
    }

    const batches: number[] = [];
    let remaining = count;
    while (remaining > 0) {
      const batchCount = Math.min(remaining, BATCH_SIZE);
      batches.push(batchCount);
      remaining -= batchCount;
    }

    const model = buildTinhGonModel('gemini-flash');

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let total = 0;
          const allComments: string[] = [];

          for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
            const batchCount = batches[batchIndex]!;
            const prompt = buildPrompt({ postContent, language, style, count: batchCount, includeEmojis });
            let rawOutput = '';

            try {
              const result = await model.generateContent(prompt);
              rawOutput = result.response.text();
            } catch {
              try {
                const fallbackStream = await model.generateContentStream(prompt);
                for await (const chunk of fallbackStream) {
                  rawOutput += chunk.text() ?? '';
                }
              } catch (error) {
                sendEvent(controller, {
                  type: 'error',
                  message: `Batch ${batchIndex + 1}: ${error instanceof Error ? error.message : 'AI error'}`,
                });
                continue;
              }
            }

            const comments = parseCommentList(rawOutput, batchCount);
            if (comments.length === 0) {
              sendEvent(controller, {
                type: 'error',
                message: `Batch ${batchIndex + 1}: khong parse duoc output.`,
              });
              continue;
            }

            total += comments.length;
            allComments.push(...comments);
            sendEvent(controller, {
              type: 'batch',
              comments,
              batchIndex,
              totalBatch: batches.length,
            });

            if (batchIndex < batches.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          if (allComments.length === 0) {
            sendEvent(controller, {
              type: 'error',
              message: 'Khong co comment nao de luu DB.',
            });
            return;
          }

          const record = await prisma.facebookCommentBrand.create({
            data: {
              postContent: postContent.trim(),
              facebookPostId: null,
              style,
              language,
              count,
              modelId: 'gemini-flash',
              comments: allComments.map((item) => item.trim()).filter(Boolean),
              brandSnapshot: { includeEmojis },
              notes: 'Quick tool: /facebook-comment',
              userId: user.userId,
            },
          });

          sendEvent(controller, {
            type: 'done',
            total,
            savedId: record.id,
            savedCount: record.comments.length,
          });
        } catch (error) {
          sendEvent(controller, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Loi khong xac dinh',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Loi server',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  }
}
