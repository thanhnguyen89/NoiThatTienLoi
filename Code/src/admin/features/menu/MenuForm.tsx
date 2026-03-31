'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MenuTypeId } from '@/server/validators/menu.validator';

interface MenuDetail {
  id: string;
  name: string | null;
  menuTypeId: bigint | null;
  isActive: boolean | null;
}

interface Props {
  menu?: MenuDetail;
}

export function MenuForm({ menu }: Props) {
  const router = useRouter();
  const isEdit = !!menu;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    name: menu?.name || '',
    menuTypeId: menu?.menuTypeId != null ? Number(menu.menuTypeId) : null,
    isActive: menu?.isActive ?? true,
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
    if (!form.name.trim()) e.name = 'Tên menu là bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        name: form.name.trim() || null,
        menuTypeId: form.menuTypeId,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/menus/${menu.id}` : '/admin/api/menus';
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
      window.location.href = '/admin/menus';
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
            <li className="breadcrumb-item"><Link href="/admin/menus">Menu</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Sửa' : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => window.location.href = '/admin/menus'} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tên menu <span className="text-danger">*</span></label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handle}
                  placeholder="VD: Menu chính"
                  className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                />
                {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Loại menu</label>
                <select
                  name="menuTypeId"
                  value={form.menuTypeId ?? ''}
                  onChange={handle}
                  className="form-select form-select-sm"
                >
                  <option value="">— Chọn loại menu —</option>
                  <option value={1}>Menu Top</option>
                  <option value={2}>Menu Footer</option>
                  <option value={3}>Menu Left</option>
                  <option value={4}>Menu Right</option>
                </select>
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
                <label className="form-check-label" htmlFor="isActive">Công khai</label>
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
