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
    if (payload && token) {
      const xff = request.headers.get('x-forwarded-for');
      const xrip = request.headers.get('x-real-ip');
      const ua = request.headers.get('user-agent');
      const ip: string | undefined = (xff || xrip) || undefined;
      const userAgent: string | undefined = ua || undefined;
      await authService.logout(token, (payload as { userId: string }).userId, ip || undefined, userAgent || undefined);
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
