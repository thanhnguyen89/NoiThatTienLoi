import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc').max(200, 'Tên sản phẩm tối đa 200 ký tự'),
  slug: z.string().regex(slugRegex, 'Slug không hợp lệ (chỉ chứa a-z, 0-9 và dấu gạch ngang)').optional().nullable(),
  code: z.string().optional().nullable(),
  categoryId: z.string().min(1, 'Danh mục là bắt buộc'),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  specifications: z.string().optional().nullable(),
  ingredients: z.string().optional().nullable(),
  usage: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  warrantyMonths: z.coerce.number().int().min(0).optional().nullable(),
  image: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  banner: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  robots: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isFlashSale: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isShowHome: z.boolean().default(false),

  // Hình ảnh chung
  images: z.array(z.object({
    url: z.string().min(1, 'URL hình ảnh là bắt buộc'),
    alt: z.string().optional().nullable(),
    sortOrder: z.coerce.number().min(0).default(0),
    isThumbnail: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })).optional(),

  // Biến thể
  variants: z.array(z.object({
    id: z.string().optional().nullable(),
    productSizeId: z.string().min(1, 'Kích thước là bắt buộc'),
    productColorId: z.string().min(1, 'Màu sắc là bắt buộc'),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    purchasePrice: z.coerce.number().min(0).default(0),
    salePrice: z.coerce.number().min(0).default(0),
    promoPrice: z.coerce.number().min(0).optional().nullable(),
    stockQty: z.coerce.number().min(0).default(0),
    reservedQty: z.coerce.number().min(0).default(0),
    weightKg: z.coerce.number().min(0).optional().nullable(),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })).optional(),

  // Platform SEO (WEBSITE, FACEBOOK, TIKTOK, YOUTUBE)
  platformSeos: z.array(z.object({
    platform: z.enum(['WEBSITE', 'FACEBOOK', 'TIKTOK', 'YOUTUBE']),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    contentCate: z.string().optional().nullable(),
    keywords: z.string().optional().nullable(),
    hashtags: z.string().optional().nullable(),
    tags: z.string().optional().nullable(),
    linkPosted: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    canonicalUrl: z.string().optional().nullable(),
    robots: z.string().optional().nullable(),
    isNoindex: z.boolean().default(false),
    isNofollow: z.boolean().default(false),
    ogTitle: z.string().optional().nullable(),
    ogDescription: z.string().optional().nullable(),
    ogImage: z.string().optional().nullable(),
    schemaJson: z.any().optional().nullable(),
    extraMetaJson: z.any().optional().nullable(),
    isActive: z.boolean().default(true),
  })).optional(),

  // Platform images — đúng field name theo schema
  platformImages: z.array(z.object({
    platform: z.enum(['WEBSITE', 'FACEBOOK', 'TIKTOK', 'YOUTUBE']),
    imageUrl: z.string().min(1, 'URL hình ảnh là bắt buộc'),
    alt: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    caption: z.string().optional().nullable(),
    sortOrder: z.coerce.number().min(0).default(0),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

export function validateProduct(data: unknown) {
  return productSchema.safeParse(data);
}
