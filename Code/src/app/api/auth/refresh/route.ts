import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth.service';
import { isAppError } from '@/server/errors';

export async function POST(request: NextRequest) {
  try {
    // Đọc refresh token từ body (localStorage approach)
    const body = await request.json().catch(() => ({}));
    const refreshToken = body.refreshToken || request.cookies.get('admin_refresh')?.value;
    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Không có refresh token' }, { status: 401 });
    }

    const tokens = await authService.refreshToken(refreshToken);
    return NextResponse.json({ success: true, data: tokens });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('POST /api/auth/refresh error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
