import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth.service';
import { isAppError } from '@/server/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await authService.login(body.username, body.password, ip, userAgent);

    const response = NextResponse.json({ success: true, data: result }, { status: 200 });

    return response;
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
