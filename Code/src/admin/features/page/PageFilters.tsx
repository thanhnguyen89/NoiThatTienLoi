'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface Props {
  defaultSearch: string;
  defaultStatus: string;
}

export function PageFilters({ defaultSearch, defaultStatus }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus);

  const push = useCallback((o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return (
    <>
      {/* Hàng 1: Từ khóa | Công khai */}
      <div className="row g-2 mb-2">
        <div className="col-md-6">
          <label className="form-label">Từ khóa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập tên trang hoặc tiêu đề cần tìm"
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Công khai</label>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="active">Có</option>
            <option value="inactive">Không</option>
          </select>
        </div>
      </div>
      {/* Hàng 2: Nút tìm kiếm */}
      <div className="row g-2 align-items-end">
        <div className="col-md-12 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={() => push({
              search: search.trim() || undefined,
              status: status || undefined,
            })}
          >
            <i className="bi bi-search me-1"></i>Tìm kiếm
          </button>
          <button
            type="button"
            className="btn btn-sm btn-reset"
            onClick={() => {
              setSearch('');
              setStatus('');
              push({ search: undefined, status: undefined });
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </>
  );
}
