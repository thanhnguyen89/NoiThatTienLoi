export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { pageService } from '@/server/services/page.service';
import { PageTable } from '@/admin/features/page/PageTable';
import { PageFilters } from '@/admin/features/page/PageFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý trang' };

export default async function PagesPage({ searchParams }: Props) {
  const sp = await searchParams;
  let pages: Awaited<ReturnType<typeof pageService.getAllPages>> = [];
  let dbError = false;

  try {
    pages = await pageService.getAllPages();
    if (sp.search) {
      const kw = sp.search.toLowerCase();
      pages = pages.filter((p) =>
        (p.pageName?.toLowerCase().includes(kw) || false) ||
        (p.title?.toLowerCase().includes(kw) || false)
      );
    }
    if (sp.status === 'active') pages = pages.filter((p) => p.isActive);
    else if (sp.status === 'inactive') pages = pages.filter((p) => !p.isActive);
  } catch { dbError = true; }

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
            <PageFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SÁCH TRANG */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH TRANG
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          {/* Nút thêm mới */}
          <div className="mb-2">
            <Link href="/admin/pages/new" className="btn-add">
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
          <PageTable pages={pages} />
        </div>
      </div>
    </>
  );
}
