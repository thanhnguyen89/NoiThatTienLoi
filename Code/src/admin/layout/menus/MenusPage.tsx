export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { menuService } from '@/server/services/menu.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { MenuTable } from '@/admin/features/menu/MenuTable';
import { MenuFilters } from '@/admin/features/menu/MenuFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedMenus } from '@/server/repositories/menu.repository';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; menuTypeId?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý Menu' };

const emptyResult: PaginatedMenus = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function MenusPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const result = await dbSafe(() =>
    menuService.getAllMenus({
      page,
      pageSize: PAGINATION.ADMIN_PAGE_SIZE,
      search: sp.search || undefined,
      isActive: sp.status || undefined,
      menuTypeId: sp.menuTypeId || undefined,
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
            <MenuFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              defaultMenuTypeId={sp.menuTypeId || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH MENU ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/menus/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <MenuTable menus={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/menus" />
        </div>
      </div>
    </>
  );
}