import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { parseOutline, validateOutline } from '@/lib/viet-theo-dan-bai/outline-parser';
import type { DanBaiConfig } from '@/lib/viet-theo-dan-bai/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.object({
    keyword: z.string().min(1),
    language: z.string().default('Vietnamese'),
    postTitle: z.string().min(1, 'Tiêu đề bài viết không được để trống'),
    outline: z.string().min(10, 'Dàn bài quá ngắn'),
    writeMethod: z.enum(['balance', 'detail']).default('balance'),
    tone: z.enum(['seo_focus', 'confident', 'friendly']).default('seo_focus'),
    model: z.string().default('gemini-flash'),
    targetLength: z.number().min(600).max(2000).default(1000),
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

    const { config } = parsed.data as { config: DanBaiConfig };
    const parsedHeadings = parseOutline(config.outline);
    const outlineError = validateOutline(parsedHeadings);
    if (outlineError) {
      return NextResponse.json({ error: outlineError }, { status: 400 });
    }

    const runId = createTinhGonRunId(config.keyword);

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword: config.keyword,
        language: config.language,
        contentType: `viet_theo_dan_bai:${config.writeMethod}`,
        sourceType: 'manual_outline',
        targetLength: config.targetLength,
        aiProvider: config.model,
        brandConfig: (config.brandConfig ?? {}) as never,
        meta: buildArticleMeta('viet_theo_dan_bai', {
          writeMethod: config.writeMethod,
          tone: config.tone,
          headingCount: parsedHeadings.length,
        }),
        selectedTitle: config.postTitle,
        htmlContent: '',
        competitorUrls: [],
        secondaryKeywords: [],
        outline: {
          flow: 'viet_dan_bai',
          stage: 'config',
          writeMethod: config.writeMethod,
          tone: config.tone,
          rawOutline: config.outline,
          parsedHeadings,
          config: {
            ...config,
            parsedHeadings,
          },
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
