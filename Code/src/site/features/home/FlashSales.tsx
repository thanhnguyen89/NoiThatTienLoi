'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { formatPrice, calcDiscountPercent } from '@/lib/utils';
import type { ProductListItem } from '@/lib/types';

const CARD_W = 243; // 228px + 15px gap
const VISIBLE = 4;

function FlashTimer({ endTimestamp }: { endTimestamp: number }) {
  const calc = () => {
    const diff = Math.max(0, endTimestamp - Math.floor(Date.now() / 1000));
    return {
      h: String(Math.floor(diff / 3600)).padStart(2, '0'),
      m: String(Math.floor((diff % 3600) / 60)).padStart(2, '0'),
      s: String(diff % 60).padStart(2, '0'),
    };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [endTimestamp]);

  return (
    <div className="flash-sale-timer">
      <span className="timer-item hour">{time.h}</span>
      <span className="timer-sep">:</span>
      <span className="timer-item minute">{time.m}</span>
      <span className="timer-sep">:</span>
      <span className="timer-item second">{time.s}</span>
    </div>
  );
}

interface FlashSalesProps {
  products: ProductListItem[];
}

export function FlashSales({ products }: FlashSalesProps) {
  const [pos, setPos] = useState(0);

  if (products.length === 0) return null;

  const maxPos = Math.max(0, (products.length - VISIBLE) * CARD_W);
  const endTimestamp = Math.floor(Date.now() / 1000) + 7200;

  return (
    <section id="sec_flash_sale" className="flash-sale-section">
      <div className="flash-sale-header">
        <div className="flash-sale-header-left">
          <h2 className="flash-sale-title">
            <span className="flash-icon">⚡</span>
            <Link href="/flash-sale" title="Flash Deals">Flash Deals</Link>
          </h2>
          <FlashTimer endTimestamp={endTimestamp} />
        </div>
        <Link href="/flash-sale" className="flash-sale-viewall">Xem tất cả →</Link>
      </div>

      <div className="flash-sale-slider">
        <button
          className="slider-arrow slider-prev"
          onClick={() => setPos((p) => Math.max(0, p - CARD_W * 2))}
          disabled={pos <= 0}
          aria-label="Previous"
        >‹</button>

        <div className="slider-viewport">
          <div
            className="slider-track"
            style={{ transform: `translateX(-${pos}px)` }}
          >
            {products.map((p) => {
              const discount = p.comparePrice
                ? calcDiscountPercent(p.price, p.comparePrice)
                : 0;
              return (
                <div key={p.id} className="product-card">
                  <Link href={`/san-pham/${p.slug}`} className="product-thumb">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '180px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#999' }}>
                        No image
                      </div>
                    )}
                    {discount > 0 && (
                      <span className="discount-badge">-{discount}%</span>
                    )}
                  </Link>
                  <div className="product-info">
                    <h3 className="product-name">
                      <Link href={`/san-pham/${p.slug}`}>{p.name}</Link>
                    </h3>
                    <div className="product-price">
                      <span className="price-new">{formatPrice(p.price)}</span>
                      {p.comparePrice && (
                        <span className="price-old">{formatPrice(p.comparePrice)}</span>
                      )}
                    </div>
                    {p.soldCount > 0 && (
                      <div className="product-progress">
                        <div className="flash-progress-bar">
                          <span style={{ width: `${Math.min(100, (p.soldCount / 100) * 100)}%` }} />
                        </div>
                        <span className="flash-progress-text">{Math.min(100, Math.round((p.soldCount / 100) * 100))}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="slider-arrow slider-next"
          onClick={() => setPos((p) => Math.min(maxPos, p + CARD_W * 2))}
          disabled={pos >= maxPos}
          aria-label="Next"
        >›</button>
      </div>
    </section>
  );
}