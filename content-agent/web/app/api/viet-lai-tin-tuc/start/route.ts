import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { countHtmlWords, extractArticleTitle } from '@/lib/viet-lai/html-parser';
import type { NewsRewriteConfig } from '@/lib/viet-lai-tin-tuc/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  draftArticleId: z.string().min(1).optional(),
  config: z.object({
    originalHtml: z.string().min(1),
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
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config, draftArticleId } = parsed.data as { config: NewsRewriteConfig; draftArticleId?: string };

    if (!config.originalHtml.trim()) {
      return NextResponse.json({ error: 'Nội dung tin gốc không được để trống.' }, { status: 422 });
    }

    const originalTitle = config.originalTitle.trim()
      || extractArticleTitle(config.originalHtml)
      || config.keyword
      || 'Tin tức';

    const keyword = config.keyword.trim();
    const runId = createTinhGonRunId(keyword || originalTitle);
    const wordCount = countHtmlWords(config.originalHtml);

    const existingDraft = draftArticleId
      ? await prisma.article.findFirst({
          where: {
            id: draftArticleId,
            userId: user.userId,
            deletedAt: null,
            status: 'DRAFT',
          },
        })
      : null;

    if (existingDraft) {
      const updated = await prisma.article.update({
        where: { id: existingDraft.id },
        data: {
          status: 'DRAFT',
          keyword: keyword || originalTitle,
          language: config.language,
          contentType: 'viet_lai_tin_tuc:rewrite_news',
          sourceType: 'rewrite_news',
          targetLength: wordCount,
          aiProvider: config.model,
          brandConfig: (config.brandConfig ?? {}) as never,
          meta: buildArticleMeta('viet_lai_tin_tuc', {
            style: config.style,
            seoMode: config.seoMode,
          }),
          selectedTitle: originalTitle,
          htmlContent: '',
          plainText: null,
          wordCount: 0,
          metaDescription: null,
          slug: null,
          seoScore: null,
          seoChecks: Prisma.DbNull,
          humannessScore: null,
          scoreBreakdown: Prisma.DbNull,
          aiDecision: null,
          featuredImage: null,
          publishedAt: null,
          wordpressPostId: null,
          wordpressUrl: null,
          wordpressStatus: null,
          isBoosted: false,
          boostedAt: null,
          competitorUrls: [],
          secondaryKeywords: [],
          outline: {
            flow: 'viet_lai_tin_tuc',
            stage: 'config',
            config,
          } as never,
        },
      });

      return NextResponse.json({
        articleId: updated.id,
        runId: updated.runId,
        wordCount,
      });
    }

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword: keyword || originalTitle,
        language: config.language,
        contentType: 'viet_lai_tin_tuc:rewrite_news',
        sourceType: 'rewrite_news',
        targetLength: wordCount,
        aiProvider: config.model,
        brandConfig: (config.brandConfig ?? {}) as never,
        meta: buildArticleMeta('viet_lai_tin_tuc', {
          style: config.style,
          seoMode: config.seoMode,
        }),
        selectedTitle: originalTitle,
        htmlContent: '',
        wordCount: 0,
        competitorUrls: [],
        secondaryKeywords: [],
        outline: {
          flow: 'viet_lai_tin_tuc',
          stage: 'config',
          config,
        } as never,
      },
    });

    return NextResponse.json({
      articleId: article.id,
      runId,
      wordCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
