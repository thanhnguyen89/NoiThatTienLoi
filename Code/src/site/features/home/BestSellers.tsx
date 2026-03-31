import { ProductCard } from '@/site/features/product/ProductCard';
import type { ProductListItem } from '@/lib/types';

interface BestSellersProps {
  products: ProductListItem[];
}

export function BestSellers({ products }: BestSellersProps) {
  if (products.length === 0) return null;

  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Sản phẩm nổi bật</h2>
      </div>
      <div className="home-section__grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
