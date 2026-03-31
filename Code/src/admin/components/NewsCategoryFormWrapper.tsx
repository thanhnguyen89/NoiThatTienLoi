'use client';

import dynamic from 'next/dynamic';

const DynamicNewsCategoryForm = dynamic(
  () => import('@/admin/features/news-category/NewsCategoryForm').then(m => m.NewsCategoryForm),
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
  newsCategory?: {
    id: string;
    title: string;
    summary: string | null;
    content: string | null;
    imageUrl: string | null;
    seName: string;
    sortOrder: number;
    isPublished: boolean;
    isShowHome: boolean;
    isActive: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    slugRedirect: string | null;
    seoCanonical: string | null;
    seoNoindex: boolean;
    createdDate: Date;
    updatedDate: Date | null;
  };
}

export function DynamicNewsCategoryFormClient(props: Props) {
  return <DynamicNewsCategoryForm {...props} />;
}
