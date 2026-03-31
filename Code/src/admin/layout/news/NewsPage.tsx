export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { newsService } from '@/server/services/news.service';
import { NewsTable } from '@/admin/features/news/NewsTable';
import { NewsFilters } from '@/admin/features/news/NewsFilters';

interface Props {
  searchParams: Promise<{ search?: string; isPublished?: string; isShowHome?: string }>;
}

export const metadata = { title: 'Quan ly tin tuc' };

export default async function NewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  let news: Awaited<ReturnType<typeof newsService.getAllNews>> = [];
  let dbError = false;

  try {
    news = await newsService.getAllNews();
    // Apply filters
    if (sp.search) {
      const kw = sp.search.toLowerCase();
      news = news.filter((n: typeof news[number]) =>
        (n.title?.toLowerCase().includes(kw) || false) ||
        (n.seName?.toLowerCase().includes(kw) || false)
      );
    }
    if (sp.isPublished === 'published') {
      news = news.filter((n: typeof news[number]) => n.isPublished);
    } else if (sp.isPublished === 'unpublished') {
      news = news.filter((n: typeof news[number]) => !n.isPublished);
    }
    if (sp.isShowHome === 'home') {
      news = news.filter((n: typeof news[number]) => n.isShowHome);
    } else if (sp.isShowHome === 'nothome') {
      news = news.filter((n: typeof news[number]) => !n.isShowHome);
    }
  } catch { dbError = true; }

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
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SACH TIN TUC */}
      <div className="card">
        <div className="card-header-custom">
          DANH SACH TIN TUC
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
          <NewsTable news={news} />
        </div>
      </div>
    </>
  );
}
