import { NextRequest, NextResponse } from 'next/server';
import { productSizeService } from '@/server/services/product-size.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const sizes = await productSizeService.getAllSizes();
    return NextResponse.json({ success: true, data: sizes });
  } catch (error) {
    console.error('GET /admin/api/product-sizes error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy kích thước' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const size = await productSizeService.createSize(body);
    return NextResponse.json({ success: true, data: size }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/product-sizes error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo kích thước' },
      { status: 500 }
    );
  }
}
