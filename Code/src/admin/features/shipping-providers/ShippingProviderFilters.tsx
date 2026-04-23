'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface Props {
  defaultSearch: string;
  defaultStatus: string;
  defaultServiceType?: string;
}

const SERVICE_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'standard', label: 'Tiêu chuẩn' },
  { value: 'express', label: 'Nhanh' },
  { value: 'same_day', label: 'Hỏa tốc' },
  { value: 'scheduled', label: 'Hẹn giờ' },
  { value: 'other', label: 'Khác' },
];

export function ShippingProviderFilters({ defaultSearch, defaultStatus, defaultServiceType = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus);
  const [serviceType, setServiceType] = useState(defaultServiceType);
  const [exporting, setExporting] = useState(false);

  const push = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  function handleSearch() {
    push({
      search: search.trim() || undefined,
      status: status || undefined,
      serviceType: serviceType || undefined,
    });
  }

  function handleReset() {
    setSearch('');
    setStatus('');
    setServiceType('');
    push({ search: undefined, status: undefined, serviceType: undefined });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (serviceType) params.set('serviceType', serviceType);
      const url = `/admin/api/shipping-providers/export?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = res.headers.get('Content-Disposition')
        ? decodeURIComponent(res.headers.get('Content-Disposition')!.split("filename*=UTF-8''")[1] ?? 'don-vi-van-chuyen.xlsx')
        : 'don-vi-van-chuyen.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert('Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {/* Row 1: Search */}
      <div className="row g-2 align-items-end mb-2">
        <div className="col-md-6">
          <label className="form-label">Tìm kiếm</label>
          <div className="position-relative">
            <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: 12 }}></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập mã, tên đơn vị, SĐT..."
              className="form-control form-control-sm ps-4"
            />
          </div>
        </div>
        <div className="col-md-3">
          <label className="form-label">Trạng thái</label>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Loại dịch vụ</label>
          <select
            className="form-select form-select-sm"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          >
            {SERVICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Action buttons */}
      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleReset}>
          <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
        </button>
        <button type="button" className="btn btn-sm btn-search" onClick={handleSearch}>
          <i className="bi bi-search me-1"></i>Áp dụng bộ lọc
        </button>
        <button
          type="button"
          className="btn btn-sm"
          style={{ background: '#6f42c1', color: '#fff', border: 'none' }}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-1"></span>
              Đang xuất...
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-excel me-1"></i>Xuất Excel
            </>
          )}
        </button>
      </div>
    </>
  );
}