'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface Props {
  defaultSearch: string;
}

export function AdminRoleFilters({ defaultSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);

  const push = useCallback((o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return (
    <>
      <div className="row g-2 align-items-end">
        <div className="col-md-6">
          <label className="form-label">Từ khóa</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên hoặc mã vai trò..." className="form-control form-control-sm" />
        </div>
        <div className="col-md-6 d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-sm btn-search" onClick={() => push({ search: search.trim() || undefined })}>
            <i className="bi bi-search me-1"></i>Tìm kiếm
          </button>
          <button type="button" className="btn btn-sm btn-reset" onClick={() => { setSearch(''); push({ search: undefined }); }}>
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </>
  );
}
