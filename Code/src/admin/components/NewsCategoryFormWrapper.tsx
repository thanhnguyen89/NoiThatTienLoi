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

interface CategoryOption {
  id: string;
  title: string | null;
}

interface Props {
  newsCategory?: {
    id: string;
    parentId: bigint | null;
    title: string | null;
    summary: string | null;
    content: string | null;
    imageUrl: string | null;
    seName: string | null;
    sortOrder: number | null;
    isShowHome: boolean | null;
    isActive: boolean | null;
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    slugRedirect: string | null;
    seoCanonical: string | null;
    seoNoindex: boolean | null;
    isRedirect: boolean | null;
    viewCount: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  parentCategories?: CategoryOption[];
}

export function DynamicNewsCategoryFormClient(props: Props) {
  return <DynamicNewsCategoryForm {...props} />;
}
