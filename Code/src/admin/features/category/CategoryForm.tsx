'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { LocationPickerModal } from '@/admin/components/LocationPickerModal';
import { ImageManagerModal } from '@/admin/components/ImageManagerModal';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { createSlug } from '@/lib/utils';

interface ImageItem {
  id?: string;
  url: string;
  name: string;
  alt: string;
  order: number;
  isPrimary: boolean;
  isVisible: boolean;
}

type TabId = 'basic' | 'seo-web' | 'seo-fb' | 'seo-tt' | 'seo-yt';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'seo-web', label: 'SEO Website' },
  { id: 'seo-fb', label: 'Facebook' },
  { id: 'seo-tt', label: 'TikTok' },
  { id: 'seo-yt', label: 'YouTube' },
];

function getSeoPreviewQuality(title: string, description: string) {
  const titleLength = title.length;
  const descLength = description.length;
  const titleIdeal = titleLength >= 40 && titleLength <= 60;
  const descIdeal = descLength >= 120 && descLength <= 160;
  const titleAcceptable = titleLength >= 30 && titleLength <= 65;
  const descAcceptable = descLength >= 80 && descLength <= 170;

  let label = 'Cần tối ưu';
  let color = '#b42318';

  if (titleLength === 0 && descLength === 0) {
    label = 'Chưa có dữ liệu';
    color = '#6b7280';
  } else if (titleIdeal && descIdeal) {
    label = 'Tốt';
    color = '#166534';
  } else if ((titleIdeal || descIdeal) || (titleAcceptable && descAcceptable)) {
    label = 'Khá';
    color = '#92400e';
  }

  let tip = 'Độ dài Title/Description đang tối ưu cho SEO.';
  if (titleLength < 40) tip = 'Title nên từ 40–60 ký tự.';
  else if (titleLength > 60) tip = 'Title đang dài, nên <= 60 ký tự.';
  else if (descLength < 120) tip = 'Description nên từ 120–160 ký tự.';
  else if (descLength > 160) tip = 'Description đang dài, nên <= 160 ký tự.';

  return { label, color, tip };
}

interface ParentCategory {
  id: string;
  title: string | null;
  categoryLevel?: number;
}

interface categoryData {
  id: string;
  parentId: string | null;
  title: string | null;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  icon: string | null;
  banner: string | null;
  seName: string | null;
  sortOrder: number | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  slugRedirect: string | null;
  seoCanonical: string | null;
  seoNoindex: boolean | null;
  isRedirect: boolean | null;
  viewCount: number | null;
  // SEO Website
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  // SEO Facebook
  fbTitle: string | null;
  fbDescription: string | null;
  fbKeywords: string | null;
  fbHashtags: string | null;
  fbImage: string | null;
  fbLinkPosted: string | null;
  // SEO TikTok
  ttTitle: string | null;
  ttDescription: string | null;
  ttKeywords: string | null;
  ttHashtags: string | null;
  ttImage: string | null;
  ttLinkPosted: string | null;
  // SEO YouTube
  ytTitle: string | null;
  ytDescription: string | null;
  ytTags: string | null;
  ytHashtags: string | null;
  ytImage: string | null;
  ytLinkPosted: string | null;
  // Misc
  isMobile: boolean | null;
  categoryLevel: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Props {
  category?: categoryData;
  parentCategories?: ParentCategory[];
}

// ─── Image Card Grid Component ───
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

// ─── Platform SEO Card Component ───
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
                placeholder="VD: Tin tức nội thất đẹp hiện đại" className="form-control form-control-sm" />
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

export function CategoryForm({ category, parentCategories = [] }: Props) {
  const router = useRouter();
  const isEdit = !!category;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEdit);
  const [calculatedLevel, setCalculatedLevel] = useState(category?.categoryLevel ?? 0);
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentLocationField, setCurrentLocationField] = useState<'fb' | 'tt' | 'yt' | null>(null);

  const [form, setForm] = useState({
    parentId: category?.parentId != null ? String(category.parentId) : '',
    title: category?.title || '',
    seName: category?.seName || '',
    summary: category?.summary || '',
    content: category?.content || '',
    imageUrl: category?.imageUrl || '',
    icon: category?.icon || '',
    banner: category?.banner || '',
    sortOrder: String(category?.sortOrder ?? 0),
    isShowHome: category?.isShowHome ?? true,
    isActive: category?.isActive ?? true,
  });

  // Images per platform
  const [webImages, setWebImages] = useState<ImageItem[]>([]);
  const [fbImages, setFbImages] = useState<ImageItem[]>([]);
  const [ttImages, setTtImages] = useState<ImageItem[]>([]);
  const [ytImages, setYtImages] = useState<ImageItem[]>([]);

  // SEO per platform
  const [webSeo, setWebSeo] = useState<Record<string, any>>({
    linkPosted: '',
    metaTitle: category?.metaTitle || '',
    metaDescription: category?.metaDescription || '',
    metaKeywords: category?.metaKeywords || '',
    seoCanonical: category?.seoCanonical || '',
    seoNoindex: category?.seoNoindex || false,
    ogTitle: category?.ogTitle || '',
    ogDescription: category?.ogDescription || '',
    ogImage: category?.ogImage || '',
    robots: category?.robots || 'index,follow',
    slugRedirect: category?.slugRedirect || '',
    isRedirect: category?.isRedirect || false,
    isMobile: category?.isMobile || false,
  });
  const [fbSeo, setFbSeo] = useState<Record<string, string>>({
    linkPosted: category?.fbLinkPosted || '',
    title: category?.fbTitle || '',
    description: category?.fbDescription || '',
    keywords: category?.fbKeywords || '',
    hashtags: category?.fbHashtags || '',
    image: category?.fbImage || '',
    ogImage: category?.fbImage || '',
    location: '',
  });
  const [ttSeo, setTtSeo] = useState<Record<string, string>>({
    linkPosted: category?.ttLinkPosted || '',
    title: category?.ttTitle || '',
    description: category?.ttDescription || '',
    keywords: category?.ttKeywords || '',
    hashtags: category?.ttHashtags || '',
    image: category?.ttImage || '',
    ogImage: category?.ttImage || '',
    location: '',
  });
  const [ytSeo, setYtSeo] = useState<Record<string, string>>({
    linkPosted: category?.ytLinkPosted || '',
    title: category?.ytTitle || '',
    description: category?.ytDescription || '',
    tags: category?.ytTags || '',
    hashtags: category?.ytHashtags || '',
    image: category?.ytImage || '',
    ogImage: category?.ytImage || '',
    location: '',
  });

  const webSeoQuality = getSeoPreviewQuality(webSeo.metaTitle || '', webSeo.metaDescription || '');

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => {
      const u = { ...p, [name]: v };
      if (name === 'title' && autoSlug) u.seName = createSlug(value);
      
      // Tính toán categoryLevel khi thay đổi parentId
      if (name === 'parentId') {
        if (!value) {
          setCalculatedLevel(0);
        } else {
          const parent = parentCategories.find((p) => p.id === value);
          setCalculatedLevel((parent?.categoryLevel ?? 0) + 1);
        }
      }
      
      return u;
    });
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  function handleWebSeo(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setWebSeo((p) => ({ ...p, [name]: v }));
  }

  function handleFbSeo(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFbSeo((p) => ({ ...p, [name]: value }));
  }

  function handleTtSeo(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setTtSeo((p) => ({ ...p, [name]: value }));
  }

  function handleYtSeo(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setYtSeo((p) => ({ ...p, [name]: value }));
  }

  function openMapModal(field: 'fb' | 'tt' | 'yt') {
    setCurrentLocationField(field);
    setShowMapModal(true);
  }

  function selectLocationFromMap(location: string) {
    if (currentLocationField === 'fb') {
      setFbSeo(p => ({ ...p, location }));
    } else if (currentLocationField === 'tt') {
      setTtSeo(p => ({ ...p, location }));
    } else if (currentLocationField === 'yt') {
      setYtSeo(p => ({ ...p, location }));
    }
    setShowMapModal(false);
    setCurrentLocationField(null);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Bắt buộc nhập tiêu đề';
    if (!form.seName.trim()) e.seName = 'Bắt buộc nhập slug (seName)';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.seName)) e.seName = 'Slug chỉ chứa chữ thường, số và dấu gạch ngang';
    if (Object.keys(e).length) { setErrors(e); setActiveTab('basic'); return; }

    setLoading(true); setGlobalError('');
    try {
      const payload: Record<string, unknown> = {
        parentId: form.parentId || null,
        title: form.title.trim(),
        seName: form.seName.trim(),
        summary: form.summary.trim() || null,
        content: form.content || null,
        imageUrl: form.imageUrl || null,
        icon: form.icon || null,
        banner: form.banner || null,
        sortOrder: Number(form.sortOrder) || 0,
        isShowHome: form.isShowHome,
        isActive: form.isActive,
        // SEO Website
        metaTitle: webSeo.metaTitle?.trim() || null,
        metaDescription: webSeo.metaDescription?.trim() || null,
        metaKeywords: webSeo.metaKeywords?.trim() || null,
        seoCanonical: webSeo.seoCanonical?.trim() || null,
        seoNoindex: webSeo.seoNoindex || false,
        ogTitle: webSeo.ogTitle?.trim() || null,
        ogDescription: webSeo.ogDescription?.trim() || null,
        ogImage: webSeo.ogImage?.trim() || null,
        robots: webSeo.robots?.trim() || null,
        slugRedirect: webSeo.slugRedirect?.trim() || null,
        isRedirect: webSeo.isRedirect || false,
        isMobile: webSeo.isMobile || false,
        // SEO Facebook
        fbTitle: fbSeo.title?.trim() || null,
        fbDescription: fbSeo.description?.trim() || null,
        fbKeywords: fbSeo.keywords?.trim() || null,
        fbHashtags: fbSeo.hashtags?.trim() || null,
        fbImage: fbSeo.image?.trim() || fbSeo.ogImage?.trim() || null,
        fbLinkPosted: fbSeo.linkPosted?.trim() || null,
        // SEO TikTok
        ttTitle: ttSeo.title?.trim() || null,
        ttDescription: ttSeo.description?.trim() || null,
        ttKeywords: ttSeo.keywords?.trim() || null,
        ttHashtags: ttSeo.hashtags?.trim() || null,
        ttImage: ttSeo.image?.trim() || ttSeo.ogImage?.trim() || null,
        ttLinkPosted: ttSeo.linkPosted?.trim() || null,
        // SEO YouTube
        ytTitle: ytSeo.title?.trim() || null,
        ytDescription: ytSeo.description?.trim() || null,
        ytTags: ytSeo.tags?.trim() || null,
        ytHashtags: ytSeo.hashtags?.trim() || null,
        ytImage: ytSeo.image?.trim() || ytSeo.ogImage?.trim() || null,
        ytLinkPosted: ytSeo.linkPosted?.trim() || null,
      };

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
        } else setGlobalError(json.error || 'Lỗi không xác định');
        return;
      }
      router.push('/admin/categories'); router.refresh();
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  const parents = isEdit
    ? parentCategories.filter((p) => p.id !== category?.id)
    : parentCategories;

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/categories">Danh mục</Link></li>
            <li className="breadcrumb-item active">{isEdit ? form.title || 'Chỉnh sửa' : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/categories')} disabled={loading}>Hủy</button>
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

          {/* === THÔNG TIN CƠ BẢN === */}
          {activeTab === 'basic' && (
            <>
              <div className="card mb-3">
                <div className="card-header fw-semibold">Thông tin cơ bản</div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                    <input name="title" value={form.title} onChange={handle}
                      placeholder="VD: Tin tức nội thất" className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`} />
                    {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-8">
                      <label className="form-label small fw-semibold">
                        Slug (seName) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group input-group-sm">
                        <input name="seName" value={form.seName} onChange={handle}
                          placeholder="tin-tuc-noi-that" className={`form-control ${errors.seName ? 'is-invalid' : ''}`} />
                        <div className="form-check form-switch ms-3 d-flex align-items-center mb-0">
                          <input className="form-check-input" type="checkbox" id="autoSlug" checked={autoSlug}
                            onChange={(e) => { setAutoSlug(e.target.checked); if (e.target.checked) setForm((p) => ({ ...p, seName: createSlug(p.title) })); }}
                            style={{ width: 36, height: 18 }} />
                          <label className="form-check-label ms-1 small text-muted" htmlFor="autoSlug">Auto</label>
                        </div>
                      </div>
                      {errors.seName && <div className="invalid-feedback d-block">{errors.seName}</div>}
                      {form.title && autoSlug && (
                        <small className="text-muted">Preview: <code>{createSlug(form.title)}</code></small>
                      )}
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Thứ tự sắp xếp</label>
                      <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                        className="form-control form-control-sm" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tóm tắt</label>
                    <textarea name="summary" value={form.summary} onChange={handle}
                      rows={3} placeholder="Mô tả ngắn gọn Danh mục"
                      className="form-control form-control-sm" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nội dung</label>
                    <RichTextEditor
                      value={form.content}
                      onChange={(val) => setForm((p) => ({ ...p, content: val }))}
                      placeholder="Nhập nội dung Danh mục..."
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-4">
                      <SingleImageUploader
                        value={form.imageUrl}
                        onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
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
                        {parents.map((p) => (
                          <option key={p.id} value={p.id}>{p.title || p.id}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label small fw-semibold">Cấp danh mục</label>
                      <input type="number" min="0" value={calculatedLevel}
                        className="form-control form-control-sm" disabled 
                        title="Tự động tính toán dựa trên danh mục cha" />
                      <small className="text-muted">Tự động tính toán</small>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* === SEO WEBSITE === */}
          {activeTab === 'seo-web' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO Website</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>WEBSITE</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Title</label>
                  <input name="metaTitle" value={webSeo.metaTitle} onChange={handleWebSeo}
                    placeholder="SEO Title cho Google" className="form-control form-control-sm" maxLength={60} />
                  <small className="text-muted">{webSeo.metaTitle.length}/60</small>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Description</label>
                  <textarea name="metaDescription" value={webSeo.metaDescription} onChange={handleWebSeo}
                    rows={3} placeholder="SEO Description cho Google" className="form-control form-control-sm" maxLength={160} />
                  <small className="text-muted">{webSeo.metaDescription.length}/160</small>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Keywords</label>
                  <input name="metaKeywords" value={webSeo.metaKeywords} onChange={handleWebSeo}
                    placeholder="keyword1, keyword2, keyword3" className="form-control form-control-sm" />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">SEO Canonical URL</label>
                    <input name="seoCanonical" value={webSeo.seoCanonical} onChange={handleWebSeo}
                      placeholder="https://example.com/canonical-url" className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Robots</label>
                    <input name="robots" value={webSeo.robots} onChange={handleWebSeo}
                      placeholder="index,follow" className="form-control form-control-sm" />
                  </div>
                </div>
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" name="seoNoindex"
                    id="seoNoindex" checked={webSeo.seoNoindex} onChange={handleWebSeo} />
                  <label className="form-check-label" htmlFor="seoNoindex">Noindex (ẩn khỏi Google)</label>
                </div>
                <hr />
                <div className="mb-3">
                  <label className="form-label small fw-semibold">OG Title</label>
                  <input name="ogTitle" value={webSeo.ogTitle} onChange={handleWebSeo}
                    placeholder="Tiêu đề chia sẻ lên mạng xã hội" className="form-control form-control-sm" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">OG Description</label>
                  <textarea name="ogDescription" value={webSeo.ogDescription} onChange={handleWebSeo}
                    rows={2} className="form-control form-control-sm" />
                </div>
                <div className="mb-3">
                  <SingleImageUploader
                    value={webSeo.ogImage}
                    onChange={(url) => setWebSeo((p) => ({ ...p, ogImage: url }))}
                    label="OG Image"
                    defaultSrc="/admin/assets/images/default-image_100.png"
                  />
                </div>

                {/* Google Search Result Preview */}
                <div className="card mt-3" style={{ background: '#fff', border: '1px solid #dfe1e5', maxWidth: 600 }}>
                  <div className="card-header py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #dfe1e5' }}>
                    <i className="bi bi-google text-primary me-1" style={{ fontSize: 14 }}></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>Xem trước kết quả Google</span>
                  </div>
                  <div className="card-body p-3">
                    {/* Breadcrumb */}
                    <div className="d-flex align-items-center mb-1">
                      <div className="rounded-circle bg-light d-flex align-items-center justify-content-center me-2" 
                        style={{ width: 26, height: 26, minWidth: 26 }}>
                        <i className="bi bi-shop" style={{ fontSize: 12, color: '#5f6368' }}></i>
                      </div>
                      <div style={{ fontSize: 12, color: '#5f6368' }}>
                        noithatminhquan.vn/trang-chu
                      </div>
                    </div>
                    
                    {/* Title */}
                    <div className="mb-1">
                      <a href="#" className="text-decoration-none" style={{ fontSize: 20, color: '#1a0dab', lineHeight: '1.3' }}>
                        {webSeo.metaTitle || 'Nội Thất Minh Quân – Nội Thất Giá Xưởng | Giường, Tủ, Bàn Gh'}
                      </a>
                    </div>
                    
                    {/* Description */}
                    <div style={{ fontSize: 14, color: '#4d5156', lineHeight: '1.58' }}>
                      {webSeo.metaDescription || 'Mua nội thất giá xưởng tại Nội Thất Minh Quân – sản phẩm bền đẹp, giao nhanh 1–3 ngày, hỗ trợ đặt theo yêu cầu. Xem ngay ưu đãi hôm nay!'}
                    </div>
                    
                    {/* Meta info */}
                    <div className="mt-2" style={{ fontSize: 12, color: '#70757a' }}>
                      <span className="me-2">
                        <strong>Title:</strong> {webSeo.metaTitle?.length || 0}/60 • 
                        <strong className="ms-1">Desc:</strong> {webSeo.metaDescription?.length || 0}/160 • 
                        <strong className="ms-1" style={{ color: webSeoQuality.color }}>{webSeoQuality.label}</strong>
                      </span>
                    </div>

                    <div className="mt-1" style={{ fontSize: 12, color: '#6b7280' }}>
                      {webSeoQuality.tip}
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
            </div>
          )}

          {/* === SEO FACEBOOK === */}
          {activeTab === 'seo-fb' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO Facebook</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>FACEBOOK</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input name="linkPosted" value={fbSeo.linkPosted} onChange={handleFbSeo}
                    placeholder="https://facebook.com/post/123" className="form-control form-control-sm" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title</label>
                  <div className="input-group input-group-sm">
                    <input name="title" value={fbSeo.title} onChange={handleFbSeo}
                      placeholder="Tiêu đề bài viết" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(fbSeo.title);
                        alert('✅ Đã copy Title!');
                      }}
                      title="Copy Title">
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description</label>
                  <div className="input-group">
                    <textarea name="description" value={fbSeo.description} onChange={handleFbSeo}
                      rows={5} placeholder="Nội dung chi tiết bài viết..." className="form-control form-control-sm" style={{ resize: 'vertical' }} />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(fbSeo.description);
                        alert('✅ Đã copy Description!');
                      }}
                      title="Copy Description"
                      style={{ alignSelf: 'flex-start' }}>
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  
                  {/* Emoji Picker - Expanded */}
                  <div className="mt-2">
                    <small className="text-muted d-block mb-1">Thêm emoji nhanh:</small>
                    <div className="d-flex gap-2 flex-wrap">
                      {/* Nhà & Nội thất */}
                      <button type="button" className="btn btn-sm btn-outline-secondary" 
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🏠' }))}>
                        🏠 Nhà
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🏡' }))}>
                        🏡 Nhà đẹp
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🛋️' }))}>
                        🛋️ Sofa
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🪑' }))}>
                        🪑 Ghế
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🛏️' }))}>
                        🛏️ Giường
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🚪' }))}>
                        🚪 Cửa
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🪟' }))}>
                        🪟 Cửa sổ
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 💡' }))}>
                        💡 Đèn
                      </button>
                      
                      {/* Chất lượng & Đánh giá */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ✨' }))}>
                        ✨ Đẹp
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🌟' }))}>
                        🌟 Sang
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' �' }))}>
                        💎 Cao cấp
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ⭐' }))}>
                        ⭐ Đánh giá
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' �💯' }))}>
                        💯 Tốt
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ✅' }))}>
                        ✅ Uy tín
                      </button>
                      
                      {/* Xu hướng & Cảm xúc */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🔥' }))}>
                        🔥 Hot
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 👍' }))}>
                        👍 Like
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 👌' }))}>
                        👌 OK
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ❤️' }))}>
                        ❤️ Yêu
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 😍' }))}>
                        😍 Thích
                      </button>
                      
                      {/* Giá & Ưu đãi */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 💰' }))}>
                        💰 Giá tốt
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🎁' }))}>
                        🎁 Quà
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ⚡' }))}>
                        ⚡ Nhanh
                      </button>
                      
                      {/* Dịch vụ */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🚚' }))}>
                        🚚 Giao hàng
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 📦' }))}>
                        📦 Đóng gói
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🔨' }))}>
                        🔨 Lắp đặt
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🔧' }))}>
                        🔧 Bảo hành
                      </button>
                      
                      {/* Thiết kế */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🎨' }))}>
                        🎨 Thiết kế
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🏘️' }))}>
                        🏘️ Không gian
                      </button>
                    </div>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Keywords</label>
                    <div className="input-group input-group-sm">
                      <input name="keywords" value={fbSeo.keywords} onChange={handleFbSeo}
                        placeholder="keyword1, keyword2" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(fbSeo.keywords);
                          alert('✅ Đã copy Keywords!');
                        }}
                        title="Copy Keywords">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Keywords mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất' : 'nội thất' }))}>nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất đẹp' : 'nội thất đẹp' }))}>nội thất đẹp</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất giá rẻ' : 'nội thất giá rẻ' }))}>nội thất giá rẻ</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất cao cấp' : 'nội thất cao cấp' }))}>nội thất cao cấp</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', sofa' : 'sofa' }))}>sofa</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', bàn ghế' : 'bàn ghế' }))}>bàn ghế</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', giường ngủ' : 'giường ngủ' }))}>giường ngủ</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', tủ quần áo' : 'tủ quần áo' }))}>tủ quần áo</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', bàn làm việc' : 'bàn làm việc' }))}>bàn làm việc</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', kệ tivi' : 'kệ tivi' }))}>kệ tivi</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', thiết kế nội thất' : 'thiết kế nội thất' }))}>thiết kế nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', thi công nội thất' : 'thi công nội thất' }))}>thi công nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất phòng khách' : 'nội thất phòng khách' }))}>nội thất phòng khách</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất phòng ngủ' : 'nội thất phòng ngủ' }))}>nội thất phòng ngủ</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất bếp' : 'nội thất bếp' }))}>nội thất bếp</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất văn phòng' : 'nội thất văn phòng' }))}>nội thất văn phòng</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất gỗ' : 'nội thất gỗ' }))}>nội thất gỗ</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất hiện đại' : 'nội thất hiện đại' }))}>nội thất hiện đại</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất tối giản' : 'nội thất tối giản' }))}>nội thất tối giản</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất TPHCM' : 'nội thất TPHCM' }))}>nội thất TPHCM</button>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input name="hashtags" value={fbSeo.hashtags} onChange={handleFbSeo}
                        placeholder="#noithat #noithatdep #noithatgiare" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(fbSeo.hashtags);
                          alert('✅ Đã copy Hashtags!');
                        }}
                        title="Copy Hashtags">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Hashtags mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithat' : '#noithat' }))}>noithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatdep' : '#noithatdep' }))}>noithatdep</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatgiare' : '#noithatgiare' }))}>noithatgiare</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatcaocap' : '#noithatcaocap' }))}>noithatcaocap</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #sofa' : '#sofa' }))}>sofa</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #banghe' : '#banghe' }))}>banghe</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #giuongngu' : '#giuongngu' }))}>giuongngu</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #tuquanao' : '#tuquanao' }))}>tuquanao</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #banlamviec' : '#banlamviec' }))}>banlamviec</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #ketivi' : '#ketivi' }))}>ketivi</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #thietkenoithat' : '#thietkenoithat' }))}>thietkenoithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #thicongnoithat' : '#thicongnoithat' }))}>thicongnoithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatphongkhach' : '#noithatphongkhach' }))}>noithatphongkhach</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatphongngu' : '#noithatphongngu' }))}>noithatphongngu</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatbep' : '#noithatbep' }))}>noithatbep</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatvanphong' : '#noithatvanphong' }))}>noithatvanphong</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatgo' : '#noithatgo' }))}>noithatgo</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithathiendai' : '#noithathiendai' }))}>noithathiendai</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithattoigian' : '#noithattoigian' }))}>noithattoigian</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithattphcm' : '#noithattphcm' }))}>noithattphcm</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    <i className="bi bi-geo-alt me-1"></i>Vị trí (Location)
                  </label>
                  <div className="input-group input-group-sm mb-2">
                    <input name="location" value={fbSeo.location} onChange={handleFbSeo}
                      placeholder="VD: Nội Thất Minh Quân - TPHCM" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(fbSeo.location);
                        alert('✅ Đã copy Location!');
                      }}
                      title="Copy Location">
                      <i className="bi bi-clipboard"></i>
                    </button>
                    <button type="button" className="btn btn-outline-primary" onClick={() => openMapModal('fb')} title="Chọn từ bản đồ">
                      <i className="bi bi-map"></i>
                    </button>
                    <button type="button" className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                      <i className="bi bi-geo-alt"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><h6 className="dropdown-header">Chọn vị trí nhanh</h6></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setFbSeo(p => ({ ...p, location: 'Nội Thất Minh Quân - TP. Hồ Chí Minh' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Nội Thất Minh Quân - TP. Hồ Chí Minh
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setFbSeo(p => ({ ...p, location: 'Xưởng Nội Thất Minh Quân - Quận 12, TPHCM' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Xưởng Nội Thất Minh Quân - Quận 12, TPHCM
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setFbSeo(p => ({ ...p, location: 'Showroom Nội Thất Minh Quân - Quận 1, TPHCM' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Showroom Nội Thất Minh Quân - Quận 1, TPHCM
                      </button></li>
                      <li><hr className="dropdown-divider" /></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setFbSeo(p => ({ ...p, location: 'TP. Hồ Chí Minh, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>TP. Hồ Chí Minh, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setFbSeo(p => ({ ...p, location: 'Hà Nội, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Hà Nội, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setFbSeo(p => ({ ...p, location: 'Đà Nẵng, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Đà Nẵng, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setFbSeo(p => ({ ...p, location: 'Cần Thơ, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Cần Thơ, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setFbSeo(p => ({ ...p, location: 'Biên Hòa, Đồng Nai' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Biên Hòa, Đồng Nai
                      </button></li>
                      <li><hr className="dropdown-divider" /></li>
                      <li><button type="button" className="dropdown-item text-danger" onClick={() => setFbSeo(p => ({ ...p, location: '' }))}>
                        <i className="bi bi-x-circle me-2"></i>Xóa vị trí
                      </button></li>
                    </ul>
                  </div>
                  <small className="text-muted">Thêm vị trí giúp tăng reach với người dùng gần đó</small>
                </div>
                <div className="mb-3">
                  <SingleImageUploader
                    value={fbSeo.image}
                    onChange={(url) => setFbSeo((p) => ({ ...p, image: url }))}
                    label="Image"
                    defaultSrc="/admin/assets/images/default-image_100.png"
                  />
                </div>

                {/* Copy to Clipboard Button */}
                <div className="mb-3">
                  <button type="button" className="btn btn-success btn-sm w-100" 
                    onClick={() => {
                      const content = `${fbSeo.title ? fbSeo.title + '\n\n' : ''}${fbSeo.description}${fbSeo.hashtags ? '\n\n' + fbSeo.hashtags : ''}`;
                      navigator.clipboard.writeText(content).then(() => {
                        alert('✅ Đã copy nội dung! Paste vào Facebook ngay.');
                      }).catch(() => {
                        alert('❌ Không thể copy. Vui lòng copy thủ công.');
                      });
                    }}>
                    <i className="bi bi-clipboard-check me-2"></i>
                    Copy toàn bộ nội dung để đăng Facebook
                  </button>
                </div>

                {/* Facebook Post Preview - Compact */}
                <div className="card mt-3" style={{ background: '#f0f2f5', maxWidth: 500 }}>
                  <div className="card-header py-2" style={{ background: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                    <i className="bi bi-facebook text-primary me-1" style={{ fontSize: 14 }}></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>Preview Facebook</span>
                  </div>
                  <div className="card-body p-3" style={{ background: '#fff', fontSize: 13 }}>
                    {/* Header */}
                    <div className="d-flex align-items-start mb-2">
                      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center" 
                        style={{ width: 32, height: 32, minWidth: 32 }}>
                        <i className="bi bi-shop text-white" style={{ fontSize: 14 }}></i>
                      </div>
                      <div className="ms-2 flex-grow-1">
                        <div className="fw-semibold" style={{ fontSize: 13 }}>Nội Thất Minh Quân</div>
                        <div style={{ fontSize: 11, color: '#65676b' }}>
                          <i className="bi bi-globe2 me-1"></i>Công khai
                          {fbSeo.location && (
                            <>
                              <span className="mx-1">•</span>
                              <i className="bi bi-geo-alt me-1"></i>{fbSeo.location}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="mb-2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
                      {fbSeo.title && <div className="fw-semibold mb-1">{fbSeo.title}</div>}
                      <div style={{ maxHeight: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fbSeo.description || <span className="text-muted fst-italic">Nội dung...</span>}
                      </div>
                      {fbSeo.hashtags && <div className="text-primary mt-1" style={{ fontSize: 12 }}>{fbSeo.hashtags}</div>}
                    </div>
                    
                    {/* Image Preview */}
                    {(fbSeo.image || fbImages.length > 0) && (
                      <div className="border rounded" style={{ overflow: 'hidden', maxHeight: 200 }}>
                        {fbImages.length > 0 ? (
                          <div className="row g-1">
                            {fbImages.slice(0, 2).map((img, idx) => (
                              <div key={img.id} className="col-6">
                                <div style={{ position: 'relative', paddingTop: '100%' }}>
                                  <img src={img.url} alt={img.alt} 
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                  {idx === 1 && fbImages.length > 2 && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span className="text-white fw-bold" style={{ fontSize: 18 }}>+{fbImages.length - 2}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : fbSeo.image && (
                          <img src={fbSeo.image} alt="Preview" 
                            style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="d-flex justify-content-around pt-2 mt-2" style={{ borderTop: '1px solid #e4e6eb', fontSize: 12 }}>
                      <div className="text-muted">
                        <i className="bi bi-hand-thumbs-up me-1"></i>Thích
                      </div>
                      <div className="text-muted">
                        <i className="bi bi-chat me-1"></i>Bình luận
                      </div>
                      <div className="text-muted">
                        <i className="bi bi-share me-1"></i>Chia sẻ
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hình ảnh Facebook */}
              <ImageCardGrid
                images={fbImages}
                platform="FACEBOOK"
                platformLabel="Facebook"
                uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho Facebook."
                onImagesChange={setFbImages}
              />
            </div>
          )}

          {/* === SEO TIKTOK === */}
          {activeTab === 'seo-tt' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO TikTok</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#f0f0f0', color: '#010101' }}>TIKTOK</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input name="linkPosted" value={ttSeo.linkPosted} onChange={handleTtSeo}
                    placeholder="https://tiktok.com/@user/video/123" className="form-control form-control-sm" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title</label>
                  <div className="input-group input-group-sm">
                    <input name="title" value={ttSeo.title} onChange={handleTtSeo}
                      placeholder="Tiêu đề video TikTok" className="form-control" maxLength={150} />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ttSeo.title);
                        alert('✅ Đã copy Title!');
                      }}
                      title="Copy Title">
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  <small className="text-muted">{ttSeo.title?.length || 0}/150 ký tự</small>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description</label>
                  <div className="input-group">
                    <textarea name="description" value={ttSeo.description} onChange={handleTtSeo}
                      rows={4} placeholder="Mô tả video..." className="form-control form-control-sm" maxLength={2200} style={{ resize: 'vertical' }} />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ttSeo.description);
                        alert('✅ Đã copy Description!');
                      }}
                      title="Copy Description"
                      style={{ alignSelf: 'flex-start' }}>
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  <small className="text-muted">{ttSeo.description?.length || 0}/2200 ký tự</small>
                  
                  {/* Emoji Picker for TikTok - Expanded */}
                  <div className="mt-2">
                    <small className="text-muted d-block mb-1">Thêm emoji nhanh:</small>
                    <div className="d-flex gap-2 flex-wrap">
                      {/* Nội thất */}
                      <button type="button" className="btn btn-sm btn-outline-secondary" 
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🏠' }))}>
                        🏠
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🏡' }))}>
                        🏡
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🛋️' }))}>
                        🛋️
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🪑' }))}>
                        🪑
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🛏️' }))}>
                        🛏️
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🚪' }))}>
                        🚪
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 💡' }))}>
                        💡
                      </button>
                      
                      {/* Chất lượng */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ✨' }))}>
                        ✨
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🌟' }))}>
                        🌟
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 💎' }))}>
                        💎
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ⭐' }))}>
                        ⭐
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 💯' }))}>
                        💯
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ✅' }))}>
                        ✅
                      </button>
                      
                      {/* Trending */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🔥' }))}>
                        🔥
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 👍' }))}>
                        👍
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' �' }))}>
                        👌
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ❤️' }))}>
                        ❤️
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 😍' }))}>
                        😍
                      </button>
                      
                      {/* Giá & Ưu đãi */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' �💰' }))}>
                        💰
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🎁' }))}>
                        🎁
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ⚡' }))}>
                        ⚡
                      </button>
                      
                      {/* Video & Content */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🎥' }))}>
                        🎥
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 📹' }))}>
                        📹
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🎬' }))}>
                        🎬
                      </button>
                      
                      {/* Dịch vụ */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🚚' }))}>
                        🚚
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 📦' }))}>
                        📦
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🔨' }))}>
                        🔨
                      </button>
                      
                      {/* Thiết kế */}
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🎨' }))}>
                        🎨
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🏘️' }))}>
                        🏘️
                      </button>
                    </div>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Keywords</label>
                    <div className="input-group input-group-sm">
                      <input name="keywords" value={ttSeo.keywords} onChange={handleTtSeo}
                        placeholder="keyword1, keyword2" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(ttSeo.keywords);
                          alert('✅ Đã copy Keywords!');
                        }}
                        title="Copy Keywords">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Keywords mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất' : 'nội thất' }))}>nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất đẹp' : 'nội thất đẹp' }))}>nội thất đẹp</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất giá rẻ' : 'nội thất giá rẻ' }))}>nội thất giá rẻ</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất cao cấp' : 'nội thất cao cấp' }))}>nội thất cao cấp</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', sofa' : 'sofa' }))}>sofa</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', bàn ghế' : 'bàn ghế' }))}>bàn ghế</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', giường ngủ' : 'giường ngủ' }))}>giường ngủ</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', tủ quần áo' : 'tủ quần áo' }))}>tủ quần áo</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', bàn làm việc' : 'bàn làm việc' }))}>bàn làm việc</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', kệ tivi' : 'kệ tivi' }))}>kệ tivi</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', thiết kế nội thất' : 'thiết kế nội thất' }))}>thiết kế nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', thi công nội thất' : 'thi công nội thất' }))}>thi công nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất phòng khách' : 'nội thất phòng khách' }))}>nội thất phòng khách</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất phòng ngủ' : 'nội thất phòng ngủ' }))}>nội thất phòng ngủ</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất bếp' : 'nội thất bếp' }))}>nội thất bếp</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất văn phòng' : 'nội thất văn phòng' }))}>nội thất văn phòng</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất gỗ' : 'nội thất gỗ' }))}>nội thất gỗ</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất hiện đại' : 'nội thất hiện đại' }))}>nội thất hiện đại</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất tối giản' : 'nội thất tối giản' }))}>nội thất tối giản</button>
                        <button type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', nội thất TPHCM' : 'nội thất TPHCM' }))}>nội thất TPHCM</button>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input name="hashtags" value={ttSeo.hashtags} onChange={handleTtSeo}
                        placeholder="#noithat #tiktoknoithat #fyp" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(ttSeo.hashtags);
                          alert('✅ Đã copy Hashtags!');
                        }}
                        title="Copy Hashtags">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Hashtags mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithat' : '#noithat' }))}>noithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatdep' : '#noithatdep' }))}>noithatdep</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #tiktoknoithat' : '#tiktoknoithat' }))}>tiktoknoithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #fyp' : '#fyp' }))}>fyp</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #xuhuong' : '#xuhuong' }))}>xuhuong</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #viral' : '#viral' }))}>viral</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #sofa' : '#sofa' }))}>sofa</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #banghe' : '#banghe' }))}>banghe</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #giuongngu' : '#giuongngu' }))}>giuongngu</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #tuquanao' : '#tuquanao' }))}>tuquanao</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #thietkenoithat' : '#thietkenoithat' }))}>thietkenoithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #thicongnoithat' : '#thicongnoithat' }))}>thicongnoithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatphongkhach' : '#noithatphongkhach' }))}>noithatphongkhach</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatphongngu' : '#noithatphongngu' }))}>noithatphongngu</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatbep' : '#noithatbep' }))}>noithatbep</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatvanphong' : '#noithatvanphong' }))}>noithatvanphong</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatgo' : '#noithatgo' }))}>noithatgo</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithathiendai' : '#noithathiendai' }))}>noithathiendai</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithattoigian' : '#noithattoigian' }))}>noithattoigian</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithattphcm' : '#noithattphcm' }))}>noithattphcm</button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Location */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    <i className="bi bi-geo-alt me-1"></i>Vị trí (Location)
                  </label>
                  <div className="input-group input-group-sm mb-2">
                    <input name="location" value={ttSeo.location} onChange={handleTtSeo}
                      placeholder="VD: TP. Hồ Chí Minh, Việt Nam" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ttSeo.location);
                        alert('✅ Đã copy Location!');
                      }}
                      title="Copy Location">
                      <i className="bi bi-clipboard"></i>
                    </button>
                    <button type="button" className="btn btn-outline-primary" onClick={() => openMapModal('tt')} title="Chọn từ bản đồ">
                      <i className="bi bi-map"></i>
                    </button>
                    <button type="button" className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                      <i className="bi bi-geo-alt"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><h6 className="dropdown-header">Chọn vị trí nhanh</h6></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setTtSeo(p => ({ ...p, location: 'Nội Thất Minh Quân - TP. Hồ Chí Minh' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Nội Thất Minh Quân - TP. Hồ Chí Minh
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setTtSeo(p => ({ ...p, location: 'Xưởng Nội Thất Minh Quân - Quận 12, TPHCM' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Xưởng Nội Thất Minh Quân - Quận 12, TPHCM
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setTtSeo(p => ({ ...p, location: 'Showroom Nội Thất Minh Quân - Quận 1, TPHCM' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Showroom Nội Thất Minh Quân - Quận 1, TPHCM
                      </button></li>
                      <li><hr className="dropdown-divider" /></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setTtSeo(p => ({ ...p, location: 'TP. Hồ Chí Minh, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>TP. Hồ Chí Minh, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setTtSeo(p => ({ ...p, location: 'Hà Nội, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Hà Nội, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setTtSeo(p => ({ ...p, location: 'Đà Nẵng, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Đà Nẵng, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setTtSeo(p => ({ ...p, location: 'Cần Thơ, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Cần Thơ, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setTtSeo(p => ({ ...p, location: 'Biên Hòa, Đồng Nai' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Biên Hòa, Đồng Nai
                      </button></li>
                      <li><hr className="dropdown-divider" /></li>
                      <li><button type="button" className="dropdown-item text-danger" onClick={() => setTtSeo(p => ({ ...p, location: '' }))}>
                        <i className="bi bi-x-circle me-2"></i>Xóa vị trí
                      </button></li>
                    </ul>
                  </div>
                  <small className="text-muted">Giúp video xuất hiện trong tìm kiếm theo vị trí</small>
                </div>
                
                {/* Trending Hashtags Suggestions */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Gợi ý Hashtag Trending</label>
                  <div className="d-flex flex-wrap gap-2">
                    {['#noithat', '#noithatdep', '#noithatgiare', '#tiktoknoithat', '#fyp', '#xuhuong', '#viral'].map(tag => (
                      <button key={tag} type="button" className="btn btn-sm btn-outline-dark"
                        onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? `${p.hashtags} ${tag}` : tag }))}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <SingleImageUploader
                    value={ttSeo.image}
                    onChange={(url) => setTtSeo((p) => ({ ...p, image: url }))}
                    label="Cover Image (Thumbnail)"
                    defaultSrc="/admin/assets/images/default-image_100.png"
                  />
                </div>

                {/* Copy to Clipboard Button */}
                <div className="mb-3">
                  <button type="button" className="btn btn-dark btn-sm w-100" 
                    onClick={() => {
                      const content = `${ttSeo.title ? ttSeo.title + '\n\n' : ''}${ttSeo.description}${ttSeo.hashtags ? '\n\n' + ttSeo.hashtags : ''}`;
                      navigator.clipboard.writeText(content).then(() => {
                        alert('✅ Đã copy nội dung! Paste vào TikTok ngay.');
                      }).catch(() => {
                        alert('❌ Không thể copy. Vui lòng copy thủ công.');
                      });
                    }}>
                    <i className="bi bi-clipboard-check me-2"></i>
                    Copy toàn bộ nội dung để đăng TikTok
                  </button>
                </div>

                {/* TikTok Video Preview - Compact */}
                <div className="card mt-3" style={{ background: '#000', maxWidth: 300 }}>
                  <div className="card-header py-2" style={{ background: '#000', borderBottom: '1px solid #333', color: '#fff' }}>
                    <i className="bi bi-tiktok me-1" style={{ fontSize: 14 }}></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>Preview TikTok</span>
                  </div>
                  <div className="card-body p-2" style={{ background: '#000', color: '#fff' }}>
                    {/* Video placeholder */}
                    <div style={{ position: 'relative', paddingTop: '177.78%', background: '#1a1a1a', borderRadius: 8, overflow: 'hidden', maxHeight: 400 }}>
                      {ttSeo.image ? (
                        <img src={ttSeo.image} alt="Cover" 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                          <i className="bi bi-play-circle" style={{ fontSize: 32, color: '#666' }}></i>
                          <div className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>Video...</div>
                        </div>
                      )}
                      
                      {/* Content overlay */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                        <div className="fw-semibold mb-1" style={{ fontSize: 12 }}>
                          @noithatminhquan
                          {ttSeo.location && (
                            <div style={{ fontSize: 10, opacity: 0.8 }}>
                              <i className="bi bi-geo-alt me-1"></i>{ttSeo.location}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 60, overflow: 'hidden' }}>
                          {ttSeo.description || <span className="text-muted fst-italic">Mô tả...</span>}
                        </div>
                        {ttSeo.hashtags && (
                          <div className="mt-1" style={{ fontSize: 11 }}>
                            {ttSeo.hashtags.split(' ').slice(0, 3).map((tag, i) => (
                              <span key={i} className="me-1" style={{ color: '#fe2c55' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hình ảnh TikTok */}
              <ImageCardGrid
                images={ttImages}
                platform="TIKTOK"
                platformLabel="TikTok"
                uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho TikTok."
                onImagesChange={setTtImages}
              />
            </div>
          )}

          {/* === SEO YOUTUBE === */}
          {activeTab === 'seo-yt' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO YouTube</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#ffeef0', color: '#ff0000' }}>YOUTUBE</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input name="linkPosted" value={ytSeo.linkPosted} onChange={handleYtSeo}
                    placeholder="https://youtube.com/watch?v=..." className="form-control form-control-sm" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title</label>
                  <div className="input-group input-group-sm">
                    <input name="title" value={ytSeo.title} onChange={handleYtSeo}
                      placeholder="Tiêu đề video YouTube" className="form-control" maxLength={100} />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ytSeo.title);
                        alert('✅ Đã copy Title!');
                      }}
                      title="Copy Title">
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  <small className="text-muted">{ytSeo.title?.length || 0}/100 ký tự</small>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description</label>
                  <div className="input-group">
                    <textarea name="description" value={ytSeo.description} onChange={handleYtSeo}
                      rows={6} placeholder="Mô tả chi tiết video..." className="form-control form-control-sm" maxLength={5000} style={{ resize: 'vertical' }} />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ytSeo.description);
                        alert('✅ Đã copy Description!');
                      }}
                      title="Copy Description"
                      style={{ alignSelf: 'flex-start' }}>
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  <small className="text-muted">{ytSeo.description?.length || 0}/5000 ký tự</small>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Tags</label>
                    <div className="input-group input-group-sm">
                      <input name="tags" value={ytSeo.tags} onChange={handleYtSeo}
                        placeholder="nội thất, giường, tủ" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(ytSeo.tags);
                          alert('✅ Đã copy Tags!');
                        }}
                        title="Copy Tags">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <small className="text-muted">Phân cách bằng dấu phẩy</small>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Tags mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất' : 'nội thất' }))}>nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất đẹp' : 'nội thất đẹp' }))}>nội thất đẹp</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất giá rẻ' : 'nội thất giá rẻ' }))}>nội thất giá rẻ</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất cao cấp' : 'nội thất cao cấp' }))}>nội thất cao cấp</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', sofa' : 'sofa' }))}>sofa</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', bàn ghế' : 'bàn ghế' }))}>bàn ghế</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', giường ngủ' : 'giường ngủ' }))}>giường ngủ</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', tủ quần áo' : 'tủ quần áo' }))}>tủ quần áo</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', bàn làm việc' : 'bàn làm việc' }))}>bàn làm việc</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', kệ tivi' : 'kệ tivi' }))}>kệ tivi</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', thiết kế nội thất' : 'thiết kế nội thất' }))}>thiết kế nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', thi công nội thất' : 'thi công nội thất' }))}>thi công nội thất</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất phòng khách' : 'nội thất phòng khách' }))}>nội thất phòng khách</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất phòng ngủ' : 'nội thất phòng ngủ' }))}>nội thất phòng ngủ</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất bếp' : 'nội thất bếp' }))}>nội thất bếp</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất văn phòng' : 'nội thất văn phòng' }))}>nội thất văn phòng</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất gỗ' : 'nội thất gỗ' }))}>nội thất gỗ</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất hiện đại' : 'nội thất hiện đại' }))}>nội thất hiện đại</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất tối giản' : 'nội thất tối giản' }))}>nội thất tối giản</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', nội thất TPHCM' : 'nội thất TPHCM' }))}>nội thất TPHCM</button>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input name="hashtags" value={ytSeo.hashtags} onChange={handleYtSeo}
                        placeholder="#noithat #noithatdep" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(ytSeo.hashtags);
                          alert('✅ Đã copy Hashtags!');
                        }}
                        title="Copy Hashtags">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Hashtags mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithat' : '#noithat' }))}>noithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatdep' : '#noithatdep' }))}>noithatdep</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatgiare' : '#noithatgiare' }))}>noithatgiare</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatcaocap' : '#noithatcaocap' }))}>noithatcaocap</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #sofa' : '#sofa' }))}>sofa</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #banghe' : '#banghe' }))}>banghe</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #giuongngu' : '#giuongngu' }))}>giuongngu</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #tuquanao' : '#tuquanao' }))}>tuquanao</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #banlamviec' : '#banlamviec' }))}>banlamviec</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #ketivi' : '#ketivi' }))}>ketivi</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #thietkenoithat' : '#thietkenoithat' }))}>thietkenoithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #thicongnoithat' : '#thicongnoithat' }))}>thicongnoithat</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatphongkhach' : '#noithatphongkhach' }))}>noithatphongkhach</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatphongngu' : '#noithatphongngu' }))}>noithatphongngu</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatbep' : '#noithatbep' }))}>noithatbep</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatvanphong' : '#noithatvanphong' }))}>noithatvanphong</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithatgo' : '#noithatgo' }))}>noithatgo</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithathiendai' : '#noithathiendai' }))}>noithathiendai</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithattoigian' : '#noithattoigian' }))}>noithattoigian</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' #noithattphcm' : '#noithattphcm' }))}>noithattphcm</button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Location */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    <i className="bi bi-geo-alt me-1"></i>Vị trí quay video (Location)
                  </label>
                  <div className="input-group input-group-sm mb-2">
                    <input name="location" value={ytSeo.location} onChange={handleYtSeo}
                      placeholder="VD: Xưởng Nội Thất Minh Quân, TPHCM" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ytSeo.location);
                        alert('✅ Đã copy Location!');
                      }}
                      title="Copy Location">
                      <i className="bi bi-clipboard"></i>
                    </button>
                    <button type="button" className="btn btn-outline-primary" onClick={() => openMapModal('yt')} title="Chọn từ bản đồ">
                      <i className="bi bi-map"></i>
                    </button>
                    <button type="button" className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                      <i className="bi bi-geo-alt"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><h6 className="dropdown-header">Chọn vị trí nhanh</h6></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setYtSeo(p => ({ ...p, location: 'Nội Thất Minh Quân - TP. Hồ Chí Minh' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Nội Thất Minh Quân - TP. Hồ Chí Minh
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setYtSeo(p => ({ ...p, location: 'Xưởng Nội Thất Minh Quân - Quận 12, TPHCM' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Xưởng Nội Thất Minh Quân - Quận 12, TPHCM
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setYtSeo(p => ({ ...p, location: 'Showroom Nội Thất Minh Quân - Quận 1, TPHCM' }))}>
                        <i className="bi bi-geo-alt-fill me-2 text-primary"></i>Showroom Nội Thất Minh Quân - Quận 1, TPHCM
                      </button></li>
                      <li><hr className="dropdown-divider" /></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setYtSeo(p => ({ ...p, location: 'TP. Hồ Chí Minh, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>TP. Hồ Chí Minh, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setYtSeo(p => ({ ...p, location: 'Hà Nội, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Hà Nội, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setYtSeo(p => ({ ...p, location: 'Đà Nẵng, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Đà Nẵng, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setYtSeo(p => ({ ...p, location: 'Cần Thơ, Việt Nam' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Cần Thơ, Việt Nam
                      </button></li>
                      <li><button type="button" className="dropdown-item" onClick={() => setYtSeo(p => ({ ...p, location: 'Biên Hòa, Đồng Nai' }))}>
                        <i className="bi bi-geo-alt me-2"></i>Biên Hòa, Đồng Nai
                      </button></li>
                      <li><hr className="dropdown-divider" /></li>
                      <li><button type="button" className="dropdown-item text-danger" onClick={() => setYtSeo(p => ({ ...p, location: '' }))}>
                        <i className="bi bi-x-circle me-2"></i>Xóa vị trí
                      </button></li>
                    </ul>
                  </div>
                  <small className="text-muted">Giúp video xuất hiện trong tìm kiếm địa phương</small>
                </div>
                
                {/* Suggested Tags */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Gợi ý Tags phổ biến</label>
                  <div className="d-flex flex-wrap gap-2">
                    {['nội thất', 'nội thất đẹp', 'nội thất giá rẻ', 'giường ngủ', 'tủ quần áo', 'bàn ghế', 'nội thất phòng ngủ', 'nội thất TPHCM'].map(tag => (
                      <button key={tag} type="button" className="btn btn-sm btn-outline-danger"
                        onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? `${p.tags}, ${tag}` : tag }))}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <SingleImageUploader
                    value={ytSeo.image}
                    onChange={(url) => setYtSeo((p) => ({ ...p, image: url }))}
                    label="Thumbnail (1280x720px)"
                    defaultSrc="/admin/assets/images/default-image_100.png"
                  />
                  <small className="text-muted">Kích thước đề xuất: 1280x720px (16:9)</small>
                </div>

                {/* Copy to Clipboard Button */}
                <div className="mb-3">
                  <button type="button" className="btn btn-danger btn-sm w-100" 
                    onClick={() => {
                      const content = `${ytSeo.title}\n\n${ytSeo.description}\n\nTags: ${ytSeo.tags}\n${ytSeo.hashtags}`;
                      navigator.clipboard.writeText(content).then(() => {
                        alert('✅ Đã copy nội dung! Paste vào YouTube ngay.');
                      }).catch(() => {
                        alert('❌ Không thể copy. Vui lòng copy thủ công.');
                      });
                    }}>
                    <i className="bi bi-clipboard-check me-2"></i>
                    Copy toàn bộ nội dung để đăng YouTube
                  </button>
                </div>

                {/* YouTube Video Preview - Compact */}
                <div className="card mt-3" style={{ background: '#0f0f0f', maxWidth: 450 }}>
                  <div className="card-header py-2" style={{ background: '#0f0f0f', borderBottom: '1px solid #3f3f3f', color: '#fff' }}>
                    <i className="bi bi-youtube text-danger me-1" style={{ fontSize: 14 }}></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>Preview YouTube</span>
                  </div>
                  <div className="card-body p-3" style={{ background: '#0f0f0f', color: '#fff' }}>
                    {/* Thumbnail */}
                    <div className="mb-2" style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: 8, overflow: 'hidden', maxHeight: 200 }}>
                      {ytSeo.image ? (
                        <img src={ytSeo.image} alt="Thumbnail" 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                          <i className="bi bi-play-circle-fill" style={{ fontSize: 40, color: '#ff0000' }}></i>
                          <div className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>Thumbnail...</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Video Info */}
                    <div className="mb-2">
                      <h6 className="mb-1" style={{ fontSize: 13, fontWeight: 600, maxHeight: 40, overflow: 'hidden' }}>
                        {ytSeo.title || <span className="text-muted fst-italic">Tiêu đề...</span>}
                      </h6>
                      <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: 11, color: '#aaa' }}>
                        <span>1.2K views</span>
                        <span>•</span>
                        <span>2 giờ trước</span>
                      </div>
                    </div>
                    
                    {/* Channel Info */}
                    <div className="d-flex align-items-center mb-2">
                      <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center me-2" 
                        style={{ width: 28, height: 28, minWidth: 28 }}>
                        <i className="bi bi-shop text-white" style={{ fontSize: 12 }}></i>
                      </div>
                      <div>
                        <div className="fw-semibold" style={{ fontSize: 12 }}>Nội Thất Minh Quân</div>
                        <div style={{ fontSize: 10, color: '#aaa' }}>10K subscribers</div>
                      </div>
                      <button className="btn btn-danger btn-sm ms-auto py-0 px-2" style={{ borderRadius: 20, fontSize: 11 }}>
                        Subscribe
                      </button>
                    </div>
                    
                    {/* Description */}
                    <div className="p-2" style={{ background: '#272727', borderRadius: 8, fontSize: 12 }}>
                      {ytSeo.location && (
                        <div className="mb-1" style={{ fontSize: 10, color: '#aaa' }}>
                          <i className="bi bi-geo-alt me-1"></i>{ytSeo.location}
                        </div>
                      )}
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 60, overflow: 'hidden' }}>
                        {ytSeo.description || <span className="text-muted fst-italic">Mô tả...</span>}
                      </div>
                      {ytSeo.hashtags && (
                        <div className="mt-1 text-primary" style={{ fontSize: 11 }}>
                          {ytSeo.hashtags}
                        </div>
                      )}
                      {ytSeo.tags && (
                        <div className="mt-1" style={{ fontSize: 10, color: '#aaa' }}>
                          Tags: {ytSeo.tags.split(',').slice(0, 3).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Hình ảnh YouTube */}
              </div>

              {/* Hình ảnh YouTube */}
              <ImageCardGrid
                images={ytImages}
                platform="YOUTUBE"
                platformLabel="YouTube"
                uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho YouTube."
                onImagesChange={setYtImages}
              />
            </div>
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
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="isShowHome"
                  id="isShowHome" checked={form.isShowHome} onChange={handle} />
                <label className="form-check-label" htmlFor="isShowHome">Hiển thị trang chủ</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Hidden'}
              </span>
              <hr />
              {isEdit && (
                <>
                  <div className="mb-2">
                    <span className="text-muted small">Lượt xem:</span>
                    <span className="fw-semibold ms-1">{category.viewCount ?? 0}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted small">Tạo lúc:</span>
                    <span className="small ms-1">
                      {category.createdAt ? new Date(category.createdAt).toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted small">Cập nhật:</span>
                    <span className="small ms-1">
                      {category.updatedAt ? new Date(category.updatedAt).toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showMapModal}
        onClose={() => {
          setShowMapModal(false);
          setCurrentLocationField(null);
        }}
        onSelect={selectLocationFromMap}
        currentLocation={
          currentLocationField === 'fb' ? fbSeo.location :
          currentLocationField === 'tt' ? ttSeo.location :
          currentLocationField === 'yt' ? ytSeo.location : ''
        }
      />
    </form>
  );
}
