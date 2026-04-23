'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/admin/components/Toast';

interface EmbedCodeItem {
  id: string;
  title: string | null;
  positionId: number | null;
  embedCode: string | null;
  note: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function positionName(id: number | null | undefined) {
  if (id === null || id === undefined) return '—';
  if (id === 1) return 'Thẻ Header';
  if (id === 2) return 'Thẻ Body';
  if (id === 3) return 'Thẻ Footer';
  return String(id);
}

export function CatalogEmbedCodeTable({ embedCodes }: { embedCodes: EmbedCodeItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: EmbedCodeItem) {
    if (!confirm(`Xóa mã nhúng "${item.title || 'Không có tiêu đề'}"?`)) return;
    setDeletingId(item.id);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(`/admin/api/catalog-embed-codes/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) { toast(json.error || 'Lỗi khi xóa', 'danger'); return; }
      toast('Đã xóa mã nhúng', 'success');
      router.refresh();
    } catch { toast('Lỗi kết nối', 'danger'); }
    finally { setDeletingId(null); }
  }

  if (!embedCodes.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-code-square fs-1 d-block mb-2"></i>
              Chưa có mã nhúng nào.
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
              <th className="text-center" style={{ width: 120 }}>Vị trí</th>
              <th>Mã nhúng</th>
              <th className="text-center" style={{ width: 90 }}>Công khai</th>
              <th className="text-center" style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {embedCodes.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td>{item.title ?? '—'}</td>
                <td className="text-center">
                  {positionName(item.positionId)}
                </td>
                <td>
                  {item.embedCode ? (
                    <code className="small text-truncate d-inline-block" style={{ maxWidth: 200 }}>
                      {item.embedCode.length > 50 ? `${item.embedCode.substring(0, 50)}...` : item.embedCode}
                    </code>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  {item.isActive ? (
                    <span className="badge bg-success">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary">● Ẩn</span>
                  )}
                </td>
                <td className="text-center">{formatDate(item.createdAt)}</td>
                <td className="text-center">
                  <Link href={`/admin/catalog-embed-codes/${item.id}/edit`} className="btn-edit me-1">
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
