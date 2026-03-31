export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { seoConfigService } from '@/server/services/seo-config.service';
import { SeoConfigTable } from '@/admin/features/seo-config/SeoConfigTable';
import { SeoConfigFilters } from '@/admin/features/seo-config/SeoConfigFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý cấu hình SEO' };

export default async function SeoConfigsPage({ searchParams }: Props) {
  const sp = await searchParams;
  let configs: Awaited<ReturnType<typeof seoConfigService.getAllSeoConfigs>> = [];
  let dbError = false;

  try {
    configs = await seoConfigService.getAllSeoConfigs();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      configs = configs.filter((c) =>
        (c.pageName && c.pageName.toLowerCase().includes(kw)) ||
        (c.title && c.title.toLowerCase().includes(kw)) ||
        (c.seName && c.seName.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      configs = configs.filter((c) => c.isActive);
    } else if (sp.status === 'inactive') {
      configs = configs.filter((c) => !c.isActive);
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
            <SeoConfigFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH CẤU HÌNH SEO
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

          <SeoConfigTable configs={configs} />
        </div>
      </div>
    </>
  );
}
