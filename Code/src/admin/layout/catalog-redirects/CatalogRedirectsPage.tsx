export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { catalogRedirectService } from '@/server/services/catalog-redirect.service';
import { CatalogRedirectTable } from '@/admin/features/catalog-redirect/CatalogRedirectTable';
import { CatalogRedirectFilters } from '@/admin/features/catalog-redirect/CatalogRedirectFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý Redirect' };

export default async function CatalogRedirectsPage({ searchParams }: Props) {
  const sp = await searchParams;
  let redirects: Awaited<ReturnType<typeof catalogRedirectService.getAllRedirects>> = [];
  let dbError = false;

  try {
    redirects = await catalogRedirectService.getAllRedirects();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      redirects = redirects.filter((r) =>
        (r.urlFrom && r.urlFrom.toLowerCase().includes(kw)) ||
        (r.urlTo && r.urlTo.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      redirects = redirects.filter((r) => r.isActive);
    } else if (sp.status === 'inactive') {
      redirects = redirects.filter((r) => !r.isActive);
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
            <CatalogRedirectFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH REDIRECT
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/catalog-redirects/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <CatalogRedirectTable redirects={redirects} />
        </div>
      </div>
    </>
  );
}
