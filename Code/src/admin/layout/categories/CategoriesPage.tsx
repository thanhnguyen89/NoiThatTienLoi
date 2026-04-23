export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { categoryService } from '@/server/services/category.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { CategoryTable } from '@/admin/features/category/CategoryTable';
import { CategoryFilters } from '@/admin/features/category/CategoryFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedCategories } from '@/server/repositories/category.repository';

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    parentId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export const metadata = { title: 'Quản lý danh mục' };

const emptyResult: PaginatedCategories = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function CategoriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const [result, allCategories] = await Promise.all([
    dbSafe(() =>
      categoryService.getAdminCategories({
        page,
        pageSize: PAGINATION.ADMIN_PAGE_SIZE,
        search: sp.search || undefined,
        isActive: sp.status || undefined,
        parentId: sp.parentId || undefined,
      }),
      emptyResult
    ),
    dbSafe(() => categoryService.getAdminCategories({ pageSize: 9999 }) as Promise<PaginatedCategories>, emptyResult),
  ]);

  const dbError = result.data.length === 0 && result.pagination.total === 0;

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
            <CategoryFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              categories={allCategories.data.map((c) => ({ id: c.id, name: c.name }))}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SÁCH CHUYÊN MỤC */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH CHUYÊN MỤC ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          {/* Nút thêm mới */}
          <div className="mb-2">
            <Link href="/admin/categories/new" className="btn-add">
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
          <CategoryTable categories={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/categories" />
        </div>
      </div>
    </>
  );
}
