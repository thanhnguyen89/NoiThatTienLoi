'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RedirectDetail {
  id: string;
  urlFrom: string | null;
  urlTo: string | null;
  errorCode: string | null;
  isActive: boolean | null;
}

interface Props {
  redirect?: RedirectDetail;
}

export function CatalogRedirectForm({ redirect }: Props) {
  const router = useRouter();
  const isEdit = !!redirect;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    urlFrom: redirect?.urlFrom || '',
    urlTo: redirect?.urlTo || '',
    errorCode: redirect?.errorCode || '',
    isActive: redirect?.isActive ?? true,
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
    if (!form.urlFrom.trim()) e.urlFrom = 'Url cũ là bắt buộc';
    if (!form.urlTo.trim()) e.urlTo = 'Url mới là bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        urlFrom: form.urlFrom.trim(),
        urlTo: form.urlTo.trim(),
        errorCode: form.errorCode.trim() || null,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/catalog-redirects/${redirect.id}` : '/admin/api/catalog-redirects';
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
      router.push('/admin/catalog-redirects');
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
            <li className="breadcrumb-item"><Link href="/admin/catalog-redirects">Redirect</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Sửa' : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/catalog-redirects')} disabled={loading}>Hủy</button>
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
                <label className="form-label small fw-semibold">Url cũ <span className="text-danger">*</span></label>
                <input
                  name="urlFrom"
                  value={form.urlFrom}
                  onChange={handle}
                  placeholder="VD: /san-pham-cu"
                  className={`form-control form-control-sm ${errors.urlFrom ? 'is-invalid' : ''}`}
                />
                {errors.urlFrom && <div className="invalid-feedback d-block">{errors.urlFrom}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Url mới <span className="text-danger">*</span></label>
                <input
                  name="urlTo"
                  value={form.urlTo}
                  onChange={handle}
                  placeholder="VD: /san-pham-moi"
                  className={`form-control form-control-sm ${errors.urlTo ? 'is-invalid' : ''}`}
                />
                {errors.urlTo && <div className="invalid-feedback d-block">{errors.urlTo}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Mã lỗi</label>
                <select
                  name="errorCode"
                  value={form.errorCode}
                  onChange={handle}
                  className="form-select form-select-sm"
                >
                  <option value="">— Chọn mã lỗi —</option>
                  <option value="301">301 - Moved Permanently</option>
                  <option value="302">302 - Found (Temporary Redirect)</option>
                  <option value="307">307 - Temporary Redirect</option>
                  <option value="410">410 - Gone</option>
                  <option value="404">404 - Not Found</option>
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
