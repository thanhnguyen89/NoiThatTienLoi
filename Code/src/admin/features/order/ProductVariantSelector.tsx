'use client';

import { useState } from 'react';

interface Variant {
  id: string;
  variantName: string;
  sku: string;
  salePrice: number;
  stockQty: number;
  sizeLabel?: string | null;
  colorName?: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  salePrice: number;
  variants?: Variant[];
}

interface ProductVariantSelectorProps {
  product: Product;
  onAddToCart: (item: {
    productId: string;
    productName: string;
    sku: string | null;
    variantId: string | null;
    variantName: string | null;
    sizeLabel: string | null;
    colorName: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }) => void;
}

export function ProductVariantSelector({ product, onAddToCart }: ProductVariantSelectorProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const hasVariants = product.variants && product.variants.length > 0;
  const selectedVariant = hasVariants
    ? product.variants?.find((v) => v.id === selectedVariantId)
    : null;

  const currentPrice = selectedVariant ? selectedVariant.salePrice : product.salePrice;
  const currentSku = selectedVariant ? selectedVariant.sku : product.sku;
  const stockQty = selectedVariant?.stockQty ?? 999;

  function handleAddToCart() {
    if (hasVariants && !selectedVariantId) {
      alert('Vui lòng chọn biến thể sản phẩm');
      return;
    }

    if (quantity < 1) {
      alert('Số lượng phải lớn hơn 0');
      return;
    }

    if (quantity > stockQty) {
      alert(`Số lượng tồn kho chỉ còn ${stockQty}`);
      return;
    }

    onAddToCart({
      productId: product.id,
      productName: product.name,
      sku: currentSku,
      variantId: selectedVariantId,
      variantName: selectedVariant?.variantName || null,
      sizeLabel: selectedVariant?.sizeLabel || null,
      colorName: selectedVariant?.colorName || null,
      quantity,
      unitPrice: currentPrice,
      lineTotal: currentPrice * quantity,
    });

    // Reset
    setSelectedVariantId(null);
    setQuantity(1);
  }

  return (
    <div className="card p-2 mb-2">
      <div className="fw-semibold small mb-2">{product.name}</div>

      {hasVariants ? (
        <div className="mb-2">
          <label className="form-label small mb-1">Chọn biến thể:</label>
          <select
            className="form-select form-select-sm"
            value={selectedVariantId || ''}
            onChange={(e) => setSelectedVariantId(e.target.value || null)}
          >
            <option value="">-- Chọn biến thể --</option>
            {product.variants?.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.variantName}
                {variant.sizeLabel && ` - ${variant.sizeLabel}`}
                {variant.colorName && ` - ${variant.colorName}`}
                {' '}
                ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(variant.salePrice)})
                {' - Tồn: '}{variant.stockQty}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="small text-muted mb-2">
          SKU: {product.sku || '—'}
        </div>
      )}

      <div className="row g-2 mb-2">
        <div className="col-6">
          <label className="form-label small mb-1">Giá:</label>
          <div className="fw-semibold text-danger">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentPrice)}
          </div>
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Tồn kho:</label>
          <div className="fw-semibold text-success">{stockQty}</div>
        </div>
      </div>

      <div className="row g-2 align-items-end">
        <div className="col-6">
          <label className="form-label small mb-1">Số lượng:</label>
          <input
            type="number"
            className="form-control form-control-sm"
            min={1}
            max={stockQty}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        <div className="col-6">
          <button
            className="btn btn-sm btn-primary w-100"
            onClick={handleAddToCart}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Thêm vào đơn
          </button>
        </div>
      </div>
    </div>
  );
}
