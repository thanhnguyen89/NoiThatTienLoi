export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { adminActivityLogRepository } from '@/server/repositories/admin-activity-log.repository';
import { ActivityLogTable } from '@/admin/features/activity-log/ActivityLogTable';
import { ActivityLogFilters } from '@/admin/features/activity-log/ActivityLogFilters';

interface Props {
  searchParams: Promise<{ search?: string; action?: string; fromDate?: string; toDate?: string }>;
}

export const metadata = { title: 'Nhật ký hoạt động' };

export default async function ActivityLogsPage({ searchParams }: Props) {
  const sp = await searchParams;
  let logs = { items: [] as Awaited<ReturnType<typeof adminActivityLogRepository.findAll>>['items'], total: 0 };
  let dbError = false;

  try {
    logs = await adminActivityLogRepository.findAll(100, 0);

    if (sp.action) {
      logs.items = logs.items.filter((l) => l.action === sp.action);
    }
    if (sp.fromDate) {
      const from = new Date(sp.fromDate);
      logs.items = logs.items.filter((l) => new Date(l.createdAt) >= from);
    }
    if (sp.toDate) {
      const to = new Date(sp.toDate);
      to.setHours(23, 59, 59, 999);
      logs.items = logs.items.filter((l) => new Date(l.createdAt) <= to);
    }
  } catch { dbError = true; }

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
          NHẬT KÝ HOẠT ĐỘNG
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
          <ActivityLogTable logs={logs.items} />
        </div>
      </div>
    </>
  );
}
