import Link from 'next/link';
import type { CategoryTree } from '@/lib/types';
import './home-sections.css';

interface CategoryGridProps {
  categories: CategoryTree[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <section className="home-section category-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Danh mục sản phẩm</h2>
      </div>
      <div className="category-grid">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/danh-muc/${cat.slug}`} className="category-card">
            {cat.image && (
              <img src={cat.image} alt={cat.name} className="category-card__image" loading="lazy" />
            )}
            <span className="category-card__name">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
