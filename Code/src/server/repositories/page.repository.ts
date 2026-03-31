import { prisma } from '@/lib/prisma';
import type { PageInput } from '@/server/validators/page.validator';

const pageListSelect = {
  id: true,
  pageName: true,
  title: true,
  shortDescription: true,
  image: true,
  isActive: true,
  isShowHome: true,
  sortOrder: true,
  createdDate: true,
};

export const pageRepository = {
  async findAll() {
    return prisma.page.findMany({
      select: pageListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdDate: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.page.findUnique({ where: { id } });
  },

  async create(data: PageInput) {
    return prisma.page.create({ data: data as Parameters<typeof prisma.page.create>[0]['data'] });
  },

  async update(id: string, data: Partial<PageInput>) {
    return prisma.page.update({
      where: { id },
      data: data as Parameters<typeof prisma.page.update>[0]['data'],
    });
  },

  async delete(id: string) {
    return prisma.page.delete({ where: { id } });
  },
};
