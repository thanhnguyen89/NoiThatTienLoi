import Link from 'next/link';
import { formatPrice, calcDiscountPercent, formatSoldCount } from '@/lib/utils';
import type { ProductListItem } from '@/lib/types';

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
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt={p.name} loading="lazy" />
                ) : (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#999' }}>
                    No image
                  </div>
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
                {p.soldCount > 0 && (
                  <div className="ts-product-progress">
                    <div className="progress-bar">
                      <span style={{ width: `${Math.min(100, (p.soldCount / 100) * 100)}%` }} />
                    </div>
                    <span className="progress-text">{Math.min(100, Math.round((p.soldCount / 100) * 100))}%</span>
                  </div>
                )}
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