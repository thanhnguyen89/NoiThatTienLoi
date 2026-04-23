'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/admin/components/Toast';

interface EmbedCodeDetail {
  id: string;
  title: string | null;
  positionId: number | null;
  embedCode: string | null;
  note: string | null;
  isActive: boolean | null;
  createdBy: string | null;
  createdAt: Date | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

interface Props {
  embedCode?: EmbedCodeDetail;
}

export function CatalogEmbedCodeForm({ embedCode }: Props) {
  const router = useRouter();
  const isEdit = !!embedCode;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    title: embedCode?.title || '',
    positionId: embedCode?.positionId !== null && embedCode?.positionId !== undefined
      ? String(embedCode.positionId)
      : '',
    embedCode: embedCode?.embedCode || '',
    note: embedCode?.note || '',
    isActive: embedCode?.isActive ?? true,
  });

  const [auditInfo, setAuditInfo] = useState({
    createdAt: embedCode?.createdAt || null,
    updatedAt: embedCode?.updatedAt || null,
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
        title: form.title.trim() || null,
        positionId: form.positionId.trim() ? Number(form.positionId.trim()) : null,
        embedCode: form.embedCode.trim() || null,
        note: form.note.trim() || null,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/catalog-embed-codes/${embedCode!.id}` : '/admin/api/catalog-embed-codes';
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      toast(isEdit ? 'Cập nhật thành công' : 'Tạo mới thành công', 'success');
      setTimeout(() => {
        router.push('/admin/catalog-embed-codes');
        router.refresh();
      }, 800);
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
            <li className="breadcrumb-item"><Link href="/admin/catalog-embed-codes">Mã nhúng</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Sửa' : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/catalog-embed-codes')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin mã nhúng</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tiêu đề</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handle}
                  placeholder="VD: Embed Code Header"
                  className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`}
                />
                {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Vị trí mã nhúng</label>
                <select
                  name="positionId"
                  value={form.positionId}
                  onChange={handle}
                  className={`form-select form-select-sm ${errors.positionId ? 'is-invalid' : ''}`}
                >
                  <option value="">— Chọn vị trí —</option>
                  <option value="1">Thẻ Header</option>
                  <option value="2">Thẻ Body</option>
                  <option value="3">Thẻ Footer</option>
                </select>
                {errors.positionId && <div className="invalid-feedback d-block">{errors.positionId}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Mã nhúng (Embed Code)</label>
                <textarea
                  name="embedCode"
                  value={form.embedCode}
                  onChange={handle}
                  rows={6}
                  placeholder="Dán mã nhúng vào đây..."
                  className={`form-control form-control-sm font-monospace ${errors.embedCode ? 'is-invalid' : ''}`}
                  style={{ resize: 'vertical' }}
                />
                {errors.embedCode && <div className="invalid-feedback d-block">{errors.embedCode}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Ghi chú</label>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handle}
                  rows={3}
                  placeholder="Ghi chú (nếu có)..."
                  className="form-control form-control-sm"
                  style={{ resize: 'vertical' }}
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
                <label className="form-check-label" htmlFor="isActive">Công khai</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Hidden'}
              </span>
              {(auditInfo.createdAt || auditInfo.updatedAt) && (
                <div className="mt-3 small text-muted">
                  {auditInfo.createdAt && (
                    <div>Ngày tạo: {new Date(auditInfo.createdAt).toLocaleString('vi-VN')}</div>
                  )}
                  {auditInfo.updatedAt && (
                    <div>Ngày cập nhật: {new Date(auditInfo.updatedAt).toLocaleString('vi-VN')}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
