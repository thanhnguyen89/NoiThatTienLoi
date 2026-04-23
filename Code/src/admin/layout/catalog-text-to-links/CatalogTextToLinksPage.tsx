export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { catalogTextToLinkService } from '@/server/services/catalog-text-to-link.service';
import { categoryService } from '@/server/services/category.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { CatalogTextToLinkTable } from '@/admin/features/catalog-text-to-link/CatalogTextToLinkTable';
import { CatalogTextToLinkFilters } from '@/admin/features/catalog-text-to-link/CatalogTextToLinkFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedCatalogTextToLinks } from '@/server/repositories/catalog-text-to-link.repository';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý Text To Link' };

const emptyResult: PaginatedCatalogTextToLinks = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function CatalogTextToLinksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const [result, categories] = await Promise.all([
    dbSafe(() =>
      catalogTextToLinkService.getAll({
        page,
        pageSize: PAGINATION.ADMIN_PAGE_SIZE,
        search: sp.search || undefined,
        isActive: sp.status || undefined,
      }),
      emptyResult
    ),
    dbSafe(() => categoryService.getAdminCategories({ pageSize: 9999 }) as Promise<{ data: Array<{ id: string; name: string }>; pagination: { total: number } }>, { data: [], pagination: { total: 0 } }),
  ]);

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
            <CatalogTextToLinkFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              categories={categories.data}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH TEXT TO LINK ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/catalog-text-to-links/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <CatalogTextToLinkTable items={result.data} categories={categories.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/catalog-text-to-links" />
        </div>
      </div>
    </>
  );
}