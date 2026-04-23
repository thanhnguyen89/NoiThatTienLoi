'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CategoryTree } from '@/lib/types';

const ITEM_W = 131; // 120px + 11px gap
const VISIBLE = 8;

interface CategoryGridProps {
  categories: CategoryTree[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const [pos, setPos] = useState(0);

  if (categories.length === 0) return null;

  const maxPos = Math.max(0, (categories.length - VISIBLE) * ITEM_W);

  return (
    <section className="category-slider-section">
      <div className="category-header">
        <h2 className="category-title">Danh mục</h2>
        <div className="category-nav">
          <button
            onClick={() => setPos((p) => Math.max(0, p - ITEM_W * 3))}
            disabled={pos <= 0}
            aria-label="Previous"
          >&lt;</button>
          <button
            onClick={() => setPos((p) => Math.min(maxPos, p + ITEM_W * 3))}
            disabled={pos >= maxPos}
            aria-label="Next"
          >&gt;</button>
        </div>
      </div>
      <div className="category-slider">
        <div
          className="category-track"
          style={{ transform: `translateX(-${pos}px)` }}
        >
          {categories.map((cat) => (
            <Link key={cat.id} href={`/danh-muc/${cat.slug}`} className="category-item">
              <div className="category-icon-wrap">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} loading="lazy" />
                ) : (
                  <span style={{ fontSize: 28 }}>🪑</span>
                )}
              </div>
              <span className="category-name">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
