'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';

interface SliderPictureDetail {
  id: string;
  comment: string | null;
  name: string | null;
  image: string | null;
  sortOrder: number | null;
  isActive: boolean;
}

interface Props {
  picture?: SliderPictureDetail;
}

export function SliderPictureForm({ picture }: Props) {
  const router = useRouter();
  const isEdit = !!picture;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    comment: picture?.comment || '',
    name: picture?.name || '',
    image: picture?.image || '',
    sortOrder: String(picture?.sortOrder ?? ''),
    isActive: picture?.isActive ?? true,
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

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        comment: form.comment.trim() || null,
        name: form.name.trim() || null,
        image: form.image || null,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/slider-pictures/${picture.id}` : '/admin/api/slider-pictures';
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
      router.push('/admin/slider-pictures');
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
            <li className="breadcrumb-item"><Link href="/admin/slider-pictures">Hình ảnh Slider</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (picture.name || picture.comment || 'Chỉnh sửa') : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/slider-pictures')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin hình ảnh slider</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Tên</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handle}
                  placeholder="VD: Banner trang chủ 2024"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Ghi chú</label>
                <textarea
                  name="comment"
                  value={form.comment}
                  onChange={handle}
                  placeholder="Mô tả ngắn cho hình ảnh slider"
                  rows={3}
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <SingleImageUploader
                  label="Hình ảnh"
                  value={form.image}
                  onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                />
                {errors.image && <div className="text-danger small mt-1">{errors.image}</div>}
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Thứ tự</label>
                  <input
                    name="sortOrder"
                    type="number"
                    value={form.sortOrder}
                    onChange={handle}
                    placeholder="0"
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
    </form>
  );
}
