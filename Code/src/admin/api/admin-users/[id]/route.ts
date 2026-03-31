import { NextRequest, NextResponse } from 'next/server';
import { adminUserService } from '@/server/services/admin-user.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await adminUserService.getUserById(id);
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });
    if (!payload.isSuperAdmin && payload.roleCode !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const user = await adminUserService.updateUser(id, body, payload.userId);
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/admin-users/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi cập nhật người dùng' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });
    if (!payload.isSuperAdmin && payload.roleCode !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 });
    }

    const { id } = await context.params;
    // Không cho tự xóa chính mình
    if (id === payload.userId) {
      return NextResponse.json({ success: false, error: 'Không thể tự xóa chính mình' }, { status: 400 });
    }

    await adminUserService.deleteUser(id, payload.userId);
    return NextResponse.json({ success: true, message: 'Đã xóa người dùng' });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error('DELETE /admin/api/admin-users/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xóa người dùng' }, { status: 500 });
  }
}
