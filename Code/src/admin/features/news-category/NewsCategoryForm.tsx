'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSlug } from '@/lib/utils';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { RichTextEditor } from '@/admin/components/RichTextEditor';

interface NewsCategoryDetail {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  seName: string;
  sortOrder: number;
  isPublished: boolean;
  isShowHome: boolean;
  isActive: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  slugRedirect: string | null;
  seoCanonical: string | null;
  seoNoindex: boolean;
  createdDate: Date;
  updatedDate: Date | null;
}

interface Props {
  newsCategory?: NewsCategoryDetail;
}

type TabId = 'basic' | 'seo' | 'status';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thông tin' },
  { id: 'seo', label: 'SEO' },
  { id: 'status', label: 'Trạng thái' },
];

export function NewsCategoryForm({ newsCategory }: Props) {
  const router = useRouter();
  const isEdit = !!newsCategory;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  const [form, setForm] = useState({
    title: newsCategory?.title || '',
    summary: newsCategory?.summary || '',
    content: newsCategory?.content || '',
    imageUrl: newsCategory?.imageUrl || '',
    seName: newsCategory?.seName || '',
    sortOrder: String(newsCategory?.sortOrder ?? 0),
    isPublished: newsCategory?.isPublished ?? true,
    isShowHome: newsCategory?.isShowHome ?? false,
    isActive: newsCategory?.isActive ?? true,
    metaTitle: newsCategory?.metaTitle || '',
    metaDescription: newsCategory?.metaDescription || '',
    metaKeywords: newsCategory?.metaKeywords || '',
    slugRedirect: newsCategory?.slugRedirect || '',
    seoCanonical: newsCategory?.seoCanonical || '',
    seoNoindex: newsCategory?.seoNoindex ?? false,
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => {
      const u = { ...p, [name]: v };
      if (name === 'title' && autoSlug) u.seName = createSlug(value);
      return u;
    });
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  function buildPayload() {
    return {
      title: form.title.trim() || null,
      summary: form.summary.trim() || null,
      content: form.content || null,
      imageUrl: form.imageUrl || null,
      seName: form.seName.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      isPublished: form.isPublished,
      isShowHome: form.isShowHome,
      isActive: form.isActive,
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      metaKeywords: form.metaKeywords.trim() || null,
      slugRedirect: form.slugRedirect.trim() || null,
      seoCanonical: form.seoCanonical.trim() || null,
      seoNoindex: form.seoNoindex,
    };
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Bắt buộc';
    if (!form.seName.trim()) e.seName = 'Bắt buộc';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.seName)) e.seName = 'Slug không hợp lệ';
    if (Object.keys(e).length) { setErrors(e); setActiveTab('basic'); return; }

    setLoading(true); setGlobalError('');
    try {
      const payload = buildPayload();
      const url = isEdit ? `/admin/api/news-categories/${newsCategory.id}` : '/admin/api/news-categories';
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
      router.push('/admin/news-categories'); router.refresh();
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
            <li className="breadcrumb-item"><Link href="/admin/news-categories">Danh mục tin tức</Link></li>
            <li className="breadcrumb-item active">{isEdit ? newsCategory.title : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/news-categories')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo danh mục'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        {TABS.map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button type="button" className={`nav-link ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="row g-3">
        <div className="col-12 col-lg-9">

          {/* === THÔNG TIN === */}
          {activeTab === 'basic' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Thông tin danh mục tin tức</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                  <input name="title" value={form.title} onChange={handle}
                    placeholder="VD: Tin tức nội thất" className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`} />
                  {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Slug <span className="text-danger">*</span></label>
                  <input name="seName" value={form.seName} onChange={handle}
                    placeholder="tin-tuc-noi-that" className={`form-control form-control-sm ${errors.seName ? 'is-invalid' : ''}`} />
                  {errors.seName && <div className="invalid-feedback d-block">{errors.seName}</div>}
                  <div className="form-check mt-1">
                    <input className="form-check-input" type="checkbox" id="autoSlug"
                      checked={autoSlug} onChange={(e) => setAutoSlug(e.target.checked)} />
                    <label className="form-check-label small" htmlFor="autoSlug">Tự động tạo slug</label>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Tóm tắt</label>
                  <textarea name="summary" value={form.summary} onChange={handle}
                    rows={3} className="form-control form-control-sm" placeholder="Mô tả ngắn gọn danh mục tin tức" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Nội dung</label>
                  <RichTextEditor
                    value={form.content}
                    onChange={(val) => setForm((p) => ({ ...p, content: val }))}
                    placeholder="Nhập nội dung danh mục tin tức..."
                  />
                </div>
                <div className="mb-3">
                  <SingleImageUploader
                    value={form.imageUrl}
                    onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
                    label="Hình ảnh"
                    defaultSrc="/admin/assets/images/default-image_100.png"
                  />
                </div>
              </div>
            </div>
          )}

          {/* === SEO === */}
          {activeTab === 'seo' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Title</label>
                  <input name="metaTitle" value={form.metaTitle} onChange={handle}
                    placeholder="SEO Title cho trang" className="form-control form-control-sm" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Description</label>
                  <textarea name="metaDescription" value={form.metaDescription} onChange={handle} rows={3}
                    className="form-control form-control-sm" placeholder="Mô tả SEO cho trang" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Keywords</label>
                  <input name="metaKeywords" value={form.metaKeywords} onChange={handle}
                    placeholder="keyword1, keyword2, keyword3" className="form-control form-control-sm" />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Slug Redirect</label>
                    <input name="slugRedirect" value={form.slugRedirect} onChange={handle}
                      placeholder="/old-slug" className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Canonical URL</label>
                    <input name="seoCanonical" value={form.seoCanonical} onChange={handle}
                      placeholder="https://..." className="form-control form-control-sm" />
                  </div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" name="seoNoindex"
                    id="seoNoindex" checked={form.seoNoindex} onChange={handle} />
                  <label className="form-check-label" htmlFor="seoNoindex">Noindex (không index trang này)</label>
                </div>
              </div>
            </div>
          )}

          {/* === TRẠNG THÁI === */}
          {activeTab === 'status' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Trạng thái</div>
              <div className="card-body">
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" name="isPublished"
                    id="isPublished" checked={form.isPublished} onChange={handle} />
                  <label className="form-check-label" htmlFor="isPublished">Xuất bản</label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" name="isShowHome"
                    id="isShowHome" checked={form.isShowHome} onChange={handle} />
                  <label className="form-check-label" htmlFor="isShowHome">Hiển thị trang chủ</label>
                </div>
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" name="isActive"
                    id="isActive" checked={form.isActive} onChange={handle} />
                  <label className="form-check-label" htmlFor="isActive">Kích hoạt</label>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Thứ tự</label>
                  <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
                <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                  {form.isActive ? '● Active' : '● Hidden'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
