import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/server/services/product.service';
import { validateProduct } from '@/server/validators/product.validator';
import { PAGINATION } from '@/lib/constants';
import type { ProductSortField } from '@/lib/types';
import { parseAppError } from '@/server/errors';

/**
 * GET /admin/api/products - Admin danh sách sản phẩm
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const result = await productService.getProductsAdmin({
      page: Number(searchParams.get('page')) || 1,
      pageSize: Number(searchParams.get('pageSize')) || PAGINATION.ADMIN_PAGE_SIZE,
      categoryId: searchParams.get('categoryId') || undefined,
      search: searchParams.get('search') || undefined,
      sort: (searchParams.get('sort') as ProductSortField) || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const appError = parseAppError(error);
    return NextResponse.json(
      { success: false, error: appError.message },
      { status: appError.statusCode }
    );
  }
}

/**
 * POST /admin/api/products - Tạo sản phẩm mới
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[POST /admin/api/products] body keys:', Object.keys(body));
    console.log('[POST /admin/api/products] description:', JSON.stringify(body.description)?.substring(0, 200));
    console.log('[POST /admin/api/products] ingredients:', JSON.stringify(body.ingredients)?.substring(0, 200));
    console.log('[POST /admin/api/products] image:', JSON.stringify(body.image)?.substring(0, 200));
    const product = await productService.createProduct(body);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error('[POST /admin/api/products] ERROR:', error);
    const appError = parseAppError(error);
    const response: Record<string, unknown> = { success: false, error: appError.message };
    if (appError.details) response.errors = appError.details;
    return NextResponse.json(response, { status: appError.statusCode });
  }
}
