'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { SEO_CONFIG_NOTE_TOKENS } from '@/lib/constants';
import { PAGE_TYPES } from '@/server/validators/seo-config.validator';

interface SeoConfigDetail {
  id: string;
  pageName: string | null;
  pageType: string | null;
  title: string | null;
  contentBefore: string | null;
  contentAfter: string | null;
  image: string | null;
  icon: string | null;
  thumbnail: string | null;
  banner: string | null;
  seName: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  metaTitle: string | null;
  isActive: boolean;
  seoNoindex: boolean;
  seoCanonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  sortOrder: number;
}

interface Props {
  config?: SeoConfigDetail;
}

// ─── SEO Preview ─────────────────────────────────────────────────────────────
function SeoPreview({ title, description, url }: { title: string; description: string; url: string }) {
  const displayTitle = title || 'Tiêu đề trang';
  const displayDesc  = description || 'Mô tả trang sẽ hiển thị ở đây...';
  const displayUrl   = url ? `noithatminhquan.vn/${url.replace(/^\//, '')}` : 'noithatminhquan.vn/';
  const titleColor   = title.length > 60 ? '#d93025' : '#1a0dab';
  const descColor    = description.length > 160 ? '#d93025' : '#4d5156';
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, background: '#fff', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ fontSize: 12, color: '#4d5156', marginBottom: 2 }}>{displayUrl}</div>
      <div style={{ fontSize: 20, color: titleColor, marginBottom: 4, lineHeight: 1.3 }}>
        {displayTitle.length > 60 ? displayTitle.slice(0, 60) + '...' : displayTitle}
      </div>
      <div style={{ fontSize: 14, color: descColor, lineHeight: 1.5 }}>
        {displayDesc.length > 160 ? displayDesc.slice(0, 160) + '...' : displayDesc}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, flexWrap: 'wrap' }}>
        <span style={{ color: title.length > 60 ? '#d93025' : title.length >= 30 ? '#137333' : '#f29900' }}>
          Title: {title.length}/60 {title.length > 60 ? '⚠ Quá dài' : title.length < 30 ? '⚠ Quá ngắn' : '✓ Tốt'}
        </span>
        <span style={{ color: description.length > 160 ? '#d93025' : description.length >= 120 ? '#137333' : description.length > 0 ? '#f29900' : '#6c757d' }}>
          Desc: {description.length}/160 {description.length > 160 ? '⚠ Quá dài' : description.length < 120 && description.length > 0 ? '⚠ Quá ngắn' : description.length >= 120 ? '✓ Tốt' : ''}
        </span>
      </div>
    </div>
  );
}

// ─── SEO Checklist ────────────────────────────────────────────────────────────
function SeoChecklist({ form }: { form: Record<string, unknown> }) {
  const mt  = String(form.metaTitle  || '');
  const md  = String(form.metaDescription || '');
  const checks = [
    { ok: mt.length >= 30 && mt.length <= 60,   label: 'Title 30–60 ký tự' },
    { ok: md.length >= 120 && md.length <= 160,  label: 'Description 120–160 ký tự' },
    { ok: !!form.seName,                          label: 'Có URL slug' },
    { ok: !!form.metaKeywords,                    label: 'Có từ khóa SEO' },
    { ok: !!form.seoCanonical,                    label: 'Có Canonical URL' },
    { ok: !!form.ogTitle,                         label: 'Có Open Graph Title' },
    { ok: !!form.ogImage,                         label: 'Có Open Graph Image' },
    { ok: !form.seoNoindex,                       label: 'Cho phép index' },
  ];
  const score = checks.filter(c => c.ok).length;
  const pct   = Math.round((score / checks.length) * 100);
  const color = pct >= 80 ? '#137333' : pct >= 50 ? '#f29900' : '#d93025';
  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-2">
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{pct}%</div>
        <div className="flex-grow-1">
          <div className="progress" style={{ height: 6 }}>
            <div className="progress-bar" style={{ width: `${pct}%`, background: color }}></div>
          </div>
          <div style={{ fontSize: 11, color: '#6c757d' }}>{score}/{checks.length} tiêu chí</div>
        </div>
      </div>
      {checks.map((c, i) => (
        <div key={i} className="d-flex align-items-center gap-1 mb-1" style={{ fontSize: 12 }}>
          <i className={`bi ${c.ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-secondary'}`} style={{ fontSize: 13 }}></i>
          <span style={{ color: c.ok ? '#137333' : '#6c757d' }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

export function SeoConfigForm({ config }: Props) {
  const router = useRouter();
  const isEdit = !!config;
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'seo' | 'og'>('seo');

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const [form, setForm] = useState({
    pageName:        config?.pageName        || '',
    pageType:        config?.pageType        || '',
    title:           config?.title           || '',
    contentBefore:   config?.contentBefore   || '',
    contentAfter:    config?.contentAfter    || '',
    image:           config?.image           || '',
    icon:            config?.icon            || '',
    thumbnail:       config?.thumbnail       || '',
    banner:          config?.banner          || '',
    seName:          config?.seName          || '',
    metaKeywords:    config?.metaKeywords    || '',
    metaDescription: config?.metaDescription || '',
    metaTitle:       config?.metaTitle       || '',
    isActive:        config?.isActive        ?? true,
    seoNoindex:      config?.seoNoindex      ?? false,
    seoCanonical:    config?.seoCanonical    || '',
    ogTitle:         config?.ogTitle         || '',
    ogDescription:   config?.ogDescription   || '',
    ogImage:         config?.ogImage         || '',
    sortOrder:       String(config?.sortOrder ?? 0),
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
    if (!form.title.trim())  e.title  = 'Bắt buộc';
    if (!form.seName.trim()) e.seName = 'Bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const payload = {
        pageName:        form.pageName.trim()        || null,
        pageType:        form.pageType               || null,
        title:           form.title.trim(),
        contentBefore:   form.contentBefore          || null,
        contentAfter:    form.contentAfter           || null,
        image:           form.image.trim()           || null,
        icon:            form.icon.trim()            || null,
        thumbnail:       form.thumbnail.trim()       || null,
        banner:          form.banner.trim()          || null,
        seName:          form.seName.trim()          || null,
        metaKeywords:    form.metaKeywords.trim()    || null,
        metaDescription: form.metaDescription.trim() || null,
        metaTitle:       form.metaTitle.trim()       || null,
        isActive:        form.isActive,
        seoNoindex:      form.seoNoindex,
        seoCanonical:    form.seoCanonical.trim()    || null,
        ogTitle:         form.ogTitle.trim()         || null,
        ogDescription:   form.ogDescription.trim()   || null,
        ogImage:         form.ogImage.trim()         || null,
        sortOrder:       Number(form.sortOrder)      || 0,
      };
      const url = isEdit ? `/admin/api/seo-configs/${config.id}` : '/admin/api/seo-configs';
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
      setTimeout(() => { router.push('/admin/seo-configs'); router.refresh(); }, 1500);
    } catch { showToast('Lỗi kết nối', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, minWidth: 250, padding: '12px 20px', borderRadius: 6, color: '#fff', fontSize: 14, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: toast.type === 'success' ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
          {toast.msg}
        </div>
      )}
      <form onSubmit={submit} noValidate>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link href="/admin">Admin</Link></li>
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
          {/* ── LEFT ── */}
          <div className="col-12 col-lg-8">

            {/* Thông tin cơ bản */}
            <div className="card mb-3">
              <div className="card-header fw-semibold">Thông tin cơ bản</div>
              <div className="card-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Tiêu đề trang <span className="text-danger">*</span></label>
                    <input name="title" value={form.title} onChange={handle} placeholder="VD: Trang chủ - Nội Thất Minh Quân" className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`} />
                    {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Loại trang</label>
                    <select name="pageType" value={form.pageType} onChange={handle} className="form-select form-select-sm">
                      <option value="">— Chọn loại —</option>
                      {PAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Tên hệ thống</label>
                    <input name="pageName" value={form.pageName} onChange={handle} placeholder="VD: homepage" className="form-control form-control-sm" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Content Before</label>
                  <RichTextEditor value={form.contentBefore} onChange={(val) => setForm((p) => ({ ...p, contentBefore: val }))} placeholder="Nội dung hiển thị trước..." />
                </div>
                <div className="mb-0">
                  <label className="form-label small fw-semibold">Content After</label>
                  <RichTextEditor value={form.contentAfter} onChange={(val) => setForm((p) => ({ ...p, contentAfter: val }))} placeholder="Nội dung hiển thị sau..." />
                </div>
              </div>
            </div>

            {/* Google Preview */}
            <div className="card mb-3">
              <div className="card-header fw-semibold d-flex align-items-center gap-2">
                <i className="bi bi-google text-primary"></i>
                Xem trước kết quả Google
              </div>
              <div className="card-body">
                <SeoPreview title={form.metaTitle || form.title} description={form.metaDescription} url={form.seName} />
              </div>
            </div>

            {/* SEO / OG Tabs */}
            <div className="card mb-3">
              <div className="card-header p-0">
                <ul className="nav nav-tabs border-0 px-3 pt-2">
                  <li className="nav-item">
                    <button type="button" className={`nav-link ${activeTab === 'seo' ? 'active' : ''}`} onClick={() => setActiveTab('seo')}>
                      <i className="bi bi-search me-1"></i>SEO
                    </button>
                  </li>
                  <li className="nav-item">
                    <button type="button" className={`nav-link ${activeTab === 'og' ? 'active' : ''}`} onClick={() => setActiveTab('og')}>
                      <i className="bi bi-share me-1"></i>Open Graph / Social
                    </button>
                  </li>
                </ul>
              </div>
              <div className="card-body">
                {activeTab === 'seo' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">URL Slug <span className="text-danger">*</span></label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text text-muted" style={{ fontSize: 12 }}>noithatminhquan.vn/</span>
                        <input name="seName" value={form.seName} onChange={handle} placeholder="trang-chu" className={`form-control form-control-sm ${errors.seName ? 'is-invalid' : ''}`} />
                      </div>
                      {errors.seName && <div className="invalid-feedback d-block">{errors.seName}</div>}
                    </div>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold mb-0">Meta Title</label>
                        <span className={`small fw-semibold ${form.metaTitle.length > 60 ? 'text-danger' : form.metaTitle.length >= 30 ? 'text-success' : 'text-warning'}`}>{form.metaTitle.length}/60</span>
                      </div>
                      <input name="metaTitle" value={form.metaTitle} onChange={handle} maxLength={60} placeholder="VD: Nội Thất Minh Quân – Giá Xưởng, Giao Nhanh Toàn Quốc" className="form-control form-control-sm" />
                      <div className="form-text small">Tối ưu: 30–60 ký tự. Đặt từ khóa chính ở đầu.</div>
                    </div>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold mb-0">Meta Description</label>
                        <span className={`small fw-semibold ${form.metaDescription.length > 160 ? 'text-danger' : form.metaDescription.length >= 120 ? 'text-success' : form.metaDescription.length > 0 ? 'text-warning' : 'text-muted'}`}>{form.metaDescription.length}/160</span>
                      </div>
                      <textarea name="metaDescription" value={form.metaDescription} onChange={handle} maxLength={160} rows={3} placeholder="VD: Mua nội thất giá xưởng tại Minh Quân – giao nhanh 1–3 ngày, đặt theo yêu cầu. Xem ngay ưu đãi hôm nay!" className="form-control form-control-sm" />
                      <div className="form-text small">Tối ưu: 120–160 ký tự. Có CTA rõ ràng.</div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Từ khóa SEO</label>
                      <input name="metaKeywords" value={form.metaKeywords} onChange={handle} placeholder="VD: nội thất giá rẻ, giường sắt, tủ quần áo" className="form-control form-control-sm" />
                      <div className="form-text small">Phân cách bằng dấu phẩy.</div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Canonical URL</label>
                      <input name="seoCanonical" value={form.seoCanonical} onChange={handle} placeholder="VD: https://noithatminhquan.vn/trang-chu" className="form-control form-control-sm" />
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" name="seoNoindex" id="seoNoindex" checked={form.seoNoindex} onChange={handle} />
                      <label className="form-check-label small" htmlFor="seoNoindex">Noindex (không cho Google index trang này)</label>
                    </div>
                  </>
                )}
                {activeTab === 'og' && (
                  <>
                    <div className="alert alert-info py-2 mb-3" style={{ fontSize: 12 }}>
                      <i className="bi bi-info-circle me-1"></i>
                      Open Graph dùng khi chia sẻ lên Facebook, Zalo, Telegram. Nếu để trống sẽ dùng Meta Title/Description.
                    </div>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold mb-0">OG Title</label>
                        <span className={`small ${form.ogTitle.length > 200 ? 'text-danger' : 'text-muted'}`}>{form.ogTitle.length}/200</span>
                      </div>
                      <input name="ogTitle" value={form.ogTitle} onChange={handle} maxLength={200} placeholder="Tiêu đề khi share lên mạng xã hội..." className="form-control form-control-sm" />
                    </div>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold mb-0">OG Description</label>
                        <span className={`small ${form.ogDescription.length > 300 ? 'text-danger' : 'text-muted'}`}>{form.ogDescription.length}/300</span>
                      </div>
                      <textarea name="ogDescription" value={form.ogDescription} onChange={handle} maxLength={300} rows={3} placeholder="Mô tả khi share lên mạng xã hội..." className="form-control form-control-sm" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">OG Image</label>
                      <SingleImageUploader value={form.ogImage} onChange={(url) => setForm((p) => ({ ...p, ogImage: url }))} label="Chọn ảnh OG" defaultSrc="/admin/assets/images/default-image_100.png" />
                      <div className="form-text small">Kích thước đề xuất: 1200x630px.</div>
                    </div>
                    {(form.ogTitle || form.ogDescription || form.ogImage) && (
                      <div>
                        <div className="form-label small fw-semibold mb-2">Preview Facebook / Zalo:</div>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', maxWidth: 480 }}>
                          {form.ogImage && <img src={form.ogImage} alt="OG" style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
                          <div style={{ padding: '10px 12px', background: '#f0f2f5' }}>
                            <div style={{ fontSize: 11, color: '#606770', textTransform: 'uppercase', marginBottom: 2 }}>NOITHATMINHQUAN.VN</div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#1c1e21', marginBottom: 2 }}>{form.ogTitle || form.metaTitle || form.title || 'Tiêu đề'}</div>
                            <div style={{ fontSize: 13, color: '#606770' }}>{form.ogDescription || form.metaDescription || 'Mô tả...'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="col-12 col-lg-4">
            {/* SEO Score */}
            <div className="card mb-3">
              <div className="card-header fw-semibold d-flex align-items-center gap-2">
                <i className="bi bi-bar-chart-fill text-primary"></i>SEO Score
              </div>
              <div className="card-body">
                <SeoChecklist form={form as unknown as Record<string, unknown>} />
              </div>
            </div>

            {/* Trạng thái */}
            <div className="card mb-3">
              <div className="card-header fw-semibold">Trạng thái</div>
              <div className="card-body">
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" name="isActive" id="isActive" checked={form.isActive} onChange={handle} />
                  <label className="form-check-label small" htmlFor="isActive">Công khai</label>
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Thứ tự</label>
                  <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle} className="form-control form-control-sm" />
                </div>
                <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>{form.isActive ? '● Active' : '● Inactive'}</span>
              </div>
            </div>

            {/* Media */}
            <div className="card mb-3">
              <div className="card-header fw-semibold">Media</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Icon / Favicon</label>
                  <SingleImageUploader value={form.icon} onChange={(url) => setForm((p) => ({ ...p, icon: url }))} label="Chọn icon" defaultSrc="/admin/assets/images/default-image_100.png" />
                  <div className="form-text small">32x32px hoặc 64x64px</div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Ảnh đại diện (Thumbnail)</label>
                  <SingleImageUploader value={form.thumbnail} onChange={(url) => setForm((p) => ({ ...p, thumbnail: url }))} label="Chọn thumbnail" defaultSrc="/admin/assets/images/default-image_100.png" />
                  <div className="form-text small">400x400px</div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Ảnh Banner</label>
                  <SingleImageUploader value={form.banner} onChange={(url) => setForm((p) => ({ ...p, banner: url }))} label="Chọn banner" defaultSrc="/admin/assets/images/default-image_100.png" />
                  <div className="form-text small">1920x600px</div>
                </div>
                <div className="mb-0">
                  <label className="form-label small fw-semibold">Hình đại diện</label>
                  <SingleImageUploader value={form.image} onChange={(url) => setForm((p) => ({ ...p, image: url }))} label="Chọn hình" defaultSrc="/admin/assets/images/default-image_100.png" />
                </div>
              </div>
            </div>

            {/* Tokens */}
            <div className="card mb-3">
              <div className="card-header fw-semibold">Token placeholder</div>
              <div className="card-body py-2">
                <p className="text-muted small mb-2">Dùng trong nội dung SEO:</p>
                {SEO_CONFIG_NOTE_TOKENS.map((t) => (
                  <div key={t.token} className="mb-1">
                    <code className="small">{t.token}</code>
                    <span className="text-muted small"> — {t.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}