export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { adminUserService } from '@/server/services/admin-user.service';
import { AdminUserTable } from '@/admin/features/admin-user/AdminUserTable';
import { AdminUserFilters } from '@/admin/features/admin-user/AdminUserFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý người dùng' };

export default async function AdminUsersPage({ searchParams }: Props) {
  const sp = await searchParams;
  let users: Awaited<ReturnType<typeof adminUserService.getAllUsers>> = [];
  let dbError = false;

  try {
    users = await adminUserService.getAllUsers();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      users = users.filter((u) =>
        (u.username && u.username.toLowerCase().includes(kw)) ||
        (u.email && u.email.toLowerCase().includes(kw)) ||
        (u.fullName && u.fullName.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      users = users.filter((u) => u.isActive);
    } else if (sp.status === 'inactive') {
      users = users.filter((u) => !u.isActive);
    }
  } catch { dbError = true; }

  return (
    <>
      <div className="card mb-3">
        <div className="card-header-custom">
          THÔNG TIN TÌM KIẾM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <AdminUserFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH NGƯỜI DÙNG
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/admin-users/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <AdminUserTable users={users} />
        </div>
      </div>
    </>
  );
}
