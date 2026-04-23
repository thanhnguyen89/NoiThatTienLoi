export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { newsService } from '@/server/services/news.service';
import { newsCategoryService } from '@/server/services/news-category.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { NewsTable } from '@/admin/features/news/NewsTable';
import { NewsFilters } from '@/admin/features/news/NewsFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedNews } from '@/server/repositories/news.repository';

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    isPublished?: string;
    isShowHome?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export const metadata = { title: 'Quan ly tin tuc' };

const emptyResult: PaginatedNews = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function NewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const [result, allCategories] = await Promise.all([
    dbSafe(() =>
      newsService.getAllNews({
        page,
        pageSize: PAGINATION.ADMIN_PAGE_SIZE,
        search: sp.search || undefined,
        isPublished: sp.isPublished || undefined,
        isShowHome: sp.isShowHome || undefined,
        dateFrom: sp.dateFrom || undefined,
        dateTo: sp.dateTo || undefined,
      }),
      emptyResult
    ),
    dbSafe(() => newsCategoryService.getAllCategories() as Promise<Array<{ id: string; title: string | null }>>, []),
  ]);

  const dbError = result.data.length === 0 && result.pagination.total === 0;

  const categories = allCategories.map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      {/* THONG TIN TIM KIEM */}
      <div className="card mb-3">
        <div className="card-header-custom">
          THONG TIN TIM KIEM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <NewsFilters
              defaultSearch={sp.search || ''}
              defaultPublished={sp.isPublished || ''}
              defaultShowHome={sp.isShowHome || ''}
              defaultCategoryId={sp.categoryId || ''}
              defaultDateFrom={sp.dateFrom || ''}
              defaultDateTo={sp.dateTo || ''}
              categories={categories}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SACH TIN TUC */}
      <div className="card">
        <div className="card-header-custom">
          DANH SACH TIN TUC ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          {/* Nut them moi */}
          <div className="mb-2">
            <Link href="/admin/news/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Them moi
            </Link>
          </div>

          {/* DB Error */}
          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Khong the ket noi database. Vui long kiem tra PostgreSQL.
            </div>
          )}

          {/* Table */}
          <NewsTable news={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/news" />
        </div>
      </div>
    </>
  );
}