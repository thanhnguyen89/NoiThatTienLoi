'use client';

import { useRouter } from 'next/navigation';
import './pagination.css';

interface PaginationProps {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  baseUrl?: string; // e.g., '/admin/warehouses'
  onPageChange?: (page: number) => void; // Custom handler instead of router.push
}

export function AdminPagination({ pagination, baseUrl, onPageChange }: PaginationProps) {
  const router = useRouter();

  function renderPageNumbers() {
    const { page, totalPages } = pagination;
    if (totalPages <= 1) return null;
    const pages: (number | '...')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  function handlePageChange(newPage: number) {
    if (onPageChange) {
      onPageChange(newPage);
    } else if (baseUrl) {
      const sp = new URLSearchParams(window.location.search);
      sp.set('page', String(newPage));
      router.push(`${baseUrl}?${sp.toString()}`);
    }
  }

  if (pagination.totalPages <= 1) return null;

  return (
    <div className="admin-pagination">
      <div className="admin-pagination__info">
        Hiển thị {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
      </div>
      <div className="admin-pagination__controls">
        {/* Previous button */}
        <button
          className="admin-pagination__btn"
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          title="Trang trước"
        >
          <i className="bi bi-chevron-left"></i>
        </button>

        {/* Page numbers */}
        {renderPageNumbers()?.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="admin-pagination__ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`admin-pagination__btn ${p === pagination.page ? 'admin-pagination__btn--active' : ''}`}
              onClick={() => handlePageChange(p as number)}
            >
              {p}
            </button>
          )
        )}

        {/* Next button */}
        <button
          className="admin-pagination__btn"
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
          title="Trang sau"
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}
