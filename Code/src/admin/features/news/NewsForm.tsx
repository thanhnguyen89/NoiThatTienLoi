'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSlug } from '@/lib/utils';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { RichTextEditor } from '@/admin/components/RichTextEditor';

interface NewsItem {
  id: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  image: string | null;
  seName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  isPublished: boolean | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  isNew: boolean | null;
  allowComments: boolean | null;
  newTag: string | null;
  sortOrder: number | null;
  slugRedirect: string | null;
  seoCanonical: string | null;
  seoNoindex: boolean | null;
}

interface Props {
  news?: NewsItem;
}

type TabId = 'basic' | 'seo' | 'status';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thong tin' },
  { id: 'seo', label: 'SEO' },
  { id: 'status', label: 'Trang thai' },
];

export function NewsForm({ news }: Props) {
  const router = useRouter();
  const isEdit = !!news;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  const [form, setForm] = useState({
    title: news?.title || '',
    summary: news?.summary || '',
    content: news?.content || '',
    image: news?.image || '',
    seName: news?.seName || '',
    metaTitle: news?.metaTitle || '',
    metaDescription: news?.metaDescription || '',
    metaKeywords: news?.metaKeywords || '',
    slugRedirect: news?.slugRedirect || '',
    seoCanonical: news?.seoCanonical || '',
    seoNoindex: news?.seoNoindex ?? false,
    isPublished: news?.isPublished ?? true,
    isShowHome: news?.isShowHome ?? false,
    isActive: news?.isActive ?? true,
    isNew: news?.isNew ?? false,
    allowComments: news?.allowComments ?? true,
    newTag: news?.newTag || '',
    sortOrder: String(news?.sortOrder ?? 0),
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
      image: form.image || null,
      seName: form.seName.trim() || null,
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      metaKeywords: form.metaKeywords.trim() || null,
      slugRedirect: form.slugRedirect.trim() || null,
      seoCanonical: form.seoCanonical.trim() || null,
      seoNoindex: form.seoNoindex,
      isPublished: form.isPublished,
      isShowHome: form.isShowHome,
      isActive: form.isActive,
      isNew: form.isNew,
      allowComments: form.allowComments,
      newTag: form.newTag.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
    };
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Bat buoc';
    if (!form.seName.trim()) e.seName = 'Bat buoc';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.seName)) e.seName = 'Slug khong hop le';
    if (Object.keys(e).length) { setErrors(e); setActiveTab('basic'); return; }

    setLoading(true); setGlobalError('');
    try {
      const payload = buildPayload();
      const url = isEdit ? `/admin/api/news/${news.id}` : '/admin/api/news';
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
      router.push('/admin/news'); router.refresh();
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
            <li className="breadcrumb-item"><Link href="/admin/news">Tin tuc</Link></li>
            <li className="breadcrumb-item active">{isEdit ? form.title || 'Chinh sua' : 'Them moi'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/news')} disabled={loading}>Huy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Dang luu...</> : isEdit ? 'Cap nhat' : 'Tao tin tuc'}
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

          {/* === THONG TIN CO BAN === */}
          {activeTab === 'basic' && (
            <>
              <div className="card mb-3">
                <div className="card-header fw-semibold">Thong tin co ban</div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tieu de <span className="text-danger">*</span></label>
                    <input name="title" value={form.title} onChange={handle}
                      placeholder="VD: Xu huong noi that 2025" className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`} />
                    {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Slug <span className="text-danger">*</span></label>
                    <div className="d-flex align-items-center gap-2">
                      <input name="seName" value={form.seName} onChange={handle}
                        placeholder="xu-huong-noi-that-2025" className={`form-control form-control-sm ${errors.seName ? 'is-invalid' : ''}`} />
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="autoSlug"
                          checked={autoSlug} onChange={(e) => setAutoSlug(e.target.checked)} />
                        <label className="form-check-label small" htmlFor="autoSlug">Auto</label>
                      </div>
                    </div>
                    {errors.seName && <div className="invalid-feedback d-block">{errors.seName}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tom tat</label>
                    <textarea name="summary" value={form.summary} onChange={handle}
                      rows={3} placeholder="Tom tat ngan gan bai viet..." className="form-control form-control-sm" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Noi dung</label>
                    <RichTextEditor
                      value={form.content || ''}
                      onChange={(val) => setForm((p) => ({ ...p, content: val }))}
                      placeholder="Nhap noi dung bai viet..."
                    />
                  </div>
                  <div className="mb-3">
                    <SingleImageUploader
                      value={form.image}
                      onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                      label="Hinh anh"
                      defaultSrc="/admin/assets/images/default-image_100.png"
                    />
                  </div>
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Tag moi</label>
                      <input name="newTag" value={form.newTag} onChange={handle}
                        placeholder="VD: Hot, New" className="form-control form-control-sm" />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Thu tu</label>
                      <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* === SEO === */}
          {activeTab === 'seo' && (
            <>
              <div className="card mb-3">
                <div className="card-header fw-semibold">SEO Website</div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Meta Title</label>
                    <input name="metaTitle" value={form.metaTitle} onChange={handle}
                      placeholder="SEO title hien thi tren Google" className="form-control form-control-sm" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Meta Description</label>
                    <textarea name="metaDescription" value={form.metaDescription} onChange={handle}
                      rows={3} placeholder="Mo ta ngan gon cho Google" className="form-control form-control-sm" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Meta Keywords</label>
                    <input name="metaKeywords" value={form.metaKeywords} onChange={handle}
                      placeholder="keyword1, keyword2, keyword3" className="form-control form-control-sm" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Slug Redirect</label>
                    <input name="slugRedirect" value={form.slugRedirect} onChange={handle}
                      placeholder="/tin-tuc/ten-cu" className="form-control form-control-sm" />
                  </div>
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Canonical URL</label>
                      <input name="seoCanonical" value={form.seoCanonical} onChange={handle}
                        placeholder="https://example.com/canonical-url" className="form-control form-control-sm" />
                    </div>
                    <div className="col-6 d-flex align-items-end">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" name="seoNoindex"
                          id="seoNoindex" checked={form.seoNoindex} onChange={handle} />
                        <label className="form-check-label" htmlFor="seoNoindex">Noindex</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* === TRANG THAI === */}
          {activeTab === 'status' && (
            <>
              <div className="card mb-3">
                <div className="card-header fw-semibold">Trang thai hien thi</div>
                <div className="card-body">
                  <div className="form-check form-switch mb-2">
                    <input className="form-check-input" type="checkbox" name="isActive"
                      id="isActive" checked={form.isActive} onChange={handle} />
                    <label className="form-check-label" htmlFor="isActive">Hien thi</label>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input className="form-check-input" type="checkbox" name="isPublished"
                      id="isPublished" checked={form.isPublished} onChange={handle} />
                    <label className="form-check-label" htmlFor="isPublished">Xuat ban</label>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input className="form-check-input" type="checkbox" name="isShowHome"
                      id="isShowHome" checked={form.isShowHome} onChange={handle} />
                    <label className="form-check-label" htmlFor="isShowHome">Hien thi trang chu</label>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input className="form-check-input" type="checkbox" name="isNew"
                      id="isNew" checked={form.isNew} onChange={handle} />
                    <label className="form-check-label" htmlFor="isNew">Danh dau moi</label>
                  </div>
                  <div className="form-check form-switch mb-3">
                    <input className="form-check-input" type="checkbox" name="allowComments"
                      id="allowComments" checked={form.allowComments} onChange={handle} />
                    <label className="form-check-label" htmlFor="allowComments">Cho phep binh luan</label>
                  </div>
                  <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                    {form.isActive ? '● Active' : '● Hidden'}
                  </span>
                  <span className={`badge ${form.isPublished ? 'bg-primary ms-2' : 'bg-warning ms-2'}`}>
                    {form.isPublished ? '● Published' : '● Draft'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT - Quick info */}
        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Trang thai</div>
            <div className="card-body">
              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Hien thi:</span>
                  <span className={`fw-semibold ${form.isActive ? 'text-success' : 'text-danger'}`}>
                    {form.isActive ? 'Co' : 'Khong'}
                  </span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Xuat ban:</span>
                  <span className={`fw-semibold ${form.isPublished ? 'text-success' : 'text-warning'}`}>
                    {form.isPublished ? 'Co' : 'Khong'}
                  </span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Trang chu:</span>
                  <span className="fw-semibold">
                    {form.isShowHome ? 'Co' : 'Khong'}
                  </span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Binh luan:</span>
                  <span className="fw-semibold">
                    {form.allowComments ? 'Cho phep' : 'Khong'}
                  </span>
                </div>
              </div>
              <p className="text-muted mt-3" style={{ fontSize: 12 }}>
                Cac truong SEO giup bai viet tot hon tren cong cu tim kiem.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
