'use client';

import { useState } from 'react';
import { ProductListTabs } from './ProductListTabs';
import type { ProductListItem } from '@/lib/types';

interface ProductTabsWrapperProps {
  products: ProductListItem[];
  paginationElement: React.ReactNode;
}

export function ProductTabsWrapper({ products, paginationElement }: ProductTabsWrapperProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'top-selling'>('list');

  return (
    <>
      <ProductListTabs products={products} onTabChange={setActiveTab} />

      {/* Pagination chỉ hiển thị khi đang ở tab danh sách */}
      {activeTab === 'list' && (
        <div className="mt-3">
          {paginationElement}
        </div>
      )}
    </>
  );
}
