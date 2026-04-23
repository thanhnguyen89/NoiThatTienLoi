import { NextRequest, NextResponse } from 'next/server';
import { catalogEmbedCodeService } from '@/server/services/catalog-embed-code.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('admin_token')?.value || null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const embedCode = await catalogEmbedCodeService.getEmbedCodeById(id);
    return NextResponse.json({ success: true, data: embedCode });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/catalog-embed-codes/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const embedCode = await catalogEmbedCodeService.updateEmbedCode(id, body, payload.userId);
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
    return NextResponse.json({ success: false, error: 'Lỗi khi cập nhật mã nhúng' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });

    const { id } = await params;
    await catalogEmbedCodeService.deleteEmbedCode(id, payload.userId);
    return NextResponse.json({ success: true, message: 'Đã xóa mã nhúng' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json({ success: false, error: message, code }, { status: statusCode });
    }
    console.error('DELETE /admin/api/catalog-embed-codes/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xóa mã nhúng' }, { status: 500 });
  }
}
