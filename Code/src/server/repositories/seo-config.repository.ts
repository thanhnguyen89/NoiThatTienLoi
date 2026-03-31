import { prisma } from '@/lib/prisma';
import type { SeoConfigInput } from '@/server/validators/seo-config.validator';

const seoConfigListSelect = {
  id: true,
  pageName: true,
  title: true,
  seName: true,
  metaTitle: true,
  isActive: true,
  seoNoindex: true,
  sortOrder: true,
  createdAt: true,
};

export const seoConfigRepository = {
  async findAll() {
    return prisma.seoConfig.findMany({
      select: seoConfigListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.seoConfig.findUnique({
      where: { id },
      select: {
        ...seoConfigListSelect,
        contentBefore: true,
        contentAfter: true,
        image: true,
        metaKeywords: true,
        metaDescription: true,
        seoCanonical: true,
      },
    });
  },

  async create(data: SeoConfigInput) {
    return prisma.seoConfig.create({
      data,
      select: seoConfigListSelect,
    });
  },

  async update(id: string, data: Partial<SeoConfigInput>) {
    return prisma.seoConfig.update({
      where: { id },
      data,
      select: seoConfigListSelect,
    });
  },

  async delete(id: string) {
    return prisma.seoConfig.delete({ where: { id } });
  },
};
