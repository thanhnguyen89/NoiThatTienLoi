export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { newsCategoryService } from '@/server/services/news-category.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { NewsCategoryTable } from '@/admin/features/news-category/NewsCategoryTable';
import { NewsCategoryFilters } from '@/admin/features/news-category/NewsCategoryFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedNewsCategories } from '@/server/repositories/news-category.repository';

interface Props {
  searchParams: Promise<{ search?: string; category?: string; dateFrom?: string; dateTo?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý danh mục tin tức' };

const emptyResult: PaginatedNewsCategories = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function NewsCategoriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const [result, allCategories] = await Promise.all([
    dbSafe(() =>
      newsCategoryService.getAllCategories({
        page,
        pageSize: PAGINATION.ADMIN_PAGE_SIZE,
        search: sp.search || undefined,
        dateFrom: sp.dateFrom || undefined,
        dateTo: sp.dateTo || undefined,
      }),
      emptyResult
    ),
    dbSafe(() => newsCategoryService.getAllCategories() as Promise<PaginatedNewsCategories>, emptyResult),
  ]);

  const dbError = result.data.length === 0 && result.pagination.total === 0;

  const filterCategories = allCategories.data.map((c) => ({ id: c.id, name: c.title || c.seName || c.id }));

  return (
    <>
      {/* THÔNG TIN TÌM KIẾM */}
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
            <NewsCategoryFilters
              defaultSearch={sp.search || ''}
              defaultCategory={sp.category || ''}
              defaultDateFrom={sp.dateFrom || ''}
              defaultDateTo={sp.dateTo || ''}
              categories={filterCategories}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SÁCH CHUYÊN MỤC TIN TỨC */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH DANH MỤC TIN TỨC ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          {/* Nút thêm mới */}
          <div className="mb-2">
            <Link href="/admin/news-categories/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {/* DB Error */}
          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          {/* Table */}
          <NewsCategoryTable categories={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/news-categories" />
        </div>
      </div>
    </>
  );
}