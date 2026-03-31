'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminRoleItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number | null;
  _count: { users: number };
}

export function AdminRoleTable({ roles }: { roles: AdminRoleItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(role: AdminRoleItem) {
    if (!confirm(`Xóa vai trò "${role.name}"?`)) return;
    setDeletingId(role.id);
    try {
      const res = await fetch(`/admin/api/admin-roles/${role.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!roles.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-shield fs-1 d-block mb-2"></i>
              Chưa có vai trò nào.
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
              <th>Tên vai trò</th>
              <th>Mã</th>
              <th>Mô tả</th>
              <th className="text-center" style={{ width: 80 }}>Thứ tự</th>
              <th className="text-center" style={{ width: 80 }}>Người dùng</th>
              <th className="text-center" style={{ width: 90 }}>Hệ thống</th>
              <th className="text-center" style={{ width: 90 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role, idx) => (
              <tr key={role.id}>
                <td className="text-center">{idx + 1}</td>
                <td><div className="fw-semibold small">{role.name}</div></td>
                <td><code>{role.code}</code></td>
                <td><div className="small text-muted">{role.description || '—'}</div></td>
                <td className="text-center">{role.sortOrder ?? 0}</td>
                <td className="text-center"><span className="badge bg-secondary">{role._count.users}</span></td>
                <td className="text-center">
                  {role.isSystem ? <i className="bi bi-check-lg text-danger"></i> : <span className="text-muted">—</span>}
                </td>
                <td className="text-center">
                  {role.isActive ? <span className="badge bg-success">● Active</span> : <span className="badge bg-secondary">● Inactive</span>}
                </td>
                <td className="text-center">
                  <Link href={`/admin/admin-roles/${role.id}/edit`} className="btn-edit me-1"><i className="bi bi-pencil-fill"></i></Link>
                  <button className="btn-del" onClick={() => handleDelete(role)} disabled={deletingId === role.id || role.isSystem}>
                    {deletingId === role.id ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-trash-fill"></i>}
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
