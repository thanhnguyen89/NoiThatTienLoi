import { NextRequest, NextResponse } from 'next/server';
import { catalogEmbedCodeService } from '@/server/services/catalog-embed-code.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('admin_token')?.value || null;
}

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
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });

    const body = await request.json();
    const embedCode = await catalogEmbedCodeService.createEmbedCode(body, payload.userId);
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
