import { ArticleStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildMetaDescription, countWords, slugify, stripHtml } from '@/lib/tinh-gon/text';
import {
  applySeoOptions,
  buildFallbackArticle,
  buildStreamResult,
  buildVbtWritingPrompt,
  chunkText,
  crawlMany,
  fetchGoogleContext,
  sanitizeVbtHtml,
  toJsonValue,
} from '@/lib/viet-bai-thong-minh/server';
import type {
  SemanticAnalysis,
  VbtArticleConfig,
  VbtStep1State,
  VbtStep3State,
} from '@/lib/viet-bai-thong-minh/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

interface StoredVbtOutline {
  flow?: string;
  step1?: VbtStep1State;
  semantic?: SemanticAnalysis | null;
  step3?: VbtStep3State;
  title?: string;
  finalOutline?: string;
}

function send(controller: ReadableStreamDefaultController<Uint8Array>, event: unknown) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}

function loadConfigFromArticle(article: {
  id: string;
  runId: string;
  outline: unknown;
  selectedTitle: string;
}): VbtArticleConfig | null {
  const stored = article.outline as StoredVbtOutline | null;
  if (!stored?.step1 || !stored.step3) return null;

  return {
    ...stored.step1,
    title: stored.title || article.selectedTitle,
    outline: stored.finalOutline || '',
    secondaryKeywords: stored.step1.secondaryKeywordsRaw.split(',').map((item) => item.trim()).filter(Boolean),
    semantic: stored.semantic || null,
    step3: stored.step3,
    articleId: article.id,
    runId: article.runId,
  };
}

async function gatherContextData(config: VbtArticleConfig): Promise<string> {
  const parts: string[] = [];

  if (config.semantic?.competitorInsights) {
    parts.push(`COMPETITOR INSIGHTS:\n${config.semantic.competitorInsights}`);
  }

  if (config.dataSourceMode === 'manual_text' && config.dataSourceText.trim()) {
    parts.push(`MANUAL DATA:\n${config.dataSourceText.trim().slice(0, 5000)}`);
  }

  if (config.dataSourceMode === 'url_crawl' && config.dataSourceUrls.length > 0) {
    const crawled = await crawlMany(config.dataSourceUrls, 3);
    if (crawled.length) {
      parts.push(crawled.map((item, index) => `SOURCE ${index + 1}: ${item.url}\n${item.text}`).join('\n\n---\n\n'));
    }
  }

  if (config.dataSourceMode === 'google_search') {
    const google = await fetchGoogleContext(config.keyword, config.language);
    if (google) parts.push(google);
  }

  return parts.join('\n\n====\n\n');
}

async function createStreamResponse(runId: string | null) {
  try {
    const user = await requireAuth();
    if (!runId) {
      return NextResponse.json({ error: 'Thiếu runId.' }, { status: 400 });
    }

    const article = await prisma.article.findFirst({
      where: {
        runId,
        userId: user.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        runId: true,
        outline: true,
        selectedTitle: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Không tìm thấy bài viết.' }, { status: 404 });
    }

    const config = loadConfigFromArticle(article);
    if (!config) {
      return NextResponse.json({ error: 'Cấu hình VBT không hợp lệ.' }, { status: 400 });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          send(controller, { type: 'step', step: 'init' });
          await new Promise((resolve) => setTimeout(resolve, 50));
          send(controller, { type: 'step_done', step: 'init' });

          send(controller, { type: 'step', step: 'research' });
          const contextData = await gatherContextData(config);
          send(controller, { type: 'step_done', step: 'research' });

          send(controller, { type: 'step', step: 'outline' });
          const prompt = buildVbtWritingPrompt(config, contextData);
          send(controller, { type: 'step_done', step: 'outline' });

          send(controller, { type: 'step', step: 'writing' });
          let rawHtml = '';
          let streamedAnyChunk = false;
          try {
            const model = buildTinhGonModel(config.step3.model || 'gemini-flash');
            const generated = await model.generateContentStream(prompt);
            for await (const chunk of generated) {
              const text = chunk.text();
              if (!text) continue;
              rawHtml += text;
              streamedAnyChunk = true;
              send(controller, { type: 'chunk', text });
            }
          } catch {
            rawHtml = buildFallbackArticle(config);
          }

          let finalHtml = sanitizeVbtHtml(rawHtml || buildFallbackArticle(config), config.title);
          finalHtml = applySeoOptions(finalHtml, config);
          finalHtml = sanitizeVbtHtml(finalHtml, config.title);

          if (!streamedAnyChunk) {
            for (const chunk of chunkText(finalHtml, 180)) {
              send(controller, { type: 'chunk', text: chunk });
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
          send(controller, { type: 'step_done', step: 'writing' });

          send(controller, { type: 'step', step: 'seo' });
          const result = buildStreamResult({
            config,
            html: finalHtml,
            articleId: config.articleId,
            runId: config.runId,
          });
          const seoChecks = computeSeoChecks({
            title: result.title,
            metaDescription: result.metaDescription,
            html: finalHtml,
            wordCount: result.wordCount,
            keyword: config.keyword,
            secondaryKeywords: config.secondaryKeywords,
            slug: result.slug,
            minWordCount: config.contentType === 'pillar' ? 2500 : Math.min(800, Math.max(500, Math.round(config.step3.targetLength * 0.5))),
          });
          send(controller, { type: 'step_done', step: 'seo' });

          send(controller, { type: 'step', step: 'humanize' });
          await new Promise((resolve) => setTimeout(resolve, 50));
          send(controller, { type: 'step_done', step: 'humanize' });

          send(controller, { type: 'step', step: 'done' });
          await prisma.article.update({
            where: { id: config.articleId },
            data: {
              status: ArticleStatus.WRITTEN,
              selectedTitle: result.title,
              htmlContent: finalHtml,
              plainText: stripHtml(finalHtml),
              wordCount: countWords(finalHtml),
              metaDescription: result.metaDescription || buildMetaDescription(result.title, config.keyword, config.semantic?.macroContext),
              slug: result.slug || slugify(result.title),
              seoScore: seoChecks.score,
              seoChecks: toJsonValue(seoChecks.checks),
              humannessScore: result.humannessScore,
              scoreBreakdown: toJsonValue({
                language_natural: Math.round(result.humannessScore * 0.25),
                structure: Math.round(result.humannessScore * 0.25),
                eeat_signals: Math.round(result.humannessScore * 0.24),
                engagement: Math.round(result.humannessScore * 0.26),
              }),
              aiDecision: result.decision,
            },
          });

          send(controller, { type: 'done', data: result });
          send(controller, { type: 'step_done', step: 'done' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Stream thất bại.';
          send(controller, { type: 'error', message });
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
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? 'Chưa được xác thực.' : 'Stream thất bại.' },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { runId?: string };
  return createStreamResponse(body.runId || null);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return createStreamResponse(searchParams.get('runId'));
}
