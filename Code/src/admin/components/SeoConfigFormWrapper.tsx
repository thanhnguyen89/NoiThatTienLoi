'use client';

import dynamic from 'next/dynamic';

const DynamicSeoConfigForm = dynamic(
  () => import('@/admin/features/seo-config/SeoConfigForm').then(m => m.SeoConfigForm),
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
  config?: {
    id: string;
    pageName: string | null;
    title: string | null;
    contentBefore: string | null;
    contentAfter: string | null;
    image: string | null;
    seName: string | null;
    metaKeywords: string | null;
    metaDescription: string | null;
    metaTitle: string | null;
    isActive: boolean | null;
    seoNoindex: boolean | null;
    seoCanonical: string | null;
    sortOrder: number | null;
  };
}

export function DynamicSeoConfigFormClient(props: Props) {
  return <DynamicSeoConfigForm {...props} />;
}
