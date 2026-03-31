import Link from 'next/link';
import './pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = generatePageNumbers(currentPage, totalPages);

  function buildHref(page: number) {
    return page === 1 ? basePath : `${basePath}?page=${page}`;
  }

  return (
    <nav className="cate-paging" aria-label="Phân trang">
      <ul className="cate-paging__list">
        <li className={`cate-paging__item ${currentPage <= 1 ? 'cate-paging__item--disabled' : ''}`}>
          {currentPage > 1 ? (
            <Link href={buildHref(currentPage - 1)} className="cate-paging__link cate-paging__prev" aria-label="Trang trước">‹</Link>
          ) : (
            <span className="cate-paging__link cate-paging__prev" aria-label="Trang trước">‹</span>
          )}
        </li>
        {pages.map((p, i) =>
          p === '...' ? (
            <li key={`dots-${i}`} className="cate-paging__item cate-paging__item--dots">
              <span className="cate-paging__link">…</span>
            </li>
          ) : (
            <li key={p} className={`cate-paging__item ${p === currentPage ? 'is-active' : ''}`}>
              <Link href={buildHref(p as number)} className="cate-paging__link">{p}</Link>
            </li>
          )
        )}
        <li className={`cate-paging__item ${currentPage >= totalPages ? 'cate-paging__item--disabled' : ''}`}>
          {currentPage < totalPages ? (
            <Link href={buildHref(currentPage + 1)} className="cate-paging__link cate-paging__next" aria-label="Trang sau">›</Link>
          ) : (
            <span className="cate-paging__link cate-paging__next" aria-label="Trang sau">›</span>
          )}
        </li>
      </ul>
    </nav>
  );
}

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
