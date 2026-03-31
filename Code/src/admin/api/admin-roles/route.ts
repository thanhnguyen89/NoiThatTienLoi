import { NextRequest, NextResponse } from 'next/server';
import { adminRoleService } from '@/server/services/admin-role.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const [roles, permissions] = await Promise.all([
      adminRoleService.getAllRoles(),
      adminRoleService.getAllPermissions(),
    ]);
    return NextResponse.json({ success: true, data: { roles, permissions } });
  } catch (error) {
    console.error('GET /admin/api/admin-roles error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi lấy vai trò' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });
    if (!payload.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Chỉ Super Admin mới có quyền tạo vai trò' }, { status: 403 });
    }

    const body = await request.json();
    const { permissionIds, ...roleData } = body;
    const role = await adminRoleService.createRole(roleData, permissionIds || [], payload.userId);
    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/admin-roles error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi tạo vai trò' }, { status: 500 });
  }
}
