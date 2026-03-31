export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { productSizeService } from '@/server/services/product-size.service';
import { ProductSizeTable } from '@/admin/features/product-size/ProductSizeTable';
import { ProductSizeFilters } from '@/admin/features/product-size/ProductSizeFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý kích thước' };

export default async function ProductSizesPage({ searchParams }: Props) {
  const sp = await searchParams;
  let sizes: Awaited<ReturnType<typeof productSizeService.getAllSizes>> = [];
  let dbError = false;

  try {
    sizes = await productSizeService.getAllSizes();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      sizes = sizes.filter((s) =>
        s.sizeLabel.toLowerCase().includes(kw)
      );
    }
    if (sp.status === 'active') {
      sizes = sizes.filter((s) => s.isActive);
    } else if (sp.status === 'inactive') {
      sizes = sizes.filter((s) => !s.isActive);
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
            <ProductSizeFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH KÍCH THƯỚC
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/product-sizes/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <ProductSizeTable sizes={sizes} />
        </div>
      </div>
    </>
  );
}
