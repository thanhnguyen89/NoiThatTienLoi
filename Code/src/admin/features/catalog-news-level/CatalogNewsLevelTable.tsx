'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CatalogNewsLevelItem {
  id: string;
  name: string | null;
  sortOrder: number | null;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function formatDate(date: Date | null) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function CatalogNewsLevelTable({ levels }: { levels: CatalogNewsLevelItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: CatalogNewsLevelItem) {
    if (!confirm(`Xóa mức độ tin tức "${item.name || 'Không có tên'}"?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/admin/api/catalog-news-levels/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!levels.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-card-list fs-1 d-block mb-2"></i>
              Chưa có mức độ tin tức nào.
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
              <th>Tên mức độ</th>
              <th className="text-center" style={{ width: 90 }}>Thứ tự</th>
              <th className="text-center" style={{ width: 110 }}>Công khai</th>
              <th className="text-center" style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td><div className="fw-semibold">{item.name || '—'}</div></td>
                <td className="text-center">{item.sortOrder ?? '—'}</td>
                <td className="text-center">
                  {item.isActive ? (
                    <span className="badge bg-success">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary">● Ẩn</span>
                  )}
                </td>
                <td className="text-center">{formatDate(item.createdAt)}</td>
                <td className="text-center">
                  <Link href={`/admin/catalog-news-levels/${item.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
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
