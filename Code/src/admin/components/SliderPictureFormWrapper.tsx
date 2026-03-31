'use client';

import dynamic from 'next/dynamic';

const DynamicSliderPictureForm = dynamic(
  () => import('@/admin/features/slider-picture/SliderPictureForm').then(m => m.SliderPictureForm),
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
  picture?: {
    id: string;
    comment: string | null;
    name: string | null;
    image: string | null;
    sortOrder: number | null;
    isActive: boolean;
  };
}

export function DynamicSliderPictureFormClient(props: Props) {
  return <DynamicSliderPictureForm {...props} />;
}
