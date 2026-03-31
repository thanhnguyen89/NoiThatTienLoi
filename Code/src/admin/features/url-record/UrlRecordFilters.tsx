'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface Props {
  defaultSearch: string;
  defaultStatus: string;
}

export function UrlRecordFilters({ defaultSearch, defaultStatus }: Props) {
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
      <div className="row g-2 align-items-end">
        <div className="col-md-6">
          <label className="form-label">Tu khoa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhap slug, entityName, entityId..."
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Trang thai</label>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tat ca</option>
            <option value="active">Hoat dong</option>
            <option value="inactive">Khong hoat dong</option>
          </select>
        </div>
        <div className="col-md-3 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={() => push({
              search: search.trim() || undefined,
              status: status || undefined,
            })}
          >
            <i className="bi bi-search me-1"></i>Tim kiem
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
            <i className="bi bi-arrow-counterclockwise me-1"></i>Lam moi
          </button>
        </div>
      </div>
    </>
  );
}
