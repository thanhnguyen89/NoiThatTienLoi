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
 * Tính progress bar cho flash sale hoặc best seller
 * @param soldCount - Số lượng đã bán
 * @param target - Mục tiêu bán (flashSaleTarget hoặc stock target)
 * @returns Phần trăm progress (0-100)
 */
export function calcProgressPercent(soldCount: number, target: number): number {
  if (!target || target <= 0) return 0;
  const percent = Math.round((soldCount / target) * 100);
  return Math.min(percent, 100); // Giới hạn tối đa 100%
}

/**
 * Format số lượng bán theo tháng (dùng cho hiển thị "2.1k/tháng")
 * @param soldCount - Tổng số lượng đã bán
 * @param monthsActive - Số tháng sản phẩm đã active (tính từ createdAt)
 * @returns Chuỗi format "X.Xk/tháng" hoặc "XX/tháng"
 */
export function formatSoldPerMonth(soldCount: number, monthsActive: number = 1): string {
  const perMonth = soldCount / Math.max(monthsActive, 1);
  if (perMonth >= 1000) {
    return (perMonth / 1000).toFixed(1) + 'k/tháng';
  }
  return Math.round(perMonth) + '/tháng';
}

/**
 * Tính số tháng từ ngày tạo đến hiện tại
 */
export function calcMonthsSince(date: Date): number {
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return Math.max(months, 1); // Ít nhất 1 tháng
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
