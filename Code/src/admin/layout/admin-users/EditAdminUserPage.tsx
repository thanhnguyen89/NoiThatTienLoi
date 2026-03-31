import { notFound } from 'next/navigation';
import { adminUserService } from '@/server/services/admin-user.service';
import { adminRoleService } from '@/server/services/admin-role.service';
import { DynamicAdminUserFormClient } from '@/admin/components/AdminUserFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa người dùng' };

export default async function EditAdminUserPage({ params }: Props) {
  const { id } = await params;
  let [user, roles] = await Promise.all([
    adminUserService.getUserById(id),
    adminRoleService.getAllRoles(),
  ]);
  if (!user) notFound();

  return (
    <DynamicAdminUserFormClient
      roles={roles}
      user={{
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar,
        roleId: user.roleId,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
      }}
    />
  );
}
