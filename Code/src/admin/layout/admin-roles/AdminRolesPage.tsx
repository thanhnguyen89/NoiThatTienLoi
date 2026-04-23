export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { adminRoleService } from '@/server/services/admin-role.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { AdminRoleTable } from '@/admin/features/admin-role/AdminRoleTable';
import { AdminRoleFilters } from '@/admin/features/admin-role/AdminRoleFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedAdminRoles } from '@/server/repositories/admin-role.repository';

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý vai trò' };

const emptyResult: PaginatedAdminRoles = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function AdminRolesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const result = await dbSafe(() =>
    adminRoleService.getAllRoles({
      page,
      pageSize: PAGINATION.ADMIN_PAGE_SIZE,
      search: sp.search || undefined,
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
            <AdminRoleFilters defaultSearch={sp.search || ''} />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH VAI TRÒ ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/admin-roles/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database.
            </div>
          )}

          <AdminRoleTable roles={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/admin-roles" />
        </div>
      </div>
    </>
  );
}
