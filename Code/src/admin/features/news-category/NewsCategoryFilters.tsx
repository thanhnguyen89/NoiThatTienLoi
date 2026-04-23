'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface Props {
  defaultSearch: string;
  defaultCategory: string;
  defaultDateFrom: string;
  defaultDateTo: string;
  defaultLevel: string;
  categories: Array<{ id: string; name: string }>;
  maxLevel: number;
}

export function NewsCategoryFilters({
  defaultSearch,
  defaultCategory,
  defaultDateFrom,
  defaultDateTo,
  defaultLevel,
  categories,
  maxLevel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [category, setCategory] = useState(defaultCategory);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [level, setLevel] = useState(defaultLevel);

  const push = useCallback((o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return (
    <>
      {/* Hàng 1: Từ khóa | Danh mục | Level */}
      <div className="row g-2 mb-2">
        <div className="col-md-5">
          <label className="form-label">Từ khóa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập tiêu đề hoặc slug cần tìm"
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-5">
          <label className="form-label">Danh mục</label>
          <select
            className="form-select form-select-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Tất cả</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Cấp độ</label>
          <select
            className="form-select form-select-sm"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Tất cả</option>
            {Array.from({ length: maxLevel + 1 }, (_, i) => (
              <option key={i} value={i}>Level {i}</option>
            ))}
          </select>
        </div>
      </div>
      {/* Hàng 2: Từ ngày | Đến ngày | Nút */}
      <div className="row g-2 align-items-end">
        <div className="col-md-3">
          <label className="form-label">Từ ngày</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Đến ngày</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-6 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={() => push({
              search: search.trim() || undefined,
              category: category || undefined,
              level: level || undefined,
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
              setCategory('');
              setLevel('');
              setDateFrom('');
              setDateTo('');
              push({ search: undefined, category: undefined, level: undefined, dateFrom: undefined, dateTo: undefined });
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </>
  );
}
