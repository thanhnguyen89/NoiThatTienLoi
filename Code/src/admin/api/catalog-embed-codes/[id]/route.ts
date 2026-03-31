import { NextRequest, NextResponse } from 'next/server';
import { catalogEmbedCodeService } from '@/server/services/catalog-embed-code.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const embedCode = await catalogEmbedCodeService.getEmbedCodeById(id);
    if (!embedCode) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy mã nhúng' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: embedCode });
  } catch (error) {
    console.error('GET /admin/api/catalog-embed-codes/:id error:', error);
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
    const embedCode = await catalogEmbedCodeService.updateEmbedCode(id, body);
    return NextResponse.json({ success: true, data: embedCode });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/catalog-embed-codes/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật mã nhúng' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await catalogEmbedCodeService.deleteEmbedCode(id);
    return NextResponse.json({ success: true, message: 'Đã xóa mã nhúng' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/catalog-embed-codes/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa mã nhúng' },
      { status: 500 }
    );
  }
}
