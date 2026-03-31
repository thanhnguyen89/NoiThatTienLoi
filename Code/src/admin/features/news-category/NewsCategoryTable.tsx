'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface NewsCategoryItem {
  id: string;
  title: string | null;
  summary: string | null;
  imageUrl: string | null;
  seName: string | null;
  isPublished: boolean | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  sortOrder: bigint | null;
  createdDate: Date | null;
}

function formatDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function NewsCategoryTable({ categories }: { categories: NewsCategoryItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(cat: NewsCategoryItem) {
    if (!confirm(`Xóa danh mục tin tức "${cat.title ?? ''}"?`)) return;
    setDeletingId(cat.id);
    try {
      const res = await fetch(`/admin/api/news-categories/${cat.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!categories.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-folder2-open fs-1 d-block mb-2"></i>
              Không tìm thấy danh mục tin tức nào.
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
              <th>Tóm tắt</th>
              <th style={{ width: 80 }}>Hình</th>
              <th style={{ width: 200 }}>Slug</th>
              <th className="text-center" style={{ width: 80 }}>Xuất bản</th>
              <th className="text-center" style={{ width: 80 }}>Trang chủ</th>
              <th style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => (
              <tr key={cat.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <div className="fw-semibold small">{cat.title}</div>
                </td>
                <td>
                  <span className="text-muted small">{cat.summary ? (cat.summary.length > 60 ? cat.summary.substring(0, 60) + '...' : cat.summary) : '—'}</span>
                </td>
                <td className="text-center">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.title ?? ''}
                      style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td><code className="small">{cat.seName || '—'}</code></td>
                <td className="text-center">
                  {cat.isPublished ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  {cat.isShowHome ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>{cat.createdDate ? formatDate(cat.createdDate) : '—'}</td>
                <td className="text-center">
                  <Link href={`/admin/news-categories/${cat.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(cat)}
                    disabled={deletingId === cat.id}
                  >
                    {deletingId === cat.id ? (
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
