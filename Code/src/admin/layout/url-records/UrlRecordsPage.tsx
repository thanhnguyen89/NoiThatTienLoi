export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { urlRecordService } from '@/server/services/url-record.service';
import { UrlRecordTable } from '@/admin/features/url-record/UrlRecordTable';
import { UrlRecordFilters } from '@/admin/features/url-record/UrlRecordFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quan ly UrlRecord' };

export default async function UrlRecordsPage({ searchParams }: Props) {
  const sp = await searchParams;
  let records: Awaited<ReturnType<typeof urlRecordService.getAllUrlRecords>> = [];
  let dbError = false;

  try {
    records = await urlRecordService.getAllUrlRecords();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      records = records.filter((r) =>
        (r.slug && r.slug.toLowerCase().includes(kw)) ||
        (r.entityName && r.entityName.toLowerCase().includes(kw)) ||
        (r.entityId !== null && r.entityId !== undefined && r.entityId.toString().includes(kw))
      );
    }
    if (sp.status === 'active') {
      records = records.filter((r) => r.isActive);
    } else if (sp.status === 'inactive') {
      records = records.filter((r) => !r.isActive);
    }
  } catch { dbError = true; }

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
          DANH SACH URLRECORD
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

          <UrlRecordTable records={records} />
        </div>
      </div>
    </>
  );
}
