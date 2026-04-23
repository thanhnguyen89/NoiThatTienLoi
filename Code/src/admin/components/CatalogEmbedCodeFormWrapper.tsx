'use client';

import dynamic from 'next/dynamic';

const DynamicCatalogEmbedCodeForm = dynamic(
  () => import('@/admin/features/catalog-embed-code/CatalogEmbedCodeForm').then(m => m.CatalogEmbedCodeForm),
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
  embedCode?: {
    id: string;
    title: string | null;
    positionId: number | null;
    embedCode: string | null;
    note: string | null;
    isActive: boolean | null;
    createdBy: string | null;
    createdAt: Date | null;
    updatedBy: string | null;
    updatedAt: Date | null;
  };
}

export function DynamicCatalogEmbedCodeFormClient(props: Props) {
  return <DynamicCatalogEmbedCodeForm {...props} />;
}
