import { NextRequest, NextResponse } from 'next/server';
import { catalogNewsLevelService } from '@/server/services/catalog-news-level.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const item = await catalogNewsLevelService.getById(id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy mức độ tin tức' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('GET /admin/api/catalog-news-levels/:id error:', error);
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
    const item = await catalogNewsLevelService.update(id, body);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/catalog-news-levels/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật mức độ tin tức' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await catalogNewsLevelService.delete(id);
    return NextResponse.json({ success: true, message: 'Đã xóa mức độ tin tức' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/catalog-news-levels/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa mức độ tin tức' },
      { status: 500 }
    );
  }
}
