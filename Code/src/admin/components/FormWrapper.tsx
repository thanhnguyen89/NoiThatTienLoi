'use client';

import dynamic from 'next/dynamic';
import type { CategoryDetail } from '@/lib/types';

const DynamicCategoryForm = dynamic(
  () => import('@/admin/features/category/CategoryForm').then(m => m.CategoryForm),
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
  parentCategories: Array<{ id: string; name: string }>;
  category?: CategoryDetail;
}

export function DynamicCategoryFormClient(props: Props) {
  return <DynamicCategoryForm {...props} />;
}
