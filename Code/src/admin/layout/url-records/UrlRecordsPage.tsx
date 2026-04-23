export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { urlRecordService } from '@/server/services/url-record.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { UrlRecordTable } from '@/admin/features/url-record/UrlRecordTable';
import { UrlRecordFilters } from '@/admin/features/url-record/UrlRecordFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedUrlRecords } from '@/server/repositories/url-record.repository';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export const metadata = { title: 'Quan ly UrlRecord' };

const emptyResult: PaginatedUrlRecords = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function UrlRecordsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const result = await dbSafe(() =>
    urlRecordService.getAllUrlRecords({
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
          THONG TIN TIM KIEM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <UrlRecordFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SACH URLRECORD ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/url-records/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Them moi
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Khong the ket noi database.
            </div>
          )}

          <UrlRecordTable records={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/url-records" />
        </div>
      </div>
    </>
  );
}