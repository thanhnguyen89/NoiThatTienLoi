import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { ProductInput } from '@/server/validators/product.validator';
import { PAGINATION } from '@/lib/constants';
import type { ProductFilterParams } from '@/lib/types';

// ============================================================
// SELECT FIELDS
// ============================================================

const listSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  brand: true,
  image: true,
  icon: true,
  banner: true,
  sortOrder: true,
  isFeatured: true,
  isFlashSale: true,
  isActive: true,
  viewCount: true,
  soldCount: true,
  avgRating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
  category: {
    select: { id: true, name: true, slug: true },
  },
  images: {
    select: { id: true, url: true, alt: true, sortOrder: true, isThumbnail: true },
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
    take: 1,
  },
  variants: {
    select: {
      salePrice: true,
      promoPrice: true,
      isDefault: true,
      isActive: true,
    },
    where: { isActive: true },
    orderBy: { isDefault: 'desc' as const },
  },
  _count: {
    select: { variants: { where: { isActive: true } } },
  },
};

const detailSelect = {
  ...listSelect,
  shortDescription: true,
  description: true,
  specifications: true,
  ingredients: true,
  usage: true,
  categoryId: true,
  images: {
    select: { id: true, url: true, alt: true, sortOrder: true, isThumbnail: true, isActive: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  variants: {
    select: {
      id: true,
      productSizeId: true,
      productColorId: true,
      sku: true,
      barcode: true,
      purchasePrice: true,
      salePrice: true,
      promoPrice: true,
      stockQty: true,
      reservedQty: true,
      weightKg: true,
      isDefault: true,
      isActive: true,
      productSize: { select: { id: true, sizeLabel: true, widthCm: true, lengthCm: true, heightCm: true } },
      productColor: { select: { id: true, colorName: true, colorCode: true } },
    },
    where: { isActive: true },
    orderBy: { isDefault: 'desc' as const },
  },
  platformSeos: {
    select: {
      id: true,
      platform: true,
      title: true,
      description: true,
      contentCate: true,
      keywords: true,
      hashtags: true,
      tags: true,
      linkPosted: true,
      slug: true,
      canonicalUrl: true,
      robots: true,
      isNoindex: true,
      isNofollow: true,
      ogTitle: true,
      ogDescription: true,
      ogImage: true,
      isActive: true,
      seoMedia: {
        select: {
          id: true,
          mediaType: true,
          mediaUrl: true,
          altText: true,
          title: true,
          widthPx: true,
          heightPx: true,
          sortOrder: true,
          isPrimary: true,
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
  platformImages: {
    select: {
      id: true,
      platform: true,
      imageUrl: true,
      alt: true,
      title: true,
      caption: true,
      sortOrder: true,
      isPrimary: true,
      isActive: true,
    },
  },
};

// ============================================================
// BUILD WHERE
// ============================================================

function buildWhere(params: ProductFilterParams) {
  const where: Record<string, unknown> = {
    isDeleted: false,
  };

  if (params.isActive !== undefined) where.isActive = params.isActive;
  if (params.isFeatured) where.isFeatured = true;
  if (params.isFlashSale) where.isFlashSale = true;
  if (params.categorySlug) where.category = { slug: params.categorySlug };
  if (params.categoryId) where.categoryId = params.categoryId;

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { sku: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  // Build variant filter conditions
  const variantConditions: Record<string, unknown>[] = [];
  if (params.priceMin !== undefined || params.priceMax !== undefined) {
    const priceCond: Record<string, unknown> = { isActive: true };
    if (params.priceMin !== undefined && params.priceMax !== undefined) {
      priceCond.salePrice = { gte: params.priceMin, lte: params.priceMax };
    } else if (params.priceMin !== undefined) {
      priceCond.salePrice = { gte: params.priceMin };
    } else {
      priceCond.salePrice = { lte: params.priceMax };
    }
    variantConditions.push(priceCond);
  }
  if (params.sizeId) {
    variantConditions.push({ productSizeId: params.sizeId, isActive: true });
  }
  if (params.colorId) {
    variantConditions.push({ productColorId: params.colorId, isActive: true });
  }
  if (variantConditions.length > 0) {
    where.variants = { some: variantConditions.length === 1 ? variantConditions[0] : { AND: variantConditions } };
  }

  return where;
}

function buildOrderBy(sort?: string) {
  switch (sort) {
    case 'best-seller': return { soldCount: 'desc' as const };
    case 'newest':
    default: return { createdAt: 'desc' as const };
  }
}

// ============================================================
// REPOSITORY
// ============================================================

export const productRepository = {
  async findMany(params: ProductFilterParams) {
    const page = params.page || 1;
    const pageSize = Math.min(
      params.pageSize || PAGINATION.DEFAULT_PAGE_SIZE,
      PAGINATION.MAX_PAGE_SIZE
    );
    const skip = (page - 1) * pageSize;
    const where = buildWhere(params);
    const orderBy = buildOrderBy(params.sort);

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where: where as never,
        select: listSelect,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where: where as never }),
    ]);

    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAllFlat() {
    return prisma.product.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  async findBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug, isDeleted: false }, select: detailSelect });
  },

  async findById(id: string) {
    return prisma.product.findUnique({ where: { id, isDeleted: false }, select: detailSelect });
  },

  async create(data: ProductInput, createdBy?: string) {
    const {
      images,
      variants,
      platformSeos,
      platformImages,
      ...rest
    } = data;

    // Destructure all expected product fields to avoid type conflicts
    const {
      name, slug, code, categoryId, shortDescription, description,
      specifications, ingredients, usage, brand, sku, origin, unit,
      warrantyMonths, image, icon, banner, seoTitle, seoDescription,
      canonicalUrl, ogTitle, ogDescription, ogImage, robots,
      sortOrder, isFeatured, isFlashSale, isActive, isShowHome,
    } = rest as Record<string, unknown> as {
      name: string;
      slug: string | null | undefined;
      code: string | null | undefined;
      categoryId: string;
      shortDescription: string | null | undefined;
      description: string | null | undefined;
      specifications: string | null | undefined;
      ingredients: string | null | undefined;
      usage: string | null | undefined;
      brand: string | null | undefined;
      sku: string | null | undefined;
      origin: string | null | undefined;
      unit: string | null | undefined;
      warrantyMonths: number | null | undefined;
      image: string | null | undefined;
      icon: string | null | undefined;
      banner: string | null | undefined;
      seoTitle: string | null | undefined;
      seoDescription: string | null | undefined;
      canonicalUrl: string | null | undefined;
      ogTitle: string | null | undefined;
      ogDescription: string | null | undefined;
      ogImage: string | null | undefined;
      robots: string | null | undefined;
      sortOrder: number;
      isFeatured: boolean;
      isFlashSale: boolean;
      isActive: boolean;
      isShowHome: boolean;
    };

    return prisma.product.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        createdBy: createdBy ?? null,
        isDeleted: false,
        name,
        slug: slug || undefined,
        code: code || undefined,
        category: { connect: { id: categoryId } },
        shortDescription: shortDescription || undefined,
        description: description || undefined,
        specifications: specifications || undefined,
        ingredients: ingredients || undefined,
        usage: usage || undefined,
        brand: brand || undefined,
        sku: sku || undefined,
        origin: origin || undefined,
        unit: unit || undefined,
        warrantyMonths: warrantyMonths || undefined,
        image: image || undefined,
        icon: icon || undefined,
        banner: banner || undefined,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        canonicalUrl: canonicalUrl || undefined,
        ogTitle: ogTitle || undefined,
        ogDescription: ogDescription || undefined,
        ogImage: ogImage || undefined,
        robots: robots || undefined,
        sortOrder: sortOrder ?? 0,
        isFeatured: isFeatured ?? false,
        isFlashSale: isFlashSale ?? false,
        isActive: isActive ?? true,
        isShowHome: isShowHome ?? false,
        ...(images?.length ? {
          images: {
            create: images.map((img, i) => ({
              url: img.url,
              alt: img.alt || null,
              sortOrder: img.sortOrder ?? i,
              isThumbnail: img.isThumbnail,
              isActive: img.isActive,
            })),
          },
        } : {}),
        ...(variants?.length ? {
          variants: {
            create: variants.map((v) => ({
              productSizeId: v.productSizeId,
              productColorId: v.productColorId,
              sku: v.sku || null,
              barcode: v.barcode || null,
              purchasePrice: v.purchasePrice,
              salePrice: v.salePrice,
              promoPrice: v.promoPrice ?? null,
              stockQty: v.stockQty,
              reservedQty: v.reservedQty,
              weightKg: v.weightKg ?? null,
              isDefault: v.isDefault,
              isActive: v.isActive,
            })),
          },
        } : {}),
        ...(platformSeos?.length ? {
          platformSeos: {
            create: platformSeos.map((seo) => ({ ...seo })),
          },
        } : {}),
        ...(platformImages?.length ? {
          platformImages: {
            create: platformImages.map((pImg) => ({
              platform: pImg.platform,
              imageUrl: pImg.imageUrl,
              alt: pImg.alt || null,
              title: pImg.title || null,
              caption: pImg.caption || null,
              sortOrder: pImg.sortOrder,
              isPrimary: pImg.isPrimary,
              isActive: pImg.isActive,
            })),
          },
        } : {}),
      } as any,
      include: {
        images: true,
        variants: true,
        platformSeos: true,
        platformImages: true,
      },
    });
  },

  async update(id: string, data: Partial<ProductInput>, updatedBy?: string) {
    const {
      images,
      variants,
      platformSeos,
      platformImages,
      ...rest
    } = data;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Xóa ảnh cũ
      await tx.productImage.deleteMany({ where: { productId: id } });

      // Cập nhật ảnh mới
      if (images?.length) {
        await tx.productImage.createMany({
          data: images.map((img, i) => ({
            productId: id,
            url: img.url,
            alt: img.alt || null,
            sortOrder: img.sortOrder ?? i,
            isThumbnail: img.isThumbnail,
            isActive: img.isActive,
          })),
        });
      }

      // Cập nhật biến thể
      if (variants !== undefined) {
        // Xóa biến thể cũ
        await tx.productVariant.deleteMany({ where: { productId: id } });
        // Tạo biến thể mới
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map((v) => ({
              productId: id,
              productSizeId: v.productSizeId,
              productColorId: v.productColorId,
              sku: v.sku || null,
              barcode: v.barcode || null,
              purchasePrice: v.purchasePrice,
              salePrice: v.salePrice,
              promoPrice: v.promoPrice ?? null,
              stockQty: v.stockQty,
              reservedQty: v.reservedQty,
              weightKg: v.weightKg ?? null,
              isDefault: v.isDefault,
              isActive: v.isActive,
            })),
          });
        }
      }

      // Cập nhật SEO platforms
      if (platformSeos !== undefined) {
        await tx.productSeoPlatform.deleteMany({ where: { productId: id } });
        if (platformSeos.length > 0) {
          await tx.productSeoPlatform.createMany({
            data: platformSeos.map((seo) => ({ ...seo, productId: id })),
          });
        }
      }

      // Cập nhật platform images (ProductPlatformImage)
      if (platformImages !== undefined) {
        await tx.productPlatformImage.deleteMany({ where: { productId: id } });
        if (platformImages.length > 0) {
          await tx.productPlatformImage.createMany({
            data: platformImages.map((pImg) => ({
              productId: id,
              platform: pImg.platform,
              imageUrl: pImg.imageUrl,
              alt: pImg.alt || null,
              title: pImg.title || null,
              caption: pImg.caption || null,
              sortOrder: pImg.sortOrder,
              isPrimary: pImg.isPrimary,
              isActive: pImg.isActive,
            })),
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          ...rest as Record<string, unknown>,
          updatedBy: updatedBy ?? null,
        },
        include: {
          images: true,
          variants: true,
          platformSeos: true,
          platformImages: true,
        },
      });
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },

  async hasVariants(id: string) {
    const count = await prisma.productVariant.count({ where: { productId: id } });
    return count > 0;
  },

  async incrementViewCount(id: string) {
    return prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  },

  async getSizes() {
    const rows = await prisma.productSize.findMany({
      where: { isActive: true },
      select: { id: true, sizeLabel: true, widthCm: true, lengthCm: true, heightCm: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      sizeLabel: r.sizeLabel,
      widthCm: r.widthCm?.toString() ?? null,
      lengthCm: r.lengthCm?.toString() ?? null,
      heightCm: r.heightCm?.toString() ?? null,
    }));
  },

  async getColors() {
    return prisma.productColor.findMany({
      where: { isActive: true },
      select: { id: true, colorName: true, colorCode: true },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async getStats() {
    const [total, active, inactive, featured] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false } }),
      prisma.product.count({ where: { isDeleted: false, isActive: true } }),
      prisma.product.count({ where: { isDeleted: false, isActive: false } }),
      prisma.product.count({ where: { isDeleted: false, isFeatured: true } }),
    ]);
    return { total, active, inactive, featured };
  },

  async getSalesByPeriod(productId: string, period: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const result = await prisma.orderItem.aggregate({
      where: {
        productId,
        order: {
          isDeleted: false,
          orderStatus: { in: ['delivered', 'completed'] },
          placedAt: {
            gte: startDate,
            lte: now,
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity || 0;
  },

  async getSalesStatistics(productId: string) {
    const now = new Date();

    const [today, thisWeek, thisMonth, thisYear] = await Promise.all([
      productRepository.getSalesByPeriod(productId, 'day'),
      productRepository.getSalesByPeriod(productId, 'week'),
      productRepository.getSalesByPeriod(productId, 'month'),
      productRepository.getSalesByPeriod(productId, 'year'),
    ]);

    return {
      today,
      thisWeek,
      thisMonth,
      thisYear,
    };
  },

  async getTopSellingProducts(limit = 10) {
    const result = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          isDeleted: false,
          orderStatus: { in: ['delivered', 'completed'] },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const productIds = result.map((r) => r.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isDeleted: false },
      select: listSelect,
    });

    return result.map((r) => {
      const product = products.find((p) => p.id === r.productId);
      return {
        product,
        totalSold: r._sum.quantity || 0,
      };
    });
  },
};
