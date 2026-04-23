import { NextRequest, NextResponse } from 'next/server';
import { pageService } from '@/server/services/page.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

interface Props { params: Promise<{ id: string }>; }

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('admin_token')?.value || null;
}

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const page = await pageService.getPageById(id);
    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const page = await pageService.updatePage(id, body, payload.userId);
    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    await pageService.deletePage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
