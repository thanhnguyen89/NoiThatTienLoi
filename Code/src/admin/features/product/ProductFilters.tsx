'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

interface CategoryOption { id: string; name: string; }
interface SizeOption { id: string; sizeLabel: string; }
interface ColorOption { id: string; colorName: string; colorCode: string | null; }

interface Props {
  defaultSearch: string;
  defaultStatus: string;
  defaultCategoryId: string;
  defaultFromDate?: string;
  defaultToDate?: string;
  defaultPriceMin?: string;
  defaultPriceMax?: string;
  defaultSizeId?: string;
  defaultColorId?: string;
  categories: CategoryOption[];
}

export function ProductFilters({
  defaultSearch, defaultStatus, defaultCategoryId,
  defaultFromDate = '', defaultToDate = '',
  defaultPriceMin = '', defaultPriceMax = '',
  defaultSizeId = '', defaultColorId = '',
  categories,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus);
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [priceMin, setPriceMin] = useState(defaultPriceMin);
  const [priceMax, setPriceMax] = useState(defaultPriceMax);
  const [sizeId, setSizeId] = useState(defaultSizeId);
  const [colorId, setColorId] = useState(defaultColorId);
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [colors, setColors] = useState<ColorOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch sizes and colors
  useEffect(() => {
    async function fetchOptions() {
      setLoadingOptions(true);
      try {
        const [sizesRes, colorsRes] = await Promise.all([
          fetch('/admin/api/products/sizes'),
          fetch('/admin/api/products/colors'),
        ]);
        if (sizesRes.ok) {
          const data = await sizesRes.json();
          setSizes(data.data || []);
        }
        if (colorsRes.ok) {
          const data = await colorsRes.json();
          setColors(data.data || []);
        }
      } catch { /* ignore */ }
      setLoadingOptions(false);
    }
    fetchOptions();
  }, []);

  const push = useCallback((o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  function handleSearch() {
    push({
      search: search.trim() || undefined,
      categoryId: categoryId || undefined,
      status: status || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
      sizeId: sizeId || undefined,
      colorId: colorId || undefined,
    });
  }

  function handleReset() {
    setSearch(''); setStatus(''); setCategoryId('');
    setFromDate(''); setToDate('');
    setPriceMin(''); setPriceMax('');
    setSizeId(''); setColorId('');
    push({
      search: undefined, status: undefined, categoryId: undefined,
      fromDate: undefined, toDate: undefined,
      priceMin: undefined, priceMax: undefined,
      sizeId: undefined, colorId: undefined,
    });
  }

  return (
    <>
      {/* Hàng 1: Từ khóa | Công khai | Danh mục */}
      <div className="row g-2 mb-2">
        <div className="col-md-4">
          <label className="form-label">Từ khóa</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập tên hoặc SKU..." className="form-control form-control-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        </div>
        <div className="col-md-2">
          <label className="form-label">Công khai</label>
          <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="active">Có</option>
            <option value="inactive">Không</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Danh mục</label>
          <select className="form-select form-select-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Tất cả</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Ngày tạo</label>
          <div className="d-flex gap-1">
            <input type="date" className="form-control form-control-sm" value={fromDate}
              onChange={(e) => setFromDate(e.target.value)} placeholder="Từ ngày" style={{ maxWidth: '50%' }} />
            <input type="date" className="form-control form-control-sm" value={toDate}
              onChange={(e) => setToDate(e.target.value)} placeholder="Đến ngày" style={{ maxWidth: '50%' }} />
          </div>
        </div>
      </div>

      {/* Hàng 2: Giá | Size | Color */}
      <div className="row g-2 mb-2 align-items-end">
        <div className="col-md-2">
          <label className="form-label">Giá từ</label>
          <input type="number" min="0" className="form-control form-control-sm"
            value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
            placeholder="VD: 100000" />
        </div>
        <div className="col-md-2">
          <label className="form-label">Giá đến</label>
          <input type="number" min="0" className="form-control form-control-sm"
            value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
            placeholder="VD: 500000" />
        </div>
        <div className="col-md-3">
          <label className="form-label">Kích thước</label>
          <select className="form-select form-select-sm" value={sizeId}
            onChange={(e) => setSizeId(e.target.value)} disabled={loadingOptions}>
            <option value="">Tất cả</option>
            {sizes.map((s) => <option key={s.id} value={s.id}>{s.sizeLabel}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Màu sắc</label>
          <select className="form-select form-select-sm" value={colorId}
            onChange={(e) => setColorId(e.target.value)} disabled={loadingOptions}>
            <option value="">Tất cả</option>
            {colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.colorCode && (
                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, backgroundColor: c.colorCode, marginRight: 4, border: '1px solid #dee2e6' }} />
                )}
                {c.colorName}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2 d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-sm btn-search" onClick={handleSearch}>
            <i className="bi bi-search me-1"></i>Tìm kiếm
          </button>
          <button type="button" className="btn btn-sm btn-reset" onClick={handleReset}>
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </>
  );
}
