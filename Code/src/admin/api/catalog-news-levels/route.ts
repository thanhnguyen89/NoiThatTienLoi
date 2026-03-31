import { NextRequest, NextResponse } from 'next/server';
import { catalogNewsLevelService } from '@/server/services/catalog-news-level.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const items = await catalogNewsLevelService.getAll();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('GET /admin/api/catalog-news-levels error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy danh sách mức độ tin tức' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await catalogNewsLevelService.create(body);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/catalog-news-levels error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo mức độ tin tức' },
      { status: 500 }
    );
  }
}
