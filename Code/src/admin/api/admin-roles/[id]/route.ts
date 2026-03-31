import { NextRequest, NextResponse } from 'next/server';
import { adminRoleService } from '@/server/services/admin-role.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const role = await adminRoleService.getRoleById(id);
    return NextResponse.json({ success: true, data: role });
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
    if (!payload.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Chỉ Super Admin mới có quyền sửa vai trò' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { permissionIds, ...roleData } = body;
    const role = await adminRoleService.updateRole(id, roleData, permissionIds, payload.userId);
    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/admin-roles/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi cập nhật vai trò' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });
    if (!payload.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Chỉ Super Admin mới có quyền xóa vai trò' }, { status: 403 });
    }

    const { id } = await context.params;
    await adminRoleService.deleteRole(id, payload.userId);
    return NextResponse.json({ success: true, message: 'Đã xóa vai trò' });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error('DELETE /admin/api/admin-roles/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xóa vai trò' }, { status: 500 });
  }
}
