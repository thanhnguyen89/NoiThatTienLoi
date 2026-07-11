import { ArticleStatus, BulkJobStatus, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { crawlUrls } from '@/lib/viet-theo-nguon/crawler';
import { parseOutline, validateOutline } from '@/lib/viet-theo-dan-bai/outline-parser';
import { getBulkFeature, type BulkFeatureId } from './features';
import { parseBulkKeywords } from './parser';
import { processBulkArticleVariant } from './processors';
import type { BulkArticleConfig, BulkEnqueueRequest, BulkKeywordItem } from './types';
import type { SourceItem } from '@/lib/viet-theo-nguon/types';

export const bulkApiRuntime = 'nodejs';
export const bulkApiMaxDuration = 300;

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getConfig(body: unknown, featureId: BulkFeatureId): BulkEnqueueRequest {
  const record = (body ?? {}) as Partial<BulkEnqueueRequest> & Partial<BulkArticleConfig>;
  const config = record.config ?? (record as BulkArticleConfig);
  return {
    config: {
      ...(config as BulkArticleConfig),
      featureId,
    },
    brandConfig: record.brandConfig,
    crawledSources: record.crawledSources,
  };
}

function normalizeConfig(config: BulkArticleConfig, featureId: BulkFeatureId): BulkArticleConfig {
  return {
    ...config,
    featureId,
    duplicateMode: config.duplicateMode ?? 'reject',
    titleMode: config.titleMode ?? 'keyword_as_title',
    language: config.language || 'Vietnamese',
    imageOption: config.imageOption || 'none',
    imageCount: config.imageCount || 1,
    targetLength: Number(config.targetLength || 1200),
    tone: config.tone || 'seo_basic',
    modelId: config.modelId || 'gemini-flash',
    outlineMode: config.outlineMode || 'no_outline',
    aiOutlineObjective: config.aiOutlineObjective || 'basic',
    aiOutlineSize: config.aiOutlineSize || '5_6_h2',
    dataSourceMode: config.dataSourceMode || 'ai_only',
    contentType: config.contentType || 'blog_seo',
    topicalMapRole: config.topicalMapRole || 'standalone',
    outlineType: config.outlineType || 'review_product',
    searchResultCount: config.searchResultCount || 5,
    crawlMode: config.crawlMode || 'auto',
    structure: config.structure || 'auto',
    outlineAIType: config.outlineAIType || 'h2_6',
    sourceUrls: Array.isArray(config.sourceUrls) ? config.sourceUrls : [],
    sharedOutline: config.sharedOutline || '',
    writeMethod: config.writeMethod || 'balance',
  };
}

function extractArticleItem(article: {
  keyword: string;
  selectedTitle: string;
  secondaryKeywords: string[];
  meta: Prisma.JsonValue | null;
}): BulkKeywordItem {
  const meta = (article.meta ?? {}) as Record<string, unknown>;
  const item = (meta.item ?? {}) as Partial<BulkKeywordItem>;
  return {
    keyword: item.keyword || article.keyword,
    postTitle: item.postTitle || article.selectedTitle,
    secondaryKeywords: item.secondaryKeywords || article.secondaryKeywords || [],
    raw: item.raw || article.keyword,
  };
}

function cleanSources(sources: SourceItem[] | undefined): SourceItem[] {
  return (sources ?? []).filter((source) => !source.error && source.content?.trim());
}

async function resolveSources(config: BulkArticleConfig, bodySources?: SourceItem[]): Promise<SourceItem[]> {
  if (config.featureId !== 'theo-nguon') return [];

  const validBodySources = cleanSources(bodySources);
  if (validBodySources.length) return bodySources ?? [];

  const urls = config.sourceUrls.filter((url) => /^https?:\/\//i.test(url.trim())).slice(0, 5);
  if (!urls.length) return [];
  return crawlUrls(urls);
}

function parseItems(config: BulkArticleConfig, featureId: BulkFeatureId) {
  const feature = getBulkFeature(featureId);
  return parseBulkKeywords(config.keywordsRaw, {
    duplicateMode: config.duplicateMode,
    maxKeywords: feature.maxKeywords,
    pipeMode: featureId === 'dan-bai',
  });
}

function buildArticleTitle(item: BulkKeywordItem, config: BulkArticleConfig): string {
  if (config.featureId === 'dan-bai' && item.postTitle && config.titleMode === 'keyword_as_title') {
    return item.postTitle;
  }
  return item.postTitle || item.keyword;
}

export async function enqueueBulkJob(featureId: BulkFeatureId, request: NextRequest) {
  try {
    const user = await requireAuth();
    const feature = getBulkFeature(featureId);
    const body = getConfig(await request.json(), featureId);
    const config = normalizeConfig(body.config, featureId);
    const parsed = parseItems(config, featureId);

    if (!parsed.items.length) {
      return NextResponse.json({ success: false, error: 'Danh sách keyword trống' }, { status: 400 });
    }

    let parsedHeadings = config.parsedHeadings ?? [];
    if (featureId === 'dan-bai') {
      parsedHeadings = parsedHeadings.length ? parsedHeadings : parseOutline(config.sharedOutline);
      const outlineError = validateOutline(parsedHeadings);
      if (outlineError) {
        return NextResponse.json({ success: false, error: outlineError }, { status: 400 });
      }
    }

    const sources = await resolveSources(config, body.crawledSources);
    if (feature.requiresSources && cleanSources(sources).length === 0) {
      return NextResponse.json({ success: false, error: 'Cần thu thập ít nhất 1 nguồn URL hợp lệ' }, { status: 400 });
    }

    const finalConfig: BulkArticleConfig = {
      ...config,
      parsedHeadings,
      crawledSources: undefined,
    };

    const job = await prisma.bulkJob.create({
      data: {
        userId: user.userId,
        jobType: feature.jobType,
        config: json({
          ...finalConfig,
          _sources: sources,
        }),
        brandConfig: body.brandConfig === undefined ? Prisma.DbNull : json(body.brandConfig),
        keywords: parsed.items.map((item) => item.keyword),
        totalCount: parsed.items.length,
        status: BulkJobStatus.PENDING,
      },
    });

    const articles = await prisma.$transaction(
      parsed.items.map((item, index) =>
        prisma.article.create({
          data: {
            userId: user.userId,
            runId: `bulk-${feature.id}-${job.id}-${index}`,
            status: ArticleStatus.DRAFT,
            keyword: item.keyword,
            language: finalConfig.language,
            contentType: feature.contentType,
            sourceType: feature.sourceType,
            targetLength: finalConfig.targetLength,
            aiProvider: finalConfig.modelId,
            brandConfig: body.brandConfig === undefined ? Prisma.DbNull : json(body.brandConfig),
            meta: json({
              bulkFeatureId: feature.id,
              bulkJobId: job.id,
              item,
              sourcesSummary: sources.map((source) => ({
                url: source.url,
                title: source.title,
                wordCount: source.wordCount,
                isUnique: source.isUnique,
                error: source.error,
              })),
            }),
            competitorUrls: finalConfig.sourceUrls.filter(Boolean),
            outline: json({
              flow: feature.sourceType,
              stage: 'pending',
              config: finalConfig,
              parsedHeadings,
            }),
            selectedTitle: buildArticleTitle(item, finalConfig),
            secondaryKeywords: item.secondaryKeywords,
            htmlContent: '',
            bulkJobId: job.id,
            bulkIndex: index,
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      articleCount: articles.length,
      skippedCount: parsed.skippedCount,
      overLimitCount: parsed.overLimitCount,
      articleIds: articles.map((article) => article.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function getBulkJob(featureId: BulkFeatureId, jobId: string) {
  try {
    const user = await requireAuth();
    const feature = getBulkFeature(featureId);
    const job = await prisma.bulkJob.findFirst({
      where: { id: jobId, userId: user.userId, jobType: feature.jobType },
      include: {
        articles: {
          orderBy: { bulkIndex: 'asc' },
          select: {
            id: true,
            keyword: true,
            selectedTitle: true,
            status: true,
            wordCount: true,
            humannessScore: true,
            seoScore: true,
            bulkIndex: true,
            meta: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!job) return NextResponse.json({ success: false, error: 'Không tìm thấy job' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: { job },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function patchBulkJob(featureId: BulkFeatureId, jobId: string, request: NextRequest) {
  try {
    const user = await requireAuth();
    const feature = getBulkFeature(featureId);
    const { action } = (await request.json()) as { action?: string };
    const statusMap: Record<string, BulkJobStatus> = {
      pause: BulkJobStatus.PAUSED,
      resume: BulkJobStatus.RUNNING,
      cancel: BulkJobStatus.FAILED,
    };
    const nextStatus = action ? statusMap[action] : undefined;
    if (!nextStatus) {
      return NextResponse.json({ success: false, error: 'Action không hợp lệ' }, { status: 400 });
    }

    await prisma.bulkJob.updateMany({
      where: { id: jobId, userId: user.userId, jobType: feature.jobType },
      data: { status: nextStatus },
    });

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

function sse(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function processBulkJob(featureId: BulkFeatureId, jobId: string) {
  try {
    const user = await requireAuth();
    const feature = getBulkFeature(featureId);
    const job = await prisma.bulkJob.findFirst({
      where: { id: jobId, userId: user.userId, jobType: feature.jobType },
      include: { articles: { orderBy: { bulkIndex: 'asc' } } },
    });

    if (!job) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy job' }), { status: 404 });
    }

    const configRecord = (job.config ?? {}) as Record<string, unknown>;
    const config = normalizeConfig(configRecord as unknown as BulkArticleConfig, featureId);
    const sources = ((configRecord._sources ?? []) as SourceItem[]) || [];

    await prisma.bulkJob.update({
      where: { id: job.id },
      data: { status: BulkJobStatus.RUNNING, startedAt: job.startedAt ?? new Date() },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const keepalive = setInterval(() => {
          controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
        }, 30000);

        try {
          for (const article of job.articles) {
            if (article.status !== ArticleStatus.DRAFT && article.status !== ArticleStatus.WRITING) continue;

            const currentJob = await prisma.bulkJob.findUnique({
              where: { id: job.id },
              select: { status: true },
            });
            if (currentJob?.status === BulkJobStatus.PAUSED || currentJob?.status === BulkJobStatus.FAILED) {
              sse(controller, { type: 'paused', jobId: job.id });
              break;
            }

            const index = article.bulkIndex ?? 0;
            const item = extractArticleItem(article);
            sse(controller, { type: 'item_start', index, articleId: article.id, keyword: item.keyword });

            try {
              await prisma.article.update({
                where: { id: article.id },
                data: { status: ArticleStatus.WRITING },
              });

              const result = await processBulkArticleVariant({
                featureId,
                config,
                item,
                sources,
                onStep: (step, detail, progress) =>
                  sse(controller, { type: 'item_step', index, articleId: article.id, step, detail, progress }),
              });

              await prisma.article.update({
                where: { id: article.id },
                data: {
                  status: ArticleStatus.WRITTEN,
                  selectedTitle: result.title,
                  htmlContent: result.html,
                  plainText: result.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                  wordCount: result.wordCount,
                  metaDescription: result.metaDescription,
                  slug: result.slug,
                  seoScore: result.seoScore,
                  seoChecks: json(result.seoChecks),
                  humannessScore: result.humannessScore,
                  aiDecision: result.humannessDecision,
                  scoreBreakdown: json(result.scoreBreakdown),
                  outline: json({
                    flow: feature.sourceType,
                    stage: 'generated',
                    config,
                    item,
                    trace: result.trace ?? null,
                    sourcesSummary: sources.map((source) => ({
                      url: source.url,
                      title: source.title,
                      wordCount: source.wordCount,
                      isUnique: source.isUnique,
                    })),
                  }),
                  meta: json({
                    ...((article.meta ?? {}) as Record<string, unknown>),
                    bulkError: null,
                    keywordDensity: result.keywordDensity,
                  }),
                },
              });

              await prisma.bulkJob.update({
                where: { id: job.id },
                data: {
                  processedCount: { increment: 1 },
                  successCount: { increment: 1 },
                },
              });

              sse(controller, {
                type: 'item_done',
                index,
                articleId: article.id,
                title: result.title,
                wordCount: result.wordCount,
                humanness: result.humannessScore,
                seoScore: result.seoScore,
              });
            } catch (itemError) {
              const message = itemError instanceof Error ? itemError.message : 'Lỗi xử lý bài';
              await prisma.article.update({
                where: { id: article.id },
                data: {
                  status: ArticleStatus.DRAFT,
                  meta: json({
                    ...((article.meta ?? {}) as Record<string, unknown>),
                    bulkError: message,
                  }),
                },
              }).catch(() => undefined);
              await prisma.bulkJob.update({
                where: { id: job.id },
                data: {
                  processedCount: { increment: 1 },
                  errorCount: { increment: 1 },
                },
              }).catch(() => undefined);
              sse(controller, { type: 'item_error', index, articleId: article.id, message });
            }

            await new Promise((resolve) => setTimeout(resolve, feature.delayMs));
          }

          const latest = await prisma.bulkJob.findUnique({ where: { id: job.id } });
          if (latest?.status !== BulkJobStatus.PAUSED && latest?.status !== BulkJobStatus.FAILED) {
            const completed = await prisma.bulkJob.update({
              where: { id: job.id },
              data: { status: BulkJobStatus.COMPLETED, completedAt: new Date() },
            });
            sse(controller, {
              type: 'job_done',
              jobId: job.id,
              successCount: completed.successCount,
              errorCount: completed.errorCount,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Lỗi server';
          await prisma.bulkJob.update({ where: { id: job.id }, data: { status: BulkJobStatus.FAILED } }).catch(() => undefined);
          sse(controller, { type: 'error', message });
        } finally {
          clearInterval(keepalive);
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
    return new Response(JSON.stringify({ success: false, error: message }), { status });
  }
}

export async function crawlTheoNguon(request: NextRequest) {
  try {
    await requireAuth();
    const body = (await request.json()) as { urls?: string[] };
    const urls = (body.urls ?? []).filter((url) => /^https?:\/\//i.test(url.trim())).slice(0, 5);
    if (!urls.length) {
      return NextResponse.json({ success: false, error: 'Chưa có URL hợp lệ' }, { status: 400 });
    }
    const sources = await crawlUrls(urls);
    return NextResponse.json({ success: true, sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi crawl';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
