import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/server/services/product.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/:id - Public: lấy chi tiết sản phẩm
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const product = await productService.getProductById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('GET /api/products/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
