import { NextRequest, NextResponse } from 'next/server';
import { newsCategoryService } from '@/server/services/news-category.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('admin_token')?.value || null;
}

export async function GET() {
  try {
    const cats = await newsCategoryService.getAllCategories();
    return NextResponse.json({ success: true, data: cats });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/news-categories error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });

    const body = await request.json();
    const cat = await newsCategoryService.createCategory(body, payload.userId);
    return NextResponse.json({ success: true, data: cat }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    console.error('POST /admin/api/news-categories error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
