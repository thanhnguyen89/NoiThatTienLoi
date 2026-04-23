'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface NewsItem {
  id: string;
  title: string | null;
  image: string | null;
  seName: string | null;
  isPublished: boolean | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  isNew: boolean | null;
  viewCount: bigint | null;
  commentCount: bigint | null;
  likeCount: bigint | null;
  authorName: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  isRedirect: boolean | null;
  slugRedirect: string | null;
}

function formatDate(date: Date | null) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function NewsTable({ news }: { news: NewsItem[]; categories?: unknown[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: NewsItem) {
    if (!confirm(`Xoa tin "${item.title || item.seName || item.id}"?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/admin/api/news/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Loi'); return; }
      router.refresh();
    } catch { alert('Loi ket noi'); }
    finally { setDeletingId(null); }
  }

  if (!news.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-newspaper fs-1 d-block mb-2"></i>
              Khong tim thay tin tuc nao.
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
              <th style={{ width: 80 }}>Hình</th>
              <th style={{ width: 150 }}>Slug</th>
              <th className="text-center" style={{ width: 60 }}>Xuất bản</th>
              <th className="text-center" style={{ width: 60 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 60 }}>HM</th>
              <th className="text-center" style={{ width: 70 }}>Xem</th>
              <th style={{ width: 120 }}>Tác giả</th>
              <th style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {news.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <div className="fw-semibold small">{item.title || '—'}</div>
                  {item.isNew === true && (
                    <span className="badge bg-danger" style={{ fontSize: 10 }}>Mới</span>
                  )}
                  {item.isRedirect && (
                    <span className="badge bg-warning ms-1" style={{ fontSize: 10 }}>Chuyển hướng</span>
                  )}
                </td>
                <td className="text-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title || ''}
                      style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td><code className="small">{item.seName || '—'}</code></td>
                <td className="text-center">
                  {item.isPublished ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <i className="bi bi-dash text-muted"></i>
                  )}
                </td>
                <td className="text-center">
                  {item.isActive ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <i className="bi bi-dash text-muted"></i>
                  )}
                </td>
                <td className="text-center">
                  {item.isShowHome ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <i className="bi bi-dash text-muted"></i>
                  )}
                </td>
                <td className="text-center">{item.viewCount ? Number(item.viewCount) : '—'}</td>
                <td className="small">{item.authorName || '—'}</td>
                <td>{formatDate(item.createdAt)}</td>
                <td className="text-center">
                  <Link href={`/admin/news/${item.id}/edit`} className="btn-edit me-1">
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
