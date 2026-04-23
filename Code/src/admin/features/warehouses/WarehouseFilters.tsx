'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Props {
  defaultSearch: string;
  defaultStatus: string;
  defaultRegion?: string;
  defaultProvince?: string;
}

export function WarehouseFilters({ defaultSearch, defaultStatus, defaultRegion, defaultProvince }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus);
  const [region, setRegion] = useState(defaultRegion || '');
  const [province, setProvince] = useState(defaultProvince || '');
  const [provinces, setProvinces] = useState<{ code: string; name: string }[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/locations/provinces')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setProvinces(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const push = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (region) params.set('region', region);
      if (province) params.set('province', province);
      const url = `/admin/api/warehouses/export?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'danh-sach-kho.xlsx';
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
      <div className="row g-2 align-items-end">
        <div className="col-md-6">
          <label className="form-label">Từ khóa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập mã kho, tên, địa chỉ, SĐT..."
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Trạng thái</label>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm đóng</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Khu vực</label>
          <select
            className="form-select form-select-sm"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="north">Miền Bắc</option>
            <option value="central">Miền Trung</option>
            <option value="south">Miền Nam</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Tỉnh/TP</label>
          <select
            className="form-select form-select-sm"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            <option value="">Tất cả</option>
            {provinces.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-12 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={() => push({
              search: search.trim() || undefined,
              status: status || undefined,
              region: region || undefined,
              province: province || undefined,
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
              setRegion('');
              setProvince('');
              push({ search: undefined, status: undefined, region: undefined, province: undefined });
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#6f42c1', color: '#fff', border: 'none' }}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <><span className="spinner-border spinner-border-sm me-1"></span>Đang xuất...</>
            ) : (
              <><i className="bi bi-file-earmark-excel me-1"></i>Xuất Excel</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
