export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Nội Thất Tiện Lợi';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  ADMIN_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const PRODUCT_SORT_OPTIONS = [
  { label: 'Mới nhất', value: 'newest' },
  { label: 'Bán chạy', value: 'best-seller' },
  { label: 'Giá thấp đến cao', value: 'price-asc' },
  { label: 'Giá cao đến thấp', value: 'price-desc' },
] as const;

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const INQUIRY_TYPE_LABELS: Record<string, string> = {
  CONSULTATION: 'Tư vấn',
  ORDER: 'Đặt hàng',
  COMPLAINT: 'Khiếu nại',
  OTHER: 'Khác',
};

export const MENU_TYPE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Menu Top',
  2: 'Menu Footer',
  3: 'Menu Left',
  4: 'Menu Right',
};

export const MENU_LINK_SOURCE_TYPES: ReadonlyArray<{
  key: string;
  label: string;
  batchable?: boolean;
}> = [
  { key: 'news-content', label: 'Nội dung tin tức', batchable: true },
  { key: 'news-category', label: 'Chuyên mục tin tức', batchable: true },
  { key: 'static-page', label: 'Trang tĩnh', batchable: true },
  { key: 'product-category', label: 'Danh mục sản phẩm', batchable: true },
  { key: 'product', label: 'Sản phẩm', batchable: true },
  { key: 'package-category', label: 'Danh mục gói cước', batchable: true },
  { key: 'package', label: 'Gói cước', batchable: true },
];

export type MenuLinkSourceType = typeof MENU_LINK_SOURCE_TYPES[number]['key'];
