'use client';

import dynamic from 'next/dynamic';

const DynamicMenuForm = dynamic(
  () => import('@/admin/features/menu/MenuForm').then(m => m.MenuForm),
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

interface MenuDetail {
  id: string;
  name: string | null;
  menuTypeId: bigint | null;
  isActive: boolean | null;
}

interface Props {
  menu?: MenuDetail;
}

export function DynamicMenuFormClient(props: Props) {
  return <DynamicMenuForm {...props} />;
}
