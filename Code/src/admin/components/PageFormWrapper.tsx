'use client';

import dynamic from 'next/dynamic';

const DynamicPageForm = dynamic(
  () => import('@/admin/features/page/PageForm').then(m => m.PageForm),
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

interface PageItem {
  id: string;
  pageName: string | null;
  title: string | null;
  body: string | null;
  sortOrder: number | null;
  shortDescription: string | null;
  image: string | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  slugRedirect: string | null;
  seoCanonical: string | null;
  seoNoindex: boolean | null;
  isRedirect: boolean | null;
  errorCode: string | null;
}

interface Props {
  page?: PageItem;
}

export function DynamicPageFormClient(props: Props) {
  return <DynamicPageForm {...props} />;
}
