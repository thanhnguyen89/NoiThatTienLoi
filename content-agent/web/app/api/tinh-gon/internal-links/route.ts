import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rankInternalLinks } from '@/lib/tinh-gon/internal-links';
import { internalLinksRequestSchema } from '@/lib/tinh-gon/schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = internalLinksRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { keyword, html } = parsed.data;
    const articles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        slug: {
          not: null,
        },
      },
      select: {
        selectedTitle: true,
        slug: true,
        keyword: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
    });

    const candidates = articles
      .filter(
        (article): article is { selectedTitle: string; slug: string; keyword: string } =>
          Boolean(article.slug) && Boolean(article.selectedTitle),
      )
      .map((article) => ({
        title: article.selectedTitle,
        slug: article.slug,
        keyword: article.keyword,
      }));

    const links = rankInternalLinks({
      keyword,
      html,
      articles: candidates,
      limit: 5,
      baseUrl: process.env.SITE_URL || 'https://noithatminhquan.com',
    });

    return NextResponse.json({ links });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
