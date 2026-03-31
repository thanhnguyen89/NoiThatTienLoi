import { notFound } from 'next/navigation';
import { adminRoleService } from '@/server/services/admin-role.service';
import { DynamicAdminRoleFormClient } from '@/admin/components/AdminRoleFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa vai trò' };

export default async function EditAdminRolePage({ params }: Props) {
  const { id } = await params;
  let [role, roles, permissions] = await Promise.all([
    adminRoleService.getRoleById(id),
    adminRoleService.getAllRoles(),
    adminRoleService.getAllPermissions(),
  ]);
  if (!role) notFound();

  return (
    <DynamicAdminRoleFormClient
      roles={roles}
      permissions={permissions}
      role={{
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        isSystem: role.isSystem,
        isActive: role.isActive,
        sortOrder: role.sortOrder,
        rolePermissions: role.rolePermissions.map((rp) => rp.permission.id),
      }}
    />
  );
}
