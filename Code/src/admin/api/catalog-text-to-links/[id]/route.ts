import { NextRequest, NextResponse } from 'next/server';
import { catalogTextToLinkService } from '@/server/services/catalog-text-to-link.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const item = await catalogTextToLinkService.getById(id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy text to link' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('GET /admin/api/catalog-text-to-links/:id error:', error);
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
    const item = await catalogTextToLinkService.update(id, body);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/catalog-text-to-links/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật text to link' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await catalogTextToLinkService.delete(id);
    return NextResponse.json({ success: true, message: 'Đã xóa text to link' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/catalog-text-to-links/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa text to link' },
      { status: 500 }
    );
  }
}
