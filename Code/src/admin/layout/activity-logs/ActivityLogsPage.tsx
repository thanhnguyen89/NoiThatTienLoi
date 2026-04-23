export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { adminActivityLogRepository } from '@/server/repositories/admin-activity-log.repository';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { ActivityLogTable } from '@/admin/features/activity-log/ActivityLogTable';
import { ActivityLogFilters } from '@/admin/features/activity-log/ActivityLogFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedActivityLogs } from '@/server/repositories/admin-activity-log.repository';

interface Props {
  searchParams: Promise<{ action?: string; fromDate?: string; toDate?: string; page?: string }>;
}

export const metadata = { title: 'Nhật ký hoạt động' };

const emptyResult: PaginatedActivityLogs = {
  items: [],
  total: 0,
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function ActivityLogsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const result = await dbSafe(() =>
    adminActivityLogRepository.findAllPaginated({
      page,
      pageSize: PAGINATION.ADMIN_PAGE_SIZE,
      action: sp.action || undefined,
      dateFrom: sp.fromDate || undefined,
      dateTo: sp.toDate || undefined,
    }),
    emptyResult
  );

  const dbError = result.items.length === 0 && result.pagination.total === 0;

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
            <ActivityLogFilters
              defaultAction={sp.action || ''}
              defaultFromDate={sp.fromDate || ''}
              defaultToDate={sp.toDate || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          NHẬT KÝ HOẠT ĐỘNG ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database.
            </div>
          )}
          <ActivityLogTable logs={result.items} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/activity-logs" />
        </div>
      </div>
    </>
  );
}