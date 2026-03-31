'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface Props {
  defaultSearch: string;
  defaultPublished: string;
  defaultShowHome: string;
}

export function NewsFilters({ defaultSearch, defaultPublished, defaultShowHome }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [isPublished, setIsPublished] = useState(defaultPublished);
  const [isShowHome, setIsShowHome] = useState(defaultShowHome);

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
            placeholder="Nhập tiêu đề hoặc slug cần tìm"
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Xuất bản</label>
          <select
            className="form-select form-select-sm"
            value={isPublished}
            onChange={(e) => setIsPublished(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="published">Đã xuất bản</option>
            <option value="unpublished">Chưa xuất bản</option>
          </select>
        </div>
        <div className="col-md-3">
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
        <div className="col-md-2 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={() => push({
              search: search.trim() || undefined,
              isPublished: isPublished || undefined,
              isShowHome: isShowHome || undefined,
            })}
          >
            <i className="bi bi-search me-1"></i>Tìm kiếm
          </button>
          <button
            type="button"
            className="btn btn-sm btn-reset"
            onClick={() => {
              setSearch('');
              setIsPublished('');
              setIsShowHome('');
              push({ search: undefined, isPublished: undefined, isShowHome: undefined });
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </>
  );
}
