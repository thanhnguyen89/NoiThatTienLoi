'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PageItem {
  id: string;
  pageName: string | null;
  title: string | null;
  shortDescription: string | null;
  image: string | null;
  isActive: boolean | null;
  isShowHome: boolean | null;
  sortOrder: number | null;
  createdAt: Date | null;
}

function formatDate(date: Date | null) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function PageTable({ pages }: { pages: PageItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(page: PageItem) {
    const label = page.title || page.pageName || page.id;
    if (!confirm(`Xóa trang "${label}"?`)) return;
    setDeletingId(page.id);
    try {
      const res = await fetch(`/admin/api/pages/${page.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!pages.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-file-earmark-text fs-1 d-block mb-2"></i>
              Không tìm thấy trang nào.
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
              <th>Tên trang</th>
              <th>Tiêu đề</th>
              <th>Mô tả</th>
              <th className="text-center" style={{ width: 60 }}>Hình</th>
              <th className="text-center" style={{ width: 80 }}>Trang chủ</th>
              <th className="text-center" style={{ width: 80 }}>Trạng thái</th>
              <th style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page, idx) => (
              <tr key={page.id}>
                <td className="text-center">{idx + 1}</td>
                <td className="fw-semibold small">{page.pageName || '—'}</td>
                <td>{page.title || '—'}</td>
                <td>
                  <span className="text-muted small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {page.shortDescription || '—'}
                  </span>
                </td>
                <td className="text-center">
                  {page.image ? (
                    <img
                      src={page.image}
                      alt={page.pageName || page.title || ''}
                      style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  {page.isShowHome ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  {page.isActive ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>{formatDate(page.createdAt)}</td>
                <td className="text-center">
                  <Link href={`/admin/pages/${page.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(page)}
                    disabled={deletingId === page.id}
                  >
                    {deletingId === page.id ? (
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
