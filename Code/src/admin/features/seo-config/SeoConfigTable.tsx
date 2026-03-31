'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SeoConfigItem {
  id: string;
  pageName: string | null;
  title: string | null;
  seName: string | null;
  metaTitle: string | null;
  isActive: boolean;
  seoNoindex: boolean;
  sortOrder: number;
  createdAt?: Date | null;
}

function formatDate(date: Date | null) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function SeoConfigTable({ configs }: { configs: SeoConfigItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(config: SeoConfigItem) {
    if (!confirm(`Xóa cấu hình SEO "${config.title || config.pageName || 'Không tiêu đề'}"?`)) return;
    setDeletingId(config.id);
    try {
      const res = await fetch(`/admin/api/seo-configs/${config.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!configs.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-gear fs-1 d-block mb-2"></i>
              Chưa có cấu hình SEO nào.
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
              <th>Url</th>
              <th>Tiêu đề</th>
              <th>Tiêu đề SEO</th>
              <th className="text-center" style={{ width: 80 }}>Noindex</th>
              <th className="text-center" style={{ width: 80 }}>Thứ tự</th>
              <th className="text-center" style={{ width: 90 }}>Công khai</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config, idx) => (
              <tr key={config.id}>
                <td className="text-center">{idx + 1}</td>
                <td><code className="small">{config.pageName || '—'}</code></td>
                <td><div className="small fw-semibold">{config.title || '—'}</div></td>
                <td><div className="small text-truncate" style={{ maxWidth: 200 }}>{config.metaTitle || '—'}</div></td>
                <td className="text-center">
                  {config.seoNoindex ? (
                    <i className="bi bi-check-lg text-danger"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">{config.sortOrder}</td>
                <td className="text-center">
                  {config.isActive ? (
                    <span className="badge bg-success">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary">● Ẩn</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/seo-configs/${config.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(config)}
                    disabled={deletingId === config.id}
                  >
                    {deletingId === config.id ? (
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
