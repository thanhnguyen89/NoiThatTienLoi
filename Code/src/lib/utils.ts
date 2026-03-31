import slugifyLib from 'slugify';

/**
 * Format giá tiền VND
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

/**
 * Tính phần trăm giảm giá
 */
export function calcDiscountPercent(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

/**
 * Tạo slug từ tiếng Việt
 */
export function createSlug(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    locale: 'vi',
  });
}

/**
 * Parse page number từ searchParams
 */
export function parsePageParam(param: string | string[] | undefined): number {
  const page = Number(param);
  return isNaN(page) || page < 1 ? 1 : page;
}

/**
 * Format số lượng đã bán
 */
export function formatSoldCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
