export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { productColorService } from '@/server/services/product-color.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { ProductColorTable } from '@/admin/features/product-color/ProductColorTable';
import { ProductColorFilters } from '@/admin/features/product-color/ProductColorFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedProductColors } from '@/server/repositories/product-color.repository';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý màu sắc' };

const emptyResult: PaginatedProductColors = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function ProductColorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const result = await dbSafe(() =>
    productColorService.getAllColors({
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
            <ProductColorFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH MÀU SẮC ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/product-colors/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <ProductColorTable colors={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/product-colors" />
        </div>
      </div>
    </>
  );
}