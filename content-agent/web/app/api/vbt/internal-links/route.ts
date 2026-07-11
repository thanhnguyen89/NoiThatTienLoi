import { ArticleStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { rankInternalLinks } from '@/lib/tinh-gon/internal-links';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json() as {
      keywords?: string[];
      currentArticleId?: string;
    };

    const keywords = (body.keywords || []).map((item) => item.trim()).filter(Boolean).slice(0, 8);
    if (keywords.length === 0) {
      return NextResponse.json({ links: [] });
    }

    const articles = await prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        deletedAt: null,
        slug: { not: null },
        id: body.currentArticleId ? { not: body.currentArticleId } : undefined,
        OR: keywords.flatMap((keyword) => ([
          { selectedTitle: { contains: keyword, mode: 'insensitive' } },
          { metaDescription: { contains: keyword, mode: 'insensitive' } },
          { keyword: { contains: keyword, mode: 'insensitive' } },
        ])),
      },
      select: {
        selectedTitle: true,
        slug: true,
        keyword: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 20,
    });

    const candidates = articles
      .filter((article): article is { selectedTitle: string; slug: string; keyword: string } =>
        Boolean(article.selectedTitle) && Boolean(article.slug),
      )
      .map((article) => ({
        title: article.selectedTitle,
        slug: article.slug,
        keyword: article.keyword,
      }));

    const links = rankInternalLinks({
      keyword: keywords.join(' '),
      articles: candidates,
      limit: 8,
      baseUrl: process.env.SITE_URL || 'https://noithatminhquan.vn',
    });

    return NextResponse.json({ links });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { links: [], error: status === 401 ? 'Chưa được xác thực.' : 'Không thể lấy liên kết nội bộ.' },
      { status },
    );
  }
}
