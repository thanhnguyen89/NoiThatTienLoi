'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface CategoryOption {
  id: string;
  title: string | null;
}

interface Props {
  defaultSearch: string;
  defaultPublished: string;
  defaultShowHome: string;
  defaultCategoryId: string;
  defaultDateFrom: string;
  defaultDateTo: string;
  categories?: CategoryOption[];
}

export function NewsFilters({ defaultSearch, defaultPublished, defaultShowHome, defaultCategoryId, defaultDateFrom, defaultDateTo, categories = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [isPublished, setIsPublished] = useState(defaultPublished);
  const [isShowHome, setIsShowHome] = useState(defaultShowHome);
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);

  const push = useCallback((o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return (
    <>
      <div className="row g-2 align-items-end">
        <div className="col-md-6">
          <label className="form-label">Từ khóa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhap tieu de hoac slug can tim"
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Danh mục</label>
          <select
            className="form-select form-select-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Tat ca</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.title || c.id}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Xuất bản</label>
          <select
            className="form-select form-select-sm"
            value={isPublished}
            onChange={(e) => setIsPublished(e.target.value)}
          >
            <option value="">Tat ca</option>
            <option value="published">Đã xuất bản</option>
            <option value="unpublished">Chưa xuất bản</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Trang chủ</label>
          <select
            className="form-select form-select-sm"
            value={isShowHome}
            onChange={(e) => setIsShowHome(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="home">Có</option>
            <option value="nothome">Không</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Từ ngày</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Đến ngày</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-12 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={() => push({
              search: search.trim() || undefined,
              categoryId: categoryId || undefined,
              isPublished: isPublished || undefined,
              isShowHome: isShowHome || undefined,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
            })}
          >
            <i className="bi bi-search me-1"></i>Tìm kiếm
          </button>
          <button
            type="button"
            className="btn btn-sm btn-reset"
            onClick={() => {
              setSearch('');
              setCategoryId('');
              setIsPublished('');
              setIsShowHome('');
              setDateFrom('');
              setDateTo('');
              push({ search: undefined, categoryId: undefined, isPublished: undefined, isShowHome: undefined, dateFrom: undefined, dateTo: undefined });
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </>
  );
}