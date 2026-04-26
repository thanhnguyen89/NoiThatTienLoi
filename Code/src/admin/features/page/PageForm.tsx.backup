'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { toast } from '@/admin/components/Toast';

interface PageItem {
  id: string;
  pageName: string | null;
  title: string | null;
  body: string | null;
  sortOrder: number | null;
  shortDescription: string | null;
  image: string | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  slugRedirect: string | null;
  seoCanonical: string | null;
  seoNoindex: boolean | null;
  isRedirect: boolean | null;
  errorCode: string | null;
}

interface Props {
  page?: PageItem;
}

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function PageForm({ page }: Props) {
  const router = useRouter();
  const isEdit = !!page;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    pageName: page?.pageName || '',
    title: page?.title || '',
    shortDescription: page?.shortDescription || '',
    body: page?.body || '',
    image: page?.image || '',
    sortOrder: String(page?.sortOrder ?? 0),
    isActive: page?.isActive ?? true,
    isShowHome: page?.isShowHome ?? false,
    metaTitle: page?.metaTitle || '',
    metaDescription: page?.metaDescription || '',
    metaKeywords: page?.metaKeywords || '',
    slugRedirect: page?.slugRedirect || '',
    seoCanonical: page?.seoCanonical || '',
    seoNoindex: page?.seoNoindex ?? false,
    isRedirect: page?.isRedirect ?? false,
    errorCode: page?.errorCode || '',
  });

  // Bootstrap tooltips init
  const tooltipRefs = useRef<Record<string, HTMLInputElement | null>>({});
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { bootstrap?: { Tooltip?: new (el: Element, opts?: unknown) => { dispose: () => void } } }).bootstrap?.Tooltip) {
      Object.entries(tooltipRefs.current).forEach(([key, el]) => {
        if (el) {
          new ((window as unknown as { bootstrap: { Tooltip: new (el: Element, opts?: unknown) => { dispose: () => void } } }).bootstrap.Tooltip)(el, { trigger: 'hover focus' });
          tooltipRefs.current[key] = el;
        }
      });
    }
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  function handleRichText(val: string) {
    setForm((p) => ({ ...p, body: val }));
  }

  function handleImage(url: string) {
    setForm((p) => ({ ...p, image: url }));
  }

  // Auto-generate pageName from title (create mode)
  useEffect(() => {
    if (!isEdit && form.title && !form.pageName) {
      setForm((p) => ({ ...p, pageName: makeSlug(form.title) }));
    }
  }, [form.title, form.pageName, isEdit]);

  // Enable/disable redirect fields
  useEffect(() => {
    if (!form.isRedirect) {
      setForm((p) => ({ ...p, slugRedirect: '', errorCode: '' }));
    }
  }, [form.isRedirect]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Bắt buộc';
    if (form.isRedirect && !form.slugRedirect.trim()) e.slugRedirect = 'Bắt buộc khi bật chuyển hướng';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        pageName: form.pageName.trim() || null,
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim() || null,
        body: form.body || null,
        image: form.image || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        isShowHome: form.isShowHome,
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        metaKeywords: form.metaKeywords.trim() || null,
        slugRedirect: form.slugRedirect.trim() || null,
        seoCanonical: form.seoCanonical.trim() || null,
        seoNoindex: form.seoNoindex,
        isRedirect: form.isRedirect,
        errorCode: form.isRedirect ? (form.errorCode || null) : null,
      };
      const url = isEdit ? `/admin/api/pages/${page.id}` : '/admin/api/pages';
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
        router.push('/admin/pages');
        router.refresh();
      }, 800);
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  const metaTitleLen = form.metaTitle.length;
  const metaDescLen = form.metaDescription.length;

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}
      {errors.title && !globalError && <div className="alert alert-danger py-2">{errors.title}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/pages">Trang</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (page?.title || page?.pageName || 'Chỉnh sửa') : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/pages')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo trang'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        {/* ===== LEFT PANEL: THÔNG TIN ===== */}
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin trang</div>
            <div className="card-body">
              {/* Tiêu đề */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  Tiêu đề <span className="text-danger">*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handle}
                  placeholder="VD: Giới thiệu công ty"
                  maxLength={60}
                  className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`}
                />
                {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
              </div>

              {/* Tên hệ thống */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="URL slug của trang. VD: gioi-thieu, lien-he" style={{ cursor: 'pointer' }}></i>{' '}
                  Tên hệ thống <span className="text-danger">*</span>
                </label>
                <input
                  name="pageName"
                  value={form.pageName}
                  onChange={handle}
                  placeholder="VD: gioi-thieu, lien-he"
                  className={`form-control form-control-sm ${errors.pageName ? 'is-invalid' : ''}`}
                  style={{ fontSize: '0.8125rem' }}
                />
                <div className="form-text small">Nếu để trống, sẽ tự động tạo từ Tiêu đề</div>
                {errors.pageName && <div className="invalid-feedback d-block">{errors.pageName}</div>}
              </div>

              {/* Mô tả ngắn */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">Mô tả ngắn gọn</label>
                <textarea
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handle}
                  rows={3}
                  className="form-control form-control-sm"
                  placeholder="Mô tả ngắn gọn về trang..."
                  style={{ fontSize: '0.8125rem' }}
                />
              </div>

              {/* Nội dung */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">Nội dung</label>
                <RichTextEditor
                  value={form.body}
                  onChange={handleRichText}
                  placeholder="Nhập nội dung trang..."
                />
              </div>

              {/* Hình ảnh */}
              <div className="mb-3">
                <SingleImageUploader
                  value={form.image}
                  onChange={handleImage}
                  label="Hình ảnh"
                  defaultSrc="/admin/assets/images/default-image_100.png"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL: SEO + CHUYỂN HƯỚNG ===== */}
        <div className="col-12 col-lg-3">

          {/* SEO Panel */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">SEO</div>
            <div className="card-body">
              {/* Tiêu đề SEO */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Tiêu đề hiển thị trên thanh tab trình duyệt và kết quả tìm kiếm" style={{ cursor: 'pointer' }}></i>{' '}
                  Tiêu đề SEO
                </label>
                <div className="position-relative">
                  <input
                    name="metaTitle"
                    value={form.metaTitle}
                    onChange={handle}
                    maxLength={60}
                    placeholder="SEO title..."
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.8125rem', paddingRight: '45px' }}
                  />
                  <span className={`position-absolute top-50 translate-middle-y me-1 small ${metaTitleLen > 55 ? (metaTitleLen > 60 ? 'text-danger fw-bold' : 'text-warning') : 'text-muted'}`}
                    style={{ right: 8, fontSize: '0.7rem' }}>
                    {metaTitleLen}/60
                  </span>
                </div>
              </div>

              {/* Mô tả SEO */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Mô tả hiển thị trong kết quả tìm kiếm Google" style={{ cursor: 'pointer' }}></i>{' '}
                  Mô tả SEO
                </label>
                <div className="position-relative">
                  <textarea
                    name="metaDescription"
                    value={form.metaDescription}
                    onChange={handle}
                    maxLength={160}
                    rows={3}
                    placeholder="SEO description..."
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.8125rem', paddingRight: '45px' }}
                  />
                  <span className={`position-absolute bottom-0 me-1 mb-1 small ${metaDescLen > 140 ? (metaDescLen > 160 ? 'text-danger fw-bold' : 'text-warning') : 'text-muted'}`}
                    style={{ right: 8, fontSize: '0.7rem' }}>
                    {metaDescLen}/160
                  </span>
                </div>
              </div>

              {/* Từ khóa */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Các từ khóa phân cách bằng dấu phẩy" style={{ cursor: 'pointer' }}></i>{' '}
                  Từ khóa
                </label>
                <input
                  name="metaKeywords"
                  value={form.metaKeywords}
                  onChange={handle}
                  placeholder="keyword1, keyword2, ..."
                  className="form-control form-control-sm"
                  style={{ fontSize: '0.8125rem' }}
                />
              </div>

              {/* URL (= pageName) */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="URL slug của trang. VD: gioi-thieu, lien-he" style={{ cursor: 'pointer' }}></i>{' '}
                  URL
                </label>
                <input
                  name="pageName"
                  value={form.pageName}
                  onChange={handle}
                  maxLength={75}
                  placeholder="VD: gioi-thieu, lien-he"
                  className={`form-control form-control-sm ${errors.pageName ? 'is-invalid' : ''}`}
                  style={{ fontSize: '0.8125rem' }}
                />
                {errors.pageName && <div className="invalid-feedback d-block">{errors.pageName}</div>}
              </div>

              {/* SEO Canonical */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Liên kết canonical chuẩn cho Google" style={{ cursor: 'pointer' }}></i>{' '}
                  SEO Canonical
                </label>
                <input
                  name="seoCanonical"
                  value={form.seoCanonical}
                  onChange={handle}
                  placeholder="https://..."
                  className="form-control form-control-sm"
                  style={{ fontSize: '0.8125rem' }}
                />
              </div>

              {/* SEO Noindex */}
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="seoNoindex"
                  id="seoNoindex"
                  checked={form.seoNoindex}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="seoNoindex" style={{ fontSize: '0.8125rem' }}>
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Nếu bật, Google sẽ không index trang này" style={{ cursor: 'pointer' }}></i>{' '}
                  Noindex
                </label>
              </div>
            </div>
          </div>

          {/* Chuyển hướng Panel */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Chuyển hướng</div>
            <div className="card-body">
              {/* Redirect toggle */}
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isRedirect"
                  id="isRedirect"
                  checked={form.isRedirect}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isRedirect" style={{ fontSize: '0.8125rem' }}>
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Bật để chuyển hướng trang này sang URL khác (301/302)" style={{ cursor: 'pointer' }}></i>{' '}
                  Chuyển hướng
                </label>
              </div>

              {/* Slug Redirect */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="URL đích chuyển hướng (dùng khi bật chuyển hướng)" style={{ cursor: 'pointer' }}></i>{' '}
                  URL
                </label>
                <input
                  name="slugRedirect"
                  value={form.slugRedirect}
                  onChange={handle}
                  placeholder="/url-dich"
                  disabled={!form.isRedirect}
                  maxLength={75}
                  className={`form-control form-control-sm ${!form.isRedirect ? 'bg-light' : ''} ${errors.slugRedirect ? 'is-invalid' : ''}`}
                  style={{ fontSize: '0.8125rem' }}
                />
                {errors.slugRedirect && <div className="invalid-feedback d-block">{errors.slugRedirect}</div>}
              </div>

              {/* Redirect Error Code */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Mã HTTP chuyển hướng: 301 (vĩnh viễn), 302 (tạm thời)" style={{ cursor: 'pointer' }}></i>{' '}
                  Mã lỗi
                </label>
                <select
                  name="errorCode"
                  value={form.errorCode}
                  onChange={handle}
                  disabled={!form.isRedirect}
                  className={`form-select form-select-sm ${!form.isRedirect ? 'bg-light' : ''}`}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <option value="">-- Chọn mã lỗi --</option>
                  <option value="301">301 - Chuyển hướng vĩnh viễn</option>
                  <option value="302">302 - Chuyển hướng tạm thời</option>
                </select>
              </div>
            </div>
          </div>

          {/* Trạng thái Panel */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              {/* Thứ tự */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">Thứ tự hiển thị</label>
                <input
                  name="sortOrder"
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={handle}
                  className="form-control form-control-sm"
                  style={{ fontSize: '0.8125rem' }}
                />
              </div>

              {/* Công khai */}
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={form.isActive}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isActive" style={{ fontSize: '0.8125rem' }}>Công khai</label>
              </div>

              {/* Trang chủ */}
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isShowHome"
                  id="isShowHome"
                  checked={form.isShowHome}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isShowHome" style={{ fontSize: '0.8125rem' }}>
                  <i className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Chỉ cho phép 1 trang làm trang chủ" style={{ cursor: 'pointer' }}></i>{' '}
                  Hiển thị trang chủ
                </label>
              </div>

              {/* Badge status */}
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                ● {form.isActive ? 'Active' : 'Hidden'}
              </span>
            </div>
          </div>

        </div>
      </div>

    </form>
  );
}
