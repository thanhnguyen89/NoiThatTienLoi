'use client';

import dynamic from 'next/dynamic';

const DynamicCatalogNewsLevelForm = dynamic(
  () => import('@/admin/features/catalog-news-level/CatalogNewsLevelForm').then(m => m.CatalogNewsLevelForm),
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
  level?: {
    id: string;
    name: string | null;
    sortOrder: number | null;
    isActive: boolean;
  };
}

export function DynamicCatalogNewsLevelFormClient(props: Props) {
  return <DynamicCatalogNewsLevelForm {...props} />;
}
