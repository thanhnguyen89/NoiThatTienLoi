import { NextRequest, NextResponse } from 'next/server';
import { catalogTextToLinkService } from '@/server/services/catalog-text-to-link.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const items = await catalogTextToLinkService.getAll();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('GET /admin/api/catalog-text-to-links error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy text to link' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await catalogTextToLinkService.create(body);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/catalog-text-to-links error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo text to link' },
      { status: 500 }
    );
  }
}
