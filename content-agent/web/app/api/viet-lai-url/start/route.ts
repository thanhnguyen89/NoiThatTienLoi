import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import type { UrlRewriteConfig } from '@/lib/viet-lai-url/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  draftArticleId: z.string().min(1).optional(),
  config: z.object({
    sourceUrl: z.string().url(),
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
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config, draftArticleId } = parsed.data as { config: UrlRewriteConfig; draftArticleId?: string };
    const keyword = config.keyword.trim() || config.sourceTitle || new URL(config.sourceUrl).hostname;
    const runId = createTinhGonRunId(keyword);

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
      const secondaryKeywords = config.secondaryKeywords
        ? config.secondaryKeywords.split(',').map((item) => item.trim()).filter(Boolean)
        : [];

      const updated = await prisma.article.update({
        where: { id: existingDraft.id },
        data: {
          status: 'DRAFT',
          keyword,
          language: config.language,
          contentType: 'viet_lai_url:rewrite_url',
          sourceType: 'rewrite_url',
          targetLength: 1500,
          aiProvider: config.model,
          brandConfig: (config.brandConfig ?? {}) as never,
          meta: buildArticleMeta('viet_lai_url', {
            sourceUrl: config.sourceUrl,
            seoMode: config.seoMode,
            hasAdditionalLinks: config.additionalLinks.length > 0,
          }),
          selectedTitle: config.sourceTitle || keyword,
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
          competitorUrls: [config.sourceUrl],
          secondaryKeywords,
          outline: {
            flow: 'viet_lai_url',
            stage: 'config',
            config,
          } as never,
        },
      });

      return NextResponse.json({
        articleId: updated.id,
        runId: updated.runId,
      });
    }

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword,
        language: config.language,
        contentType: 'viet_lai_url:rewrite_url',
        sourceType: 'rewrite_url',
        targetLength: 1500,
        aiProvider: config.model,
        brandConfig: (config.brandConfig ?? {}) as never,
        meta: buildArticleMeta('viet_lai_url', {
          sourceUrl: config.sourceUrl,
          seoMode: config.seoMode,
          hasAdditionalLinks: config.additionalLinks.length > 0,
        }),
        selectedTitle: config.sourceTitle || keyword,
        htmlContent: '',
        wordCount: 0,
        competitorUrls: [config.sourceUrl],
        secondaryKeywords: config.secondaryKeywords
          ? config.secondaryKeywords.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
        outline: {
          flow: 'viet_lai_url',
          stage: 'config',
          config,
        } as never,
      },
    });

    return NextResponse.json({
      articleId: article.id,
      runId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
