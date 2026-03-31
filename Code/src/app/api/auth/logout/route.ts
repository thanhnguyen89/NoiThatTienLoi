import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

function getToken(request: NextRequest): string | null {
  // Try Authorization header first (localStorage approach)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Fallback to cookie
  return request.cookies.get('admin_token')?.value || null;
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    const payload = token ? verifyAccessToken(token) : null;
    if (payload) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const userAgent = request.headers.get('user-agent') || undefined;
      await authService.logout(token, payload.userId, ip, userAgent);
    }

    const response = NextResponse.json({ success: true, message: 'Đăng xuất thành công' });
    response.cookies.delete('admin_token');
    response.cookies.delete('admin_refresh');
    return response;
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('POST /api/auth/logout error:', error);
    return NextResponse.json({ success: true, message: 'Đăng xuất' });
  }
}
