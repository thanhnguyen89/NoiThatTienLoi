export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { seoConfigService } from '@/server/services/seo-config.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { SeoConfigTable } from '@/admin/features/seo-config/SeoConfigTable';
import { SeoConfigFilters } from '@/admin/features/seo-config/SeoConfigFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedSeoConfigs } from '@/server/repositories/seo-config.repository';

interface Props {
  searchParams: Promise<{ keyword?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý cấu hình SEO' };

const emptyResult: PaginatedSeoConfigs = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function SeoConfigsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  let dbError = false;
  let result = emptyResult;
  
  try {
    result = await seoConfigService.getAllSeoConfigs({
      page,
      pageSize: PAGINATION.ADMIN_PAGE_SIZE,
      keyword: sp.keyword || undefined,
    });
  } catch (error) {
    console.error('Database error:', error);
    dbError = true;
  }

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
            <SeoConfigFilters
              defaultKeyword={sp.keyword || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH CẤU HÌNH SEO ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/seo-configs/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <SeoConfigTable configs={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/seo-configs" />
        </div>
      </div>
    </>
  );
}