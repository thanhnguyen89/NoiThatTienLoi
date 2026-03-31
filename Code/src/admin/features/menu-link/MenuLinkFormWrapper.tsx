'use client';

import dynamic from 'next/dynamic';

const DynamicMenuLinkForm = dynamic(
  () => import('@/admin/features/menu-link/MenuLinkForm').then(m => m.MenuLinkForm),
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
        Dang tai...
      </div>
    ),
  }
);

interface MenuLinkDetail {
  id: string;
  title: string | null;
  slug: string | null;
  target: string | null;
  menuId: bigint | number | null;
  icon: string | null;
  parentId: string | null;
  entityId: bigint | number | null;
  entityName: string | null;
  nofollow: boolean | null;
  level: number | null;
  sortOrder: number | null;
}

interface Props {
  menuLink?: MenuLinkDetail;
  defaultMenuId?: string;
}

export function DynamicMenuLinkFormClient(props: Props) {
  return <DynamicMenuLinkForm {...props} />;
}
