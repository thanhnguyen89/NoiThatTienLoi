'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSlug } from '@/lib/utils';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { toast } from '@/admin/components/Toast';

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
    isPublished: news?.isPublished ?? true,
    isShowHome: news?.isShowHome ?? false,
    isActive: news?.isActive ?? true,
    isNew: news?.isNew ?? false,
    allowComments: news?.allowComments ?? true,
    newTag: news?.newTag || '',
    sortOrder: String(news?.sortOrder ?? 0),
    slugRedirect: news?.slugRedirect || '',
    seoCanonical: news?.seoCanonical || '',
    seoNoindex: news?.seoNoindex ?? false,
    isRedirect: news?.isRedirect ?? false,
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

  // Enable/disable redirect fields
  useEffect(() => {
    if (!form.isRedirect) {
      setForm((p) => ({ ...p, slugRedirect: '' }));
    }
  }, [form.isRedirect]);

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

  function handleRedirectToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setForm((p) => ({ ...p, isRedirect: checked, slugRedirect: checked ? p.slugRedirect : '' }));
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
      isPublished: form.isPublished,
      isShowHome: form.isShowHome,
      isActive: form.isActive,
      isNew: form.isNew,
      allowComments: form.allowComments,
      newTag: form.newTag.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      slugRedirect: form.slugRedirect.trim() || null,
      seoCanonical: form.seoCanonical.trim() || null,
      seoNoindex: form.seoNoindex,
      isRedirect: form.isRedirect,
      authorName: form.authorName.trim() || null,
      publishedAt: form.publishedAt || null,
      viewCount: Number(form.viewCount) || 0,
      commentCount: Number(form.commentCount) || 0,
      likeCount: Number(form.likeCount) || 0,
    };
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Bắt buộc';
    if (!form.seName.trim()) e.seName = 'Bắt buộc';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.seName)) e.seName = 'Slug không hợp lệ';
    if (form.isRedirect && !form.slugRedirect.trim()) e.slugRedirect = 'Bắt buộc khi bật chuyển hướng';
    if (Object.keys(e).length) { setErrors(e); return; }

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

      <div className="row g-3">
        {/* === COL-MD-8: THÔNG TIN === */}
        <div className="col-md-8">
          <div className="card mb-3">
            <div className="card-header-custom fw-semibold">THÔNG TIN BÀI VIẾT</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                <input name="title" value={form.title} onChange={handle}
                  placeholder="VD: Xu hướng nội thất 2025" maxLength={60}
                  className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`} />
                {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tóm tắt</label>
                <textarea name="summary" value={form.summary} onChange={handle}
                  rows={10} className="form-control form-control-sm" placeholder="Tóm tắt ngắn gọn bài viết..." />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Nội dung</label>
                <RichTextEditor
                  value={form.content || ''}
                  onChange={(val) => setForm((p) => ({ ...p, content: val }))}
                  placeholder="Nhập nội dung bài viết..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* === COL-MD-4: MEDIA + SEO === */}
        <div className="col-md-4">

          {/* Card Media */}
          <div className="card mb-3">
            <div className="card-header-custom fw-semibold">MEDIA</div>
            <div className="card-body">
              <div className="mb-3">
                <SingleImageUploader
                  value={form.image}
                  onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                  label="Hình ảnh"
                  defaultSrc="/admin/assets/images/default-image_100.png"
                />
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Lượt xem</label>
                  <input name="viewCount" type="number" min="0" value={form.viewCount} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Thứ tự</label>
                  <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Bình luận</label>
                  <input name="commentCount" type="number" min="0" value={form.commentCount} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Lượt thích</label>
                  <input name="likeCount" type="number" min="0" value={form.likeCount} onChange={handle}
                    className="form-control form-control-sm" />
                </div>
              </div>
              <div className="mb-2 mt-2">
                <label className="form-label small fw-semibold">Tag mới</label>
                <input name="newTag" value={form.newTag} onChange={handle}
                  placeholder="VD: Hot, New" className="form-control form-control-sm" />
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
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" name="isActive"
                  id="isActive" checked={form.isActive} onChange={handle} />
                <label className="form-check-label" htmlFor="isActive">Kích hoạt</label>
              </div>
            </div>
          </div>
           {/* Card Trạng thái */}
          <div className="card mb-3">
            <div className="card-header-custom fw-semibold">TRẠNG THÁI</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Ngày xuất bản</label>
                <input name="publishedAt" type="datetime-local" value={form.publishedAt} onChange={handle}
                  className="form-control form-control-sm" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tác giả</label>
                <input name="authorName" value={form.authorName} onChange={handle}
                  placeholder="Tên tác giả" className="form-control form-control-sm" />
              </div>
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="isPublished"
                  id="isPublished" checked={form.isPublished} onChange={handle} />
                <label className="form-check-label" htmlFor="isPublished">Xuất bản</label>
              </div>
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="allowComments"
                  id="allowComments" checked={form.allowComments} onChange={handle} />
                <label className="form-check-label" htmlFor="allowComments">Cho phép bình luận</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Hidden'}
              </span>
              <span className={`badge ${form.isPublished ? 'bg-primary ms-1' : 'bg-warning ms-1'}`}>
                {form.isPublished ? '● Published' : '● Draft'}
              </span>
            </div>
          </div>          
          {/* Card SEO */}
          <div className="card mb-3">
            <div className="card-header-custom fw-semibold">SEO</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">URL (Slug) <span className="text-danger">*</span></label>
                <input name="seName" value={form.seName} onChange={handle}
                  placeholder="xu-huong-noi-that-2025"
                  className={`form-control form-control-sm ${errors.seName ? 'is-invalid' : ''}`} />
                {errors.seName && <div className="invalid-feedback d-block">{errors.seName}</div>}
                <div className="form-check mt-1">
                  <input className="form-check-input" type="checkbox" id="autoSlug"
                    checked={autoSlug} onChange={(e) => setAutoSlug(e.target.checked)} />
                  <label className="form-check-label small" htmlFor="autoSlug">Tự động tạo slug</label>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tiêu đề SEO</label>
                <input name="metaTitle" value={form.metaTitle} onChange={handle}
                  placeholder="SEO title cho trang" className="form-control form-control-sm" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Mô tả SEO</label>
                <textarea name="metaDescription" value={form.metaDescription} onChange={handle} rows={3}
                  className="form-control form-control-sm" placeholder="Mô tả SEO cho trang" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Từ khóa</label>
                <input name="metaKeywords" value={form.metaKeywords} onChange={handle}
                  placeholder="keyword1, keyword2, keyword3" className="form-control form-control-sm" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">SEO Canonical</label>
                <input name="seoCanonical" value={form.seoCanonical} onChange={handle}
                  placeholder="https://..." className="form-control form-control-sm" />
              </div>
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" name="seoNoindex"
                  id="seoNoindex" checked={form.seoNoindex} onChange={handle} />
                <label className="form-check-label" htmlFor="seoNoindex">SEO NoIndex</label>
              </div>
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="isRedirect"
                  id="isRedirect" checked={form.isRedirect} onChange={handleRedirectToggle} />
                <label className="form-check-label" htmlFor="isRedirect">Chuyển hướng</label>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">URL chuyển hướng</label>
                <input name="slugRedirect" value={form.slugRedirect} onChange={handle}
                  placeholder="/url-cu" disabled={!form.isRedirect}
                  className={`form-control form-control-sm ${!form.isRedirect ? 'bg-light' : ''} ${errors.slugRedirect ? 'is-invalid' : ''}`} />
                {errors.slugRedirect && <div className="invalid-feedback d-block">{errors.slugRedirect}</div>}
              </div>
            </div>
          </div>

          {/* Audit info */}
          {(auditInfo.createdAt || auditInfo.updatedAt) && (
            <div className="card">
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
    </form>
  );
}
