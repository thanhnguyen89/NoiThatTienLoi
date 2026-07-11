import { ArticleStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildVbtArticleContentType } from '@/lib/viet-bai-thong-minh/options';
import { toJsonValue } from '@/lib/viet-bai-thong-minh/server';
import type { VbtStartRequest } from '@/lib/viet-bai-thong-minh/types';

export const runtime = 'nodejs';

function createRunId(keyword: string): string {
  const slug = keyword
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return `vbt_${slug || 'article'}_${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json() as VbtStartRequest;

    if (!body.keyword?.trim() || !body.title?.trim()) {
      return NextResponse.json({ error: 'Thiếu keyword hoặc title.' }, { status: 400 });
    }

    const runId = createRunId(body.keyword);
    const outlinePayload = {
      flow: 'vbt',
      step1: {
        keyword: body.keyword,
        secondaryKeywordsRaw: body.secondaryKeywordsRaw,
        contentType: body.contentType,
        topicalMapRole: body.topicalMapRole,
        competitorUrls: body.competitorUrls,
        dataSourceMode: body.dataSourceMode,
        dataSourceUrls: body.dataSourceUrls,
        dataSourceText: body.dataSourceText,
        language: body.language,
      },
      semantic: body.semantic,
      step3: body.step3,
      title: body.title,
      finalOutline: body.outline,
    };

    const article = await prisma.article.create({
      data: {
        userId: user.userId,
        runId,
        status: ArticleStatus.WRITING,
        keyword: body.keyword,
        language: body.language,
        contentType: buildVbtArticleContentType(body.contentType),
        sourceType: body.dataSourceMode,
        targetLength: body.step3.targetLength,
        aiProvider: body.step3.model,
        brandConfig: toJsonValue(body.step3.brand),
        meta: toJsonValue({
          flow: 'vbt',
          vbtContentType: body.contentType,
          topicalMapRole: body.topicalMapRole,
          imageOption: body.step3.imageOption,
          tone: body.step3.tone,
          searchIntent: body.semantic?.searchIntent || null,
          semanticKeywords: body.semantic?.semanticKeywords || [],
        }),
        competitorUrls: body.competitorUrls,
        competitorAnalysis: body.semantic?.competitorInsights || '',
        outline: toJsonValue(outlinePayload),
        selectedTitle: body.title,
        userNotes: body.outline || null,
        secondaryKeywords: body.secondaryKeywords,
        htmlContent: '',
        plainText: '',
        wordCount: 0,
      },
    });

    return NextResponse.json({ runId, articleId: article.id });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? 'Chưa được xác thực.' : 'Không thể bắt đầu viết bài.' },
      { status },
    );
  }
}
