import { NextRequest, NextResponse } from 'next/server';
import { productSizeService } from '@/server/services/product-size.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const size = await productSizeService.getSizeById(id);
    if (!size) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy kích thước' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: size });
  } catch (error) {
    console.error('GET /admin/api/product-sizes/:id error:', error);
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
    const size = await productSizeService.updateSize(id, body);
    return NextResponse.json({ success: true, data: size });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/product-sizes/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật kích thước' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await productSizeService.deleteSize(id);
    return NextResponse.json({ success: true, message: 'Đã xóa kích thước' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/product-sizes/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa kích thước' },
      { status: 500 }
    );
  }
}
