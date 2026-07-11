import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(keyword: string, title: string): number {
  const keywordWords = normalizeText(keyword).split(/\s+/).filter((word) => word.length > 1);
  if (keywordWords.length === 0) return 0;

  const normalizedTitle = normalizeText(title);
  const matched = keywordWords.filter((word) => normalizedTitle.includes(word)).length;
  return matched / keywordWords.length;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword')?.trim() || '';

    if (!keyword) {
      return NextResponse.json({ success: true, data: { exists: false, articles: [] } });
    }

    const candidates = await prisma.article.findMany({
      where: {
        userId: user.userId,
        deletedAt: null,
        OR: [
          { keyword: { contains: keyword, mode: 'insensitive' } },
          { selectedTitle: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        selectedTitle: true,
        keyword: true,
        slug: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    const articles = candidates
      .map((article) => ({
        id: article.id,
        title: article.selectedTitle,
        keyword: article.keyword,
        slug: article.slug,
        status: article.status,
        publishedAt: article.publishedAt,
        updatedAt: article.updatedAt,
        similarity: Math.max(similarity(keyword, article.selectedTitle), similarity(keyword, article.keyword)),
      }))
      .filter((article) => article.similarity >= 0.6);

    return NextResponse.json({
      success: true,
      data: {
        exists: articles.length > 0,
        cannibalizing: articles.length > 0,
        articles,
      },
    });
  } catch (error) {
    console.error('[check-cannibalization] Error:', error);
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: status === 401 ? 'Unauthorized' : 'Internal server error' }, { status });
  }
}
