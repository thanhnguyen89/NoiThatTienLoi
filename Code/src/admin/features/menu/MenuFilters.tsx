'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface Props {
  defaultSearch: string;
  defaultStatus: string;
  defaultMenuTypeId: string;
}

export function MenuFilters({ defaultSearch, defaultStatus, defaultMenuTypeId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus);
  const [menuTypeId, setMenuTypeId] = useState(defaultMenuTypeId);

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
        <div className="col-md-4">
          <label className="form-label">Từ khóa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập tên menu cần tìm..."
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Loại menu</label>
          <select
            className="form-select form-select-sm"
            value={menuTypeId}
            onChange={(e) => setMenuTypeId(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="1">Menu Top</option>
            <option value="2">Menu Footer</option>
            <option value="3">Menu Left</option>
            <option value="4">Menu Right</option>
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Trạng thái</label>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>
        <div className="col-md-3 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={() => push({
              search: search.trim() || undefined,
              status: status || undefined,
              menuTypeId: menuTypeId || undefined,
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
              setMenuTypeId('');
              push({ search: undefined, status: undefined, menuTypeId: undefined });
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </>
  );
}
