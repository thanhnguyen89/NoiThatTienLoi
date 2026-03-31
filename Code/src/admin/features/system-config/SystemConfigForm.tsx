'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';

interface SystemConfigData {
  id?: string;
  imageUrl: string | null;
  displayRowCount: number | null;
  pageTitle: string | null;
  keywords: string | null;
  metaDescription: string | null;
  logoUrl: string | null;
  accessTimeFrom: string | null;
  accessTimeTo: string | null;
  holidays: string | null;
}

interface Props {
  config?: SystemConfigData;
}

export function SystemConfigForm({ config }: Props) {
  const router = useRouter();
  const isEdit = !!config;
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    pageTitle: config?.pageTitle || '',
    keywords: config?.keywords || '',
    metaDescription: config?.metaDescription || '',
    logoUrl: config?.logoUrl || '',
    displayRowCount: String(config?.displayRowCount ?? 20),
    accessTimeFrom: config?.accessTimeFrom || '',
    accessTimeTo: config?.accessTimeTo || '',
    holidays: config?.holidays || '',
    imageUrl: config?.imageUrl || '',
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setGlobalError('');
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    setGlobalError('');
    try {
      const res = await fetch('/admin/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle: form.pageTitle.trim() || null,
          keywords: form.keywords.trim() || null,
          metaDescription: form.metaDescription.trim() || null,
          logoUrl: form.logoUrl || null,
          displayRowCount: form.displayRowCount ? Number(form.displayRowCount) : null,
          accessTimeFrom: form.accessTimeFrom || null,
          accessTimeTo: form.accessTimeTo || null,
          holidays: form.holidays.trim() || null,
          imageUrl: form.imageUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGlobalError(json.error || 'Lỗi khi lưu cấu hình');
        return;
      }
      router.push('/admin/system-config');
      router.refresh();
    } catch {
      setGlobalError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/system-config">Cấu hình</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Chỉnh sửa' : 'Cấu hình hệ thống'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/system-config')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">

          {/* === THÔNG TIN SEO === */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin SEO</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-semibold">Page Title</label>
                <input
                  name="pageTitle"
                  value={form.pageTitle}
                  onChange={handle}
                  placeholder="VD: Nội Thất Tiện Lợi - Nội thất giá tốt"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Keywords</label>
                <textarea
                  name="keywords"
                  value={form.keywords}
                  onChange={handle}
                  rows={3}
                  placeholder="VD: noi that, giuong ngu, ban ghe"
                  className="form-control form-control-sm"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Meta Description</label>
                <textarea
                  name="metaDescription"
                  value={form.metaDescription}
                  onChange={handle}
                  rows={3}
                  placeholder="Mô tả ngắn gọn về website, tối đa 160 ký tự"
                  className="form-control form-control-sm"
                />
              </div>
            </div>
          </div>

          {/* === THÔNG TIN HIỂN THỊ === */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin hiển thị</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Số dòng hiển thị / trang</label>
                  <input
                    name="displayRowCount"
                    type="number"
                    min="1"
                    max="100"
                    value={form.displayRowCount}
                    onChange={handle}
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* === THỜI GIAN TRUY CẬP === */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thời gian truy cập</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Từ giờ</label>
                  <input
                    name="accessTimeFrom"
                    value={form.accessTimeFrom}
                    onChange={handle}
                    placeholder="VD: 08:00"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Đến giờ</label>
                  <input
                    name="accessTimeTo"
                    value={form.accessTimeTo}
                    onChange={handle}
                    placeholder="VD: 22:00"
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="form-label small fw-semibold">Ngày nghỉ</label>
                <input
                  name="holidays"
                  value={form.holidays}
                  onChange={handle}
                  placeholder="VD: Thứ 7, Chủ nhật"
                  className="form-control form-control-sm"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT - Hình ảnh */}
        <div className="col-12 col-lg-4">
          <div className="card">
            <div className="card-header fw-semibold">Hình ảnh</div>
            <div className="card-body">
              <div className="mb-3">
                <SingleImageUploader
                  value={form.logoUrl}
                  onChange={(url) => setForm((p) => ({ ...p, logoUrl: url }))}
                  label="Logo"
                  defaultSrc="/admin/assets/images/default-image_100.png"
                />
              </div>
              <div>
                <SingleImageUploader
                  value={form.imageUrl}
                  onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
                  label="Hình ảnh"
                  defaultSrc="/admin/assets/images/default-image_100.png"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
