import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { computeToplistTargetLength } from '@/lib/viet-toplist/options';
import type { ToplistConfig } from '@/lib/viet-toplist/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.object({
    keyword: z.string().min(1),
    secondaryKeywords: z.array(z.string()).default([]),
    topN: z.number().min(5).max(15).default(10),
    structure: z.string().default('intro_features_pros_cons'),
    tone: z.string().default('formal_seo'),
    dataSource: z.enum(['google_search', 'ai_only']).default('ai_only'),
    imageOption: z.enum(['none', 'yandex', 'ai_generated', 'shutterstock']).default('none'),
    language: z.string().default('Vietnamese'),
    model: z.string().default('gemini-flash'),
    brandConfig: z.record(z.unknown()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ', issues: parsed.error.flatten() }, { status: 400 });
    }

    const { config } = parsed.data as { config: ToplistConfig };
    const runId = createTinhGonRunId(config.keyword);
    const targetLength = computeToplistTargetLength(config.topN, config.structure);

    let serpData: string | undefined;
    if (config.dataSource === 'google_search') {
      try {
        const googleData = await fetchGoogleSearchData(config.keyword, {
          num: 5,
          crawl: true,
          language: config.language,
        });
        if (googleData) serpData = buildDataBlock(googleData);
      } catch {
        // non-blocking
      }
    }

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword: config.keyword,
        language: config.language,
        contentType: `viet_toplist:top${config.topN}`,
        sourceType: config.dataSource === 'google_search' ? 'google_search' : 'ai_only',
        targetLength,
        aiProvider: config.model,
        brandConfig: (config.brandConfig ?? {}) as never,
        meta: buildArticleMeta('viet_toplist', {
          topN: config.topN,
          structure: config.structure,
          tone: config.tone,
          dataSource: config.dataSource,
          serpDataAvailable: Boolean(serpData),
        }),
        selectedTitle: config.keyword,
        htmlContent: '',
        competitorUrls: [],
        secondaryKeywords: config.secondaryKeywords,
        outline: {
          flow: 'viet_toplist',
          stage: 'config',
          topN: config.topN,
          structure: config.structure,
          tone: config.tone,
          config,
          serpData: serpData ?? null,
        } as never,
      },
    });

    return NextResponse.json({
      articleId: article.id,
      runId,
      ...(serpData ? { serpData } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
