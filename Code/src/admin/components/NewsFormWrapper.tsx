'use client';

import dynamic from 'next/dynamic';

const DynamicNewsForm = dynamic(
  () => import('@/admin/features/news/NewsForm').then(m => m.NewsForm),
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
        Dang tai...
      </div>
    ),
  }
);

interface CategoryOption {
  id: string;
  title: string | null;
}

interface Props {
  news?: {
    id: string;
    title: string | null;
    summary: string | null;
    content: string | null;
    image: string | null;
    seName: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    isPublished: boolean | null;
    isShowHome: boolean | null;
    isActive: boolean | null;
    isNew: boolean | null;
    allowComments: boolean | null;
    newTag: string | null;
    sortOrder: number | null;
    slugRedirect: string | null;
    seoCanonical: string | null;
    seoNoindex: boolean | null;
    isRedirect: boolean | null;
    authorName: string | null;
    publishedAt: Date | string | null;
    viewCount: number | null;
    commentCount: number | null;
    likeCount: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  categories?: CategoryOption[];
}

export function DynamicNewsFormClient(props: Props) {
  return <DynamicNewsForm {...props} />;
}
