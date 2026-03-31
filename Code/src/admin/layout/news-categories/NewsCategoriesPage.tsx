export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { newsCategoryService } from '@/server/services/news-category.service';
import { NewsCategoryTable } from '@/admin/features/news-category/NewsCategoryTable';
import { NewsCategoryFilters } from '@/admin/features/news-category/NewsCategoryFilters';

interface Props {
  searchParams: Promise<{ search?: string; isPublished?: string }>;
}

export const metadata = { title: 'Quản lý danh mục tin tức' };

export default async function NewsCategoriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  let categories: Awaited<ReturnType<typeof newsCategoryService.getAllCategories>> = [];
  let dbError = false;

  try {
    categories = await newsCategoryService.getAllCategories();
    if (sp.search) {
      const kw = sp.search.toLowerCase();
      categories = categories.filter((c) =>
        (c.title?.toLowerCase().includes(kw) ?? false) || (c.seName && c.seName.toLowerCase().includes(kw))
      );
    }
    if (sp.isPublished === 'true') categories = categories.filter((c) => c.isPublished);
    else if (sp.isPublished === 'false') categories = categories.filter((c) => !c.isPublished);
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
            <NewsCategoryFilters
              defaultSearch={sp.search || ''}
              defaultPublished={sp.isPublished || ''}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SÁCH CHUYÊN MỤC TIN TỨC */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH DANH MỤC TIN TỨC
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          {/* Nút thêm mới */}
          <div className="mb-2">
            <Link href="/admin/news-categories/new" className="btn-add">
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
          <NewsCategoryTable categories={categories} />
        </div>
      </div>
    </>
  );
}
