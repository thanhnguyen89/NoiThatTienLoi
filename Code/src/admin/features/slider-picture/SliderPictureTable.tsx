'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SliderPictureItem {
  id: string;
  comment: string | null;
  name: string | null;
  image: string | null;
  sortOrder: number | null;
  isActive: boolean;
}

export function SliderPictureTable({ pictures }: { pictures: SliderPictureItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(picture: SliderPictureItem) {
    if (!confirm(`Xóa hình ảnh slider "${picture.name || picture.comment || picture.id}"?`)) return;
    setDeletingId(picture.id);
    try {
      const res = await fetch(`/admin/api/slider-pictures/${picture.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!pictures.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-image fs-1 d-block mb-2"></i>
              Không tìm thấy hình ảnh slider nào.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <>
      <div className="table-responsive">
        <table className="table table-bordered mb-0 w-100">
          <thead>
            <tr>
              <th className="text-center" style={{ width: 50 }}>STT</th>
              <th style={{ width: 100 }}>Hình ảnh</th>
              <th>Tên</th>
              <th>Ghi chú</th>
              <th className="text-center" style={{ width: 80 }}>Thứ tự</th>
              <th className="text-center" style={{ width: 100 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pictures.map((picture, idx) => (
              <tr key={picture.id}>
                <td className="text-center">{idx + 1}</td>
                <td className="text-center">
                  {picture.image ? (
                    <img
                      src={picture.image}
                      alt={picture.name ?? picture.comment ?? ''}
                      style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <div className="fw-semibold small">{picture.name || <span className="text-muted">—</span>}</div>
                </td>
                <td>
                  <span className="small text-muted">{picture.comment || '—'}</span>
                </td>
                <td className="text-center">{picture.sortOrder ?? '—'}</td>
                <td className="text-center">
                  {picture.isActive ? (
                    <span className="badge bg-success">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary">● Ẩn</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/slider-pictures/${picture.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(picture)}
                    disabled={deletingId === picture.id}
                  >
                    {deletingId === picture.id ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className="bi bi-trash-fill"></i>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
