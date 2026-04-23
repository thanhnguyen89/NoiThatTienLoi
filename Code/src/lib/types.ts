// ============================================================
// SHARED TYPES
// ============================================================

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================
// PRODUCT TYPES
// ============================================================

export type ProductSortField = 'newest' | 'best-seller';

export interface ProductFilterParams extends PaginationParams {
  categorySlug?: string;
  categoryId?: string;
  search?: string;
  sort?: ProductSortField;
  isFeatured?: boolean;
  isFlashSale?: boolean;
  isActive?: boolean;
  priceMin?: number;
  priceMax?: number;
  sizeId?: string;
  colorId?: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  brand: string | null;
  thumbnail: string | null;
  avgRating: number;
  reviewCount: number;
  soldCount: number;
  viewCount: number;
  createdAt: Date;
  isFeatured: boolean;
  isFlashSale: boolean;
  flashSaleTarget?: number | null;
  isActive: boolean;
  isShowHome: boolean;
  sortOrder: number;
  variantCount: number;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ProductDetail extends ProductListItem {
  shortDescription: string | null;
  description: string | null;
  specifications: string | null;
  ingredients: string | null;
  usage: string | null;
  // Các field bổ sung từ Product model
  code: string | null;
  origin: string | null;
  unit: string | null;
  warrantyMonths: number | null;
  image: string | null;
  icon: string | null;
  banner: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    sortOrder: number;
    isThumbnail: boolean;
    isActive: boolean;
  }>;
  variants: Array<{
    id: string;
    productSizeId: string;
    productColorId: string;
    sizeLabel: string;
    colorName: string;
    colorCode: string | null;
    sku: string | null;
    barcode: string | null;
    purchasePrice: number;
    salePrice: number;
    promoPrice: number | null;
    stockQty: number;
    reservedQty: number;
    weightKg: number | null;
    isDefault: boolean;
    isActive: boolean;
  }>;
  seoPlatforms: Array<{
    id: string;
    platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
    title: string | null;
    description: string | null;
    contentCate: string | null;
    keywords: string | null;
    hashtags: string | null;
    tags: string | null;
    linkPosted: string | null;
    slug: string | null;
    canonicalUrl: string | null;
    robots: string | null;
    isNoindex: boolean;
    isNofollow: boolean;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    isActive: boolean;
    seoMedia: Array<{
      id: string;
      mediaType: string;
      mediaUrl: string;
      altText: string | null;
      title: string | null;
      widthPx: number | null;
      heightPx: number | null;
      sortOrder: number;
      isPrimary: boolean;
      isActive?: boolean;
    }>;
  }>;
  platformImages: Array<{
    id: string;
    platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
    imageUrl: string;
    alt: string | null;
    title: string | null;
    caption: string | null;
    sortOrder: number;
    isPrimary: boolean;
    isActive: boolean;
  }>;
}

// ============================================================
// CATEGORY TYPES
// ============================================================

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isShowHome: boolean;
  parent: { id: string; name: string } | null;
  _count: {
    products: number;
  };
}

export interface CategoryTree extends CategoryListItem {
  children: CategoryTree[];
}

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  robots: string;
}

export interface CategoryDetail {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  image: string | null;
  icon: string | null;
  banner: string | null;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isShowHome: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  parent: { id: string; name: string } | null;
  platformSeos: Array<{
    platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
    title: string | null;
    description: string | null;
    keywords: string | null;
    hashtags: string | null;
    tags: string | null;
    slug: string | null;
    canonicalUrl: string | null;
    linkPosted: string | null;
    contentCate: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    robots: string | null;
  }>;
  platformImages: Array<{
    id: string;
    platform: 'WEBSITE' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE';
    imageUrl: string;
    alt: string | null;
    title: string | null;
    caption: string | null;
    sortOrder: number;
    isPrimary: boolean;
    isActive: boolean;
  }>;
  _count: { products: number };
}

// ============================================================
// INQUIRY TYPES
// ============================================================

export interface InquiryCreateInput {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  productId?: string;
  type?: 'CONSULTATION' | 'ORDER' | 'COMPLAINT' | 'OTHER';
}

export interface InquiryFilterParams extends PaginationParams {
  status?: string;
  type?: string;
  search?: string;
}

// ============================================================
// SIZE / COLOR TYPES
// ============================================================

export interface SizeOption {
  id: string;
  sizeLabel: string;
  widthCm: number | null;
  lengthCm: number | null;
  heightCm: number | null;
}

export interface ColorOption {
  id: string;
  colorName: string;
  colorCode: string | null;
}
