import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { OUTLINE_AI_TYPE_TARGET } from '@/lib/viet-theo-nguon/options';
import type { SourceConfig, SourceItem } from '@/lib/viet-theo-nguon/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.record(z.unknown()),
  sources: z.array(z.record(z.unknown())).default([]),
  outline: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config, sources, outline } = parsed.data;
    const cfg = config as unknown as SourceConfig;
    const runId = createTinhGonRunId(cfg.keyword);
    const targetLength = OUTLINE_AI_TYPE_TARGET[cfg.outlineAIType] ?? 1500;

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword: cfg.keyword,
        language: cfg.language,
        contentType: `viet_theo_nguon:${cfg.structure}`,
        sourceType: 'source_url',
        targetLength: cfg.outlineMode === 'none' ? 1200 : targetLength,
        aiProvider: cfg.model,
        brandConfig: (cfg.brandConfig ?? {}) as never,
        meta: buildArticleMeta('viet_theo_nguon', {
          structure: cfg.structure,
          outlineMode: cfg.outlineMode,
          outlineAIType: cfg.outlineAIType,
          sourceCount: sources.length,
          hasOutline: Boolean(outline?.trim()),
        }),
        selectedTitle: cfg.keyword,
        htmlContent: '',
        competitorUrls: [],
        secondaryKeywords: cfg.secondaryKeywords ?? [],
        outline: {
          stage: 'config',
          config: cfg,
          sources: sources as unknown as SourceItem[],
          outline: outline ?? '',
        } as never,
      },
    });

    return NextResponse.json({ articleId: article.id, runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
