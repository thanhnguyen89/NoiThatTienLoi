import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/server/services/product.service';
import type { ProductSortField } from '@/lib/types';

/**
 * GET /api/products - Public: lấy danh sách sản phẩm
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const result = await productService.getProducts({
      page: Number(searchParams.get('page')) || 1,
      pageSize: Number(searchParams.get('pageSize')) || undefined,
      categorySlug: searchParams.get('categorySlug') || undefined,
      search: searchParams.get('search') || undefined,
      sort: (searchParams.get('sort') as ProductSortField) || undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy danh sách sản phẩm' },
      { status: 500 }
    );
  }
}
