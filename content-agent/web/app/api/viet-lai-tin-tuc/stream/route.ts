import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildForbiddenList, mergeForbiddenWords } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildPlainTextFromHtml } from '@/lib/tinh-gon/persistence';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import { appendContentToArticle, autoBoldContent, injectAdditionalLinks, injectMainKeywordLink } from '@/lib/viet-lai/post-process';
import { countHtmlWords } from '@/lib/viet-lai/html-parser';
import type { NewsRewriteConfig, NewsRewriteResult } from '@/lib/viet-lai-tin-tuc/types';

export const runtime = 'nodejs';

const STYLE_INSTRUCTIONS: Record<string, string> = {
  neutral: 'Viết lại thành bài tin chuẩn, trung tính, gọn và rõ.',
  breaking: 'Viết lại theo kiểu breaking news: mở đầu mạnh, nhịp nhanh, hút người đọc.',
  formal: 'Viết lại trang trọng, nghiêm túc, phù hợp chuyên mục tin tức.',
  friendly: 'Viết lại dễ đọc, mềm hơn, hợp blog tin tức hoặc bản tin tổng hợp.',
  analysis: 'Viết lại có thêm bối cảnh và góc nhìn phân tích, nhưng vẫn bám facts.',
  magazine: 'Viết lại mượt, giàu nhịp kể hơn, như bài magazine ngắn.',
};

function buildRewriteNewsPrompt(
  config: NewsRewriteConfig,
  brandPrompt: string,
  forbidden: string,
): string {
  const styleInstruction = STYLE_INSTRUCTIONS[config.style] ?? STYLE_INSTRUCTIONS.neutral;
  const seoInstruction = config.seoMode && config.keyword
    ? `- Tích hợp từ khóa "${config.keyword}" tự nhiên, không nhồi nhét.`
    : '';

  return `
Bạn là AI chuyên viết lại tin tức.

${brandPrompt}

## Thông tin đầu ra
- Ngôn ngữ: ${config.language}
- Phong cách: ${styleInstruction}
${seoInstruction}
- Từ cấm: ${forbidden || 'không có'}

## Tin gốc cần viết lại
Tiêu đề gốc: ${config.originalTitle || '(không có)'}

${config.originalHtml}

## Quy tắc bắt buộc
- Viết lại thành một bài tin mới, không copy nguyên văn.
- Giữ đúng facts cốt lõi, không bịa thông tin mới.
- Mở bài phải khác tiêu đề và câu dẫn gốc.
- Ưu tiên các đoạn ngắn, rõ, dễ quét đọc.
- Có đúng 1 <h1>, các ý chính là <h2> nếu cần.
- Chỉ trả HTML hoàn chỉnh trong 1 thẻ <article>.
- Không thêm markdown, CSS, JavaScript hay giải thích ngoài bài.

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
    originalHtml: z.string(),
    originalTitle: z.string().default(''),
    keyword: z.string().default(''),
    seoMode: z.boolean().default(false),
    style: z.string().default('neutral'),
    language: z.string().default('Vietnamese'),
    mainKeywordUrl: z.string().default(''),
    additionalLinks: z.array(z.object({ keyword: z.string(), url: z.string() })).default([]),
    appendContent: z.string().default(''),
    autoBold: z.string().default('none'),
    model: z.string().default('gemini-flash'),
    brandConfig: z.record(z.unknown()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { articleId, runId, config } = parsed.data as {
      articleId: string;
      runId: string;
      config: NewsRewriteConfig;
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
          await prisma.article.update({
            where: { id: articleId },
            data: {
              status: 'WRITING',
              keyword: config.keyword || article.keyword,
              language: config.language,
              contentType: 'viet_lai_tin_tuc:rewrite_news',
              targetLength: countHtmlWords(config.originalHtml),
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
              outline: {
                flow: 'viet_lai_tin_tuc',
                stage: 'generate',
                config,
              } as never,
            },
          });

          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );

          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          const forbidden = mergeForbiddenWords(config.brandConfig?.forbiddenExtra).join(', ');
          const prompt = buildRewriteNewsPrompt(config, brandPrompt, forbidden);
          const model = buildTinhGonModel(config.model);

          send({ type: 'step', step: 'rewrite', label: 'AI đang viết lại tin tức...' });

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

          send({ type: 'step_done', step: 'rewrite' });
          send({ type: 'step', step: 'postprocess', label: 'Xử lý hậu kỳ...' });

          let html = rawHtml;
          if (config.mainKeywordUrl && config.keyword) {
            html = injectMainKeywordLink(html, config.keyword, config.mainKeywordUrl);
          }
          if (config.additionalLinks.length > 0) {
            html = injectAdditionalLinks(html, config.additionalLinks);
          }
          if (config.autoBold !== 'none') {
            html = autoBoldContent(html, config.keyword, config.autoBold);
          }
          if (config.appendContent) {
            html = appendContentToArticle(html, config.appendContent);
          }

          const fallbackTitle = config.originalTitle || config.keyword || 'Tin tức';
          html = sanitizeHtmlArticle(html, fallbackTitle);

          send({ type: 'step_done', step: 'postprocess' });
          send({ type: 'step', step: 'analyze', label: 'Phân tích chất lượng...' });

          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : fallbackTitle;

          const wordCount = countWords(html);
          const keywordDensity = config.keyword ? computeKeywordDensity(html, config.keyword) : 0;
          const humanness = analyzeHumanness(html, forbiddenList);
          const metaDescription = buildMetaDescription(title, config.keyword || title);

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
                flow: 'viet_lai_tin_tuc',
                stage: 'generate',
                config,
              } as never,
            },
          });

          send({
            type: 'done',
            data: {
              runId,
              html,
              title,
              metaDescription,
              wordCount,
              keywordDensity,
              humanness,
              originalWordCount: countHtmlWords(config.originalHtml),
            } satisfies NewsRewriteResult,
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
