import { NextRequest, NextResponse } from 'next/server';
import { productColorService } from '@/server/services/product-color.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const colors = await productColorService.getAllColors();
    return NextResponse.json({ success: true, data: colors });
  } catch (error) {
    console.error('GET /admin/api/product-colors error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy danh sách màu sắc' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const color = await productColorService.createColor(body);
    return NextResponse.json({ success: true, data: color }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/product-colors error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo màu sắc' },
      { status: 500 }
    );
  }
}
