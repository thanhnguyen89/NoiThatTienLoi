import { ProductCard } from '@/site/features/product/ProductCard';
import type { ProductListItem } from '@/lib/types';
import './home-sections.css';

interface FlashSalesProps {
  products: ProductListItem[];
}

export function FlashSales({ products }: FlashSalesProps) {
  if (products.length === 0) return null;

  return (
    <section className="home-section flash-sales">
      <div className="home-section__header">
        <h2 className="home-section__title">
          <span className="flash-icon">⚡</span> Flash Sale
        </h2>
      </div>
      <div className="home-section__grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
