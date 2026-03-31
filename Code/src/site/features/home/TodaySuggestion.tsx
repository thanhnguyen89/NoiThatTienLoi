import { ProductCard } from '@/site/features/product/ProductCard';
import type { ProductListItem } from '@/lib/types';

interface TodaySuggestionProps {
  products: ProductListItem[];
}

export function TodaySuggestion({ products }: TodaySuggestionProps) {
  if (products.length === 0) return null;

  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Gợi ý hôm nay</h2>
      </div>
      <div className="home-section__grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
