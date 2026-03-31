import { productRepository } from '@/server/repositories/product.repository';
import { validateProduct, type ProductInput } from '@/server/validators/product.validator';
import { createSlug } from '@/lib/utils';
import type { ProductFilterParams, PaginatedResult, ProductListItem, ProductDetail } from '@/lib/types';
import { NotFoundError, ValidationError, DuplicateError, ConflictError } from '@/server/errors';

// ============================================================
// TRANSFORM helpers
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

function toListItem(raw: AnyRow): ProductListItem {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    sku: raw.sku || null,
    price: 0, // Giá nằm ở variant
    comparePrice: null,
    brand: raw.brand || null,
    thumbnail: raw.images?.[0]?.url || null,
    avgRating: raw.avgRating,
    reviewCount: raw.reviewCount,
    soldCount: raw.soldCount,
    viewCount: raw.viewCount,
    createdAt: raw.createdAt,
    isFeatured: raw.isFeatured,
    isFlashSale: raw.isFlashSale,
    isActive: raw.isActive,
    isShowHome: raw.isShowHome,
    sortOrder: raw.sortOrder,
    category: raw.category,
    variantCount: raw._count?.variants || 0,
  };
}

function toDetail(raw: AnyRow): ProductDetail {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    sku: raw.sku || null,
    price: 0,
    comparePrice: null,
    brand: raw.brand || null,
    thumbnail: raw.images?.[0]?.url || null,
    avgRating: raw.avgRating,
    reviewCount: raw.reviewCount,
    soldCount: raw.soldCount,
    isFeatured: raw.isFeatured,
    isFlashSale: raw.isFlashSale,
    isActive: raw.isActive,
    isShowHome: raw.isShowHome,
    sortOrder: raw.sortOrder,
    category: raw.category,
    variantCount: raw._count?.variants || 0,
    shortDescription: raw.shortDescription || null,
    description: raw.description || null,
    specifications: raw.specifications || null,
    ingredients: raw.ingredients || null,
    usage: raw.usage || null,
    viewCount: raw.viewCount,
    createdAt: raw.createdAt,
    // Các field bổ sung từ Product model
    code: raw.code || null,
    origin: raw.origin || null,
    unit: raw.unit || null,
    warrantyMonths: raw.warrantyMonths || null,
    image: raw.image || null,
    icon: raw.icon || null,
    banner: raw.banner || null,
    seoTitle: raw.seoTitle || null,
    seoDescription: raw.seoDescription || null,
    canonicalUrl: raw.canonicalUrl || null,
    ogTitle: raw.ogTitle || null,
    ogDescription: raw.ogDescription || null,
    ogImage: raw.ogImage || null,
    robots: raw.robots || null,
    images: (raw.images || []).map((img: AnyRow) => ({
      id: img.id,
      url: img.url,
      alt: img.alt || null,
      sortOrder: img.sortOrder,
      isThumbnail: img.isThumbnail,
      isActive: img.isActive,
    })),
    variants: (raw.variants || []).map((v: AnyRow) => ({
      id: v.id,
      productSizeId: v.productSizeId,
      productColorId: v.productColorId,
      sizeLabel: v.productSize?.sizeLabel || '',
      colorName: v.productColor?.colorName || '',
      colorCode: v.productColor?.colorCode || null,
      sku: v.sku || null,
      barcode: v.barcode || null,
      purchasePrice: Number(v.purchasePrice),
      salePrice: Number(v.salePrice),
      promoPrice: v.promoPrice ? Number(v.promoPrice) : null,
      stockQty: v.stockQty,
      reservedQty: v.reservedQty,
      weightKg: v.weightKg ? Number(v.weightKg) : null,
      isDefault: v.isDefault,
      isActive: v.isActive,
    })),
    seoPlatforms: (raw.seoPlatforms || []).map((p: AnyRow) => ({
      id: p.id,
      platform: p.platform,
      title: p.title || null,
      description: p.description || null,
      contentCate: p.contentCate || null,
      keywords: p.keywords || null,
      hashtags: p.hashtags || null,
      tags: p.tags || null,
      linkPosted: p.linkPosted || null,
      slug: p.slug || null,
      canonicalUrl: p.canonicalUrl || null,
      robots: p.robots || null,
      isNoindex: p.isNoindex || false,
      isNofollow: p.isNofollow || false,
      ogTitle: p.ogTitle || null,
      ogDescription: p.ogDescription || null,
      ogImage: p.ogImage || null,
      isActive: p.isActive,
      seoMedia: (p.seoMedia || []).map((m: AnyRow) => ({
        id: m.id,
        mediaType: m.mediaType,
        mediaUrl: m.mediaUrl,
        altText: m.altText || null,
        title: m.title || null,
        widthPx: m.widthPx || null,
        heightPx: m.heightPx || null,
        sortOrder: m.sortOrder,
        isPrimary: m.isPrimary,
      })),
    })),
    platformImages: (raw.platformImages || []).map((p: AnyRow) => ({
      id: p.id,
      platform: p.platform,
      imageUrl: p.imageUrl,
      alt: p.alt || null,
      title: p.title || null,
      caption: p.caption || null,
      sortOrder: p.sortOrder,
      isPrimary: p.isPrimary,
      isActive: p.isActive,
    })),
  };
}

// ============================================================
// SERVICE
// ============================================================

export const productService = {
  async getProducts(params: ProductFilterParams): Promise<PaginatedResult<ProductListItem>> {
    const result = await productRepository.findMany({ ...params, isActive: true });
    return {
      data: result.data.map((p: AnyRow) => toListItem(p)),
      pagination: result.pagination,
    };
  },

  async getProductsAdmin(params: ProductFilterParams): Promise<PaginatedResult<ProductListItem>> {
    const result = await productRepository.findMany(params);
    return {
      data: result.data.map((p: AnyRow) => toListItem(p)),
      pagination: result.pagination,
    };
  },

  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    const product = await productRepository.findBySlug(slug);
    if (!product || !product.isActive) return null;
    productRepository.incrementViewCount(product.id).catch(() => {});
    return toDetail(product);
  },

  async getProductById(id: string): Promise<ProductDetail | null> {
    const product = await productRepository.findById(id);
    if (!product) return null;
    return toDetail(product);
  },

  async createProduct(input: Record<string, unknown>) {
    // Validate với Zod
    const result = validateProduct(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = result.data as Record<string, unknown>;

    console.log('[createProduct] description:', JSON.stringify(data.description)?.substring(0, 200));
    console.log('[createProduct] ingredients:', JSON.stringify(data.ingredients)?.substring(0, 200));
    console.log('[createProduct] image:', JSON.stringify(data.image)?.substring(0, 200));

    // Auto slug
    if (!data.slug && data.name) {
      data.slug = createSlug(data.name as string);
    }

    // Tạo product
    const product = await productRepository.create(data as ProductInput);
    return toDetail(product);
  },

  async updateProduct(id: string, input: Record<string, unknown>) {
    const current = await productRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy sản phẩm');
    }

    // Validate với Zod
    const result = validateProduct({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = result.data;

    // Auto slug nếu name thay đổi
    if (input.name && !input.slug) {
      data.slug = createSlug(input.name as string);
    }

    const product = await productRepository.update(id, data as Partial<ProductInput>);
    return toDetail(product);
  },

  async deleteProduct(id: string) {
    const current = await productRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy sản phẩm');
    }

    return productRepository.delete(id);
  },

  async getFeaturedProducts(limit = 8) {
    const result = await productRepository.findMany({
      isFeatured: true, isActive: true, page: 1, pageSize: limit,
    });
    return result.data.map((p: AnyRow) => toListItem(p));
  },

  async getFlashSaleProducts(limit = 8) {
    const result = await productRepository.findMany({
      isFlashSale: true, isActive: true, page: 1, pageSize: limit,
    });
    return result.data.map((p: AnyRow) => toListItem(p));
  },

  async getSizes() {
    return productRepository.getSizes();
  },

  async getColors() {
    return productRepository.getColors();
  },
};
