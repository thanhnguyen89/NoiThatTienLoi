'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface MenuLinkItem {
  id: string;
  title: string | null;
  slug: string | null;
  target: string | null;
  menuId: bigint | null;
  icon: string | null;
  parentId: string | null;
  entityId: bigint | null;
  entityName: string | null;
  nofollow: boolean | null;
  level: number | null;
  sortOrder: number | null;
  createdDate: Date | null;
  lastUpdDate: Date | null;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatBigInt(val: bigint | null | undefined): string {
  if (val === null || val === undefined) return '—';
  return String(val);
}

export function MenuLinkTable({ menuLinks }: { menuLinks: MenuLinkItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: MenuLinkItem) {
    if (!confirm(`Xoa menu link "${item.title || 'Khong co tieu de'}"?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/admin/api/menu-links/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Loi'); return; }
      router.refresh();
    } catch { alert('Loi ket noi'); }
    finally { setDeletingId(null); }
  }

  if (!menuLinks.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-link-45deg fs-1 d-block mb-2"></i>
              Chua co menu link nao.
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
              <th>Tieu de</th>
              <th>Slug</th>
              <th>Target</th>
              <th>Entity</th>
              <th className="text-center" style={{ width: 80 }}>NoFollow</th>
              <th className="text-center" style={{ width: 70 }}>Level</th>
              <th className="text-center" style={{ width: 80 }}>Thu tu</th>
              <th className="text-center" style={{ width: 100 }}>Ngay tao</th>
              <th className="text-center" style={{ width: 100 }}>Thao tac</th>
            </tr>
          </thead>
          <tbody>
            {menuLinks.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <span className="fw-semibold small">{item.title ?? '—'}</span>
                </td>
                <td>
                  <code className="small text-secondary">{item.slug ?? '—'}</code>
                </td>
                <td>
                  <code className="small">{item.target ?? '—'}</code>
                </td>
                <td>
                  <span className="small">{item.entityName ?? '—'}</span>
                  {item.entityId !== null && item.entityId !== undefined && (
                    <span className="text-muted small ms-1">#{formatBigInt(item.entityId)}</span>
                  )}
                </td>
                <td className="text-center">
                  {item.nofollow ? (
                    <span className="badge bg-warning text-dark">nofollow</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">{item.level ?? '—'}</td>
                <td className="text-center">{item.sortOrder ?? '—'}</td>
                <td className="text-center">{formatDate(item.createdDate)}</td>
                <td className="text-center">
                  <Link href={`/admin/menu-links/${item.id}/edit`} className="btn-edit me-1">
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
