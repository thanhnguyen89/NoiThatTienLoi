import Link from 'next/link';
import { formatPrice, calcDiscountPercent, formatSoldCount } from '@/lib/utils';
import type { ProductListItem } from '@/lib/types';
import './home-sections.css';

interface TodaySuggestionProps {
  products: ProductListItem[];
}

export function TodaySuggestion({ products }: TodaySuggestionProps) {
  if (products.length === 0) return null;

  return (
    <section id="sec_today_suggestion" className="today-suggestion-section">
      <div className="today-suggestion-header">
        <h2 className="today-suggestion-title">
          <Link href="/san-pham">Gợi ý hôm nay</Link>
        </h2>
      </div>

      <div className="today-suggestion-grid">
        {products.map((p) => {
          const discount = p.comparePrice
            ? calcDiscountPercent(p.price, p.comparePrice)
            : 0;
          return (
            <div key={p.id} className="ts-product-card">
              <Link href={`/san-pham/${p.slug}`} className="ts-product-thumb">
                {p.thumbnail && (
                  <img src={p.thumbnail} alt={p.name} loading="lazy" />
                )}
                {discount > 0 && (
                  <span className="discount-badge">-{discount}%</span>
                )}
              </Link>
              <div className="ts-product-info">
                <div className="ts-product-price">
                  <span className="price-new">{formatPrice(p.price)}</span>
                  {p.comparePrice && (
                    <span className="price-old">{formatPrice(p.comparePrice)}</span>
                  )}
                </div>
                {p.brand && <p className="ts-product-brand">{p.brand}</p>}
                <h3 className="ts-product-name">
                  <Link href={`/san-pham/${p.slug}`}>{p.name}</Link>
                </h3>
                <div className="ts-product-rating">
                  <span className="rating-score">{p.avgRating.toFixed(1)}</span>
                  <span className="rating-star">★</span>
                  <span className="rating-count">({p.reviewCount})</span>
                  <span className="sold-count">🛒 {formatSoldCount(p.soldCount)}/tháng</span>
                </div>
                <div className="ts-product-progress">
                  <div className="progress-bar">
                    <span style={{ width: '65%' }} />
                  </div>
                  <span className="progress-text">65%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="today-suggestion-footer">
        <Link href="/san-pham" className="today-suggestion-viewmore">Xem thêm →</Link>
      </div>
    </section>
  );
}
