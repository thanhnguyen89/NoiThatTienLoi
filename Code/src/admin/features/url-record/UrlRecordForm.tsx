'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UrlRecordDetail {
  id: string;
  entityId: bigint | null;
  entityName: string | null;
  slug: string | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
  deletedBy: string | null;
  deletedAt: Date | string | null;
  slugRedirect: string | null;
  isRedirect: boolean | null;
  errorCode: string | null;
}

interface Props {
  record?: UrlRecordDetail;
}

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function UrlRecordForm({ record }: Props) {
  const router = useRouter();
  const isEdit = !!record;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    entityId: record?.entityId !== null && record?.entityId !== undefined ? String(record.entityId) : '',
    entityName: record?.entityName || '',
    slug: record?.slug || '',
    isActive: record?.isActive ?? true,
    isDeleted: record?.isDeleted ?? false,
    deletedBy: record?.deletedBy || '',
    deletedAt: formatDateForInput(record?.deletedAt),
    slugRedirect: record?.slugRedirect || '',
    isRedirect: record?.isRedirect ?? false,
    errorCode: record?.errorCode || '',
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

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        entityId: form.entityId ? Number(form.entityId) : null,
        entityName: form.entityName.trim() || null,
        slug: form.slug.trim() || null,
        isActive: form.isActive,
        isDeleted: form.isDeleted,
        deletedBy: form.deletedBy.trim() || null,
        deletedAt: form.deletedAt ? new Date(form.deletedAt).toISOString() : null,
        slugRedirect: form.slugRedirect.trim() || null,
        isRedirect: form.isRedirect,
        errorCode: form.errorCode.trim() || null,
      };
      const url = isEdit ? `/admin/api/url-records/${record.id}` : '/admin/api/url-records';
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
        } else setGlobalError(json.error || 'Loi');
        return;
      }
      router.push('/admin/url-records');
      router.refresh();
    } catch { setGlobalError('Loi ket noi'); }
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
            <li className="breadcrumb-item"><Link href="/admin/url-records">UrlRecord</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Sua' : 'Them moi'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/url-records')} disabled={loading}>Huy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Dang luu...</> : isEdit ? 'Cap nhat' : 'Tao moi'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thong tin</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Slug</label>
                  <input
                    name="slug"
                    value={form.slug}
                    onChange={handle}
                    placeholder="VD: san-pham-1"
                    className={`form-control form-control-sm ${errors.slug ? 'is-invalid' : ''}`}
                  />
                  {errors.slug && <div className="invalid-feedback d-block">{errors.slug}</div>}
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Entity Name</label>
                  <input
                    name="entityName"
                    value={form.entityName}
                    onChange={handle}
                    placeholder="VD: Product, Category"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Entity ID</label>
                  <input
                    name="entityId"
                    value={form.entityId}
                    onChange={handle}
                    placeholder="VD: 123"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Error Code</label>
                  <input
                    name="errorCode"
                    value={form.errorCode}
                    onChange={handle}
                    placeholder="VD: 404"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Slug Redirect</label>
                  <input
                    name="slugRedirect"
                    value={form.slugRedirect}
                    onChange={handle}
                    placeholder="VD: /san-pham-moi"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Deleted By</label>
                  <input
                    name="deletedBy"
                    value={form.deletedBy}
                    onChange={handle}
                    placeholder="UUID"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Deleted At</label>
                  <input
                    name="deletedAt"
                    type="datetime-local"
                    value={form.deletedAt}
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
            <div className="card-header fw-semibold">Trang thai</div>
            <div className="card-body">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={form.isActive}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isActive">Hoat dong</label>
              </div>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isRedirect"
                  id="isRedirect"
                  checked={form.isRedirect}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isRedirect">Redirect</label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isDeleted"
                  id="isDeleted"
                  checked={form.isDeleted}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isDeleted">Da xoa</label>
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
