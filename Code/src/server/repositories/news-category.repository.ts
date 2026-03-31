import { prisma } from '@/lib/prisma';
import type { NewsCategoryInput } from '@/server/validators/news-category.validator';

const newsCategoryListSelect = {
  id: true,
  title: true,
  summary: true,
  imageUrl: true,
  seName: true,
  isPublished: true,
  isShowHome: true,
  isActive: true,
  sortOrder: true,
  createdDate: true,
};

export const newsCategoryRepository = {
  async findAll() {
    return prisma.newsCategory.findMany({
      select: newsCategoryListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdDate: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.newsCategory.findUnique({ where: { id } });
  },

  async create(data: NewsCategoryInput) {
    return prisma.newsCategory.create({ data: data as Parameters<typeof prisma.newsCategory.create>[0]['data'] });
  },

  async update(id: string, data: Partial<NewsCategoryInput>) {
    return prisma.newsCategory.update({
      where: { id },
      data: data as Parameters<typeof prisma.newsCategory.update>[0]['data'],
    });
  },

  async delete(id: string) {
    return prisma.newsCategory.delete({ where: { id } });
  },
};
