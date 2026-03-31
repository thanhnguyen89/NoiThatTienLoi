'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';

interface SeoConfigDetail {
  id: string;
  pageName: string | null;
  title: string | null;
  contentBefore: string | null;
  contentAfter: string | null;
  image: string | null;
  seName: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  metaTitle: string | null;
  isActive: boolean | null;
  seoNoindex: boolean | null;
  seoCanonical: string | null;
  sortOrder: number | null;
}

interface Props {
  config?: SeoConfigDetail;
}

export function SeoConfigForm({ config }: Props) {
  const router = useRouter();
  const isEdit = !!config;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    pageName: config?.pageName || '',
    title: config?.title || '',
    contentBefore: config?.contentBefore || '',
    contentAfter: config?.contentAfter || '',
    image: config?.image || '',
    seName: config?.seName || '',
    metaKeywords: config?.metaKeywords || '',
    metaDescription: config?.metaDescription || '',
    metaTitle: config?.metaTitle || '',
    isActive: config?.isActive ?? true,
    seoNoindex: config?.seoNoindex ?? false,
    seoCanonical: config?.seoCanonical || '',
    sortOrder: String(config?.sortOrder ?? 0),
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
    if (!form.title.trim()) e.title = 'Tiêu đề là bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        pageName: form.pageName.trim() || null,
        title: form.title.trim(),
        contentBefore: form.contentBefore || null,
        contentAfter: form.contentAfter || null,
        image: form.image.trim() || null,
        seName: form.seName.trim() || null,
        metaKeywords: form.metaKeywords.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        metaTitle: form.metaTitle.trim() || null,
        isActive: form.isActive,
        seoNoindex: form.seoNoindex,
        seoCanonical: form.seoCanonical.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      const url = isEdit ? `/admin/api/seo-configs/${config.id}` : '/admin/api/seo-configs';
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
      router.push('/admin/seo-configs');
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
            <li className="breadcrumb-item"><Link href="/admin/seo-configs">Cấu hình SEO</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (config.title || 'SEO') : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/seo-configs')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          {/* Thông tin */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handle}
                  placeholder="VD: Trang chủ"
                  className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`}
                />
                {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tên hệ thống (pageName)</label>
                <input
                  name="pageName"
                  value={form.pageName}
                  onChange={handle}
                  placeholder="VD: /trang-chu"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Content Before</label>
                <RichTextEditor
                  value={form.contentBefore}
                  onChange={(val) => setForm((p) => ({ ...p, contentBefore: val }))}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Content After</label>
                <RichTextEditor
                  value={form.contentAfter}
                  onChange={(val) => setForm((p) => ({ ...p, contentAfter: val }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-3">
          {/* Media */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Media</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Hình đại diện</label>
                <SingleImageUploader
                  value={form.image}
                  onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                  label="Chọn hình"
                  defaultSrc="/admin/assets/images/default-image_100.png"
                />
              </div>
              <div className="mb-3">
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
            </div>
          </div>

          {/* SEO */}
          <div className="card">
            <div className="card-header fw-semibold">SEO</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Slug (seName)</label>
                <input
                  name="seName"
                  value={form.seName}
                  onChange={handle}
                  placeholder="VD: trang-chu"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tiêu đề SEO</label>
                <input
                  name="metaTitle"
                  value={form.metaTitle}
                  onChange={handle}
                  placeholder="Meta title"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Mô tả SEO</label>
                <textarea
                  name="metaDescription"
                  value={form.metaDescription}
                  onChange={handle}
                  placeholder="Meta description"
                  className="form-control form-control-sm"
                  rows={3}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Từ khóa SEO</label>
                <input
                  name="metaKeywords"
                  value={form.metaKeywords}
                  onChange={handle}
                  placeholder="Keywords, cách nhau bởi dấu phẩy"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">SEO Canonical</label>
                <input
                  name="seoCanonical"
                  value={form.seoCanonical}
                  onChange={handle}
                  placeholder="Canonical URL"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="seoNoindex"
                  id="seoNoindex"
                  checked={form.seoNoindex}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="seoNoindex">Noindex</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
