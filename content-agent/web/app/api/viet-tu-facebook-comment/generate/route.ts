import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { BATCH_SIZE, FREE_USER_MAX_WORDS } from '@/lib/facebook-comment/options';
import { parseCommentList } from '@/lib/facebook-comment/parser';
import { buildCommentBrandPrompt } from '@/lib/viet-tu-facebook-comment/prompt-builder';
import type {
  CommentBrandBatchEvent,
  CommentBrandDoneEvent,
  CommentBrandErrorEvent,
  CommentBrandStyle,
} from '@/lib/viet-tu-facebook-comment/types';

export const runtime = 'nodejs';

const brandSchema = z.object({
  shopName: z.string().optional().default(''),
  brandPronouns: z.string().optional().default(''),
  mainProducts: z.string().optional().default(''),
  brandAudience: z.string().optional().default(''),
  brandToneNotes: z.string().optional().default(''),
  brandForbidden: z.string().optional().default(''),
});

const generateSchema = z.object({
  postContent: z.string().min(5).max(10000),
  facebookPostId: z.string().nullable().optional(),
  language: z.string().default('Vietnamese'),
  style: z.string().default('friendly'),
  count: z.number().int().min(1).max(50).default(5),
  modelId: z.string().default('gemini-flash'),
  brand: brandSchema.optional().default({}),
});

type StreamEvent = CommentBrandBatchEvent | CommentBrandDoneEvent | CommentBrandErrorEvent;

function sseEvent(controller: ReadableStreamDefaultController, data: StreamEvent) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

async function loadBrandFallback(userBrand: z.infer<typeof brandSchema>) {
  const profile = await prisma.brandProfile.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  }).catch(() => null);

  return {
    shopName: userBrand.shopName || profile?.shopName || 'Noi That Minh Quan',
    brandPronouns: userBrand.brandPronouns || profile?.brandPronouns || 'Minh Quan',
    mainProducts: userBrand.mainProducts || profile?.mainProducts || 'giuong sat, tu quan ao, ban ghe',
    brandAudience: userBrand.brandAudience || profile?.brandAudience || 'gia dinh tre, sinh vien, chu homestay',
    brandToneNotes: userBrand.brandToneNotes || profile?.brandToneNotes || '',
    brandForbidden: userBrand.brandForbidden || profile?.brandForbidden || '',
  };
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return new Response(JSON.stringify({ type: 'error', message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = generateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ type: 'error', message: parsed.error.errors[0]?.message || 'Payload khong hop le' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { postContent, language, style, count, modelId, brand: inputBrand } = parsed.data;
    const wordCount = countWords(postContent);

    if (wordCount > FREE_USER_MAX_WORDS) {
      return new Response(
        JSON.stringify({
          type: 'error',
          message: `Noi dung vuot qua ${FREE_USER_MAX_WORDS} tu (hien tai: ${wordCount} tu).`,
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const brand = await loadBrandFallback(inputBrand);
    const batches: number[] = [];
    let remaining = count;
    while (remaining > 0) {
      const batchCount = Math.min(remaining, BATCH_SIZE);
      batches.push(batchCount);
      remaining -= batchCount;
    }

    const model = buildTinhGonModel(modelId);

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: StreamEvent) => sseEvent(controller, data);

        try {
          let totalGenerated = 0;

          for (let index = 0; index < batches.length; index += 1) {
            const batchCount = batches[index] || 0;
            const prompt = buildCommentBrandPrompt({
              postContent,
              count: batchCount,
              style: style as CommentBrandStyle,
              language,
              brand,
            });

            let rawOutput = '';

            try {
              const result = await model.generateContent(prompt);
              rawOutput = result.response.text();
            } catch {
              const aiStream = await model.generateContentStream(prompt);
              for await (const chunk of aiStream) {
                rawOutput += chunk.text() || '';
              }
            }

            const comments = parseCommentList(rawOutput, batchCount);
            if (comments.length === 0) {
              send({ type: 'error', message: `Batch ${index + 1}: AI tra ve khong dung format.` });
              continue;
            }

            totalGenerated += comments.length;
            send({ type: 'batch', comments, batchIndex: index, totalBatch: batches.length });

            if (index < batches.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          send({ type: 'done', total: totalGenerated });
        } catch (error) {
          send({
            type: 'error',
            message: error instanceof Error ? error.message : 'Loi tao comment',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Loi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
