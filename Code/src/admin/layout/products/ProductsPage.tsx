export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { productService } from '@/server/services/product.service';
import { categoryService } from '@/server/services/category.service';
import { parsePageParam } from '@/lib/utils';
import { Pagination } from '@/admin/shared/Pagination';
import { PAGINATION } from '@/lib/constants';
import { ProductFilters } from '@/admin/features/product/ProductFilters';
import { ProductTable } from '@/admin/features/product/ProductTable';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedResult, ProductListItem } from '@/lib/types';

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    categoryId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    priceMin?: string;
    priceMax?: string;
    sizeId?: string;
    colorId?: string;
  }>;
}

export const metadata = { title: 'Quản lý sản phẩm' };

const emptyResult: PaginatedResult<ProductListItem> = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);
  const statusFilter = sp.status === 'inactive' ? false : sp.status === 'active' ? true : undefined;

  const [result, categories] = await Promise.all([
    dbSafe(() => productService.getProductsAdmin({
      page,
      pageSize: PAGINATION.ADMIN_PAGE_SIZE,
      search: sp.search || undefined,
      categoryId: sp.categoryId || undefined,
      isActive: statusFilter,
      priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      sizeId: sp.sizeId || undefined,
      colorId: sp.colorId || undefined,
    }), emptyResult),
    dbSafe(() => categoryService.getAllCategories() as Promise<Array<{ id: string; name: string }>>, []),
  ]);

  const dbError = result === emptyResult && categories.length === 0;

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
            <ProductFilters
              categories={categories}
              defaultSearch={sp.search || ''}
              defaultCategoryId={sp.categoryId || ''}
              defaultStatus={sp.status || ''}
              defaultFromDate={sp.fromDate || ''}
              defaultToDate={sp.toDate || ''}
              defaultPriceMin={sp.priceMin || ''}
              defaultPriceMax={sp.priceMax || ''}
              defaultSizeId={sp.sizeId || ''}
              defaultColorId={sp.colorId || ''}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SÁCH SẢN PHẨM */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH SẢN PHẨM ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/products/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <ProductTable products={result.data} />

          <div className="mt-2">
            <Pagination
              currentPage={result.pagination.page}
              totalPages={result.pagination.totalPages}
              basePath="/admin/products"
            />
          </div>
        </div>
      </div>
    </>
  );
}
