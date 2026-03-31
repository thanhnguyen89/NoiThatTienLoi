import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/server/services/product.service';
import { parseAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /admin/api/products/:id
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
    const appError = parseAppError(error);
    return NextResponse.json(
      { success: false, error: appError.message },
      { status: appError.statusCode }
    );
  }
}

/**
 * PUT /admin/api/products/:id
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const product = await productService.updateProduct(id, body);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    const appError = parseAppError(error);
    const response: Record<string, unknown> = { success: false, error: appError.message };
    if (appError.details) response.errors = appError.details;
    return NextResponse.json(response, { status: appError.statusCode });
  }
}

/**
 * DELETE /admin/api/products/:id
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await productService.deleteProduct(id);
    return NextResponse.json({ success: true, message: 'Đã xóa sản phẩm' });
  } catch (error) {
    const appError = parseAppError(error);
    return NextResponse.json(
      { success: false, error: appError.message },
      { status: appError.statusCode }
    );
  }
}
