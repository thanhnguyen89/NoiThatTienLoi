import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { CategoryInput } from '@/server/validators/category.validator';

const categoryListSelect = {
  id: true,
  name: true,
  slug: true,
  code: true,
  image: true,
  icon: true,
  banner: true,
  parentId: true,
  sortOrder: true,
  isActive: true,
  isFeatured: true,
  isShowHome: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  robots: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
  _count: {
    select: { products: true },
  },
};

const categoryDetailSelect = {
  ...categoryListSelect,
  description: true,
  seoTitle: true,
  seoDescription: true,
  canonicalUrl: true,
  ogTitle: true,
  ogDescription: true,
  ogImage: true,
  robots: true,
  parent: {
    select: { id: true, name: true },
  },
};

export interface PaginatedCategories {
  data: Awaited<ReturnType<typeof categoryRepository.findAllFlat>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const categoryRepository = {
  async findAllFlatPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean; parentId?: string | null }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { slug: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;
    if (opts?.parentId !== undefined) where.parentId = opts.parentId;

    const [result, total] = await Promise.all([
      prisma.category.findMany({
        where,
        select: {
          ...categoryListSelect,
          parent: { select: { id: true, name: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.category.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll(onlyActive = false) {
    const activeFilter = onlyActive ? { isActive: true } : undefined;

    return prisma.category.findMany({
      where: {
        isDeleted: false,
        parentId: null,
        ...activeFilter,
      },
      select: {
        ...categoryListSelect,
        children: {
          select: categoryListSelect,
          where: { isDeleted: false, ...activeFilter },
          orderBy: { sortOrder: 'asc' as const },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findAllFlat() {
    return prisma.category.findMany({
      where: { isDeleted: false },
      select: {
        ...categoryListSelect,
        parent: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug, isDeleted: false },
      select: {
        ...categoryListSelect,
        description: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        ogTitle: true,
        ogDescription: true,
        ogImage: true,
        robots: true,
        platformSeos: true,
        platformImages: true,
        children: {
          select: categoryListSelect,
          orderBy: { sortOrder: 'asc' as const },
        },
      },
    });
  },

  async findById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id, isDeleted: false },
      select: {
        ...categoryDetailSelect,
        platformSeos: true,
        platformImages: true,
      },
    });
    return category;
  },

  async create(data: CategoryInput, createdBy?: string) {
    const { parentId, platformSeos, platformImages, ...rest } = data;

    return prisma.category.create({
      data: {
        ...rest,
        createdBy: createdBy ?? null,
        isDeleted: false,
        ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
        ...(platformSeos?.length ? {
          platformSeos: {
            create: platformSeos.map((seo) => ({ ...seo })),
          },
        } : {}),
        ...(platformImages?.length ? {
          platformImages: {
            create: platformImages.map((img) => ({ ...img })),
          },
        } : {}),
      },
      include: {
        platformSeos: true,
        platformImages: true,
      },
    });
  },

  async update(id: string, data: Partial<CategoryInput>, updatedBy?: string) {
    const { parentId, platformSeos, platformImages, ...rest } = data;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (platformSeos !== undefined) {
        await tx.categoryPlatformSeo.deleteMany({ where: { categoryId: id } });
        if (platformSeos.length > 0) {
          await tx.categoryPlatformSeo.createMany({
            data: platformSeos.map((seo) => ({ ...seo, categoryId: id })),
          });
        }
      }

      if (platformImages !== undefined) {
        await tx.categoryPlatformImage.deleteMany({ where: { categoryId: id } });
        if (platformImages.length > 0) {
          await tx.categoryPlatformImage.createMany({
            data: platformImages.map((img) => ({ ...img, categoryId: id })),
          });
        }
      }

      return tx.category.update({
        where: { id },
        data: {
          ...rest,
          updatedBy: updatedBy ?? null,
          ...(parentId !== undefined
            ? parentId
              ? { parent: { connect: { id: parentId } } }
              : { parent: { disconnect: true } }
            : {}),
        },
        include: {
          platformSeos: true,
          platformImages: true,
        },
      });
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.category.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },

  async hasChildren(id: string) {
    const count = await prisma.category.count({ where: { parentId: id } });
    return count > 0;
  },

  async hasProducts(id: string) {
    const count = await prisma.product.count({ where: { categoryId: id } });
    return count > 0;
  },
};
