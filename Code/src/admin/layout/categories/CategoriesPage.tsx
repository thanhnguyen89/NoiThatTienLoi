export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { categoryService } from '@/server/services/category.service';
import { CategoryTable } from '@/admin/features/category/CategoryTable';
import { CategoryFilters } from '@/admin/features/category/CategoryFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; parentId?: string; fromDate?: string; toDate?: string }>;
}

export const metadata = { title: 'Quản lý danh mục' };

export default async function CategoriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  let categories: Awaited<ReturnType<typeof categoryService.getAdminCategories>> = [];
  let all: typeof categories = [];
  let dbError = false;

  try {
    all = await categoryService.getAdminCategories();
    categories = [...all];
    if (sp.search) {
      const kw = sp.search.toLowerCase();
      categories = categories.filter((c: typeof categories[number]) => c.name.toLowerCase().includes(kw) || c.slug.toLowerCase().includes(kw));
    }
    if (sp.status === 'active') categories = categories.filter((c: typeof categories[number]) => c.isActive);
    else if (sp.status === 'inactive') categories = categories.filter((c: typeof categories[number]) => !c.isActive);
    if (sp.parentId) categories = categories.filter((c: typeof categories[number]) => c.parentId === sp.parentId);
    if (sp.fromDate) {
      const from = new Date(sp.fromDate);
      categories = categories.filter((c: typeof categories[number]) => new Date(c.createdAt) >= from);
    }
    if (sp.toDate) {
      const to = new Date(sp.toDate);
      to.setHours(23, 59, 59, 999);
      categories = categories.filter((c: typeof categories[number]) => new Date(c.createdAt) <= to);
    }
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
            <CategoryFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              categories={all.map((c: typeof all[number]) => ({ id: c.id, name: c.name }))}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SÁCH CHUYÊN MỤC */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH CHUYÊN MỤC
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          {/* Nút thêm mới */}
          <div className="mb-2">
            <Link href="/admin/categories/new" className="btn-add">
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
          <CategoryTable categories={categories} />
        </div>
      </div>
    </>
  );
}
