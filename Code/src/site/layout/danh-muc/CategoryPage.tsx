import type { Metadata } from 'next';
import { productService } from '@/server/services/product.service';
import { categoryService } from '@/server/services/category.service';
import { parsePageParam } from '@/lib/utils';
import { ProductGrid } from '@/site/features/product/ProductGrid';
import { Pagination } from '@/site/shared/Pagination';
import { SortBar } from '@/site/features/product/SortBar';
import { Breadcrumb } from '@/site/shared/Breadcrumb';
import { dbSafe } from '@/lib/db-safe';
import type { ProductSortField, PaginatedResult, ProductListItem } from '@/lib/types';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

const emptyResult: PaginatedResult<ProductListItem> = {
  data: [],
  pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await dbSafe(() => categoryService.getCategoryBySlug(slug), null);
  if (!category) return {};
  return { title: category.name, description: category.description || `Danh mục ${category.name}` };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parsePageParam(sp.page);
  const sort = (sp.sort || 'newest') as ProductSortField;

  const [category, result] = await Promise.all([
    dbSafe(() => categoryService.getCategoryBySlug(slug), null),
    dbSafe(() => productService.getProducts({ categorySlug: slug, page, sort }), emptyResult),
  ]);

  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: category?.name || slug }]} />
      <section className="cate-page">
        <div className="cate-heading">
          <h1 className="cate-heading__title">{category?.name || slug}</h1>
          <span className="cate-heading__count">({result.pagination.total} sản phẩm)</span>
        </div>
        {category?.description && <p className="cate-description">{category.description}</p>}
        <SortBar currentSort={sort} />
        <ProductGrid products={result.data} />
        <Pagination
          currentPage={result.pagination.page}
          totalPages={result.pagination.totalPages}
          basePath={`/danh-muc/${slug}`}
        />
      </section>
    </div>
  );
}
