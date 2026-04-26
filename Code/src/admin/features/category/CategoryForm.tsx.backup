'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoryDetail } from '@/lib/types';
import { createSlug } from '@/lib/utils';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { ImageManagerModal } from '@/admin/components/ImageManagerModal';
import { RichTextEditor } from '@/admin/components/RichTextEditor';

interface Props {
  category?: CategoryDetail;
  parentCategories: Array<{ id: string; name: string }>;
}

type TabId = 'basic' | 'seo-web' | 'seo-fb' | 'seo-tt' | 'seo-yt';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'seo-web', label: 'SEO Website' },
  { id: 'seo-fb', label: 'Facebook' },
  { id: 'seo-tt', label: 'TikTok' },
  { id: 'seo-yt', label: 'YouTube' },
];

interface ImageItem {
  id?: string;
  url: string;
  name: string;
  alt: string;
  order: number;
  isPrimary: boolean;
  isVisible: boolean;
}

// ─── Image Card Component ───
function ImageCardGrid({
  images,
  platformLabel,
  onImagesChange,
}: {
  images: ImageItem[];
  platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
  platformLabel: string;
  uploadDesc: string;
  onImagesChange: (imgs: ImageItem[]) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editAlt, setEditAlt] = useState('');

  function addImage(url: string) {
    if (images.find((i) => i.url === url)) return;
    const newImg: ImageItem = {
      id: `new-${Date.now()}`,
      url,
      name: url.split('/').pop() || 'image.jpg',
      alt: '',
      order: images.length,
      isPrimary: images.length === 0,
      isVisible: true,
    };
    onImagesChange([...images, newImg]);
  }

  function addImages(urls: string[]) {
    const existing = new Set(images.map((i) => i.url));
    const newImgs = urls.filter((u) => !existing.has(u)).map((url, i) => ({
      id: `new-${Date.now()}-${i}`,
      url,
      name: url.split('/').pop() || 'image.jpg',
      alt: '',
      order: images.length + i,
      isPrimary: images.length === 0 && i === 0,
      isVisible: true,
    }));
    if (newImgs.length) onImagesChange([...images, ...newImgs]);
  }

  function removeImage(idx: number) {
    const updated = images.filter((_, i) => i !== idx).map((img, i) => ({ ...img, order: i, isPrimary: i === 0 }));
    onImagesChange(updated);
  }

  function setPrimary(idx: number) {
    onImagesChange(images.map((img, i) => ({ ...img, isPrimary: i === idx })));
  }

  function saveEdit(idx: number) {
    onImagesChange(images.map((img, i) => i === idx ? { ...img, alt: editAlt } : img));
    setEditingIdx(null);
  }

  return (
    <div className="card mt-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span className="fw-semibold">Hình ảnh {platformLabel}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowModal(true)}>
          <i className="bi bi-images me-1"></i>Chọn ảnh
        </button>
      </div>
      <div className="card-body">
        {images.length === 0 ? (
          <p className="text-muted small mb-0">Chưa có ảnh. Nhấn "Chọn ảnh" để thêm.</p>
        ) : (
          <div className="row g-3">
            {images.map((img, idx) => (
              <div key={img.id || idx} className="col-6 col-md-4 col-lg-3">
                <div className="border rounded-2 overflow-hidden">
                  <div className="bg-light border-bottom d-flex align-items-center justify-content-center" style={{ height: 100 }}>
                    <img src={img.url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div className="p-2">
                    <div className="fw-semibold small mb-1 text-truncate">{img.name}</div>
                    {editingIdx === idx ? (
                      <div className="mb-2">
                        <input value={editAlt} onChange={(e) => setEditAlt(e.target.value)}
                          className="form-control form-control-sm mb-1" placeholder="Alt text..." />
                        <div className="d-flex gap-1">
                          <button type="button" className="btn btn-success btn-sm flex-fill" onClick={() => saveEdit(idx)}>Lưu</button>
                          <button type="button" className="btn btn-secondary btn-sm flex-fill" onClick={() => setEditingIdx(null)}>Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted small mb-2" style={{ fontSize: 11 }}>
                        Alt: {img.alt || <em className="text-secondary">Chưa có</em>}
                      </div>
                    )}
                    <div className="d-flex gap-1 flex-wrap mb-2">
                      {img.isPrimary && <span className="badge" style={{ fontSize: 10, background: '#dcfce7', color: '#166534' }}>Ảnh chính</span>}
                    </div>
                    <div className="d-flex justify-content-end gap-2 small">
                      <button type="button" className="btn btn-sm p-1 text-primary" title="Sửa alt" onClick={() => { setEditingIdx(idx); setEditAlt(img.alt); }}>
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      {!img.isPrimary && (
                        <button type="button" className="btn btn-sm p-1 text-success" title="Đặt ảnh chính" onClick={() => setPrimary(idx)}>
                          <i className="bi bi-star"></i>
                        </button>
                      )}
                      <button type="button" className="btn btn-sm p-1 text-danger" title="Xóa" onClick={() => removeImage(idx)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ImageManagerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        multiSelect
        onSelect={(url) => { addImage(url); setShowModal(false); }}
        onSelectMultiple={(urls) => { addImages(urls); setShowModal(false); }}
      />
    </div>
  );
}

// ─── Platform SEO Card ───
function PlatformSeoCard({
  platform,
  platformLabel,
  badgeLabel,
  seo,
  onSeoChange,
  images,
  platformLabel2,
  uploadDesc,
  onImagesChange,
}: {
  platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
  platformLabel: string;
  badgeLabel: string;
  seo: Record<string, string>;
  onSeoChange: (s: Record<string, string>) => void;
  images: ImageItem[];
  platformLabel2: string;
  uploadDesc: string;
  onImagesChange: (imgs: ImageItem[]) => void;
}) {
  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onSeoChange({ ...seo, [e.target.name]: e.target.value });
  }

  return (
    <div className="card mb-3">
      <div className="card-header fw-semibold">SEO {platformLabel}</div>
      <div className="card-body">
        <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{badgeLabel}</span>

        {/* Link bài đã đăng */}
        <div className="mb-3">
          <label className="form-label small fw-semibold">Link bài đã đăng</label>
          <input name="linkPosted" value={seo.linkPosted || ''} onChange={handle}
            placeholder="https://facebook.com/post/123" className="form-control form-control-sm" />
        </div>

        {platform === 'WEBSITE' ? (
          <>
            <div className="mb-3">
              <label className="form-label small fw-semibold">SEO Title</label>
              <input name="seoTitle" value={seo.seoTitle || ''} onChange={handle}
                placeholder="VD: Giường ngủ đẹp hiện đại cho phòng ngủ" className="form-control form-control-sm" />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">SEO Description</label>
              <textarea name="seoDescription" value={seo.seoDescription || ''} onChange={handle} rows={2}
                className="form-control form-control-sm" />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">Slug riêng</label>
                <input name="slug" value={seo.slug || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Canonical URL</label>
                <input name="canonicalUrl" value={seo.canonicalUrl || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-4">
                <label className="form-label small fw-semibold">OG Title</label>
                <input name="ogTitle" value={seo.ogTitle || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
              <div className="col-4">
                <label className="form-label small fw-semibold">OG Description</label>
                <input name="ogDescription" value={seo.ogDescription || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
              <div className="col-4">
                <label className="form-label small fw-semibold">OG Image</label>
                <input name="ogImage" value={seo.ogImage || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Robots</label>
              <input name="robots" value={seo.robots || 'index,follow'} onChange={handle} className="form-control form-control-sm" />
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Title {platformLabel}</label>
              <input name="title" value={seo.title || ''} onChange={handle} className="form-control form-control-sm" />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Description {platformLabel}</label>
              <textarea name="description" value={seo.description || ''} onChange={handle} rows={2} className="form-control form-control-sm" />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">Keywords</label>
                <input name="keywords" value={seo.keywords || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Hashtags</label>
                <input name="hashtags" value={seo.hashtags || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
            </div>
            {platform === 'YOUTUBE' && (
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tags</label>
                <input name="tags" value={seo.tags || ''} onChange={handle} className="form-control form-control-sm" />
              </div>
            )}
            <div className="mb-3">
              <label className="form-label small fw-semibold">OG Image</label>
              <input name="ogImage" value={seo.ogImage || ''} onChange={handle} className="form-control form-control-sm" />
            </div>
          </>
        )}

        {/* Images */}
        <ImageCardGrid
          images={images}
          platform={platform}
          platformLabel={platformLabel2}
          uploadDesc={uploadDesc}
          onImagesChange={onImagesChange}
        />
      </div>
    </div>
  );
}

// ─── Main Form ───
export function CategoryForm({ category, parentCategories }: Props) {
  const router = useRouter();
  const isEdit = !!category;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  // Images per platform — init từ category khi edit
  const [webImages, setWebImages] = useState<ImageItem[]>(() =>
    (category?.platformImages ?? [])
      .filter((i) => i.platform === 'WEBSITE')
      .map((i) => ({ id: i.id, url: i.imageUrl, name: i.imageUrl.split('/').pop() || 'image', alt: i.alt || '', order: i.sortOrder, isPrimary: i.isPrimary, isVisible: i.isActive }))
  );
  const [fbImages, setFbImages] = useState<ImageItem[]>(() =>
    (category?.platformImages ?? [])
      .filter((i) => i.platform === 'FACEBOOK')
      .map((i) => ({ id: i.id, url: i.imageUrl, name: i.imageUrl.split('/').pop() || 'image', alt: i.alt || '', order: i.sortOrder, isPrimary: i.isPrimary, isVisible: i.isActive }))
  );
  const [ttImages, setTtImages] = useState<ImageItem[]>(() =>
    (category?.platformImages ?? [])
      .filter((i) => i.platform === 'TIKTOK')
      .map((i) => ({ id: i.id, url: i.imageUrl, name: i.imageUrl.split('/').pop() || 'image', alt: i.alt || '', order: i.sortOrder, isPrimary: i.isPrimary, isVisible: i.isActive }))
  );
  const [ytImages, setYtImages] = useState<ImageItem[]>(() =>
    (category?.platformImages ?? [])
      .filter((i) => i.platform === 'YOUTUBE')
      .map((i) => ({ id: i.id, url: i.imageUrl, name: i.imageUrl.split('/').pop() || 'image', alt: i.alt || '', order: i.sortOrder, isPrimary: i.isPrimary, isVisible: i.isActive }))
  );

  // SEO per platform — init từ category khi edit
  const [webSeo, setWebSeo] = useState<Record<string, string>>(() => {
    const s = category?.platformSeos?.find((x) => x.platform === 'WEBSITE');
    return {
      linkPosted: s?.linkPosted || '', seoTitle: s?.title || category?.seoTitle || '',
      seoDescription: s?.description || category?.seoDescription || '',
      slug: s?.slug || '', canonicalUrl: s?.canonicalUrl || category?.canonicalUrl || '',
      ogTitle: s?.ogTitle || category?.ogTitle || '',
      ogDescription: s?.ogDescription || category?.ogDescription || '',
      ogImage: s?.ogImage || category?.ogImage || '',
      robots: s?.robots || category?.robots || 'index,follow',
      contentCate: s?.contentCate || '',
    };
  });
  const [fbSeo, setFbSeo] = useState<Record<string, string>>(() => {
    const s = category?.platformSeos?.find((x) => x.platform === 'FACEBOOK');
    return { linkPosted: s?.linkPosted || '', title: s?.title || '', description: s?.description || '', keywords: s?.keywords || '', hashtags: s?.hashtags || '', ogImage: s?.ogImage || '', contentCate: s?.contentCate || '' };
  });
  const [ttSeo, setTtSeo] = useState<Record<string, string>>(() => {
    const s = category?.platformSeos?.find((x) => x.platform === 'TIKTOK');
    return { linkPosted: s?.linkPosted || '', title: s?.title || '', description: s?.description || '', keywords: s?.keywords || '', hashtags: s?.hashtags || '', ogImage: s?.ogImage || '', contentCate: s?.contentCate || '' };
  });
  const [ytSeo, setYtSeo] = useState<Record<string, string>>(() => {
    const s = category?.platformSeos?.find((x) => x.platform === 'YOUTUBE');
    return { linkPosted: s?.linkPosted || '', title: s?.title || '', description: s?.description || '', tags: s?.tags || '', hashtags: s?.hashtags || '', ogImage: s?.ogImage || '', contentCate: s?.contentCate || '' };
  });

  const [form, setForm] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    code: category?.code || '',
    description: category?.description || '',
    parentId: category?.parentId || '',
    sortOrder: String(category?.sortOrder ?? 0),
    image: category?.image || '',
    icon: category?.icon || '',
    banner: category?.banner || '',
    isActive: category?.isActive ?? true,
    isFeatured: category?.isFeatured ?? false,
    isShowHome: category?.isShowHome ?? false,
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => {
      const u = { ...p, [name]: v };
      if (name === 'name' && autoSlug) u.slug = createSlug(value);
      return u;
    });
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  function buildPayload() {
    // Build platformSeos
    const seos = [];

    seos.push({
      platform: 'WEBSITE' as const,
      title: webSeo.seoTitle || null,
      description: webSeo.seoDescription || null,
      keywords: null,
      hashtags: null,
      tags: null,
      slug: webSeo.slug || null,
      canonicalUrl: webSeo.canonicalUrl || null,
      linkPosted: webSeo.linkPosted || null,
      contentCate: webSeo.contentCate || null,
      ogTitle: webSeo.ogTitle || null,
      ogDescription: webSeo.ogDescription || null,
      ogImage: webSeo.ogImage || null,
      robots: webSeo.robots || null,
    });

    if (fbSeo.title || fbSeo.description || fbSeo.keywords || fbSeo.hashtags || fbSeo.ogImage || fbSeo.linkPosted) {
      seos.push({
        platform: 'FACEBOOK' as const,
        title: fbSeo.title || null, description: fbSeo.description || null,
        keywords: fbSeo.keywords || null, hashtags: fbSeo.hashtags || null, tags: null,
        slug: null, canonicalUrl: null, linkPosted: fbSeo.linkPosted || null,
        contentCate: fbSeo.contentCate || null,
        ogTitle: null, ogDescription: null, ogImage: fbSeo.ogImage || null, robots: null,
      });
    }
    if (ttSeo.title || ttSeo.description || ttSeo.keywords || ttSeo.hashtags || ttSeo.ogImage || ttSeo.linkPosted) {
      seos.push({
        platform: 'TIKTOK' as const,
        title: ttSeo.title || null, description: ttSeo.description || null,
        keywords: ttSeo.keywords || null, hashtags: ttSeo.hashtags || null, tags: null,
        slug: null, canonicalUrl: null, linkPosted: ttSeo.linkPosted || null,
        contentCate: ttSeo.contentCate || null,
        ogTitle: null, ogDescription: null, ogImage: ttSeo.ogImage || null, robots: null,
      });
    }
    if (ytSeo.title || ytSeo.description || ytSeo.tags || ytSeo.hashtags || ytSeo.ogImage || ytSeo.linkPosted) {
      seos.push({
        platform: 'YOUTUBE' as const,
        title: ytSeo.title || null, description: ytSeo.description || null,
        keywords: null, hashtags: ytSeo.hashtags || null, tags: ytSeo.tags || null,
        slug: null, canonicalUrl: null, linkPosted: ytSeo.linkPosted || null,
        contentCate: ytSeo.contentCate || null,
        ogTitle: null, ogDescription: null, ogImage: ytSeo.ogImage || null, robots: null,
      });
    }

    // Build platformImages
    const imgs: Array<{
      platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
      imageUrl: string; alt: string | null; title: string | null; caption: string | null;
      sortOrder: number; isPrimary: boolean; isActive: boolean;
    }> = [];

    webImages.forEach((img, i) => {
      imgs.push({ platform: 'WEBSITE', imageUrl: img.url, alt: img.alt || null, title: null, caption: null, sortOrder: i, isPrimary: img.isPrimary, isActive: img.isVisible });
    });
    fbImages.forEach((img, i) => {
      imgs.push({ platform: 'FACEBOOK', imageUrl: img.url, alt: img.alt || null, title: null, caption: null, sortOrder: i, isPrimary: img.isPrimary, isActive: img.isVisible });
    });
    ttImages.forEach((img, i) => {
      imgs.push({ platform: 'TIKTOK', imageUrl: img.url, alt: img.alt || null, title: null, caption: null, sortOrder: i, isPrimary: img.isPrimary, isActive: img.isVisible });
    });
    ytImages.forEach((img, i) => {
      imgs.push({ platform: 'YOUTUBE', imageUrl: img.url, alt: img.alt || null, title: null, caption: null, sortOrder: i, isPrimary: img.isPrimary, isActive: img.isVisible });
    });

    return {
      name: form.name.trim(),
      slug: form.slug.trim(),
      code: form.code || null,
      description: form.description.trim() || null,
      image: form.image || null,
      icon: form.icon || null,
      banner: form.banner || null,
      parentId: form.parentId || null,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      isShowHome: form.isShowHome,
      seoTitle: webSeo.seoTitle.trim() || null,
      seoDescription: webSeo.seoDescription.trim() || null,
      canonicalUrl: webSeo.canonicalUrl.trim() || null,
      ogTitle: webSeo.ogTitle.trim() || null,
      ogDescription: webSeo.ogDescription.trim() || null,
      ogImage: webSeo.ogImage.trim() || null,
      robots: webSeo.robots.trim() || null,
      platformSeos: seos,
      platformImages: imgs,
    };
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Bắt buộc';
    if (!form.slug.trim()) e.slug = 'Bắt buộc';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) e.slug = 'Slug không hợp lệ';
    if (Object.keys(e).length) { setErrors(e); setActiveTab('basic'); return; }

    setLoading(true); setGlobalError('');
    try {
      const payload = buildPayload();
      const url = isEdit ? `/admin/api/categories/${category.id}` : '/admin/api/categories';
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
      router.push('/admin/categories'); router.refresh();
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  const parents = isEdit ? parentCategories.filter((p) => p.id !== category.id) : parentCategories;

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/categories">Danh mục</Link></li>
            <li className="breadcrumb-item active">{isEdit ? category.name : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/categories')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo danh mục'}
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>Publish</button>
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

          {/* === THÔNG TIN CƠ BẢN === */}
          {activeTab === 'basic' && (
            <>
              <div className="card mb-3">
                <div className="card-header fw-semibold">Thông tin cơ bản</div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tên danh mục <span className="text-danger">*</span></label>
                    <input name="name" value={form.name} onChange={handle}
                      placeholder="VD: Giường ngủ" className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`} />
                    {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-8">
                      <label className="form-label small fw-semibold">Slug <span className="text-danger">*</span></label>
                      <input name="slug" value={form.slug} onChange={handle}
                        placeholder="giuong-ngu" className={`form-control form-control-sm ${errors.slug ? 'is-invalid' : ''}`} />
                      {errors.slug && <div className="invalid-feedback d-block">{errors.slug}</div>}
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Mã danh mục</label>
                      <input name="code" value={form.code} onChange={handle}
                        placeholder="GIUONG_NGU" className="form-control form-control-sm" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mô tả</label>
                    <textarea name="description" value={form.description} onChange={handle}
                      rows={6} className="form-control form-control-sm" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nội dung danh mục</label>
                    <RichTextEditor
                      value={webSeo.contentCate}
                      onChange={(val) => setWebSeo((p) => ({ ...p, contentCate: val }))}
                      placeholder="Nhập nội dung danh mục..."
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-4">
                      <SingleImageUploader
                        value={form.image}
                        onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                        label="Hình ảnh"
                        defaultSrc="/admin/assets/images/default-image_100.png"
                      />
                    </div>
                    <div className="col-4">
                      <SingleImageUploader
                        value={form.icon}
                        onChange={(url) => setForm((p) => ({ ...p, icon: url }))}
                        label="Icon"
                        defaultSrc="/admin/assets/images/default-image_100.png"
                      />
                    </div>
                    <div className="col-4">
                      <SingleImageUploader
                        value={form.banner}
                        onChange={(url) => setForm((p) => ({ ...p, banner: url }))}
                        label="Banner"
                        defaultSrc="/admin/assets/images/default-image_100.png"
                      />
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-9">
                      <label className="form-label small fw-semibold">Danh mục cha</label>
                      <select name="parentId" value={form.parentId} onChange={handle} className="form-select form-select-sm">
                        <option value="">— Không có —</option>
                        {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label small fw-semibold">Thứ tự</label>
                      <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hình ảnh Website */}
              <ImageCardGrid
                images={webImages}
                platform="WEBSITE"
                platformLabel="Website"
                uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho Website."
                onImagesChange={setWebImages}
              />
            </>
          )}

          {/* === SEO WEBSITE === */}
          {activeTab === 'seo-web' && (
            <PlatformSeoCard
              platform="WEBSITE"
              platformLabel="Website"
              badgeLabel="WEBSITE"
              seo={webSeo}
              onSeoChange={setWebSeo}
              images={webImages}
              platformLabel2="Website"
              uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho Website."
              onImagesChange={setWebImages}
            />
          )}

          {/* === FACEBOOK === */}
          {activeTab === 'seo-fb' && (
            <PlatformSeoCard
              platform="FACEBOOK"
              platformLabel="Facebook"
              badgeLabel="FACEBOOK"
              seo={fbSeo}
              onSeoChange={setFbSeo}
              images={fbImages}
              platformLabel2="Facebook"
              uploadDesc="Cho phép tải lên nhiều ảnh post Facebook theo từng danh mục."
              onImagesChange={setFbImages}
            />
          )}

          {/* === TIKTOK === */}
          {activeTab === 'seo-tt' && (
            <PlatformSeoCard
              platform="TIKTOK"
              platformLabel="TikTok"
              badgeLabel="TIKTOK"
              seo={ttSeo}
              onSeoChange={setTtSeo}
              images={ttImages}
              platformLabel2="TikTok"
              uploadDesc="Hỗ trợ nhiều ảnh dọc hoặc ảnh carousel cho TikTok."
              onImagesChange={setTtImages}
            />
          )}

          {/* === YOUTUBE === */}
          {activeTab === 'seo-yt' && (
            <PlatformSeoCard
              platform="YOUTUBE"
              platformLabel="YouTube"
              badgeLabel="YOUTUBE"
              seo={ytSeo}
              onSeoChange={setYtSeo}
              images={ytImages}
              platformLabel2="YouTube"
              uploadDesc="Có thể dùng cho thumbnail, ảnh minh họa hoặc ảnh cover video."
              onImagesChange={setYtImages}
            />
          )}
        </div>

        {/* RIGHT - Trạng thái */}
        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="isActive"
                  id="isActive" checked={form.isActive} onChange={handle} />
                <label className="form-check-label" htmlFor="isActive">Hiển thị</label>
              </div>
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="isFeatured"
                  id="isFeatured" checked={form.isFeatured} onChange={handle} />
                <label className="form-check-label" htmlFor="isFeatured">Nổi bật</label>
              </div>
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="isShowHome"
                  id="isShowHome" checked={form.isShowHome} onChange={handle} />
                <label className="form-check-label" htmlFor="isShowHome">Hiển thị trang chủ</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Hidden'}
              </span>
              <p className="text-muted mt-2" style={{ fontSize: 12 }}>
                1 danh mục có thể cấu hình đầy đủ tất cả nền tảng cùng lúc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
