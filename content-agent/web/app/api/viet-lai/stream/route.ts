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
import { countHtmlWords, extractSectionsByHeading } from '@/lib/viet-lai/html-parser';
import { appendContentToArticle, autoBoldContent, injectAdditionalLinks, injectMainKeywordLink } from '@/lib/viet-lai/post-process';
import type { ArticleRewriteConfig, ArticleRewriteResult, ArticleSection } from '@/lib/viet-lai/types';

export const runtime = 'nodejs';

const STYLE_INSTRUCTIONS: Record<string, string> = {
  standard: 'Viết lại giữ nguyên nghĩa, thay đổi cách diễn đạt.',
  creative: 'Viết lại sáng tạo hơn, có góc nhìn mới.',
  structured: 'Viết lại dễ đọc hơn, rõ nhịp hơn.',
  shorten: 'Rút gọn rõ rệt nhưng không làm mất ý chính.',
  expand: 'Mở rộng rõ rệt bằng ví dụ, chi tiết hoặc dữ kiện.',
  funny: 'Thêm sắc thái vui vẻ, nhẹ nhàng.',
  friendly: 'Thân thiện, gần gũi, dễ đọc.',
  casual: 'Thoải mái như nói chuyện hằng ngày.',
  professional: 'Chuyên nghiệp, chính xác, súc tích.',
  rewrite_struct: 'Giữ ý nhưng đổi hẳn cấu trúc câu và nhịp diễn đạt.',
  rewrite_persp: 'Chuyển góc nhìn hoặc chủ thể diễn đạt nếu phù hợp.',
  rewrite_kw: 'Tích hợp từ khóa tự nhiên hơn vào bản mới.',
  emoji: 'Có thể thêm emoji ở chỗ phù hợp, không lạm dụng.',
};

function buildRewritePrompt(
  config: ArticleRewriteConfig,
  sections: ArticleSection[],
  brandPrompt: string,
  forbidden: string,
): string {
  const styleInstruction = STYLE_INSTRUCTIONS[config.style] ?? STYLE_INSTRUCTIONS.standard;
  const seoInstruction = config.seoMode && config.keyword
    ? `- Tối ưu SEO: tích hợp từ khóa "${config.keyword}" tự nhiên vào bài.`
    : '';

  let sectionsText: string;

  if (config.method === 'keep_headings') {
    sectionsText = sections.map((section) => {
      const headingLine = section.headingHtml ? `${section.headingHtml} [GIỮ NGUYÊN HEADING NÀY]` : '';
      return [headingLine, section.bodyHtml].filter(Boolean).join('\n');
    }).join('\n\n');
  } else if (config.method === 'rewrite_all') {
    sectionsText = sections.map((section) => [section.headingHtml, section.bodyHtml].filter(Boolean).join('\n')).join('\n\n');
  } else {
    sectionsText = sections.map((section, index) => {
      const headingLine = section.headingHtml ? section.headingHtml : '';
      return `[SECTION ${index + 1} — viết lại hoàn toàn mới, tránh trùng lặp tối đa]\n${headingLine}\n${section.bodyHtml}`;
    }).join('\n\n---\n\n');
  }

  return `
Bạn là AI chuyên viết lại bài viết chất lượng cao.

${brandPrompt}

## Thông tin viết lại
- Ngôn ngữ đầu ra: ${config.language}
- Phong cách: ${styleInstruction}
${seoInstruction}
- Từ bị cấm: ${forbidden || 'không có'}

## Phương pháp: ${config.method}
${config.method === 'keep_headings' ? '→ Giữ nguyên các heading có tag [GIỮ NGUYÊN]. Chỉ viết lại phần body.' : ''}
${config.method === 'rewrite_all' ? '→ Viết lại toàn bộ, kể cả heading. Tạo phiên bản mới rõ rệt.' : ''}
${config.method === 'deep_rewrite' ? '→ Viết lại từng section độc lập, tối đa hóa unique, tránh lặp lại cụm gốc.' : ''}

## Nội dung gốc cần viết lại
${sectionsText}

## Quy tắc output
- Trả HTML hoàn chỉnh trong đúng 1 thẻ <article>.
- Bắt đầu bằng <h1> là tiêu đề bài.
${config.method === 'keep_headings' ? '- Giữ nguyên text và level của các heading được đánh dấu [GIỮ NGUYÊN].' : ''}
- Không thêm CSS, JavaScript, markdown hay giải thích ngoài bài.
- Chỉ trả HTML.
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
    method: z.string().default('keep_headings'),
    style: z.string().default('standard'),
    language: z.string().default('Vietnamese'),
    mainKeywordUrl: z.string().default(''),
    additionalLinks: z.array(z.object({ keyword: z.string(), url: z.string() })).default([]),
    appendContent: z.string().default(''),
    autoBold: z.string().default('none'),
    model: z.string().default('gemini-flash'),
    brandConfig: z.record(z.unknown()).optional(),
  }),
  sections: z.array(z.object({
    headingLevel: z.string().nullable(),
    headingText: z.string(),
    headingHtml: z.string(),
    bodyHtml: z.string(),
  })).optional(),
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

    const { articleId, runId, config, sections: sectionsPassed } = parsed.data as {
      articleId: string;
      runId: string;
      config: ArticleRewriteConfig;
      sections?: ArticleSection[];
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

    const sections: ArticleSection[] = sectionsPassed?.length
      ? sectionsPassed
      : extractSectionsByHeading(config.originalHtml);

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
              contentType: `viet_lai:${config.method}`,
              targetLength: countHtmlWords(config.originalHtml),
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
              outline: {
                flow: 'viet_lai',
                stage: 'generate',
                method: config.method,
                style: config.style,
                config,
                sections,
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
          const prompt = buildRewritePrompt(config, sections, brandPrompt, forbidden);
          const model = buildTinhGonModel(config.model);

          send({ type: 'step', step: 'rewrite', label: 'AI đang viết lại bài...' });

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

          const originalTitle = config.originalTitle || config.keyword || 'Bài viết';
          html = sanitizeHtmlArticle(html, originalTitle);

          send({ type: 'step_done', step: 'postprocess' });
          send({ type: 'step', step: 'analyze', label: 'Phân tích chất lượng...' });

          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : originalTitle;

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
                flow: 'viet_lai',
                stage: 'generate',
                method: config.method,
                style: config.style,
                config,
                sections,
              } as never,
            },
          });

          send({ type: 'step_done', step: 'analyze' });
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
            } satisfies ArticleRewriteResult,
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
