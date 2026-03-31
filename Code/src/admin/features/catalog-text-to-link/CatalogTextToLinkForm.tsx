'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TextToLinkDetail {
  id: string;
  categoryId: string | null;
  keyword: string | null;
  priority: number | null;
  link: string | null;
  matchCount: number | null;
  domain: string | null;
  refAttribute: string | null;
  otherAttribute: string | null;
  frUnique: boolean | null;
  matchLinks: string | null;
  isActive: boolean | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  categories: CategoryOption[];
  item?: TextToLinkDetail;
}

export function CatalogTextToLinkForm({ categories, item }: Props) {
  const router = useRouter();
  const isEdit = !!item;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    categoryId: item?.categoryId || '',
    keyword: item?.keyword || '',
    priority: String(item?.priority ?? 0),
    link: item?.link || '',
    matchCount: String(item?.matchCount ?? ''),
    domain: item?.domain || '',
    refAttribute: item?.refAttribute || '',
    otherAttribute: item?.otherAttribute || '',
    frUnique: item?.frUnique ?? false,
    matchLinks: item?.matchLinks || '',
    isActive: item?.isActive ?? true,
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
    if (!form.keyword.trim()) e.keyword = 'Từ khóa là bắt buộc';
    if (!form.link.trim()) e.link = 'Liên kết là bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        categoryId: form.categoryId || null,
        keyword: form.keyword.trim(),
        priority: Number(form.priority) || 0,
        link: form.link.trim(),
        matchCount: form.matchCount ? Number(form.matchCount) : null,
        domain: form.domain.trim() || null,
        refAttribute: form.refAttribute.trim() || null,
        otherAttribute: form.otherAttribute.trim() || null,
        frUnique: form.frUnique,
        matchLinks: form.matchLinks.trim() || null,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/catalog-text-to-links/${item.id}` : '/admin/api/catalog-text-to-links';
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
      router.push('/admin/catalog-text-to-links');
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
            <li className="breadcrumb-item"><Link href="/admin/catalog-text-to-links">Text To Link</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Sửa' : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/catalog-text-to-links')} disabled={loading}>Hủy</button>
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
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Danh mục sản phẩm</label>
                    <select
                      name="categoryId"
                      value={form.categoryId}
                      onChange={handle}
                      className="form-select form-select-sm"
                    >
                      <option value="">— Chọn danh mục —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Ưu tiên</label>
                    <input
                      name="priority"
                      type="number"
                      min="0"
                      value={form.priority}
                      onChange={handle}
                      className="form-control form-control-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Text (từ khóa) <span className="text-danger">*</span></label>
                <input
                  name="keyword"
                  value={form.keyword}
                  onChange={handle}
                  placeholder="VD: ghế gỗ"
                  className={`form-control form-control-sm ${errors.keyword ? 'is-invalid' : ''}`}
                />
                {errors.keyword && <div className="invalid-feedback d-block">{errors.keyword}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Url (liên kết) <span className="text-danger">*</span></label>
                <input
                  name="link"
                  value={form.link}
                  onChange={handle}
                  placeholder="VD: /san-pham/ghe-go"
                  className={`form-control form-control-sm ${errors.link ? 'is-invalid' : ''}`}
                />
                {errors.link && <div className="invalid-feedback d-block">{errors.link}</div>}
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Count</label>
                    <input
                      name="matchCount"
                      type="number"
                      min="0"
                      value={form.matchCount}
                      onChange={handle}
                      className="form-control form-control-sm"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Domain</label>
                    <input
                      name="domain"
                      value={form.domain}
                      onChange={handle}
                      placeholder="VD: example.com"
                      className="form-control form-control-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Thuộc tính REF</label>
                <input
                  name="refAttribute"
                  value={form.refAttribute}
                  onChange={handle}
                  placeholder="Thuộc tính REF"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Thuộc tính khác</label>
                <input
                  name="otherAttribute"
                  value={form.otherAttribute}
                  onChange={handle}
                  placeholder="Thuộc tính khác"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Chỉ áp dụng cho các liên kết</label>
                <textarea
                  name="matchLinks"
                  value={form.matchLinks}
                  onChange={handle}
                  placeholder="Danh sách url cách nhau bởi dấu phẩy"
                  className="form-control form-control-sm"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Tùy chọn</div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="frUnique"
                  id="frUnique"
                  checked={form.frUnique}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="frUnique">Unique</label>
              </div>
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
