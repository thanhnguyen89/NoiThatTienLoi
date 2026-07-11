import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildPlainTextFromHtml } from '@/lib/tinh-gon/persistence';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import { parseOutline, renderOutlineForPrompt } from '@/lib/viet-theo-dan-bai/outline-parser';
import type { DanBaiConfig, ParsedHeading } from '@/lib/viet-theo-dan-bai/types';

export const runtime = 'nodejs';

const WRITE_METHOD_INSTRUCTIONS: Record<string, string> = {
  balance: `
Phương pháp BALANCE:
- Nội dung giữa các heading liền mạch, không nhắc lại ý đã viết ở section trước.
- Mỗi heading triển khai ý mới, không tóm tắt lại heading trước.
- Bài đọc như một văn bản liên tục, chỉ heading là điểm ngắt.
`.trim(),
  detail: `
Phương pháp DETAIL:
- Mỗi heading là một đơn vị độc lập, giải thích đầy đủ, tự đủ nghĩa.
- Ý có thể trùng nhẹ giữa các heading nếu cần để giải thích hoàn chỉnh.
- Phù hợp bài kỹ thuật, hướng dẫn, glossary hoặc bài cần độ sâu cao.
`.trim(),
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  seo_focus: `
Tone SEO FOCUS:
- Keyword chính xuất hiện trong h1, h2 đầu tiên và đoạn mở bài tự nhiên.
- Viết rõ ràng, súc tích, ưu tiên xếp hạng SERP.
- Tránh lan man, mỗi heading đi thẳng vào trọng tâm.
`.trim(),
  confident: `
Tone CONFIDENT:
- Viết như chuyên gia ngành, có quan điểm rõ ràng, số liệu cụ thể.
- Dùng trải nghiệm, thực tế, quan sát chuyên môn để tăng E-E-A-T.
- Không viết chung chung, mỗi claim nên có bằng chứng hoặc ví dụ.
`.trim(),
  friendly: `
Tone FRIENDLY:
- Giọng văn ấm áp, tự nhiên như người thật viết cho người thật.
- Câu ngắn xen câu dài, có câu hỏi tu từ và ví dụ sinh động.
- Tránh cấu trúc lặp lại, máy móc, cứng ngắc.
`.trim(),
};

function buildDanBaiPrompt(
  config: DanBaiConfig,
  parsedHeadings: ParsedHeading[],
  brandPrompt: string,
  forbiddenList: string[],
): string {
  const outlineText = renderOutlineForPrompt(parsedHeadings);
  const forbidden = forbiddenList.join(', ');
  const writeMethodInstruction = WRITE_METHOD_INSTRUCTIONS[config.writeMethod] ?? WRITE_METHOD_INSTRUCTIONS.balance;
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.seo_focus;

  return `
Bạn là Writer Agent viết bài theo đúng dàn bài người dùng cung cấp.

${brandPrompt}

## Thông tin bài viết
- Từ khóa chính: ${config.keyword}
- Tiêu đề: ${config.postTitle}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: ${config.targetLength} từ

## Dàn bài (PHẢI tuân thủ đúng thứ tự và heading)
${outlineText}

## ${writeMethodInstruction}

## ${toneInstruction}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong 1 thẻ <article>.
- Thẻ <h1> là tiêu đề bài: "${config.postTitle}"
- Mỗi [H2] thành <h2>, mỗi [H3] thành <h3>. KHÔNG thêm heading ngoài dàn bài.
- Dưới mỗi <h2> hoặc <h3>: 1–3 đoạn <p>. Tổng từ bám sát ${config.targetLength} từ.
- Phân bổ từ đều cho các heading, không để heading nào quá ngắn.
- Không dùng các từ/cụm: ${forbidden}
- Không thêm CSS, JavaScript, markdown hay lời giải thích ngoài thẻ <article>.

## Chống dấu vết AI
- Nhịp câu đa dạng: xen câu ngắn 3–6 từ với câu trung bình 12–18 từ.
- Mở đầu đoạn luân phiên: số liệu, câu hỏi, nhận xét, ví dụ.
- Dùng số liệu thực như mm, kg, ngày, giá tiền thay tính từ chung chung.
- CTA cuối bài phải cụ thể, không dùng "Hy vọng bài viết hữu ích".

Chỉ trả HTML.
`.trim();
}

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

const streamSchema = z.object({
  articleId: z.string(),
  runId: z.string(),
  config: z.object({
    keyword: z.string().min(1),
    language: z.string(),
    postTitle: z.string().min(1),
    outline: z.string(),
    writeMethod: z.string(),
    tone: z.string(),
    model: z.string(),
    targetLength: z.number(),
    brandConfig: z.record(z.unknown()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload không hợp lệ' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { articleId, runId, config } = parsed.data as {
      articleId: string;
      runId: string;
      config: DanBaiConfig;
    };

    const article = await prisma.article.findFirst({
      where: { id: articleId, runId, userId: user.userId, deletedAt: null },
    });

    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);

        try {
          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );

          const parsedHeadings = parseOutline(config.outline);
          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          const prompt = buildDanBaiPrompt(config, parsedHeadings, brandPrompt, forbiddenList);
          const model = buildTinhGonModel(config.model);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              status: 'WRITING',
              keyword: config.keyword,
              language: config.language,
              contentType: `viet_theo_dan_bai:${config.writeMethod}`,
              targetLength: config.targetLength,
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
              selectedTitle: config.postTitle,
            },
          });

          send({ type: 'step', step: 'writing', label: 'AI đang viết bài theo dàn bài...' });

          let rawHtml = '';
          try {
            const aiStream = await model.generateContentStream(prompt);
            for await (const chunk of aiStream) {
              const text = chunk.text();
              if (!text) continue;
              rawHtml += text;
              send({ type: 'chunk', text });
            }
          } catch {
            const result = await model.generateContent(prompt);
            rawHtml = result.response.text();
            send({ type: 'chunk', text: rawHtml });
          }

          send({ type: 'step_done', step: 'writing' });
          send({ type: 'step', step: 'scoring', label: 'Đang chấm điểm...' });

          const html = sanitizeHtmlArticle(rawHtml, config.postTitle);
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : config.postTitle;

          const wordCount = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness = analyzeHumanness(html, forbiddenList);
          const metaDescription = buildMetaDescription(title, config.keyword);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle: title,
              htmlContent: html,
              plainText: buildPlainTextFromHtml(html),
              metaDescription,
              wordCount,
              status: 'WRITTEN',
              aiDecision: humanness.decision,
              humannessScore: humanness.score,
              seoChecks: { keywordDensity } as never,
              scoreBreakdown: { humanness, keywordDensity } as never,
              outline: {
                flow: 'viet_dan_bai',
                stage: 'generate',
                writeMethod: config.writeMethod,
                tone: config.tone,
                rawOutline: config.outline,
                parsedHeadings,
                config: {
                  ...config,
                  parsedHeadings,
                },
              } as never,
            },
          });

          send({ type: 'step_done', step: 'scoring' });
          send({
            type: 'done',
            data: { runId, html, title, metaDescription, wordCount, keywordDensity, humanness },
          });
        } catch (error) {
          await prisma.article.update({
            where: { id: articleId },
            data: { status: 'DRAFT' },
          }).catch(() => null);
          send({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi stream' });
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
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
