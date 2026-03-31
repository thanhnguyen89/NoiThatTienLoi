'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

interface Props {
  defaultAction: string;
  defaultFromDate: string;
  defaultToDate: string;
}

const ACTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'LOGIN', label: 'Đăng nhập' },
  { value: 'LOGOUT', label: 'Đăng xuất' },
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'UPDATE', label: 'Cập nhật' },
  { value: 'DELETE', label: 'Xóa' },
];

export function ActivityLogFilters({ defaultAction, defaultFromDate, defaultToDate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [action, setAction] = useState(defaultAction);
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);

  const push = useCallback((o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return (
    <>
      <div className="row g-2 align-items-end">
        <div className="col-md-3">
          <label className="form-label">Hành động</label>
          <select className="form-select form-select-sm" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Từ ngày</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="form-control form-control-sm" />
        </div>
        <div className="col-md-3">
          <label className="form-label">Đến ngày</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="form-control form-control-sm" />
        </div>
        <div className="col-md-3 d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-sm btn-search" onClick={() => push({ action: action || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined })}>
            <i className="bi bi-search me-1"></i>Tìm kiếm
          </button>
          <button type="button" className="btn btn-sm btn-reset" onClick={() => { setAction(''); setFromDate(''); setToDate(''); push({ action: undefined, fromDate: undefined, toDate: undefined }); }}>
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </>
  );
}
