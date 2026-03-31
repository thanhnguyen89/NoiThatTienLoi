import { NextRequest, NextResponse } from 'next/server';
import { productColorService } from '@/server/services/product-color.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const color = await productColorService.getColorById(id);
    if (!color) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy màu sắc' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: color });
  } catch (error) {
    console.error('GET /admin/api/product-colors/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const color = await productColorService.updateColor(id, body);
    return NextResponse.json({ success: true, data: color });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/product-colors/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật màu sắc' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await productColorService.deleteColor(id);
    return NextResponse.json({ success: true, message: 'Đã xóa màu sắc' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/product-colors/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa màu sắc' },
      { status: 500 }
    );
  }
}
