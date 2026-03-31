'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ColorPicker } from '@/admin/components/ColorPicker';

interface ProductColorDetail {
  id: string;
  colorName: string;
  colorCode: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Props {
  color?: ProductColorDetail;
}

export function ProductColorForm({ color }: Props) {
  const router = useRouter();
  const isEdit = !!color;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    colorName: color?.colorName || '',
    colorCode: color?.colorCode || '',
    sortOrder: String(color?.sortOrder ?? 0),
    isActive: color?.isActive ?? true,
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
    if (!form.colorName.trim()) e.colorName = 'Bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        colorName: form.colorName.trim(),
        colorCode: form.colorCode.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/product-colors/${color.id}` : '/admin/api/product-colors';
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
      router.push('/admin/product-colors');
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
            <li className="breadcrumb-item"><Link href="/admin/product-colors">Màu sắc</Link></li>
            <li className="breadcrumb-item active">{isEdit ? color.colorName : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/product-colors')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo màu sắc'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin màu sắc</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tên màu sắc <span className="text-danger">*</span></label>
                <input
                  name="colorName"
                  value={form.colorName}
                  onChange={handle}
                  placeholder="VD: Đỏ đô, Xanh navy, Vàng gold"
                  className={`form-control form-control-sm ${errors.colorName ? 'is-invalid' : ''}`}
                />
                {errors.colorName && <div className="invalid-feedback d-block">{errors.colorName}</div>}
              </div>
              <div className="row g-3 mb-3">
                <div className="col-8">
                  <label className="form-label small fw-semibold">Mã màu (HEX)</label>
                  <ColorPicker
                    value={form.colorCode}
                    onChange={(hex) => setForm((p) => ({ ...p, colorCode: hex }))}
                  />
                </div>
                <div className="col-6">
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
