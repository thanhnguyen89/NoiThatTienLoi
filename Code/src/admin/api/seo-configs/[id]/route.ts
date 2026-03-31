import { NextRequest, NextResponse } from 'next/server';
import { seoConfigService } from '@/server/services/seo-config.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const config = await seoConfigService.getSeoConfigById(id);
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy cấu hình SEO' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('GET /admin/api/seo-configs/:id error:', error);
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
    const config = await seoConfigService.updateSeoConfig(id, body);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/seo-configs/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật cấu hình SEO' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await seoConfigService.deleteSeoConfig(id);
    return NextResponse.json({ success: true, message: 'Đã xóa cấu hình SEO' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/seo-configs/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa cấu hình SEO' },
      { status: 500 }
    );
  }
}
