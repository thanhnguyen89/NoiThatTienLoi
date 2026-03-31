'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface TextToLinkItem {
  id: string;
  categoryId: string | null;
  keyword: string | null;
  priority: number | null;
  link: string | null;
  matchCount: number | null;
  domain: string | null;
  refAttribute: string | null;
  otherAttribute: string | null;
  frUnique: boolean | null;
  matchLinks: string | null;
  isActive: boolean;
  createdAt?: Date | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

export function CatalogTextToLinkTable({ items, categories }: { items: TextToLinkItem[]; categories: CategoryOption[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function getCategoryName(id: string | null) {
    if (!id) return '—';
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : '—';
  }

  async function handleDelete(item: TextToLinkItem) {
    if (!confirm(`Xóa text to link "${item.keyword || 'Không tiêu đề'}"?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/admin/api/catalog-text-to-links/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!items.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-link fs-1 d-block mb-2"></i>
              Chưa có text to link nào.
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
              <th>Từ khóa</th>
              <th>Liên kết</th>
              <th>D.mục</th>
              <th className="text-center" style={{ width: 60 }}>Unique</th>
              <th className="text-center" style={{ width: 60 }}>Ưu tiên</th>
              <th className="text-center" style={{ width: 70 }}>Count</th>
              <th className="text-center" style={{ width: 90 }}>REF</th>
              <th className="text-center" style={{ width: 90 }}>Khác</th>
              <th className="text-center" style={{ width: 90 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td><div className="small fw-semibold">{item.keyword || '—'}</div></td>
                <td>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="small text-truncate d-block" style={{ maxWidth: 180 }}>
                      {item.link}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td><div className="small">{getCategoryName(item.categoryId)}</div></td>
                <td className="text-center">
                  {item.frUnique ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">{item.priority ?? '—'}</td>
                <td className="text-center">{item.matchCount ?? '—'}</td>
                <td className="text-center">
                  {item.refAttribute ? (
                    <span className="badge bg-info text-dark">{item.refAttribute}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  {item.otherAttribute ? (
                    <span className="badge bg-secondary">{item.otherAttribute}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/catalog-text-to-links/${item.id}/edit`} className="btn-edit me-1">
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
