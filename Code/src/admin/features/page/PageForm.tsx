'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { RichTextEditor } from '@/admin/components/RichTextEditor';

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
}

interface Props {
  page?: PageItem;
}

type TabId = 'info' | 'seo' | 'status';

const TABS: { id: TabId; label: string }[] = [
  { id: 'info', label: 'Thông tin' },
  { id: 'seo', label: 'SEO' },
  { id: 'status', label: 'Trạng thái' },
];

export function PageForm({ page }: Props) {
  const router = useRouter();
  const isEdit = !!page;
  const [activeTab, setActiveTab] = useState<TabId>('info');
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
    if (!form.title.trim()) e.title = 'Bắt buộc';
    if (Object.keys(e).length) { setErrors(e); setActiveTab('info'); return; }

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
      };
      const url = isEdit ? `/admin/api/pages/${page.id}` : '/admin/api/pages';
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
      router.push('/admin/pages');
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
            <li className="breadcrumb-item"><Link href="/admin/pages">Trang</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (page.title || page.pageName || 'Chỉnh sửa') : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/pages')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo trang'}
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
          {activeTab === 'info' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Thông tin trang</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Tên trang</label>
                  <input name="pageName" value={form.pageName} onChange={handle}
                    placeholder="VD: gioi-thieu, lien-he" className="form-control form-control-sm" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                  <input name="title" value={form.title} onChange={handle}
                    placeholder="VD: Giới thiệu công ty" className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`} />
                  {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Mô tả ngắn</label>
                  <textarea name="shortDescription" value={form.shortDescription} onChange={handle}
                    rows={3} className="form-control form-control-sm" placeholder="Mô tả ngắn gọn về trang..." />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Nội dung</label>
                  <RichTextEditor
                    value={form.body}
                    onChange={(val) => setForm((p) => ({ ...p, body: val }))}
                    placeholder="Nhập nội dung trang..."
                  />
                </div>
                <div className="mb-3">
                  <SingleImageUploader
                    value={form.image}
                    onChange={(url) => setForm((p) => ({ ...p, image: url }))}
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
                    placeholder="SEO title cho trình duyệt" className="form-control form-control-sm" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Description</label>
                  <textarea name="metaDescription" value={form.metaDescription} onChange={handle}
                    rows={3} className="form-control form-control-sm" placeholder="SEO description..." />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Keywords</label>
                  <input name="metaKeywords" value={form.metaKeywords} onChange={handle}
                    placeholder="keyword1, keyword2, ..." className="form-control form-control-sm" />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Slug Redirect</label>
                    <input name="slugRedirect" value={form.slugRedirect} onChange={handle}
                      placeholder="/old-url" className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">SEO Canonical</label>
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
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Thứ tự hiển thị</label>
                  <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" name="isActive"
                    id="isActive" checked={form.isActive} onChange={handle} />
                  <label className="form-check-label" htmlFor="isActive">Công khai (Hiển thị)</label>
                </div>
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" name="isShowHome"
                    id="isShowHome" checked={form.isShowHome} onChange={handle} />
                  <label className="form-check-label" htmlFor="isShowHome">Hiển thị trang chủ</label>
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
