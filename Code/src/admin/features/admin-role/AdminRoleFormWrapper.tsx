'use client';

import dynamic from 'next/dynamic';

const DynamicAdminRoleForm = dynamic(
  () => import('@/admin/features/admin-role/AdminRoleForm').then(m => m.AdminRoleForm),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: 400,
        background: '#f9f9f9',
        border: '1px solid #dee2e6',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6c757d',
      }}>
        Đang tải...
      </div>
    ),
  }
);

interface PermissionItem {
  id: string;
  action: string;
  resource: string;
  description: string | null;
}

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number | null;
  rolePermissions?: string[];
}

interface Props {
  roles: RoleItem[];
  permissions: PermissionItem[];
  role?: RoleItem;
}

export function DynamicAdminRoleFormClient(props: Props) {
  return <DynamicAdminRoleForm {...props} />;
}
