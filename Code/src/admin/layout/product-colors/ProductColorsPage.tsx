export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { productColorService } from '@/server/services/product-color.service';
import { ProductColorTable } from '@/admin/features/product-color/ProductColorTable';
import { ProductColorFilters } from '@/admin/features/product-color/ProductColorFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý màu sắc' };

export default async function ProductColorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  let colors: Awaited<ReturnType<typeof productColorService.getAllColors>> = [];
  let dbError = false;

  try {
    colors = await productColorService.getAllColors();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      colors = colors.filter((c) =>
        c.colorName.toLowerCase().includes(kw) ||
        (c.colorCode && c.colorCode.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      colors = colors.filter((c) => c.isActive);
    } else if (sp.status === 'inactive') {
      colors = colors.filter((c) => !c.isActive);
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
            <ProductColorFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH MÀU SẮC
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/product-colors/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <ProductColorTable colors={colors} />
        </div>
      </div>
    </>
  );
}
