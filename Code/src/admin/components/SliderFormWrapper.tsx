'use client';

import dynamic from 'next/dynamic';

const DynamicSliderForm = dynamic(
  () => import('@/admin/features/slider/SliderForm').then(m => m.SliderForm),
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
  slider?: {
    id: string;
    title: string | null;
    image: string;
    link: string | null;
    content: string | null;
    sortOrder: number;
    isActive: boolean;
  };
}

export function DynamicSliderFormClient(props: Props) {
  return <DynamicSliderForm {...props} />;
}
