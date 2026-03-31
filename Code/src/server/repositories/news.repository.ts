import { prisma } from '@/lib/prisma';
import type { NewsInput } from '@/server/validators/news.validator';

const newsListSelect = {
  id: true,
  title: true,
  summary: true,
  image: true,
  seName: true,
  isPublished: true,
  isShowHome: true,
  isActive: true,
  isNew: true,
  viewCount: true,
  commentCount: true,
  likeCount: true,
  sortOrder: true,
  createdDate: true,
  authorName: true,
};

export const newsRepository = {
  async findAll() {
    return prisma.newsContent.findMany({
      select: newsListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdDate: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.newsContent.findUnique({
      where: { id },
    });
  },

  async create(data: NewsInput) {
    return prisma.newsContent.create({ data: data as Parameters<typeof prisma.newsContent.create>[0]['data'] });
  },

  async update(id: string, data: Partial<NewsInput>) {
    return prisma.newsContent.update({
      where: { id },
      data: data as Parameters<typeof prisma.newsContent.update>[0]['data'],
    });
  },

  async delete(id: string) {
    return prisma.newsContent.delete({ where: { id } });
  },
};
