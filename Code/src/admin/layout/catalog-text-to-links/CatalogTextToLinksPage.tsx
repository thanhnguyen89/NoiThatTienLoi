export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { catalogTextToLinkService } from '@/server/services/catalog-text-to-link.service';
import { categoryService } from '@/server/services/category.service';
import { CatalogTextToLinkTable } from '@/admin/features/catalog-text-to-link/CatalogTextToLinkTable';
import { CatalogTextToLinkFilters } from '@/admin/features/catalog-text-to-link/CatalogTextToLinkFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý Text To Link' };

export default async function CatalogTextToLinksPage({ searchParams }: Props) {
  const sp = await searchParams;
  let items: Awaited<ReturnType<typeof catalogTextToLinkService.getAll>> = [];
  let categories: Array<{ id: string; name: string }> = [];
  let dbError = false;

  try {
    [items, categories] = await Promise.all([
      catalogTextToLinkService.getAll(),
      categoryService.getAdminCategories() as Promise<Array<{ id: string; name: string }>>,
    ]);

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      items = items.filter((item) =>
        (item.keyword && item.keyword.toLowerCase().includes(kw)) ||
        (item.link && item.link.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      items = items.filter((item) => item.isActive);
    } else if (sp.status === 'inactive') {
      items = items.filter((item) => !item.isActive);
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
            <CatalogTextToLinkFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              categories={categories}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH TEXT TO LINK
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/catalog-text-to-links/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <CatalogTextToLinkTable items={items} categories={categories} />
        </div>
      </div>
    </>
  );
}
