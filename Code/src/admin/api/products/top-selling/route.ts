import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/server/services/product.service';
import { parseAppError } from '@/server/errors';

/**
 * GET /admin/api/products/top-selling?limit=10
 * Lấy danh sách sản phẩm bán chạy nhất
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const products = await productService.getTopSellingProducts(limit);
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    const appError = parseAppError(error);
    return NextResponse.json(
      { success: false, error: appError.message },
      { status: appError.statusCode }
    );
  }
}
