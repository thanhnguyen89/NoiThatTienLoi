import type { ProductDetail } from '@/lib/types';

interface ProductTabsProps {
  product: ProductDetail;
}

export function ProductTabs({ product }: ProductTabsProps) {
  return (
    <div className="product-tabs">
      {product.description && (
        <div className="product-tab-content">
          <h3>Mô tả sản phẩm</h3>
          <p>{product.description}</p>
        </div>
      )}
      {product.specifications && (
        <div className="product-tab-content">
          <h3>Thông số kỹ thuật</h3>
          <p>{product.specifications}</p>
        </div>
      )}
    </div>
  );
}
