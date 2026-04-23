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
    pageType: string | null;
    title: string | null;
    contentBefore: string | null;
    contentAfter: string | null;
    image: string | null;
    icon: string | null;
    thumbnail: string | null;
    banner: string | null;
    seName: string | null;
    metaKeywords: string | null;
    metaDescription: string | null;
    metaTitle: string | null;
    isActive: boolean | null;
    seoNoindex: boolean | null;
    seoCanonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    sortOrder: number | null;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DynamicSeoConfigFormClient(props: Props) {
  return <DynamicSeoConfigForm config={props.config as any} />;
}
