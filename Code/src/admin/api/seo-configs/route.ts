import { NextRequest, NextResponse } from 'next/server';
import { seoConfigService } from '@/server/services/seo-config.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const configs = await seoConfigService.getAllSeoConfigs();
    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    console.error('GET /admin/api/seo-configs error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy cấu hình SEO' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = await seoConfigService.createSeoConfig(body);
    return NextResponse.json({ success: true, data: config }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/seo-configs error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo cấu hình SEO' },
      { status: 500 }
    );
  }
}
