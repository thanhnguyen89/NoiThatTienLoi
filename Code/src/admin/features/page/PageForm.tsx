'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { toast } from '@/admin/components/Toast';
import { LocationPickerModal } from '@/admin/components/LocationPickerModal';

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

type TabId = 'basic' | 'seo-fb' | 'seo-tt' | 'seo-yt';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'seo-fb', label: 'Facebook' },
  { id: 'seo-tt', label: 'TikTok' },
  { id: 'seo-yt', label: 'YouTube' },
];

const EMOJI_SET = [
  '🏠', '🏡', '🛋️', '🪑', '🛏️', '🚪', '🪟', '💡',
  '✨', '🌟', '💎', '⭐', '💯', '✅',
  '🔥', '👍', '👌', '❤️', '😍',
  '💰', '🎁', '⚡',
  '🚚', '📦', '🔨', '🔧', '🎨', '🏘️',
];

const LOCATION_PRESETS = [
  'Nội Thất Minh Quân - TP. Hồ Chí Minh',
  'Xưởng Nội Thất Minh Quân - Quận 12, TPHCM',
  'Showroom Nội Thất Minh Quân - Quận 1, TPHCM',
  'TP. Hồ Chí Minh, Việt Nam',
  'Hà Nội, Việt Nam',
  'Đà Nẵng, Việt Nam',
  'Cần Thơ, Việt Nam',
  'Biên Hòa, Đồng Nai',
  'Bình Dương, Việt Nam',
];

const KEYWORD_SAMPLES = [
  'nội thất', 'nội thất đẹp', 'nội thất giá rẻ', 'nội thất cao cấp', 'sofa',
  'bàn ăn', 'giường ngủ', 'tủ quần áo', 'tủ bếp', 'nội thất phòng khách',
  'nội thất phòng ngủ', 'nội thất văn phòng', 'thi công nội thất', 'trang trí nội thất', 'đồ gỗ nội thất',
  'nội thất hiện đại', 'nội thất tân cổ điển', 'nội thất thông minh', 'nội thất TPHCM', 'nội thất Việt Nam',
];

const HASHTAG_SAMPLES = [
  '#noithat', '#noithatdep', '#noithatgiare', '#noithatcaocap', '#sofa',
  '#banan', '#giuongngu', '#tuquanao', '#tubep', '#noithatphongkhach',
  '#noithatphongngu', '#noithatvanphong', '#thicongnoithat', '#trangtrinoithat', '#dogonoithat',
  '#noithathiendai', '#noithattancodien', '#noithatthongminh', '#noithattphcm', '#noithatvietnam',
];

const YT_TAG_SAMPLES = [
  'nội thất', 'nội thất đẹp', 'nội thất giá rẻ', 'nội thất cao cấp', 'sofa',
  'bàn ăn', 'giường ngủ', 'tủ quần áo', 'tủ bếp', 'nội thất phòng khách',
  'nội thất phòng ngủ', 'nội thất văn phòng', 'thi công nội thất', 'trang trí nội thất', 'đồ gỗ nội thất',
  'nội thất hiện đại', 'nội thất tân cổ điển', 'nội thất thông minh', 'nội thất TPHCM', 'nội thất Việt Nam',
];

function addWithSpace(current: string, value: string) {
  if (!current) return value;
  return `${current} ${value}`;
}

function addWithComma(current: string, value: string) {
  if (!current) return value;
  return `${current}, ${value}`;
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
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentLocationField, setCurrentLocationField] = useState<'fb' | 'tt' | 'yt' | null>(null);

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

  const [fbSeo, setFbSeo] = useState({
    title: '',
    description: '',
    keywords: '',
    hashtags: '',
    location: '',
    linkPosted: '',
  });

  const [ttSeo, setTtSeo] = useState({
    title: '',
    description: '',
    keywords: '',
    hashtags: '',
    location: '',
    linkPosted: '',
  });

  const [ytSeo, setYtSeo] = useState({
    title: '',
    description: '',
    tags: '',
    hashtags: '',
    location: '',
    linkPosted: '',
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

  function openMapModal(platform: 'fb' | 'tt' | 'yt') {
    setCurrentLocationField(platform);
    setShowMapModal(true);
  }

  function selectLocationFromMap(location: string) {
    if (currentLocationField === 'fb') setFbSeo((p) => ({ ...p, location }));
    else if (currentLocationField === 'tt') setTtSeo((p) => ({ ...p, location }));
    else if (currentLocationField === 'yt') setYtSeo((p) => ({ ...p, location }));
    setShowMapModal(false);
    setCurrentLocationField(null);
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value || '');
      toast(`Đã copy ${label}!`, 'success');
    } catch {
      toast(`Không thể copy ${label}`, 'error');
    }
  }

  function appendEmoji(platform: 'fb' | 'tt' | 'yt', emoji: string) {
    if (platform === 'fb') setFbSeo((p) => ({ ...p, description: addWithSpace(p.description, emoji) }));
    if (platform === 'tt') setTtSeo((p) => ({ ...p, description: addWithSpace(p.description, emoji) }));
    if (platform === 'yt') setYtSeo((p) => ({ ...p, description: addWithSpace(p.description, emoji) }));
  }

  function addKeyword(platform: 'fb' | 'tt', keyword: string) {
    if (platform === 'fb') setFbSeo((p) => ({ ...p, keywords: addWithComma(p.keywords, keyword) }));
    if (platform === 'tt') setTtSeo((p) => ({ ...p, keywords: addWithComma(p.keywords, keyword) }));
  }

  function addTag(tag: string) {
    setYtSeo((p) => ({ ...p, tags: addWithComma(p.tags, tag) }));
  }

  function addHashtag(platform: 'fb' | 'tt' | 'yt', hashtag: string) {
    if (platform === 'fb') setFbSeo((p) => ({ ...p, hashtags: addWithSpace(p.hashtags, hashtag) }));
    if (platform === 'tt') setTtSeo((p) => ({ ...p, hashtags: addWithSpace(p.hashtags, hashtag) }));
    if (platform === 'yt') setYtSeo((p) => ({ ...p, hashtags: addWithSpace(p.hashtags, hashtag) }));
  }

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

  const currentModalLocation =
    currentLocationField === 'fb' ? fbSeo.location
      : currentLocationField === 'tt' ? ttSeo.location
        : currentLocationField === 'yt' ? ytSeo.location
          : '';

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

      <ul className="nav nav-tabs mb-3">
        {TABS.map((tab) => (
          <li key={tab.id} className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className={`row g-3 ${activeTab !== 'basic' ? 'd-none' : ''}`}>
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

      {activeTab !== 'basic' && (
        <div className="row g-3">
          <div className="col-12">
            {activeTab === 'seo-fb' && (
              <div className="card mb-3">
                <div className="card-header fw-semibold">SEO Facebook</div>
                <div className="card-body">
                  <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Tối ưu cho Facebook</span>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Link bài đã đăng</label>
                    <div className="input-group input-group-sm">
                      <input name="linkPosted" value={fbSeo.linkPosted} onChange={handleFbSeo}
                        placeholder="https://facebook.com/post/123" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(fbSeo.linkPosted, 'Link Facebook')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Title Facebook</label>
                    <div className="input-group input-group-sm">
                      <input name="title" value={fbSeo.title} onChange={handleFbSeo}
                        placeholder="Tiêu đề bài viết" className="form-control" maxLength={120} />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(fbSeo.title, 'Title Facebook')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <small className="text-muted">{fbSeo.title.length}/120</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mô tả</label>
                    <div className="input-group input-group-sm">
                      <textarea name="description" value={fbSeo.description} onChange={handleFbSeo}
                        rows={3} placeholder="Mô tả nội dung Facebook" className="form-control" maxLength={300} />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(fbSeo.description, 'Mô tả Facebook')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <small className="text-muted">{fbSeo.description.length}/300</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Keywords</label>
                    <div className="input-group input-group-sm">
                      <input name="keywords" value={fbSeo.keywords} onChange={handleFbSeo}
                        placeholder="keyword1, keyword2" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(fbSeo.keywords, 'Keywords Facebook')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input name="hashtags" value={fbSeo.hashtags} onChange={handleFbSeo}
                        placeholder="#noithat #noithatdep" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(fbSeo.hashtags, 'Hashtags Facebook')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold"><i className="bi bi-geo-alt me-1"></i>Location</label>
                    <div className="input-group input-group-sm mb-2">
                      <input name="location" value={fbSeo.location} onChange={handleFbSeo}
                        placeholder="VD: TP. Hồ Chí Minh, Việt Nam" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(fbSeo.location, 'Location Facebook')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                      <button type="button" className="btn btn-outline-primary" onClick={() => openMapModal('fb')}>
                        <i className="bi bi-map"></i>
                      </button>
                      <button type="button" className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown"></button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        {LOCATION_PRESETS.map((loc) => (
                          <li key={`fb-${loc}`}>
                            <button type="button" className="dropdown-item" onClick={() => setFbSeo((p) => ({ ...p, location: loc }))}>{loc}</button>
                          </li>
                        ))}
                        <li><hr className="dropdown-divider" /></li>
                        <li><button type="button" className="dropdown-item text-danger" onClick={() => setFbSeo((p) => ({ ...p, location: '' }))}>Xóa vị trí</button></li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Emoji nhanh (28)</label>
                    <div className="d-flex flex-wrap gap-1">
                      {EMOJI_SET.map((emoji) => (
                        <button key={`fb-emoji-${emoji}`} type="button" className="btn btn-sm btn-outline-secondary"
                          style={{ fontSize: 14, padding: '2px 8px' }} onClick={() => appendEmoji('fb', emoji)}>{emoji}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Keywords gợi ý</label>
                    <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 110, overflowY: 'auto' }}>
                      {KEYWORD_SAMPLES.map((k) => (
                        <button key={`fb-key-${k}`} type="button" className="btn btn-sm btn-outline-info"
                          style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => addKeyword('fb', k)}>{k}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Hashtags gợi ý</label>
                    <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 110, overflowY: 'auto' }}>
                      {HASHTAG_SAMPLES.map((h) => (
                        <button key={`fb-tag-${h}`} type="button" className="btn btn-sm btn-outline-primary"
                          style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => addHashtag('fb', h)}>{h.replace('#', '')}</button>
                      ))}
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mb-3">
                    <button type="button" className="btn btn-sm btn-primary"
                      onClick={() => copyText(`${fbSeo.title}\n${fbSeo.description}\n${fbSeo.hashtags}`.trim(), 'Nội dung Facebook')}>
                      <i className="bi bi-clipboard-check me-1"></i>Copy tất cả
                    </button>
                  </div>

                  <div className="card" style={{ border: '1px solid #d9dee3' }}>
                    <div className="card-header py-2 bg-light">Xem trước Facebook</div>
                    <div className="card-body">
                      <div className="fw-semibold mb-1">{fbSeo.title || form.title || 'Tiêu đề Facebook'}</div>
                      <div className="text-muted mb-1" style={{ fontSize: 13 }}>{fbSeo.description || form.shortDescription || 'Mô tả Facebook...'}</div>
                      {fbSeo.location && <div style={{ fontSize: 12 }}><i className="bi bi-geo-alt me-1"></i>{fbSeo.location}</div>}
                      {fbSeo.hashtags && <div className="text-primary mt-1" style={{ fontSize: 12 }}>{fbSeo.hashtags}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo-tt' && (
              <div className="card mb-3">
                <div className="card-header fw-semibold">SEO TikTok</div>
                <div className="card-body">
                  <span className="badge mb-3" style={{ background: '#eef2ff', color: '#4338ca' }}>Tối ưu cho TikTok</span>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Link video đã đăng</label>
                    <div className="input-group input-group-sm">
                      <input name="linkPosted" value={ttSeo.linkPosted} onChange={handleTtSeo}
                        placeholder="https://tiktok.com/@username/video/123" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ttSeo.linkPosted, 'Link TikTok')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Title TikTok</label>
                    <div className="input-group input-group-sm">
                      <input name="title" value={ttSeo.title} onChange={handleTtSeo}
                        placeholder="Caption TikTok" className="form-control" maxLength={150} />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ttSeo.title, 'Title TikTok')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <small className="text-muted">{ttSeo.title.length}/150</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mô tả</label>
                    <div className="input-group input-group-sm">
                      <textarea name="description" value={ttSeo.description} onChange={handleTtSeo}
                        rows={3} placeholder="Mô tả video TikTok" className="form-control" maxLength={300} />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ttSeo.description, 'Mô tả TikTok')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <small className="text-muted">{ttSeo.description.length}/300</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Keywords</label>
                    <div className="input-group input-group-sm">
                      <input name="keywords" value={ttSeo.keywords} onChange={handleTtSeo}
                        placeholder="keyword1, keyword2" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ttSeo.keywords, 'Keywords TikTok')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input name="hashtags" value={ttSeo.hashtags} onChange={handleTtSeo}
                        placeholder="#noithat #decor" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ttSeo.hashtags, 'Hashtags TikTok')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold"><i className="bi bi-geo-alt me-1"></i>Location</label>
                    <div className="input-group input-group-sm mb-2">
                      <input name="location" value={ttSeo.location} onChange={handleTtSeo}
                        placeholder="VD: TP. Hồ Chí Minh, Việt Nam" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ttSeo.location, 'Location TikTok')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                      <button type="button" className="btn btn-outline-primary" onClick={() => openMapModal('tt')}>
                        <i className="bi bi-map"></i>
                      </button>
                      <button type="button" className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown"></button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        {LOCATION_PRESETS.map((loc) => (
                          <li key={`tt-${loc}`}>
                            <button type="button" className="dropdown-item" onClick={() => setTtSeo((p) => ({ ...p, location: loc }))}>{loc}</button>
                          </li>
                        ))}
                        <li><hr className="dropdown-divider" /></li>
                        <li><button type="button" className="dropdown-item text-danger" onClick={() => setTtSeo((p) => ({ ...p, location: '' }))}>Xóa vị trí</button></li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Emoji nhanh (28)</label>
                    <div className="d-flex flex-wrap gap-1">
                      {EMOJI_SET.map((emoji) => (
                        <button key={`tt-emoji-${emoji}`} type="button" className="btn btn-sm btn-outline-secondary"
                          style={{ fontSize: 14, padding: '2px 8px' }} onClick={() => appendEmoji('tt', emoji)}>{emoji}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Keywords gợi ý</label>
                    <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 110, overflowY: 'auto' }}>
                      {KEYWORD_SAMPLES.map((k) => (
                        <button key={`tt-key-${k}`} type="button" className="btn btn-sm btn-outline-info"
                          style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => addKeyword('tt', k)}>{k}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Hashtags gợi ý</label>
                    <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 110, overflowY: 'auto' }}>
                      {HASHTAG_SAMPLES.map((h) => (
                        <button key={`tt-tag-${h}`} type="button" className="btn btn-sm btn-outline-primary"
                          style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => addHashtag('tt', h)}>{h.replace('#', '')}</button>
                      ))}
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mb-3">
                    <button type="button" className="btn btn-sm btn-primary"
                      onClick={() => copyText(`${ttSeo.title}\n${ttSeo.description}\n${ttSeo.hashtags}`.trim(), 'Nội dung TikTok')}>
                      <i className="bi bi-clipboard-check me-1"></i>Copy tất cả
                    </button>
                  </div>

                  <div className="card" style={{ border: '1px solid #d9dee3', background: '#111827', color: '#f9fafb' }}>
                    <div className="card-header py-2" style={{ background: '#1f2937', borderBottom: '1px solid #374151' }}>Xem trước TikTok</div>
                    <div className="card-body">
                      <div className="fw-semibold mb-1">{ttSeo.title || form.title || 'Caption TikTok'}</div>
                      <div className="mb-1" style={{ fontSize: 13, color: '#d1d5db' }}>{ttSeo.description || form.shortDescription || 'Mô tả TikTok...'}</div>
                      {ttSeo.location && <div style={{ fontSize: 12, color: '#9ca3af' }}><i className="bi bi-geo-alt me-1"></i>{ttSeo.location}</div>}
                      {ttSeo.hashtags && <div className="mt-1" style={{ color: '#60a5fa', fontSize: 12 }}>{ttSeo.hashtags}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo-yt' && (
              <div className="card mb-3">
                <div className="card-header fw-semibold">SEO YouTube</div>
                <div className="card-body">
                  <span className="badge mb-3" style={{ background: '#fef2f2', color: '#dc2626' }}>Tối ưu cho YouTube</span>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Link video đã đăng</label>
                    <div className="input-group input-group-sm">
                      <input name="linkPosted" value={ytSeo.linkPosted} onChange={handleYtSeo}
                        placeholder="https://youtube.com/watch?v=..." className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ytSeo.linkPosted, 'Link YouTube')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Title YouTube</label>
                    <div className="input-group input-group-sm">
                      <input name="title" value={ytSeo.title} onChange={handleYtSeo}
                        placeholder="Tiêu đề video YouTube" className="form-control" maxLength={100} />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ytSeo.title, 'Title YouTube')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <small className="text-muted">{ytSeo.title.length}/100</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mô tả</label>
                    <div className="input-group input-group-sm">
                      <textarea name="description" value={ytSeo.description} onChange={handleYtSeo}
                        rows={4} placeholder="Mô tả video YouTube" className="form-control" maxLength={5000} />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ytSeo.description, 'Mô tả YouTube')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <small className="text-muted">{ytSeo.description.length}/5000</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tags</label>
                    <div className="input-group input-group-sm">
                      <input name="tags" value={ytSeo.tags} onChange={handleYtSeo}
                        placeholder="tag1, tag2, tag3" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ytSeo.tags, 'Tags YouTube')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input name="hashtags" value={ytSeo.hashtags} onChange={handleYtSeo}
                        placeholder="#noithat #youtube #decor" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ytSeo.hashtags, 'Hashtags YouTube')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold"><i className="bi bi-geo-alt me-1"></i>Location</label>
                    <div className="input-group input-group-sm mb-2">
                      <input name="location" value={ytSeo.location} onChange={handleYtSeo}
                        placeholder="VD: TP. Hồ Chí Minh, Việt Nam" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => copyText(ytSeo.location, 'Location YouTube')}>
                        <i className="bi bi-clipboard"></i>
                      </button>
                      <button type="button" className="btn btn-outline-primary" onClick={() => openMapModal('yt')}>
                        <i className="bi bi-map"></i>
                      </button>
                      <button type="button" className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown"></button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        {LOCATION_PRESETS.map((loc) => (
                          <li key={`yt-${loc}`}>
                            <button type="button" className="dropdown-item" onClick={() => setYtSeo((p) => ({ ...p, location: loc }))}>{loc}</button>
                          </li>
                        ))}
                        <li><hr className="dropdown-divider" /></li>
                        <li><button type="button" className="dropdown-item text-danger" onClick={() => setYtSeo((p) => ({ ...p, location: '' }))}>Xóa vị trí</button></li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Emoji nhanh (28)</label>
                    <div className="d-flex flex-wrap gap-1">
                      {EMOJI_SET.map((emoji) => (
                        <button key={`yt-emoji-${emoji}`} type="button" className="btn btn-sm btn-outline-secondary"
                          style={{ fontSize: 14, padding: '2px 8px' }} onClick={() => appendEmoji('yt', emoji)}>{emoji}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tags gợi ý</label>
                    <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 110, overflowY: 'auto' }}>
                      {YT_TAG_SAMPLES.map((t) => (
                        <button key={`yt-key-${t}`} type="button" className="btn btn-sm btn-outline-info"
                          style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => addTag(t)}>{t}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Hashtags gợi ý</label>
                    <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 110, overflowY: 'auto' }}>
                      {HASHTAG_SAMPLES.map((h) => (
                        <button key={`yt-tag-${h}`} type="button" className="btn btn-sm btn-outline-primary"
                          style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => addHashtag('yt', h)}>{h.replace('#', '')}</button>
                      ))}
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mb-3">
                    <button type="button" className="btn btn-sm btn-primary"
                      onClick={() => copyText(`${ytSeo.title}\n${ytSeo.description}\n${ytSeo.tags}\n${ytSeo.hashtags}`.trim(), 'Nội dung YouTube')}>
                      <i className="bi bi-clipboard-check me-1"></i>Copy tất cả
                    </button>
                  </div>

                  <div className="card" style={{ border: '1px solid #d9dee3', background: '#0f0f0f', color: '#f9fafb' }}>
                    <div className="card-header py-2" style={{ background: '#1f1f1f', borderBottom: '1px solid #333' }}>Xem trước YouTube</div>
                    <div className="card-body">
                      <div className="fw-semibold mb-1">{ytSeo.title || form.title || 'Tiêu đề YouTube'}</div>
                      <div className="mb-1" style={{ fontSize: 13, color: '#d1d5db' }}>{ytSeo.description || form.shortDescription || 'Mô tả YouTube...'}</div>
                      {ytSeo.location && <div style={{ fontSize: 12, color: '#9ca3af' }}><i className="bi bi-geo-alt me-1"></i>{ytSeo.location}</div>}
                      {ytSeo.hashtags && <div className="mt-1" style={{ color: '#60a5fa', fontSize: 12 }}>{ytSeo.hashtags}</div>}
                      {ytSeo.tags && <div className="mt-1" style={{ fontSize: 11, color: '#9ca3af' }}>Tags: {ytSeo.tags}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <LocationPickerModal
        isOpen={showMapModal}
        onClose={() => {
          setShowMapModal(false);
          setCurrentLocationField(null);
        }}
        onSelect={selectLocationFromMap}
        currentLocation={currentModalLocation}
      />

    </form>
  );
}
