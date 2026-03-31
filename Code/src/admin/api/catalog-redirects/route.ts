import { NextRequest, NextResponse } from 'next/server';
import { catalogRedirectService } from '@/server/services/catalog-redirect.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const redirects = await catalogRedirectService.getAllRedirects();
    return NextResponse.json({ success: true, data: redirects });
  } catch (error) {
    console.error('GET /admin/api/catalog-redirects error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy redirect' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const redirect = await catalogRedirectService.createRedirect(body);
    return NextResponse.json({ success: true, data: redirect }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/catalog-redirects error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo redirect' },
      { status: 500 }
    );
  }
}
