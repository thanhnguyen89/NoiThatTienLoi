'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PRODUCT_SORT_OPTIONS } from '@/lib/constants';
import type { ProductSortField } from '@/lib/types';

interface SortBarProps {
  currentSort: ProductSortField;
}

export function SortBar({ currentSort }: SortBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSort(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    params.delete('page'); // Reset page khi đổi sort
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <nav className="cate-sort" aria-label="Sắp xếp sản phẩm">
      <div className="cate-sort__tabs">
        {PRODUCT_SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`cate-sort__tab ${currentSort === option.value ? 'is-active' : ''}`}
            onClick={() => handleSort(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
