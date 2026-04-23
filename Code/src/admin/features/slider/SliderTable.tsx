'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SliderItem {
  id: string;
  title: string | null;
  image: string;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

function formatDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function SliderTable({ sliders }: { sliders: SliderItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(slider: SliderItem) {
    if (!confirm(`Xóa slider "${slider.title || 'Không tiêu đề'}"?`)) return;
    setDeletingId(slider.id);
    try {
      const res = await fetch(`/admin/api/sliders/${slider.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!sliders.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-images fs-1 d-block mb-2"></i>
              Chưa có slider nào.
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
              <th>Tiêu đề</th>
              <th>Link</th>
              <th style={{ width: 100 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 80 }}>Thứ tự</th>
              <th className="text-center" style={{ width: 80 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sliders.map((slider, idx) => (
              <tr key={slider.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <div className="fw-semibold small">{slider.title || <span className="text-muted">Không tiêu đề</span>}</div>
                </td>
                <td>
                  {slider.link ? (
                    <a href={slider.link} target="_blank" rel="noopener noreferrer" className="small text-truncate d-block" style={{ maxWidth: 200 }}>
                      {slider.link}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>{formatDate(slider.createdAt)}</td>
                <td className="text-center">{slider.sortOrder}</td>
                <td className="text-center">
                  {slider.isActive ? (
                    <span className="badge bg-success">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary">● Ẩn</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/sliders/${slider.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(slider)}
                    disabled={deletingId === slider.id}
                  >
                    {deletingId === slider.id ? (
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
