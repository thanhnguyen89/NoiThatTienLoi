import { NextRequest, NextResponse } from 'next/server';
import { catalogEmbedCodeService } from '@/server/services/catalog-embed-code.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const embedCodes = await catalogEmbedCodeService.getAllEmbedCodes();
    return NextResponse.json({ success: true, data: embedCodes });
  } catch (error) {
    console.error('GET /admin/api/catalog-embed-codes error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy mã nhúng' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const embedCode = await catalogEmbedCodeService.createEmbedCode(body);
    return NextResponse.json({ success: true, data: embedCode }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/catalog-embed-codes error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo mã nhúng' },
      { status: 500 }
    );
  }
}
