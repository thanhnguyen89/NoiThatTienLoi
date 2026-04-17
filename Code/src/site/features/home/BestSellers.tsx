'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatPrice, calcDiscountPercent, formatSoldCount } from '@/lib/utils';
import type { ProductListItem } from '@/lib/types';
import './home-sections.css';

const CARD_W = 243; // 228px + 15px gap
const VISIBLE = 4;

interface BestSellersProps {
  products: ProductListItem[];
}

export function BestSellers({ products }: BestSellersProps) {
  const [pos, setPos] = useState(0);

  if (products.length === 0) return null;

  const maxPos = Math.max(0, (products.length - VISIBLE) * CARD_W);

  return (
    <section id="sec_best_sellers" className="best-sellers-section">
      <div className="best-sellers-header">
        <h2 className="best-sellers-title">Sản phẩm bán chạy</h2>
        <Link href="/san-pham" className="best-sellers-viewall">Xem tất cả →</Link>
      </div>

      <div className="best-sellers-slider">
        <button
          className="bs-slider-arrow bs-slider-prev"
          onClick={() => setPos((p) => Math.max(0, p - CARD_W * 2))}
          disabled={pos <= 0}
          aria-label="Previous"
        >‹</button>

        <div className="bs-slider-viewport">
          <div
            className="bs-slider-track"
            style={{ transform: `translateX(-${pos}px)` }}
          >
            {products.map((p) => {
              const discount = p.comparePrice
                ? calcDiscountPercent(p.price, p.comparePrice)
                : 0;
              return (
                <div key={p.id} className="bs-product-card">
                  <Link href={`/san-pham/${p.slug}`} className="bs-product-thumb">
                    {p.thumbnail && (
                      <img src={p.thumbnail} alt={p.name} loading="lazy" />
                    )}
                    {discount > 0 && (
                      <span className="discount-badge">-{discount}%</span>
                    )}
                  </Link>
                  <div className="bs-product-info">
                    <div className="bs-product-price">
                      <span className="price-new">{formatPrice(p.price)}</span>
                      {p.comparePrice && (
                        <span className="price-old">{formatPrice(p.comparePrice)}</span>
                      )}
                    </div>
                    {p.brand && <p className="bs-product-brand">{p.brand}</p>}
                    <h3 className="bs-product-name">
                      <Link href={`/san-pham/${p.slug}`}>{p.name}</Link>
                    </h3>
                    <div className="bs-product-rating">
                      <span className="rating-score">{p.avgRating.toFixed(1)}</span>
                      <span className="rating-star">★</span>
                      <span className="rating-count">({p.reviewCount})</span>
                      <span className="sold-count">🛒 {formatSoldCount(p.soldCount)}/tháng</span>
                    </div>
                    <div className="bs-product-progress">
                      <div className="progress-bar">
                        <span style={{ width: '60%' }} />
                      </div>
                      <span className="progress-text">60%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="bs-slider-arrow bs-slider-next"
          onClick={() => setPos((p) => Math.min(maxPos, p + CARD_W * 2))}
          disabled={pos >= maxPos}
          aria-label="Next"
        >›</button>
      </div>
    </section>
  );
}
