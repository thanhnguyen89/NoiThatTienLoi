import { NextRequest, NextResponse } from 'next/server';
import { adminUserService } from '@/server/services/admin-user.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const users = await adminUserService.getAllUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('GET /admin/api/admin-users error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi lấy người dùng' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });
    if (!payload.isSuperAdmin && payload.roleCode !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 });
    }

    const body = await request.json();
    const user = await adminUserService.createUser(body, payload.userId);
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/admin-users error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi tạo người dùng' }, { status: 500 });
  }
}
