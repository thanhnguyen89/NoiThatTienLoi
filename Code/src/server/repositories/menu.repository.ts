import { prisma } from '@/lib/prisma';
import type { MenuInput } from '@/server/validators/menu.validator';

export const menuRepository = {
  async findAll() {
    return prisma.menu.findMany({
      orderBy: { createdDate: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.menu.findUnique({ where: { id } });
  },

  async create(data: MenuInput) {
    return prisma.menu.create({ data: data as Parameters<typeof prisma.menu.create>[0]['data'] });
  },

  async update(id: string, data: Partial<MenuInput>) {
    return prisma.menu.update({
      where: { id },
      data: data as Parameters<typeof prisma.menu.update>[0]['data'],
    });
  },

  async delete(id: string) {
    return prisma.menu.delete({ where: { id } });
  },
};
