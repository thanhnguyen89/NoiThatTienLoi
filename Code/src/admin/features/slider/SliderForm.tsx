'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageManagerModal } from '@/admin/components/ImageManagerModal';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { RichTextEditor } from '@/admin/components/RichTextEditor';

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

export function SliderForm({ slider }: Props) {
  const router = useRouter();
  const isEdit = !!slider;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  const [form, setForm] = useState({
    title: slider?.title || '',
    image: slider?.image || '',
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

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.image.trim()) e.image = 'Hình ảnh là bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        title: form.title.trim() || null,
        image: form.image.trim(),
        link: form.link.trim() || null,
        content: form.content || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/sliders/${slider.id}` : '/admin/api/sliders';
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
      router.push('/admin/sliders');
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
              <div className="mb-3">
                <label className="form-label small fw-semibold">Hình ảnh <span className="text-danger">*</span></label>
                <SingleImageUploader
                  value={form.image}
                  onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                  label="Chọn hình slider"
                  defaultSrc="/admin/assets/images/default-image_100.png"
                />
                {errors.image && <div className="invalid-feedback d-block">{errors.image}</div>}
              </div>
              {form.image && (
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Xem trước</label>
                  <div style={{ border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
                    <img src={form.image} alt="Preview" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                  </div>
                </div>
              )}
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
        onSelect={(url) => { setForm((p) => ({ ...p, image: url })); setShowImageModal(false); }}
      />
    </form>
  );
}
