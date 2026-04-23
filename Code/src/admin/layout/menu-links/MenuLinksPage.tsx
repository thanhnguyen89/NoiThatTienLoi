export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { menuLinkService } from '@/server/services/menu-link.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { MenuLinkTable } from '@/admin/features/menu-link/MenuLinkTable';
import { MenuLinkFilters } from '@/admin/features/menu-link/MenuLinkFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedMenuLinks } from '@/server/repositories/menu-link.repository';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; menuId?: string; page?: string }>;
}

export const metadata = { title: 'Quan ly Menu Link' };

const emptyResult: PaginatedMenuLinks = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function MenuLinksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const result = await dbSafe(() =>
    menuLinkService.getAllMenuLinks({
      page,
      pageSize: PAGINATION.ADMIN_PAGE_SIZE,
      search: sp.search || undefined,
      isActive: sp.status || undefined,
      menuId: sp.menuId || undefined,
    }),
    emptyResult
  );

  const dbError = result.data.length === 0 && result.pagination.total === 0;

  return (
    <>
      {/* Banner thong tin menu neu dang trong context thiet lap lien ket */}
      {sp.menuId && !dbError && (
        <div className="alert alert-info d-flex align-items-center gap-2 mb-3 py-2">
          <i className="bi bi-info-circle-fill"></i>
          <span>
            Dang thiet lap lien ket cho menu ID: <strong>{sp.menuId}</strong>
          </span>
          <Link href="/admin/menus" className="btn btn-sm btn-outline-info ms-auto">
            <i className="bi bi-arrow-left me-1"></i>Quay lai danh sach menu
          </Link>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-header-custom">
          THONG TIN TIM KIEM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <MenuLinkFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              defaultMenuId={sp.menuId || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SACH MENU LINK ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href={sp.menuId ? `/admin/menu-links/new?menuId=${sp.menuId}` : '/admin/menu-links/new'} className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Them moi
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Khong the ket noi database. Vui long kiem tra PostgreSQL.
            </div>
          )}

          <MenuLinkTable menuLinks={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/menu-links" />
        </div>
      </div>
    </>
  );
}