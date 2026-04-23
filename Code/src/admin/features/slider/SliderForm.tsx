'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageManagerModal } from '@/admin/components/ImageManagerModal';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
import { toast } from '@/admin/components/Toast';

interface SliderImage {
  url: string;
  title: string;
}

interface SliderDetail {
  id: string;
  title: string | null;
  image: string;
  link: string | null;
  content: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Props {
  slider?: SliderDetail;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseImages(image: string): SliderImage[] {
  if (!image) return [];
  try {
    return JSON.parse(image);
  } catch {
    // Legacy: single image URL stored as string
    return [{ url: image, title: '' }];
  }
}

function serializeImages(images: SliderImage[]): string {
  return JSON.stringify(images);
}

// ─── ImageCard ─────────────────────────────────────────────────────────────

function ImageCard({
  img,
  idx,
  onRemove,
  onSetPrimary,
  onEditTitle,
  editingTitle,
  titleValue,
  onInputChange,
  onKeyDown,
  onBlur,
}: {
  img: SliderImage;
  idx: number;
  onRemove: () => void;
  onSetPrimary: () => void;
  onEditTitle: () => void;
  editingTitle: boolean;
  titleValue: string;
  onInputChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="col-6 col-md-4 col-lg-3">
      <div className="border rounded-2 overflow-hidden h-100 d-flex flex-column">
        <div
          className="bg-light d-flex align-items-center justify-content-center position-relative"
          style={{ height: 120 }}
        >
          <img
            src={img.url}
            alt={img.title || `Slide ${idx + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {idx === 0 && (
            <span
              className="position-absolute top-0 start-0 badge"
              style={{ fontSize: 10, background: '#dcfce7', color: '#166534' }}
            >
              Ảnh chính
            </span>
          )}
        </div>
        <div className="p-2 flex-grow-1 d-flex flex-column">
          {editingTitle ? (
            <div className="mb-2">
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                className="form-control form-control-sm mb-1"
                placeholder="Tiêu đề ảnh..."
              />
            </div>
          ) : (
            <p
              className="mb-1 small text-truncate"
              style={{ fontSize: 11, color: img.title ? '#495057' : '#adb5bd', fontStyle: img.title ? 'normal' : 'italic' }}
              title={img.title || 'Chưa có tiêu đề'}
            >
              {img.title || 'Chưa có tiêu đề'}
            </p>
          )}
          <div className="mt-auto d-flex justify-content-end gap-1">
            <button
              type="button"
              className="btn btn-sm p-1 text-secondary"
              title="Sửa tiêu đề"
              onClick={onEditTitle}
            >
              <i className="bi bi-pencil-square" style={{ fontSize: 13 }}></i>
            </button>
            {idx > 0 && (
              <button
                type="button"
                className="btn btn-sm p-1 text-success"
                title="Đặt làm ảnh chính"
                onClick={onSetPrimary}
              >
                <i className="bi bi-star" style={{ fontSize: 13 }}></i>
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm p-1 text-danger"
              title="Xóa ảnh"
              onClick={onRemove}
            >
              <i className="bi bi-trash" style={{ fontSize: 13 }}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SliderForm ─────────────────────────────────────────────────────────────

export function SliderForm({ slider }: Props) {
  const router = useRouter();
  const isEdit = !!slider;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const initImages = parseImages(slider?.image || '');

  const [form, setForm] = useState({
    title: slider?.title || '',
    images: initImages,
    link: slider?.link || '',
    content: slider?.content || '',
    sortOrder: String(slider?.sortOrder ?? 0),
    isActive: slider?.isActive ?? true,
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  // ─── Image helpers ────────────────────────────────────────────────────────

  function addImages(urls: string[]) {
    const existing = new Set(form.images.map((i) => i.url));
    const newImgs: SliderImage[] = urls
      .filter((u) => !existing.has(u))
      .map((url) => ({ url, title: '' }));
    setForm((p) => ({ ...p, images: [...p.images, ...newImgs] }));
  }

  function removeImage(idx: number) {
    setForm((p) => {
      const updated = p.images.filter((_, i) => i !== idx);
      return { ...p, images: updated };
    });
  }

  function setPrimary(idx: number) {
    setForm((p) => {
      const item = p.images[idx];
      const rest = p.images.filter((_, i) => i !== idx);
      return { ...p, images: [item, ...rest] };
    });
  }

  function startEditTitle(idx: number) {
    setEditingIdx(idx);
    setEditTitleValue(form.images[idx].title);
  }

  function saveTitle(idx: number, value: string) {
    setForm((p) => ({
      ...p,
      images: p.images.map((img, i) => i === idx ? { ...img, title: value } : img),
    }));
    setEditingIdx(null);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditingIdx(null);
    }
  }

  function handleEditBlur(e: React.FocusEvent<HTMLInputElement>, idx: number) {
    // Only save if the new focus target is NOT the edit button or title area of THIS card
    const related = e.relatedTarget as HTMLElement | null;
    const cardRoot = e.currentTarget.closest('.col-6.col-md-4.col-lg-3');
    if (cardRoot && related && cardRoot.contains(related)) return;
    saveTitle(idx, editTitleValue.trim());
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.images.length) e.images = 'Cần ít nhất một hình ảnh';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        title: form.title.trim() || null,
        image: serializeImages(form.images),
        link: form.link.trim() || null,
        content: form.content || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/sliders/${slider.id}` : '/admin/api/sliders';
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
        router.push('/admin/sliders');
        router.refresh();
      }, 800);
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}
      {errors.images && <div className="alert alert-danger py-2">{errors.images}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/sliders">Slider</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (slider.title || 'Slider') : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/sliders')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo slider'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin Slider</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tiêu đề</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handle}
                  placeholder="VD: Banner khuyến mãi mùa hè"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Link (URL)</label>
                <input
                  name="link"
                  value={form.link}
                  onChange={handle}
                  placeholder="VD: /san-pham/giuang-sat"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Nội dung</label>
                <RichTextEditor
                  value={form.content}
                  onChange={(val) => setForm((p) => ({ ...p, content: val }))}
                />
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Thứ tự</label>
                  <input
                    name="sortOrder"
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={handle}
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hình ảnh slider */}
          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Hình ảnh slider</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowImageModal(true)}
              >
                <i className="bi bi-images me-1"></i>Chọn ảnh
              </button>
            </div>
            <div className="card-body">
              {form.images.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-image" style={{ fontSize: 36 }}></i>
                  <p className="small mb-0 mt-2">Chưa có ảnh. Nhấn "Chọn ảnh" để thêm.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {form.images.map((img, idx) => (
                    <ImageCard
                      key={img.url}
                      img={img}
                      idx={idx}
                      onRemove={() => removeImage(idx)}
                      onSetPrimary={() => setPrimary(idx)}
                      onEditTitle={() => startEditTitle(idx)}
                      editingTitle={editingIdx === idx}
                      titleValue={editingIdx === idx ? editTitleValue : ''}
                      onInputChange={(v) => setEditTitleValue(v)}
                      onKeyDown={(e) => handleEditKeyDown(e, idx)}
                      onBlur={(e) => handleEditBlur(e, idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={form.isActive}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isActive">Hoạt động</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Hidden'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ImageManagerModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        multiSelect
        onSelect={(url) => { addImages([url]); setShowImageModal(false); }}
        onSelectMultiple={(urls) => { addImages(urls); setShowImageModal(false); }}
      />
    </form>
  );
}
