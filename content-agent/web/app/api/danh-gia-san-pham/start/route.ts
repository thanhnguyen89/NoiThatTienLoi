import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import { slugify } from '@/lib/tinh-gon/text';
import { reviewConfigSchema } from '@/lib/product-scraper/types';

export const runtime = 'nodejs';

function createRunId(keyword: string): string {
  const slug = slugify(keyword).slice(0, 40) || 'review';
  return `${slug}-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = reviewConfigSchema.safeParse(rawBody.config);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Config không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const config = parsed.data;
    const runId = createRunId(config.keyword);

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: 'DRAFT',
        keyword: config.keyword,
        language: config.language,
        contentType: 'viet_danh_gia_san_pham:product_review',
        sourceType: config.productUrl ? 'product_url' : 'manual_product',
        targetLength: 1500,
        aiProvider: config.model,
        brandConfig: (config.brandConfig ?? {}) as never,
        meta: buildArticleMeta('viet_danh_gia_san_pham', {
          reviewStructure: config.reviewStructure,
          reviewStyle: config.reviewStyle,
          hasProductUrl: Boolean(config.productUrl),
          hasAffiliateLink: Boolean(config.affiliateLink),
        }),
        outline: {
          flow: 'product_review',
          config,
        } as never,
        selectedTitle: config.productName,
        htmlContent: '',
        competitorUrls: [],
        secondaryKeywords: [],
      },
    });

    return NextResponse.json({ articleId: article.id, runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
