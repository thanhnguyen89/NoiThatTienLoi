'use client';

import dynamic from 'next/dynamic';

const DynamicCatalogRedirectForm = dynamic(
  () => import('@/admin/features/catalog-redirect/CatalogRedirectForm').then(m => m.CatalogRedirectForm),
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

interface Props {
  redirect?: {
    id: string;
    urlFrom: string | null;
    urlTo: string | null;
    errorCode: string | null;
    isActive: boolean | null;
  };
}

export function DynamicCatalogRedirectFormClient(props: Props) {
  return <DynamicCatalogRedirectForm {...props} />;
}
