'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSlug } from '@/lib/utils';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { LocationPickerModal } from '@/admin/components/LocationPickerModal';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { toast } from '@/admin/components/Toast';

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

interface NewsDetail {
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
  isRedirect: boolean | null;
  authorName: string | null;
  publishedAt: Date | string | null;
  viewCount: number | null;
  commentCount: number | null;
  likeCount: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  
  // SEO Website
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  isMobile: boolean | null;
  
  // SEO Facebook
  fbTitle: string | null;
  fbDescription: string | null;
  fbKeywords: string | null;
  fbHashtags: string | null;
  fbLocation: string | null;
  fbImage: string | null;
  fbLinkPosted: string | null;
  
  // SEO TikTok
  ttTitle: string | null;
  ttDescription: string | null;
  ttKeywords: string | null;
  ttHashtags: string | null;
  ttLocation: string | null;
  ttImage: string | null;
  ttLinkPosted: string | null;
  
  // SEO YouTube
  ytTitle: string | null;
  ytDescription: string | null;
  ytTags: string | null;
  ytHashtags: string | null;
  ytLocation: string | null;
  ytImage: string | null;
  ytLinkPosted: string | null;
  
  // 28 fields mới từ Phase 2
  authorId: string | null;
  authorEmail: string | null;
  authorAvatar: string | null;
  tags: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  readingTime: number | null;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  featuredImageCaption: string | null;
  galleryImages: string | null;
  videoUrl: string | null;
  videoThumbnail: string | null;
  audioUrl: string | null;
  relatedNewsIds: string | null;
  externalUrl: string | null;
  isExternalLink: boolean | null;
  openInNewTab: boolean | null;
  isFeatured: boolean | null;
  isBreakingNews: boolean | null;
  isPinned: boolean | null;
  expiryDate: Date | string | null;
  scheduledPublishDate: Date | string | null;
  lastModifiedBy: string | null;
  revisionNumber: number | null;
  contentFormat: string | null;
  customCss: string | null;
  customJs: string | null;
  jsonData: string | null;
}

interface CategoryOption {
  id: string;
  title: string | null;
}

interface Props {
  news?: NewsDetail;
  categories?: CategoryOption[];
}

export function NewsForm({ news, categories = [] }: Props) {
  const router = useRouter();
  const isEdit = !!news;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEdit);
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentLocationField, setCurrentLocationField] = useState<'fb' | 'tt' | 'yt' | null>(null);

  const [form, setForm] = useState({
    title: news?.title || '',
    summary: news?.summary || '',
    content: news?.content || '',
    image: news?.image || '',
    seName: news?.seName || '',
    isPublished: news?.isPublished ?? true,
    isShowHome: news?.isShowHome ?? false,
    isActive: news?.isActive ?? true,
    isNew: news?.isNew ?? false,
    allowComments: news?.allowComments ?? true,
    newTag: news?.newTag || '',
    sortOrder: String(news?.sortOrder ?? 0),
    authorName: news?.authorName || '',
    publishedAt: news?.publishedAt ? (typeof news.publishedAt === 'string' ? news.publishedAt : new Date(news.publishedAt).toISOString().slice(0, 16)) : '',
    viewCount: String(news?.viewCount ?? 0),
    commentCount: String(news?.commentCount ?? 0),
    likeCount: String(news?.likeCount ?? 0),
  });

  const [auditInfo] = useState({
    createdAt: news?.createdAt || null,
    updatedAt: news?.updatedAt || null,
  });

  // SEO per platform
  const [webSeo, setWebSeo] = useState({
    metaTitle: news?.metaTitle || '',
    metaDescription: news?.metaDescription || '',
    metaKeywords: news?.metaKeywords || '',
    ogTitle: news?.ogTitle || '',
    ogDescription: news?.ogDescription || '',
    ogImage: news?.ogImage || '',
    robots: news?.robots || 'index,follow',
    seoCanonical: news?.seoCanonical || '',
    seoNoindex: news?.seoNoindex ?? false,
    slugRedirect: news?.slugRedirect || '',
    isRedirect: news?.isRedirect ?? false,
    isMobile: news?.isMobile ?? false,
  });

  const [fbSeo, setFbSeo] = useState({
    title: news?.fbTitle || '',
    description: news?.fbDescription || '',
    keywords: news?.fbKeywords || '',
    hashtags: news?.fbHashtags || '',
    image: news?.fbImage || '',
    linkPosted: news?.fbLinkPosted || '',
    location: '',
  });

  const [ttSeo, setTtSeo] = useState({
    title: news?.ttTitle || '',
    description: news?.ttDescription || '',
    keywords: news?.ttKeywords || '',
    hashtags: news?.ttHashtags || '',
    image: news?.ttImage || '',
    linkPosted: news?.ttLinkPosted || '',
    location: '',
  });

  const [ytSeo, setYtSeo] = useState({
    title: news?.ytTitle || '',
    description: news?.ytDescription || '',
    tags: news?.ytTags || '',
    hashtags: news?.ytHashtags || '',
    image: news?.ytImage || '',
    linkPosted: news?.ytLinkPosted || '',
    location: '',
  });

  const webSeoQuality = getSeoPreviewQuality(webSeo.metaTitle || '', webSeo.metaDescription || '');

  // Enable/disable redirect fields
  useEffect(() => {
    if (!webSeo.isRedirect) {
      setWebSeo((p) => ({ ...p, slugRedirect: '' }));
    }
  }, [webSeo.isRedirect]);

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
      isPublished: form.isPublished,
      isShowHome: form.isShowHome,
      isActive: form.isActive,
      isNew: form.isNew,
      allowComments: form.allowComments,
      newTag: form.newTag.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      authorName: form.authorName.trim() || null,
      publishedAt: form.publishedAt || null,
      viewCount: Number(form.viewCount) || 0,
      commentCount: Number(form.commentCount) || 0,
      likeCount: Number(form.likeCount) || 0,
      // SEO Website
      metaTitle: webSeo.metaTitle.trim() || null,
      metaDescription: webSeo.metaDescription.trim() || null,
      metaKeywords: webSeo.metaKeywords.trim() || null,
      ogTitle: webSeo.ogTitle.trim() || null,
      ogDescription: webSeo.ogDescription.trim() || null,
      ogImage: webSeo.ogImage.trim() || null,
      robots: webSeo.robots.trim() || null,
      seoCanonical: webSeo.seoCanonical.trim() || null,
      seoNoindex: webSeo.seoNoindex,
      slugRedirect: webSeo.slugRedirect.trim() || null,
      isRedirect: webSeo.isRedirect,
      isMobile: webSeo.isMobile,
      // SEO Facebook
      fbTitle: fbSeo.title.trim() || null,
      fbDescription: fbSeo.description.trim() || null,
      fbKeywords: fbSeo.keywords.trim() || null,
      fbHashtags: fbSeo.hashtags.trim() || null,
      fbImage: fbSeo.image.trim() || null,
      fbLinkPosted: fbSeo.linkPosted.trim() || null,
      // SEO TikTok
      ttTitle: ttSeo.title.trim() || null,
      ttDescription: ttSeo.description.trim() || null,
      ttKeywords: ttSeo.keywords.trim() || null,
      ttHashtags: ttSeo.hashtags.trim() || null,
      ttImage: ttSeo.image.trim() || null,
      ttLinkPosted: ttSeo.linkPosted.trim() || null,
      // SEO YouTube
      ytTitle: ytSeo.title.trim() || null,
      ytDescription: ytSeo.description.trim() || null,
      ytTags: ytSeo.tags.trim() || null,
      ytHashtags: ytSeo.hashtags.trim() || null,
      ytImage: ytSeo.image.trim() || null,
      ytLinkPosted: ytSeo.linkPosted.trim() || null,
    };
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Bắt buộc';
    if (!form.seName.trim()) e.seName = 'Bắt buộc';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.seName)) e.seName = 'Slug không hợp lệ';
    if (webSeo.isRedirect && !webSeo.slugRedirect.trim()) e.slugRedirect = 'Bắt buộc khi bật chuyển hướng';
    if (Object.keys(e).length) { setErrors(e); setActiveTab('basic'); return; }

    setLoading(true); setGlobalError('');
    try {
      const payload = buildPayload();
      const url = isEdit ? `/admin/api/news/${news.id}` : '/admin/api/news';
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
        router.push('/admin/news');
        router.refresh();
      }, 800);
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
            <li className="breadcrumb-item"><Link href="/admin/news">Tin tức</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (form.title || 'Chỉnh sửa') : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/news')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo tin tức'}
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

          {/* === TAB 1: THÔNG TIN CƠ BẢN === */}
          {activeTab === 'basic' && (
            <>
              <div className="card mb-3">
                <div className="card-header fw-semibold">Thông tin bài viết</div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                    <input name="title" value={form.title} onChange={handle}
                      placeholder="VD: Xu hướng nội thất 2025"
                      className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`} />
                    {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Slug (seName) <span className="text-danger">*</span></label>
                      <div className="input-group input-group-sm">
                        <input name="seName" value={form.seName} onChange={handle}
                          placeholder="xu-huong-noi-that-2025"
                          className={`form-control ${errors.seName ? 'is-invalid' : ''}`} />
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
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tóm tắt</label>
                    <textarea name="summary" value={form.summary} onChange={handle}
                      rows={3} placeholder="Tóm tắt ngắn gọn bài viết"
                      className="form-control form-control-sm" />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nội dung</label>
                    <RichTextEditor
                      value={form.content || ''}
                      onChange={(val) => setForm((p) => ({ ...p, content: val }))}
                      placeholder="Nhập nội dung bài viết..."
                    />
                  </div>

                  <div className="mb-3">
                    <SingleImageUploader
                      value={form.image}
                      onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                      label="Hình ảnh chính"
                      defaultSrc="/admin/assets/images/default-image_100.png"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* === TAB 2: SEO WEBSITE === */}
          {activeTab === 'seo-web' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO Website</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>WEBSITE</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Title</label>
                  <input value={webSeo.metaTitle} onChange={(e) => setWebSeo(p => ({ ...p, metaTitle: e.target.value }))}
                    placeholder="SEO Title cho Google" className="form-control form-control-sm" maxLength={60} />
                  <small className="text-muted">{webSeo.metaTitle.length}/60</small>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Description</label>
                  <textarea value={webSeo.metaDescription} onChange={(e) => setWebSeo(p => ({ ...p, metaDescription: e.target.value }))}
                    rows={3} placeholder="SEO Description cho Google" className="form-control form-control-sm" maxLength={160} />
                  <small className="text-muted">{webSeo.metaDescription.length}/160</small>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Meta Keywords</label>
                  <input value={webSeo.metaKeywords} onChange={(e) => setWebSeo(p => ({ ...p, metaKeywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3" className="form-control form-control-sm" />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">SEO Canonical URL</label>
                    <input value={webSeo.seoCanonical} onChange={(e) => setWebSeo(p => ({ ...p, seoCanonical: e.target.value }))}
                      placeholder="https://example.com/canonical-url" className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Robots</label>
                    <input value={webSeo.robots} onChange={(e) => setWebSeo(p => ({ ...p, robots: e.target.value }))}
                      placeholder="index,follow" className="form-control form-control-sm" />
                  </div>
                </div>

                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="seoNoindex"
                    checked={webSeo.seoNoindex} onChange={(e) => setWebSeo(p => ({ ...p, seoNoindex: e.target.checked }))} />
                  <label className="form-check-label" htmlFor="seoNoindex">Noindex (ẩn khỏi Google)</label>
                </div>

                <hr />

                <div className="mb-3">
                  <label className="form-label small fw-semibold">OG Title</label>
                  <input value={webSeo.ogTitle} onChange={(e) => setWebSeo(p => ({ ...p, ogTitle: e.target.value }))}
                    placeholder="Tiêu đề chia sẻ lên mạng xã hội" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">OG Description</label>
                  <textarea value={webSeo.ogDescription} onChange={(e) => setWebSeo(p => ({ ...p, ogDescription: e.target.value }))}
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
                    <div className="d-flex align-items-center mb-1">
                      <div className="rounded-circle bg-light d-flex align-items-center justify-content-center me-2" 
                        style={{ width: 26, height: 26, minWidth: 26 }}>
                        <i className="bi bi-shop" style={{ fontSize: 12, color: '#5f6368' }}></i>
                      </div>
                      <div style={{ fontSize: 12, color: '#5f6368' }}>
                        noithatminhquan.vn › tin-tuc
                      </div>
                    </div>
                    
                    <div className="mb-1">
                      <a href="#" className="text-decoration-none" style={{ fontSize: 20, color: '#1a0dab', lineHeight: '1.3' }}>
                        {webSeo.metaTitle || form.title || 'Tiêu đề bài viết tin tức'}
                      </a>
                    </div>
                    
                    <div style={{ fontSize: 14, color: '#4d5156', lineHeight: '1.58' }}>
                      {webSeo.metaDescription || form.summary || 'Mô tả ngắn gọn về bài viết tin tức. Nội dung này sẽ hiển thị trên kết quả tìm kiếm Google.'}
                    </div>
                    
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

                <div className="form-check form-switch mt-3 mb-3">
                  <input className="form-check-input" type="checkbox" id="isRedirect"
                    checked={webSeo.isRedirect} onChange={(e) => setWebSeo(p => ({ ...p, isRedirect: e.target.checked }))} />
                  <label className="form-check-label" htmlFor="isRedirect">Chuyển hướng</label>
                </div>

                {webSeo.isRedirect && (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">URL chuyển hướng</label>
                    <input value={webSeo.slugRedirect} onChange={(e) => setWebSeo(p => ({ ...p, slugRedirect: e.target.value }))}
                      placeholder="/url-cu" className={`form-control form-control-sm ${errors.slugRedirect ? 'is-invalid' : ''}`} />
                    {errors.slugRedirect && <div className="invalid-feedback d-block">{errors.slugRedirect}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === TAB 3: SEO FACEBOOK === */}
          {activeTab === 'seo-fb' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO Facebook</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Tối ưu cho Facebook</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input value={fbSeo.linkPosted} onChange={(e) => setFbSeo(p => ({ ...p, linkPosted: e.target.value }))}
                    placeholder="https://facebook.com/post/123" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title Facebook</label>
                  <div className="input-group input-group-sm">
                    <input value={fbSeo.title} onChange={(e) => setFbSeo(p => ({ ...p, title: e.target.value }))}
                      placeholder="Tiêu đề bài viết" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(fbSeo.title);
                        toast('Đã copy Title!', 'success');
                      }}
                      title="Copy Title">
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description Facebook</label>
                  <div className="input-group">
                    <textarea value={fbSeo.description} onChange={(e) => setFbSeo(p => ({ ...p, description: e.target.value }))}
                      rows={5} placeholder="Nội dung chi tiết bài viết..." className="form-control form-control-sm" style={{ resize: 'vertical' }} />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(fbSeo.description);
                        toast('Đã copy Description!', 'success');
                      }}
                      title="Copy Description"
                      style={{ alignSelf: 'flex-start' }}>
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  
                  {/* Emoji Picker */}
                  <div className="mt-2">
                    <small className="text-muted d-block mb-1">Thêm emoji nhanh:</small>
                    <div className="d-flex gap-2 flex-wrap">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🏠' }))}>🏠 Nhà</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🏡' }))}>🏡 Nhà đẹp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🛋️' }))}>🛋️ Sofa</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🪑' }))}>🪑 Ghế</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🛏️' }))}>🛏️ Giường</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🚪' }))}>🚪 Cửa</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🪟' }))}>🪟 Cửa sổ</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 💡' }))}>💡 Đèn</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ✨' }))}>✨ Đẹp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🌟' }))}>🌟 Sang</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 💎' }))}>💎 Cao cấp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ⭐' }))}>⭐ Đánh giá</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 💯' }))}>💯 Tốt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ✅' }))}>✅ Uy tín</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🔥' }))}>🔥 Hot</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 👍' }))}>👍 Like</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 👌' }))}>👌 OK</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ❤️' }))}>❤️ Yêu</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 😍' }))}>😍 Thích</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 💰' }))}>💰 Giá tốt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🎁' }))}>🎁 Quà</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' ⚡' }))}>⚡ Nhanh</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🚚' }))}>🚚 Giao hàng</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 📦' }))}>📦 Đóng gói</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🔨' }))}>🔨 Lắp đặt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🔧' }))}>🔧 Bảo hành</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🎨' }))}>🎨 Thiết kế</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🏘️' }))}>🏘️ Không gian</button>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Keywords</label>
                    <div className="input-group input-group-sm">
                      <input value={fbSeo.keywords} onChange={(e) => setFbSeo(p => ({ ...p, keywords: e.target.value }))}
                        placeholder="keyword1, keyword2" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(fbSeo.keywords);
                          toast('Đã copy Keywords!', 'success');
                        }}
                        title="Copy Keywords">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Keywords mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        {['nội thất', 'nội thất đẹp', 'nội thất giá rẻ', 'nội thất cao cấp', 'sofa', 'bàn ghế', 'giường ngủ', 'tủ quần áo', 'bàn làm việc', 'kệ tivi', 'thiết kế nội thất', 'thi công nội thất', 'nội thất phòng khách', 'nội thất phòng ngủ', 'nội thất bếp', 'nội thất văn phòng', 'nội thất gỗ', 'nội thất hiện đại', 'nội thất tối giản', 'nội thất TPHCM'].map(tag => (
                          <button key={tag} type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }}
                            onClick={() => setFbSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', ' + tag : tag }))}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input value={fbSeo.hashtags} onChange={(e) => setFbSeo(p => ({ ...p, hashtags: e.target.value }))}
                        placeholder="#noithat #noithatdep" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(fbSeo.hashtags);
                          toast('Đã copy Hashtags!', 'success');
                        }}
                        title="Copy Hashtags">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Hashtags mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        {['#noithat', '#noithatdep', '#noithatgiare', '#noithatcaocap', '#sofa', '#banghe', '#giuongngu', '#tuquanao', '#banlamviec', '#ketivi', '#thietkenoithat', '#thicongnoithat', '#noithatphongkhach', '#noithatphongngu', '#noithatbep', '#noithatvanphong', '#noithatgo', '#noithathiendai', '#noithattoigian', '#noithattphcm'].map(tag => (
                          <button key={tag} type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }}
                            onClick={() => setFbSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' ' + tag : tag }))}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    <i className="bi bi-geo-alt me-1"></i>Vị trí (Location)
                  </label>
                  <div className="input-group input-group-sm mb-2">
                    <input value={fbSeo.location} onChange={(e) => setFbSeo(p => ({ ...p, location: e.target.value }))}
                      placeholder="VD: Nội Thất Minh Quân - TPHCM" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(fbSeo.location);
                        toast('Đã copy Location!', 'success');
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
                      const content = `${fbSeo.title ? fbSeo.title + '\n\n' : ''}${fbSeo.description}${fbSeo.hashtags ? '\n\n' + fbSeo.hashtags : ''}${fbSeo.location ? '\n📍 ' + fbSeo.location : ''}`;
                      navigator.clipboard.writeText(content).then(() => {
                        alert('✅ Đã copy nội dung! Paste vào Facebook ngay.');
                      });
                    }}>
                    <i className="bi bi-clipboard-check me-1"></i>
                    Copy nội dung để đăng Facebook
                  </button>
                </div>

                {/* Facebook Post Preview */}
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
                    {fbSeo.image && (
                      <div className="border rounded" style={{ overflow: 'hidden', maxHeight: 200 }}>
                        <img src={fbSeo.image} alt="Preview" 
                          style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
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
            </div>
          )}

          {/* === TAB 4: SEO TIKTOK === */}
          {activeTab === 'seo-tt' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO TikTok</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>TIKTOK</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input value={ttSeo.linkPosted} onChange={(e) => setTtSeo(p => ({ ...p, linkPosted: e.target.value }))}
                    placeholder="https://tiktok.com/@user/video/123" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title</label>
                  <div className="input-group input-group-sm">
                    <input value={ttSeo.title} onChange={(e) => setTtSeo(p => ({ ...p, title: e.target.value }))}
                      placeholder="Tiêu đề bài viết" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ttSeo.title);
                        toast('Đã copy Title!', 'success');
                      }}
                      title="Copy Title">
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description</label>
                  <div className="input-group">
                    <textarea value={ttSeo.description} onChange={(e) => setTtSeo(p => ({ ...p, description: e.target.value }))}
                      rows={5} placeholder="Nội dung chi tiết bài viết..." className="form-control form-control-sm" style={{ resize: 'vertical' }} />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ttSeo.description);
                        toast('Đã copy Description!', 'success');
                      }}
                      title="Copy Description"
                      style={{ alignSelf: 'flex-start' }}>
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  
                  {/* Emoji Picker */}
                  <div className="mt-2">
                    <small className="text-muted d-block mb-1">Thêm emoji nhanh:</small>
                    <div className="d-flex gap-2 flex-wrap">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🏠' }))}>🏠 Nhà</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🏡' }))}>🏡 Nhà đẹp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🛋️' }))}>🛋️ Sofa</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🪑' }))}>🪑 Ghế</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🛏️' }))}>🛏️ Giường</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🚪' }))}>🚪 Cửa</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🪟' }))}>🪟 Cửa sổ</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 💡' }))}>💡 Đèn</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ✨' }))}>✨ Đẹp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🌟' }))}>🌟 Sang</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 💎' }))}>💎 Cao cấp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ⭐' }))}>⭐ Đánh giá</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 💯' }))}>💯 Tốt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ✅' }))}>✅ Uy tín</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🔥' }))}>🔥 Hot</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 👍' }))}>👍 Like</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 👌' }))}>👌 OK</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ❤️' }))}>❤️ Yêu</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 😍' }))}>😍 Thích</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 💰' }))}>💰 Giá tốt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🎁' }))}>🎁 Quà</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' ⚡' }))}>⚡ Nhanh</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🚚' }))}>🚚 Giao hàng</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 📦' }))}>📦 Đóng gói</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🔨' }))}>🔨 Lắp đặt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🔧' }))}>🔧 Bảo hành</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🎨' }))}>🎨 Thiết kế</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTtSeo(p => ({ ...p, description: p.description + ' 🏘️' }))}>🏘️ Không gian</button>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Keywords</label>
                    <div className="input-group input-group-sm">
                      <input value={ttSeo.keywords} onChange={(e) => setTtSeo(p => ({ ...p, keywords: e.target.value }))}
                        placeholder="keyword1, keyword2" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(ttSeo.keywords);
                          toast('Đã copy Keywords!', 'success');
                        }}
                        title="Copy Keywords">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Keywords mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        {['nội thất', 'nội thất đẹp', 'nội thất giá rẻ', 'nội thất cao cấp', 'sofa', 'bàn ghế', 'giường ngủ', 'tủ quần áo', 'bàn làm việc', 'kệ tivi', 'thiết kế nội thất', 'thi công nội thất', 'nội thất phòng khách', 'nội thất phòng ngủ', 'nội thất bếp', 'nội thất văn phòng', 'nội thất gỗ', 'nội thất hiện đại', 'nội thất tối giản', 'nội thất TPHCM'].map(tag => (
                          <button key={tag} type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }}
                            onClick={() => setTtSeo(p => ({ ...p, keywords: p.keywords ? p.keywords + ', ' + tag : tag }))}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input value={ttSeo.hashtags} onChange={(e) => setTtSeo(p => ({ ...p, hashtags: e.target.value }))}
                        placeholder="#noithat #noithatdep" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(ttSeo.hashtags);
                          toast('Đã copy Hashtags!', 'success');
                        }}
                        title="Copy Hashtags">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Hashtags mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        {['#noithat', '#noithatdep', '#noithatgiare', '#noithatcaocap', '#sofa', '#banghe', '#giuongngu', '#tuquanao', '#banlamviec', '#ketivi', '#thietkenoithat', '#thicongnoithat', '#noithatphongkhach', '#noithatphongngu', '#noithatbep', '#noithatvanphong', '#noithatgo', '#noithathiendai', '#noithattoigian', '#noithattphcm'].map(tag => (
                          <button key={tag} type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }}
                            onClick={() => setTtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' ' + tag : tag }))}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    <i className="bi bi-geo-alt me-1"></i>Vị trí (Location)
                  </label>
                  <div className="input-group input-group-sm mb-2">
                    <input value={ttSeo.location} onChange={(e) => setTtSeo(p => ({ ...p, location: e.target.value }))}
                      placeholder="VD: Nội Thất Minh Quân - TPHCM" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ttSeo.location);
                        toast('Đã copy Location!', 'success');
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
                  <small className="text-muted">Thêm vị trí giúp tăng reach với người dùng gần đó</small>
                </div>

                <div className="mb-3">
                  <SingleImageUploader
                    value={ttSeo.image}
                    onChange={(url) => setTtSeo((p) => ({ ...p, image: url }))}
                    label="Image"
                    defaultSrc="/admin/assets/images/default-image_100.png"
                  />
                </div>

                {/* Copy to Clipboard Button */}
                <div className="mb-3">
                  <button type="button" className="btn btn-success btn-sm w-100" 
                    onClick={() => {
                      const content = `${ttSeo.title ? ttSeo.title + '\n\n' : ''}${ttSeo.description}${ttSeo.hashtags ? '\n\n' + ttSeo.hashtags : ''}${ttSeo.location ? '\n📍 ' + ttSeo.location : ''}`;
                      navigator.clipboard.writeText(content).then(() => {
                        alert('✅ Đã copy nội dung! Paste vào TikTok ngay.');
                      });
                    }}>
                    <i className="bi bi-clipboard-check me-1"></i>
                    Copy nội dung để đăng TikTok
                  </button>
                </div>

                {/* TikTok Video Preview */}
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
            </div>
          )}

          {/* === TAB 5: SEO YOUTUBE === */}
          {activeTab === 'seo-yt' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">SEO YouTube</div>
              <div className="card-body">
                <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>YOUTUBE</span>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Link bài đã đăng</label>
                  <input value={ytSeo.linkPosted} onChange={(e) => setYtSeo(p => ({ ...p, linkPosted: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=xxx" className="form-control form-control-sm" />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Title</label>
                  <div className="input-group input-group-sm">
                    <input value={ytSeo.title} onChange={(e) => setYtSeo(p => ({ ...p, title: e.target.value }))}
                      placeholder="Tiêu đề video" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ytSeo.title);
                        toast('Đã copy Title!', 'success');
                      }}
                      title="Copy Title">
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description</label>
                  <div className="input-group">
                    <textarea value={ytSeo.description} onChange={(e) => setYtSeo(p => ({ ...p, description: e.target.value }))}
                      rows={5} placeholder="Mô tả chi tiết video..." className="form-control form-control-sm" style={{ resize: 'vertical' }} />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ytSeo.description);
                        toast('Đã copy Description!', 'success');
                      }}
                      title="Copy Description"
                      style={{ alignSelf: 'flex-start' }}>
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  
                  {/* Emoji Picker */}
                  <div className="mt-2">
                    <small className="text-muted d-block mb-1">Thêm emoji nhanh:</small>
                    <div className="d-flex gap-2 flex-wrap">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🏠' }))}>🏠 Nhà</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🏡' }))}>🏡 Nhà đẹp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🛋️' }))}>🛋️ Sofa</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🪑' }))}>🪑 Ghế</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🛏️' }))}>🛏️ Giường</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🚪' }))}>🚪 Cửa</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🪟' }))}>🪟 Cửa sổ</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 💡' }))}>💡 Đèn</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' ✨' }))}>✨ Đẹp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🌟' }))}>🌟 Sang</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 💎' }))}>💎 Cao cấp</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' ⭐' }))}>⭐ Đánh giá</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 💯' }))}>💯 Tốt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' ✅' }))}>✅ Uy tín</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🔥' }))}>🔥 Hot</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 👍' }))}>👍 Like</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 👌' }))}>👌 OK</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' ❤️' }))}>❤️ Yêu</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 😍' }))}>😍 Thích</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 💰' }))}>💰 Giá tốt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🎁' }))}>🎁 Quà</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' ⚡' }))}>⚡ Nhanh</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🚚' }))}>🚚 Giao hàng</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 📦' }))}>📦 Đóng gói</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🔨' }))}>🔨 Lắp đặt</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🔧' }))}>🔧 Bảo hành</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🎨' }))}>🎨 Thiết kế</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setYtSeo(p => ({ ...p, description: p.description + ' 🏘️' }))}>🏘️ Không gian</button>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Tags</label>
                    <div className="input-group input-group-sm">
                      <input value={ytSeo.tags} onChange={(e) => setYtSeo(p => ({ ...p, tags: e.target.value }))}
                        placeholder="tag1, tag2" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(ytSeo.tags);
                          toast('Đã copy Tags!', 'success');
                        }}
                        title="Copy Tags">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Tags mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        {['nội thất', 'nội thất đẹp', 'nội thất giá rẻ', 'nội thất cao cấp', 'sofa', 'bàn ghế', 'giường ngủ', 'tủ quần áo', 'bàn làm việc', 'kệ tivi', 'thiết kế nội thất', 'thi công nội thất', 'nội thất phòng khách', 'nội thất phòng ngủ', 'nội thất bếp', 'nội thất văn phòng', 'nội thất gỗ', 'nội thất hiện đại', 'nội thất tối giản', 'nội thất TPHCM'].map(tag => (
                          <button key={tag} type="button" className="btn btn-sm btn-outline-info" style={{ fontSize: '10px', padding: '2px 6px' }}
                            onClick={() => setYtSeo(p => ({ ...p, tags: p.tags ? p.tags + ', ' + tag : tag }))}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Hashtags</label>
                    <div className="input-group input-group-sm">
                      <input value={ytSeo.hashtags} onChange={(e) => setYtSeo(p => ({ ...p, hashtags: e.target.value }))}
                        placeholder="#noithat #noithatdep" className="form-control" />
                      <button type="button" className="btn btn-outline-secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(ytSeo.hashtags);
                          toast('Đã copy Hashtags!', 'success');
                        }}
                        title="Copy Hashtags">
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block mb-1">Hashtags mẫu (click để thêm):</small>
                      <div className="d-flex gap-1 flex-wrap" style={{ maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}>
                        {['#noithat', '#noithatdep', '#noithatgiare', '#noithatcaocap', '#sofa', '#banghe', '#giuongngu', '#tuquanao', '#banlamviec', '#ketivi', '#thietkenoithat', '#thicongnoithat', '#noithatphongkhach', '#noithatphongngu', '#noithatbep', '#noithatvanphong', '#noithatgo', '#noithathiendai', '#noithattoigian', '#noithattphcm'].map(tag => (
                          <button key={tag} type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '10px', padding: '2px 6px' }}
                            onClick={() => setYtSeo(p => ({ ...p, hashtags: p.hashtags ? p.hashtags + ' ' + tag : tag }))}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    <i className="bi bi-geo-alt me-1"></i>Vị trí (Location)
                  </label>
                  <div className="input-group input-group-sm mb-2">
                    <input value={ytSeo.location} onChange={(e) => setYtSeo(p => ({ ...p, location: e.target.value }))}
                      placeholder="VD: Nội Thất Minh Quân - TPHCM" className="form-control" />
                    <button type="button" className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(ytSeo.location);
                        toast('Đã copy Location!', 'success');
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
                  <small className="text-muted">Thêm vị trí giúp tăng reach với người dùng gần đó</small>
                </div>

                <div className="mb-3">
                  <SingleImageUploader
                    value={ytSeo.image}
                    onChange={(url) => setYtSeo((p) => ({ ...p, image: url }))}
                    label="Thumbnail"
                    defaultSrc="/admin/assets/images/default-image_100.png"
                  />
                </div>

                {/* Copy to Clipboard Button */}
                <div className="mb-3">
                  <button type="button" className="btn btn-success btn-sm w-100" 
                    onClick={() => {
                      const content = `${ytSeo.title ? ytSeo.title + '\n\n' : ''}${ytSeo.description}${ytSeo.hashtags ? '\n\n' + ytSeo.hashtags : ''}${ytSeo.location ? '\n📍 ' + ytSeo.location : ''}`;
                      navigator.clipboard.writeText(content).then(() => {
                        alert('✅ Đã copy nội dung! Paste vào YouTube ngay.');
                      });
                    }}>
                    <i className="bi bi-clipboard-check me-1"></i>
                    Copy nội dung để đăng YouTube
                  </button>
                </div>

                {/* YouTube Video Preview */}
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
              </div>
            </div>
          )}

        </div>

        {/* === COL-LG-3: SIDEBAR === */}
        <div className="col-12 col-lg-3">
          
          {/* Card Media - Hiển thị cố định trên tất cả tabs */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Media & Trạng thái</div>
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Tác giả</label>
                  <input name="authorName" value={form.authorName} onChange={handle}
                    placeholder="Tên tác giả" className="form-control form-control-sm" />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Ngày xuất bản</label>
                  <input name="publishedAt" type="datetime-local" value={form.publishedAt} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-4">
                  <label className="form-label small fw-semibold">Lượt xem</label>
                  <input name="viewCount" type="number" min="0" value={form.viewCount} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Bình luận</label>
                  <input name="commentCount" type="number" min="0" value={form.commentCount} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Lượt thích</label>
                  <input name="likeCount" type="number" min="0" value={form.likeCount} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Thứ tự</label>
                  <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Tag mới</label>
                  <input name="newTag" value={form.newTag} onChange={handle}
                    placeholder="Hot, New" className="form-control form-control-sm" />
                </div>
              </div>

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

              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="isNew"
                  id="isNew" checked={form.isNew} onChange={handle} />
                <label className="form-check-label" htmlFor="isNew">Đánh dấu mới</label>
              </div>

              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="isActive"
                  id="isActive" checked={form.isActive} onChange={handle} />
                <label className="form-check-label" htmlFor="isActive">Kích hoạt</label>
              </div>

              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="allowComments"
                  id="allowComments" checked={form.allowComments} onChange={handle} />
                <label className="form-check-label" htmlFor="allowComments">Cho phép bình luận</label>
              </div>

              <div className="d-flex gap-1">
                <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                  {form.isActive ? '● Active' : '● Hidden'}
                </span>
                <span className={`badge ${form.isPublished ? 'bg-primary' : 'bg-warning'}`}>
                  {form.isPublished ? '● Published' : '● Draft'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit info */}
          {(auditInfo.createdAt || auditInfo.updatedAt) && (
            <div className="card mb-3">
              <div className="card-body py-2">
                <div className="small text-muted">
                  {auditInfo.createdAt && (
                    <div>Ngày tạo: {new Date(auditInfo.createdAt).toLocaleString('vi-VN')}</div>
                  )}
                  {auditInfo.updatedAt && (
                    <div>Ngày cập nhật: {new Date(auditInfo.updatedAt).toLocaleString('vi-VN')}</div>
                  )}
                </div>
              </div>
            </div>
          )}
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
