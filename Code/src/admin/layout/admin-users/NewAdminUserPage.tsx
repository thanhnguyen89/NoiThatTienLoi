import { adminRoleService } from '@/server/services/admin-role.service';
import { DynamicAdminUserFormClient } from '@/admin/components/AdminUserFormWrapper';

export const metadata = { title: 'Thêm người dùng mới' };

export default async function NewAdminUserPage() {
  const roles = await adminRoleService.getAllRolesForDropdown();
  return <DynamicAdminUserFormClient roles={roles} />;
}
