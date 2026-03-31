import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/server/services/news.service';
import { newsCategoryService } from '@/server/services/news-category.service';
import { pageService } from '@/server/services/page.service';
import { categoryService } from '@/server/services/category.service';
import { prisma } from '@/lib/prisma';
import { isAppError } from '@/server/errors';
import type { MenuLinkSourceType } from '@/lib/constants';

const VALID_TYPES: MenuLinkSourceType[] = [
  'news-content',
  'news-category',
  'static-page',
  'product-category',
  'product',
  'package-category',
  'package',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as MenuLinkSourceType | null;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Loai nguon link khong hop le' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'news-content': {
        const news = await newsService.getAllNews();
        const items = news.map((n: Record<string, unknown>) => ({
          id: String(n.id),
          title: n.title ?? '',
          url: `/tin-tuc/${n.seName ?? n.id}`,
        }));
        return NextResponse.json({ success: true, data: items });
      }

      case 'news-category': {
        const cats = await newsCategoryService.getAllCategories();
        const items = cats.map((c: Record<string, unknown>) => ({
          id: String(c.id),
          title: c.title ?? '',
          url: `/chuyen-muc/${c.seName ?? c.id}`,
        }));
        return NextResponse.json({ success: true, data: items });
      }

      case 'static-page': {
        const pages = await pageService.getAllPages();
        const items = pages.map((p: Record<string, unknown>) => ({
          id: String(p.id),
          title: p.pageName ?? p.title ?? '',
          url: `/${p.seName ?? p.id}`,
        }));
        return NextResponse.json({ success: true, data: items });
      }

      case 'product-category': {
        const cats = await categoryService.getAdminCategories();
        const items = cats.map((c: Record<string, unknown>) => ({
          id: String(c.id),
          title: c.name ?? '',
          url: `/danh-muc/${c.slug ?? c.id}`,
        }));
        return NextResponse.json({ success: true, data: items });
      }

      case 'product': {
        // Select minimal fields for menu link source
        const products = await prisma.product.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        const items = products.map((p) => ({
          id: p.id,
          title: p.name,
          url: `/san-pham/${p.slug ?? p.id}`,
        }));
        return NextResponse.json({ success: true, data: items });
      }

      case 'package-category':
      case 'package': {
        // Package models not implemented yet
        return NextResponse.json({ success: true, data: [] });
      }

      default:
        return NextResponse.json({ success: true, data: [] });
    }
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('GET /admin/api/menu-link-sources error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi server' },
      { status: 500 }
    );
  }
}
