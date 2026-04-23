'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getMenuTypeLabel } from '@/server/validators/menu.validator';

interface MenuItem {
  id: string;
  name: string | null;
  menuTypeId: bigint | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function MenuTable({ menus }: { menus: MenuItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Xóa menu "${item.name || 'Không có tên'}"?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/admin/api/menus/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!menus.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-list-ul fs-1 d-block mb-2"></i>
              Không tìm thấy menu nào.
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
              <th>Tên menu</th>
              <th className="text-center" style={{ width: 130 }}>Loại menu</th>
              <th className="text-center" style={{ width: 90 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 150 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <div className="fw-semibold small">{item.name || '—'}</div>
                </td>
                <td className="text-center">
                  {item.menuTypeId ? (
                    <span className="badge bg-info text-dark">{getMenuTypeLabel(item.menuTypeId)}</span>
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
                  <Link
                    href={item.menuTypeId != null ? `/admin/menu-links/${String(item.menuTypeId)}/setup` : '#'}
                    className={`btn-setup me-1${item.menuTypeId == null ? ' opacity-50' : ''}`}
                    title={item.menuTypeId == null ? 'Menu chua co loai, khong the thiet lap lien ket' : 'Thiet lap lien ket'}
                  >
                    <i className="bi bi-link-45deg"></i>
                  </Link>
                  <Link href={`/admin/menus/${item.id}/edit`} className="btn-edit me-1">
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
