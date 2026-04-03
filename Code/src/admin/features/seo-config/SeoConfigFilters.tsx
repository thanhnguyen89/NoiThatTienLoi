'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface Props {
  defaultKeyword: string;
}

export function SeoConfigFilters({ defaultKeyword }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(defaultKeyword);

  const push = useCallback((kw: string | undefined) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    if (kw) p.set('keyword', kw); else p.delete('keyword');
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return (
    <div className="row g-2 align-items-end">
      <div className="col-md-8">
        <label className="form-label">Từ khóa</label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo Url, Tiêu đề, Tiêu đề SEO, Tên hệ thống"
          className="form-control form-control-sm"
        />
      </div>
      <div className="col-md-4 d-flex gap-2 justify-content-end">
        <button
          type="button"
          className="btn btn-sm btn-search"
          onClick={() => push(keyword.trim() || undefined)}
        >
          <i className="bi bi-search me-1"></i>Tìm kiếm
        </button>
        <button
          type="button"
          className="btn btn-sm btn-reset"
          onClick={() => {
            setKeyword('');
            push(undefined);
          }}
        >
          <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
        </button>
      </div>
    </div>
  );
}
