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
import { injectYandexImages } from '@/lib/viet-toplist/image-injector';
import { buildUrlRewritePrompt } from '@/lib/viet-lai-url/prompt-builder';
import type { UrlRewriteConfig, UrlRewriteResult } from '@/lib/viet-lai-url/types';

export const runtime = 'nodejs';

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

const streamSchema = z.object({
  articleId: z.string(),
  runId: z.string(),
  config: z.object({
    sourceUrl: z.string(),
    extractedHeadings: z.string().default(''),
    extractedContent: z.string().default(''),
    sourceTitle: z.string().default(''),
    keyword: z.string().default(''),
    secondaryKeywords: z.string().default(''),
    seoMode: z.boolean().default(false),
    selectedIdeas: z.array(z.string()).default([]),
    structure: z.string().default('auto'),
    tone: z.string().default('formal'),
    language: z.string().default('Vietnamese'),
    imageOption: z.string().default('none'),
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
      config: UrlRewriteConfig;
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
              contentType: 'viet_lai_url:rewrite_url',
              targetLength: 1500,
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
              outline: {
                flow: 'viet_lai_url',
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
          const prompt = buildUrlRewritePrompt(config, brandPrompt, forbidden);
          const model = buildTinhGonModel(config.model);

          send({ type: 'step', step: 'writing', label: 'AI đang viết lại bài từ URL...' });

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
          send({ type: 'step', step: 'postprocess', label: 'Đang xử lý ảnh, link và tối ưu bài...' });

          let html = sanitizeHtmlArticle(rawHtml, config.keyword || config.sourceTitle || article.keyword);
          let imagesInjected = 0;

          if (config.imageOption === 'yandex') {
            try {
              const injected = await injectYandexImages(html, config.keyword || config.sourceTitle || article.keyword);
              html = injected.html;
              imagesInjected = injected.injectedCount;
            } catch {
              // keep going without images
            }
          }

          if (config.mainKeywordUrl.trim() && config.keyword.trim()) {
            html = injectMainKeywordLink(html, config.keyword.trim(), config.mainKeywordUrl.trim());
          }

          if (config.additionalLinks.length > 0) {
            html = injectAdditionalLinks(html, config.additionalLinks);
          }

          if (config.autoBold !== 'none' && config.keyword.trim()) {
            html = autoBoldContent(html, config.keyword.trim(), config.autoBold as 'keyword' | 'headings' | 'both');
          }

          if (config.appendContent.trim()) {
            html = appendContentToArticle(html, config.appendContent);
          }

          send({ type: 'step_done', step: 'postprocess' });
          send({ type: 'step', step: 'scoring', label: 'Đang chấm điểm và lưu bài...' });

          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : (config.keyword || config.sourceTitle || article.keyword);
          const plainText = buildPlainTextFromHtml(html);
          const wordCount = countWords(html);
          const keywordDensity = config.keyword.trim() ? computeKeywordDensity(html, config.keyword.trim()) : 0;
          const humanness = analyzeHumanness(html, forbiddenList);
          const metaDescription = buildMetaDescription(title, config.keyword || title);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle: title,
              htmlContent: html,
              plainText,
              metaDescription,
              wordCount,
              status: 'WRITTEN',
              aiDecision: humanness.decision,
              humannessScore: humanness.score,
              seoChecks: { keywordDensity } as never,
              scoreBreakdown: { humanness, keywordDensity } as never,
              outline: {
                flow: 'viet_lai_url',
                stage: 'generate',
                imagesInjected,
                config,
              } as never,
            },
          });

          send({ type: 'step_done', step: 'scoring' });
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
              imagesInjected,
            } satisfies UrlRewriteResult,
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
