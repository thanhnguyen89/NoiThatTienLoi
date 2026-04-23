export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { adminUserService } from '@/server/services/admin-user.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { AdminUserTable } from '@/admin/features/admin-user/AdminUserTable';
import { AdminUserFilters } from '@/admin/features/admin-user/AdminUserFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedAdminUsers } from '@/server/repositories/admin-user.repository';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý người dùng' };

const emptyResult: PaginatedAdminUsers = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const result = await dbSafe(() =>
    adminUserService.getAllUsers({
      page,
      pageSize: PAGINATION.ADMIN_PAGE_SIZE,
      search: sp.search || undefined,
      isActive: sp.status || undefined,
    }),
    emptyResult
  );

  const dbError = result.data.length === 0 && result.pagination.total === 0;

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
          DANH SÁCH NGƯỜI DÙNG ({result.pagination.total})
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

          <AdminUserTable users={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/admin-users" />
        </div>
      </div>
    </>
  );
}
