import React from 'react';
import { calcDiscountPercent, calcProgressPercent, formatSoldPerMonth, calcMonthsSince, formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    thumbnail: string | null;
    price: number; // Giá cuối cùng (promoPrice hoặc salePrice)
    comparePrice: number | null; // Giá gốc (để gạch ngang)
    avgRating: number;
    reviewCount: number;
    soldCount: number;
    flashSaleTarget?: number | null;
    createdAt: Date;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const {
    name,
    slug,
    brand,
    thumbnail,
    price,
    comparePrice,
    avgRating,
    reviewCount,
    soldCount,
    flashSaleTarget,
    createdAt,
  } = product;

  // Tính discount %
  const discountPercent = comparePrice ? calcDiscountPercent(price, comparePrice) : 0;

  // Tính progress bar (dựa trên flashSaleTarget hoặc một tỷ lệ mặc định)
  const progressPercent = flashSaleTarget
    ? calcProgressPercent(soldCount, flashSaleTarget)
    : Math.min((soldCount / 100) * 10, 100); // Fallback: mỗi 100 sold = 10%

  // Format số lượng bán theo tháng
  const monthsActive = calcMonthsSince(new Date(createdAt));
  const soldPerMonth = formatSoldPerMonth(soldCount, monthsActive);

  // Màu progress bar dựa trên %
  const getProgressColor = (percent: number) => {
    if (percent >= 70) return 'bg-orange-500';
    if (percent >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Discount Badge */}
      {discountPercent > 0 && (
        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white px-3 py-1 rounded-md text-sm font-bold">
          -{discountPercent}%
        </div>
      )}

      {/* Product Image */}
      <a href={`/san-pham/${slug}`} className="block">
        <div className="relative w-full pt-[100%] bg-gray-100">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>
      </a>

      {/* Product Info */}
      <div className="p-4">
        {/* Price */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-red-600">{formatPrice(price)}</span>
            {comparePrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(comparePrice)}
              </span>
            )}
          </div>
        </div>

        {/* Brand */}
        {brand && (
          <div className="text-xs text-gray-500 mb-1 uppercase">{brand}</div>
        )}

        {/* Product Name */}
        <a
          href={`/san-pham/${slug}`}
          className="block text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-2 mb-2 h-10"
          title={name}
        >
          {name}
        </a>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          </div>
          <span className="text-xs text-gray-500">({reviewCount})</span>
        </div>

        {/* Sold Count */}
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="text-xs text-gray-600">{soldPerMonth}</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getProgressColor(progressPercent)}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">{progressPercent}%</div>
        </div>
      </div>
    </div>
  );
}
