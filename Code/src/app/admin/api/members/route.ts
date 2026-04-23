import { NextRequest, NextResponse } from 'next/server';
import { memberService } from '@/server/services/member.service';
import { isAppError } from '@/server/errors';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('admin_token')?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const result = await memberService.getAllMembers({
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      emailVerified: searchParams.get('emailVerified') || undefined,
      phoneVerified: searchParams.get('phoneVerified') || undefined,
      gender: searchParams.get('gender') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      hasOrder: searchParams.get('hasOrder') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20,
    });

    return NextResponse.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/members error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await request.json();
    const member = await memberService.createMember(body);
    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const response: Record<string, unknown> = { success: false, error: error.message };
      if (error.details) response.errors = error.details;
      return NextResponse.json(response, { status: error.statusCode });
    }
    console.error('POST /admin/api/members error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
