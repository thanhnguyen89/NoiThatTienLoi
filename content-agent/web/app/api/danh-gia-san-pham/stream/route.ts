import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildPlainTextFromHtml } from '@/lib/tinh-gon/persistence';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import { buildReviewPrompt } from '@/lib/product-scraper/prompt';
import { streamRequestSchema, type ReviewConfig } from '@/lib/product-scraper/types';

export const runtime = 'nodejs';

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function generateHtml({
  prompt,
  modelId,
  onChunk,
}: {
  prompt: string;
  modelId: string;
  onChunk: (chunk: string) => void;
}): Promise<string> {
  const model = buildTinhGonModel(modelId);

  try {
    const stream = await model.generateContentStream(prompt);
    let output = '';

    for await (const chunk of stream) {
      const text = chunk.text();
      if (!text) continue;
      output += text;
      onChunk(text);
    }

    return output;
  } catch {
    const result = await model.generateContent(prompt);
    const output = result.response.text();
    onChunk(output);
    return output;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = streamRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload không hợp lệ', issues: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { articleId, runId, config } = parsed.data as {
      articleId: string;
      runId: string;
      config: ReviewConfig;
    };

    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        runId,
        userId: user.userId,
        deletedAt: null,
      },
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
              keyword: config.keyword,
              language: config.language,
              contentType: 'viet_danh_gia_san_pham:product_review',
              targetLength: 1500,
              aiProvider: config.model,
              brandConfig: (config.brandConfig ?? {}) as never,
              outline: {
                flow: 'product_review',
                config,
              } as never,
            },
          });

          send({ type: 'step', step: 'preparing', label: '📦 Đang chuẩn bị dữ liệu sản phẩm...' });

          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );

          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          send({ type: 'step_done', step: 'preparing' });
          send({ type: 'step', step: 'writing', label: '✍️ AI đang viết bài đánh giá...' });

          const prompt = buildReviewPrompt(config, brandPrompt, forbiddenList);
          const rawOutput = await generateHtml({
            prompt,
            modelId: config.model,
            onChunk: (chunk) => send({ type: 'chunk', text: chunk }),
          });

          send({ type: 'step_done', step: 'writing' });
          send({ type: 'step', step: 'scoring', label: '📊 Đang chấm điểm chất lượng...' });

          const html = sanitizeHtmlArticle(rawOutput, config.productName);
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : config.productName;
          const plainText = buildPlainTextFromHtml(html);
          const wordCount = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness = analyzeHumanness(html, forbiddenList, {
            minWords: 800,
            minSpecificDataHits: 2,
          });
          const metaDescription = buildMetaDescription(title, config.keyword);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle: title,
              htmlContent: html,
              plainText,
              wordCount,
              metaDescription,
              humannessScore: humanness.score,
              aiDecision: humanness.decision,
              seoChecks: { keywordDensity } as never,
              scoreBreakdown: { humanness, keywordDensity } as never,
              status: 'WRITTEN',
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
            },
          });
        } catch (error) {
          await prisma.article.update({
            where: { id: articleId },
            data: { status: 'DRAFT' },
          }).catch(() => null);

          const message = error instanceof Error ? error.message : 'Không thể tạo bài đánh giá';
          send({ type: 'error', message });
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
