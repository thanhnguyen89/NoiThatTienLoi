import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/server/services/news.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('admin_token')?.value || null;
}

interface Props { params: Promise<{ id: string }>; }

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const news = await newsService.getNewsById(id);
    return NextResponse.json({ success: true, data: news });
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
    const news = await newsService.updateNews(id, body, payload.userId);
    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    console.error('PUT /admin/api/news/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });

    const { id } = await params;
    await newsService.deleteNews(id, payload.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
