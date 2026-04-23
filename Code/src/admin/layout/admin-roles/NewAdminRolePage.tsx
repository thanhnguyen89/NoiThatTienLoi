import { adminRoleService } from '@/server/services/admin-role.service';
import { DynamicAdminRoleFormClient } from '@/admin/components/AdminRoleFormWrapper';

export const metadata = { title: 'Thêm vai trò mới' };

export default async function NewAdminRolePage() {
  const [rolesResult, permissions] = await Promise.all([
    adminRoleService.getAllRoles(),
    adminRoleService.getAllPermissions(),
  ]);
  return <DynamicAdminRoleFormClient roles={rolesResult.data} permissions={permissions} />;
}
