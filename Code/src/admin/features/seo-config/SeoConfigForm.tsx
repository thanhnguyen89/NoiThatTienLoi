'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { SEO_CONFIG_NOTE_TOKENS } from '@/lib/constants';

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
  isActive: boolean;
  seoNoindex: boolean;
  seoCanonical: string | null;
  sortOrder: number;
}

interface Props {
  config?: SeoConfigDetail;
}

export function SeoConfigForm({ config }: Props) {
  const router = useRouter();
  const isEdit = !!config;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

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
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Bắt buộc';
    if (!form.seName.trim()) e.seName = 'Bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
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
        } else showToast(json.error || 'Lỗi khi lưu', 'error');
        return;
      }
      showToast(isEdit ? 'Cập nhật thành công!' : 'Thêm mới thành công!', 'success');
      setTimeout(() => {
        router.push('/admin/seo-configs');
        router.refresh();
      }, 1500);
    } catch { showToast('Lỗi kết nối', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          minWidth: 250,
          padding: '12px 20px',
          borderRadius: 6,
          color: '#fff',
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          background: toast.type === 'success' ? '#4caf50' : '#f44336',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
          {toast.msg}
        </div>
      )}
      <form onSubmit={submit} noValidate>

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/seo-configs">Cấu hình SEO</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (config.title || config.seName || 'Sửa') : 'Thêm mới'}</li>
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
        {/* LEFT COLUMN */}
        <div className="col-12 col-lg-8">
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
                <label className="form-label small fw-semibold">Tên hệ thống <span className="text-danger">*</span></label>
                <input
                  name="pageName"
                  value={form.pageName}
                  onChange={handle}
                  placeholder="VD: Trang chủ"
                  className="form-control form-control-sm"
                />
                <div className="form-text small">Tên định danh nội bộ của cấu hình SEO</div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Content Before</label>
                <RichTextEditor
                  value={form.contentBefore}
                  onChange={(val) => setForm((p) => ({ ...p, contentBefore: val }))}
                  placeholder="Nội dung hiển thị trước..."
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Content After</label>
                <RichTextEditor
                  value={form.contentAfter}
                  onChange={(val) => setForm((p) => ({ ...p, contentAfter: val }))}
                  placeholder="Nội dung hiển thị sau..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-12 col-lg-4">
          {/* MEDIA */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Media</div>
            <div className="card-body">
              <SingleImageUploader
                value={form.image}
                onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                label="Hình đại diện"
                defaultSrc="/admin/assets/images/default-image_100.png"
              />
              <div className="mt-3">
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
              <div className="form-check form-switch mt-2">
                <input className="form-check-input" type="checkbox" name="isActive"
                  id="isActive" checked={form.isActive} onChange={handle} />
                <label className="form-check-label" htmlFor="isActive">Công khai</label>
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">SEO</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Url <span className="text-danger">*</span></label>
                <input
                  name="seName"
                  value={form.seName}
                  onChange={handle}
                  placeholder="VD: /trang-chu"
                  className={`form-control form-control-sm ${errors.seName ? 'is-invalid' : ''}`}
                />
                {errors.seName && <div className="invalid-feedback d-block">{errors.seName}</div>}
                <div className="form-text small">Đường dẫn URL công khai</div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tiêu đề SEO <span className="text-muted">(tối đa 70 ký tự)</span></label>
                <input
                  name="metaTitle"
                  value={form.metaTitle}
                  onChange={handle}
                  placeholder="VD: Nội Thất Tiện Lợi - Giường Ngủ Đẹp Giá Rẻ"
                  maxLength={70}
                  className="form-control form-control-sm"
                />
                <div className="form-text small text-end">{form.metaTitle.length}/70</div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Mô tả SEO <span className="text-muted">(tối đa 160 ký tự)</span></label>
                <textarea
                  name="metaDescription"
                  value={form.metaDescription}
                  onChange={handle}
                  placeholder="Mô tả ngắn gọn về trang..."
                  maxLength={160}
                  rows={3}
                  className="form-control form-control-sm"
                />
                <div className="form-text small text-end">{form.metaDescription.length}/160</div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Từ khóa SEO</label>
                <input
                  name="metaKeywords"
                  value={form.metaKeywords}
                  onChange={handle}
                  placeholder="VD: noi-that, giuong-ngu, ban-an"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">SEO Canonical</label>
                <input
                  name="seoCanonical"
                  value={form.seoCanonical}
                  onChange={handle}
                  placeholder="VD: https://example.com/trang-chu"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" name="seoNoindex"
                  id="seoNoindex" checked={form.seoNoindex} onChange={handle} />
                <label className="form-check-label" htmlFor="seoNoindex">Noindex</label>
              </div>
            </div>
          </div>

          {/* GHI CHU */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Ghi chú</div>
            <div className="card-body py-2">
              <p className="text-muted small mb-2">Danh sách token placeholder có thể dùng trong nội dung SEO:</p>
              <div className="row g-1">
                {SEO_CONFIG_NOTE_TOKENS.map((t) => (
                  <div key={t.token} className="col-6">
                    <code className="small" title={t.description}>{t.token}</code>
                    <span className="text-muted small"> — {t.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
    </>
  );
}
