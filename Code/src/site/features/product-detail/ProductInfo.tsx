import { formatPrice } from '@/lib/utils';
import type { ProductDetail } from '@/lib/types';

interface ProductInfoProps {
  product: ProductDetail;
}

export function ProductInfo({ product }: ProductInfoProps) {
  return (
    <div className="product-info">
      <h1 className="product-info__name">{product.name}</h1>
      <div className="product-info__price">
        <span>{formatPrice(product.price)}</span>
        {product.comparePrice && (
          <span style={{ textDecoration: 'line-through', color: '#999', marginLeft: 8 }}>
            {formatPrice(product.comparePrice)}
          </span>
        )}
      </div>
      {product.brand && <p>Thương hiệu: {product.brand}</p>}
      <p>SKU: {product.sku}</p>
    </div>
  );
}
