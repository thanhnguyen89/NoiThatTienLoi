export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { catalogNewsLevelService } from '@/server/services/catalog-news-level.service';
import { CatalogNewsLevelTable } from '@/admin/features/catalog-news-level/CatalogNewsLevelTable';
import { CatalogNewsLevelFilters } from '@/admin/features/catalog-news-level/CatalogNewsLevelFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý Mức độ Tin tức' };

export default async function CatalogNewsLevelsPage({ searchParams }: Props) {
  const sp = await searchParams;
  let levels: Awaited<ReturnType<typeof catalogNewsLevelService.getAll>> = [];
  let dbError = false;

  try {
    levels = await catalogNewsLevelService.getAll();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      levels = levels.filter((l) =>
        (l.name && l.name.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      levels = levels.filter((l) => l.isActive);
    } else if (sp.status === 'inactive') {
      levels = levels.filter((l) => !l.isActive);
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
            <CatalogNewsLevelFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH MỨC ĐỘ TIN TỨC
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/catalog-news-levels/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <CatalogNewsLevelTable levels={levels} />
        </div>
      </div>
    </>
  );
}
