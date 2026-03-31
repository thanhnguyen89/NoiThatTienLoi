'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProductSizeDetail {
  id: string;
  sizeLabel: string;
  widthCm: number | null;
  lengthCm: number | null;
  heightCm: number | null;
  sortOrder: number;
  isActive: boolean;
}

interface Props {
  size?: ProductSizeDetail;
}

export function ProductSizeForm({ size }: Props) {
  const router = useRouter();
  const isEdit = !!size;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    sizeLabel: size?.sizeLabel || '',
    widthCm: size?.widthCm !== null && size?.widthCm !== undefined ? String(size.widthCm) : '',
    lengthCm: size?.lengthCm !== null && size?.lengthCm !== undefined ? String(size.lengthCm) : '',
    heightCm: size?.heightCm !== null && size?.heightCm !== undefined ? String(size.heightCm) : '',
    sortOrder: String(size?.sortOrder ?? 0),
    isActive: size?.isActive ?? true,
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.sizeLabel.trim()) e.sizeLabel = 'Bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        sizeLabel: form.sizeLabel.trim(),
        widthCm: form.widthCm.trim() ? Number(form.widthCm) : null,
        lengthCm: form.lengthCm.trim() ? Number(form.lengthCm) : null,
        heightCm: form.heightCm.trim() ? Number(form.heightCm) : null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/product-sizes/${size.id}` : '/admin/api/product-sizes';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.errors) {
          const fe: Record<string, string> = {};
          Object.entries(json.errors).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? (v as string[])[0] : String(v); });
          setErrors(fe);
        } else setGlobalError(json.error || 'Lỗi');
        return;
      }
      router.push('/admin/product-sizes');
      router.refresh();
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/product-sizes">Kích thước</Link></li>
            <li className="breadcrumb-item active">{isEdit ? size.sizeLabel : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/product-sizes')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo kích thước'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin kích thước</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tên kích thước <span className="text-danger">*</span></label>
                <input
                  name="sizeLabel"
                  value={form.sizeLabel}
                  onChange={handle}
                  placeholder="VD: 1m2 x 2m, 80cm x 1m6"
                  className={`form-control form-control-sm ${errors.sizeLabel ? 'is-invalid' : ''}`}
                />
                {errors.sizeLabel && <div className="invalid-feedback d-block">{errors.sizeLabel}</div>}
              </div>
              <div className="row g-3 mb-3">
                <div className="col-4">
                  <label className="form-label small fw-semibold">Chiều rộng (cm)</label>
                  <input
                    name="widthCm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.widthCm}
                    onChange={handle}
                    placeholder="VD: 120"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Chiều dài (cm)</label>
                  <input
                    name="lengthCm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.lengthCm}
                    onChange={handle}
                    placeholder="VD: 200"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Chiều cao (cm)</label>
                  <input
                    name="heightCm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.heightCm}
                    onChange={handle}
                    placeholder="VD: 180"
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
              <div className="col-4">
                <label className="form-label small fw-semibold">Thứ tự</label>
                <input
                  name="sortOrder"
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={handle}
                  className="form-control form-control-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={form.isActive}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isActive">Hoạt động</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Hidden'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
