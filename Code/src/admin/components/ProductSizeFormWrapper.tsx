'use client';

import dynamic from 'next/dynamic';

const DynamicProductSizeForm = dynamic(
  () => import('@/admin/features/product-size/ProductSizeForm').then(m => m.ProductSizeForm),
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
  size?: {
    id: string;
    sizeLabel: string;
    widthCm: number | null;
    lengthCm: number | null;
    heightCm: number | null;
    sortOrder: number;
    isActive: boolean;
  };
}

export function DynamicProductSizeFormClient(props: Props) {
  return <DynamicProductSizeForm {...props} />;
}
