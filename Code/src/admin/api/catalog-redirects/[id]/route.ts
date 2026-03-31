import { NextRequest, NextResponse } from 'next/server';
import { catalogRedirectService } from '@/server/services/catalog-redirect.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const redirect = await catalogRedirectService.getRedirectById(id);
    if (!redirect) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy redirect' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: redirect });
  } catch (error) {
    console.error('GET /admin/api/catalog-redirects/:id error:', error);
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
    const redirect = await catalogRedirectService.updateRedirect(id, body);
    return NextResponse.json({ success: true, data: redirect });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/catalog-redirects/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật redirect' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await catalogRedirectService.deleteRedirect(id);
    return NextResponse.json({ success: true, message: 'Đã xóa redirect' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/catalog-redirects/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa redirect' },
      { status: 500 }
    );
  }
}
