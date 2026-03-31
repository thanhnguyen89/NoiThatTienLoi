'use client';

import dynamic from 'next/dynamic';

const DynamicAdminUserForm = dynamic(
  () => import('@/admin/features/admin-user/AdminUserForm').then(m => m.AdminUserForm),
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

interface RoleItem {
  id: string;
  name: string;
  code: string;
}

interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  roleId: string;
  isActive: boolean | null;
  isSuperAdmin: boolean | null;
}

interface Props {
  roles: RoleItem[];
  user?: AdminUserItem;
}

export function DynamicAdminUserFormClient(props: Props) {
  return <DynamicAdminUserForm {...props} />;
}
