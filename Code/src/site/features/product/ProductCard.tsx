import Link from 'next/link';
import { formatPrice, calcDiscountPercent, formatSoldCount } from '@/lib/utils';
import type { ProductListItem } from '@/lib/types';

interface ProductCardProps {
  product: ProductListItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = product.comparePrice
    ? calcDiscountPercent(product.price, product.comparePrice)
    : 0;

  return (
    <article className="product-card">
      <Link href={`/san-pham/${product.slug}`} className="product-card__thumb">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-card__no-image">No image</div>
        )}
        {discount > 0 && (
          <span className="product-card__badge">-{discount}%</span>
        )}
      </Link>
      <div className="product-card__info">
        <div className="product-card__prices">
          <span className="product-card__price-new">{formatPrice(product.price)}</span>
          {product.comparePrice && (
            <span className="product-card__price-old">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>
        {product.brand && (
          <p className="product-card__brand">{product.brand}</p>
        )}
        <h3 className="product-card__name">
          <Link href={`/san-pham/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-card__rating">
          <span className="product-card__score">{product.avgRating.toFixed(1)}</span>
          <span className="product-card__star">★</span>
          <span className="product-card__reviews">({product.reviewCount})</span>
          <span className="product-card__sold">
            🛒 {formatSoldCount(product.soldCount)}/tháng
          </span>
        </div>
      </div>
    </article>
  );
}
