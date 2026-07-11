import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import { createKeywordRunId, buildKeywordSnapshot } from '@/lib/viet-theo-tu-khoa/persistence';
import { parseOutlineToPreview } from '@/lib/viet-theo-tu-khoa/outline-generator';
import type { KeywordArticleConfig } from '@/lib/viet-theo-tu-khoa/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.object({
    keyword: z.string().trim().min(3),
    secondaryKeywords: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
    isToplist: z.boolean().default(false),
    outlineMode: z.enum(['no_outline', 'user_outline', 'ai_outline']),
    targetLength: z.number().int().min(600).max(5000),
    aiOutlineObjective: z.enum(['basic', 'problem_solution', 'listicle', 'comparison', 'step_by_step', 'story']).optional(),
    aiOutlineSize: z.enum(['2_3_h2', '3_4_h2', '5_6_h2', '7_8_h2', '9_10_h2']).optional(),
    resolvedOutline: z.string().optional(),
    imageOption: z.enum(['none', 'yandex', 'ai_generated', 'shutterstock']),
    language: z.string().trim().min(2),
    tone: z.enum([
      'seo_basic',
      'seo_focus',
      'seo_extended',
      'seo_longform',
      'seo_nofaq',
      'how_to',
      'listicle',
      'comparison',
      'story',
      'technical',
      'friendly',
      'formal',
      'confident',
      'year_in_title',
      'cooking',
      'random',
    ]),
    model: z.string().trim().min(1),
    seoMainLink: z.string().optional(),
    seoKeywordLinks: z.array(z.object({
      keyword: z.string().trim().min(1),
      url: z.string().trim().min(1),
    })).optional(),
    footerContent: z.string().optional(),
    boldMainKeyword: z.boolean(),
    boldHeadings: z.boolean(),
    brandProfileId: z.number().int().optional(),
    brandConfig: z.record(z.unknown()).optional(),
    dataSource: z.enum(['ai_only', 'google_search']).optional(),
    competitorUrls: z.array(z.string().trim()).optional(),
  }),
  draftArticleId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await req.json();
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const config = parsed.data.config as KeywordArticleConfig;
    const draftArticleId = parsed.data.draftArticleId;
    const runId = createKeywordRunId(config.keyword);
    const contentType = `viet_theo_tu_khoa:${config.outlineMode}`;
    const previewHtml = parseOutlineToPreview(config.resolvedOutline || '');
    const snapshot = buildKeywordSnapshot({
      stage: 'config',
      config,
    });

    let articleId = '';

    if (draftArticleId) {
      const draft = await prisma.article.findFirst({
        where: {
          id: draftArticleId,
          userId: user.userId,
          deletedAt: null,
          status: 'DRAFT',
        },
      });

      if (draft) {
        const updated = await prisma.article.update({
          where: { id: draft.id },
          data: {
            runId,
            keyword: config.keyword,
            language: config.language,
            contentType,
            sourceType: config.dataSource ?? 'ai_only',
            targetLength: config.targetLength,
            aiProvider: config.model,
            brandConfig: (config.brandConfig ?? {}) as never,
            meta: buildArticleMeta('viet_theo_tu_khoa', {
              outlineMode: config.outlineMode,
              isToplist: config.isToplist,
              imageOption: config.imageOption,
              dataSource: config.dataSource ?? 'ai_only',
            }),
            secondaryKeywords: config.secondaryKeywords,
            selectedTitle: config.keyword,
            outline: snapshot as never,
            competitorUrls: config.competitorUrls ?? [],
            htmlContent: '',
            plainText: '',
            metaDescription: '',
            wordCount: 0,
          },
        });
        articleId = updated.id;
      } else {
        console.warn(
          `[viet-theo-tu-khoa/start] draft ${draftArticleId} not found for user ${user.userId}, creating new`,
        );
      }
    }

    if (!articleId) {
      const article = await prisma.article.create({
        data: {
          userId: user.userId,
          runId,
          status: 'DRAFT',
          keyword: config.keyword,
          language: config.language,
          contentType,
          sourceType: config.dataSource ?? 'ai_only',
          targetLength: config.targetLength,
          aiProvider: config.model,
          brandConfig: (config.brandConfig ?? {}) as never,
          meta: buildArticleMeta('viet_theo_tu_khoa', {
            outlineMode: config.outlineMode,
            isToplist: config.isToplist,
            imageOption: config.imageOption,
            dataSource: config.dataSource ?? 'ai_only',
          }),
          secondaryKeywords: config.secondaryKeywords,
          selectedTitle: config.keyword,
          outline: snapshot as never,
          competitorUrls: config.competitorUrls ?? [],
          htmlContent: '',
          plainText: '',
          metaDescription: '',
          wordCount: 0,
        },
      });
      articleId = article.id;
    }

    return NextResponse.json({
      success: true,
      articleId,
      runId,
      outline: config.resolvedOutline || '',
      previewHtml,
    });
  } catch (error) {
    console.error('[viet-theo-tu-khoa/start] error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
