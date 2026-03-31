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
  robots: true,
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

export const categoryRepository = {
  async findAll(onlyActive = false) {
    const activeFilter = onlyActive ? { isActive: true } : undefined;

    return prisma.category.findMany({
      where: {
        parentId: null,
        ...activeFilter,
      },
      select: {
        ...categoryListSelect,
        children: {
          select: categoryListSelect,
          where: activeFilter,
          orderBy: { sortOrder: 'asc' as const },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findAllFlat() {
    return prisma.category.findMany({
      select: {
        ...categoryListSelect,
        parent: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
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
      where: { id },
      select: {
        ...categoryDetailSelect,
        platformSeos: true,
        platformImages: true,
      },
    });
    return category;
  },

  async create(data: CategoryInput) {
    const { parentId, platformSeos, platformImages, ...rest } = data;

    return prisma.category.create({
      data: {
        ...rest,
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

  async update(id: string, data: Partial<CategoryInput>) {
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

  async delete(id: string) {
    return prisma.category.delete({ where: { id } });
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
