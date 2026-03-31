'use client';

import dynamic from 'next/dynamic';

const DynamicProductColorForm = dynamic(
  () => import('@/admin/features/product-color/ProductColorForm').then(m => m.ProductColorForm),
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
  color?: {
    id: string;
    colorName: string;
    colorCode: string | null;
    sortOrder: number;
    isActive: boolean;
  };
}

export function DynamicProductColorFormClient(props: Props) {
  return <DynamicProductColorForm {...props} />;
}
