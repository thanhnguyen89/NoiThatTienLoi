'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatar: string | null;
  isActive: boolean | null;
  isSuperAdmin: boolean | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  role: { id: string; name: string; code: string };
}

function formatDate(date: Date | null) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function AdminUserTable({ users }: { users: AdminUserItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(user: AdminUserItem) {
    if (!confirm(`Xóa người dùng "${user.username}"?`)) return;
    setDeletingId(user.id);
    try {
      const res = await fetch(`/admin/api/admin-users/${user.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!users.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-people fs-1 d-block mb-2"></i>
              Chưa có người dùng nào.
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
              <th>Username</th>
              <th>Email</th>
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th className="text-center" style={{ width: 90 }}>Đăng nhập cuối</th>
              <th className="text-center" style={{ width: 80 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <div className="fw-semibold small">{user.username}</div>
                  {user.isSuperAdmin && <span className="badge bg-danger me-1">Super Admin</span>}
                </td>
                <td><div className="small">{user.email}</div></td>
                <td><div className="small">{user.fullName || '—'}</div></td>
                <td><span className="badge bg-info">{user.role.name}</span></td>
                <td className="text-center">{formatDate(user.lastLoginAt)}</td>
                <td className="text-center">
                  {user.isActive ? <span className="badge bg-success">● Active</span> : <span className="badge bg-secondary">● Inactive</span>}
                </td>
                <td className="text-center">
                  <Link href={`/admin/admin-users/${user.id}/edit`} className="btn-edit me-1"><i className="bi bi-pencil-fill"></i></Link>
                  <button className="btn-del" onClick={() => handleDelete(user)} disabled={deletingId === user.id}>
                    {deletingId === user.id ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-trash-fill"></i>}
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
