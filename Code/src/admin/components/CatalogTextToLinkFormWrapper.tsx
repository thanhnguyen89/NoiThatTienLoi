'use client';

import dynamic from 'next/dynamic';

const DynamicCatalogTextToLinkForm = dynamic(
  () => import('@/admin/features/catalog-text-to-link/CatalogTextToLinkForm').then(m => m.CatalogTextToLinkForm),
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
  name: string;
}

interface Props {
  categories: CategoryOption[];
  item?: {
    id: string;
    categoryId: string | null;
    keyword: string | null;
    priority: number | null;
    link: string | null;
    matchCount: number | null;
    domain: string | null;
    refAttribute: string | null;
    otherAttribute: string | null;
    frUnique: boolean | null;
    matchLinks: string | null;
    isActive: boolean | null;
  };
}

export function DynamicCatalogTextToLinkFormClient(props: Props) {
  return <DynamicCatalogTextToLinkForm {...props} />;
}
