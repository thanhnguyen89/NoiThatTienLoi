export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { catalogEmbedCodeService } from '@/server/services/catalog-embed-code.service';
import { CatalogEmbedCodeTable } from '@/admin/features/catalog-embed-code/CatalogEmbedCodeTable';
import { CatalogEmbedCodeFilters } from '@/admin/features/catalog-embed-code/CatalogEmbedCodeFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý Mã nhúng' };

export default async function CatalogEmbedCodesPage({ searchParams }: Props) {
  const sp = await searchParams;
  let embedCodes: Awaited<ReturnType<typeof catalogEmbedCodeService.getAllEmbedCodes>> = [];
  let dbError = false;

  try {
    embedCodes = await catalogEmbedCodeService.getAllEmbedCodes();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      embedCodes = embedCodes.filter((e) =>
        (e.title && e.title.toLowerCase().includes(kw)) ||
        (e.embedCode && e.embedCode.toLowerCase().includes(kw)) ||
        (e.note && e.note.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      embedCodes = embedCodes.filter((e) => e.isActive);
    } else if (sp.status === 'inactive') {
      embedCodes = embedCodes.filter((e) => !e.isActive);
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
            <CatalogEmbedCodeFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH MÃ NHÚNG
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/catalog-embed-codes/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <CatalogEmbedCodeTable embedCodes={embedCodes} />
        </div>
      </div>
    </>
  );
}
