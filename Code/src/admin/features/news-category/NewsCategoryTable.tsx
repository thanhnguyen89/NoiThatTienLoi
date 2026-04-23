'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/admin/components/Toast';

interface NewsCategoryItem {
  id: string;
  parentId: bigint | null;
  title: string | null;
  summary: string | null;
  imageUrl: string | null;
  seName: string | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '—';
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
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(`/admin/api/news-categories/${cat.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) { toast(json.error || 'Lỗi khi xóa', 'danger'); return; }
      toast('Đã xóa danh mục tin tức', 'success');
      router.refresh();
    } catch { toast('Lỗi kết nối', 'danger'); }
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
              <th>Danh mục cha</th>
              <th style={{ width: 80 }}>Hình</th>
              <th style={{ width: 160 }}>Slug</th>
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
                  <div className="fw-semibold small">{cat.title || '—'}</div>
                </td>
                <td>
                  <span className="text-muted small">{cat.summary ? (cat.summary.length > 60 ? cat.summary.substring(0, 60) + '...' : cat.summary) : '—'}</span>
                </td>
                <td>
                  {cat.parentId ? (
                    <span className="badge bg-info">{categories.find(c => c.id === String(cat.parentId))?.title ?? String(cat.parentId)}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
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
                  {cat.isShowHome ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>{cat.createdAt ? formatDate(cat.createdAt) : '—'}</td>
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
