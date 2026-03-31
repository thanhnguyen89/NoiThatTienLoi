import { prisma } from '@/lib/prisma';
import type { CatalogNewsLevelInput } from '@/server/validators/catalog-news-level.validator';

const catalogNewsLevelListSelect = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdBy: true,
  createdAt: true,
  updatedBy: true,
  updatedAt: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
};

export const catalogNewsLevelRepository = {
  async findAll() {
    return prisma.catalogNewsLevel.findMany({
      select: catalogNewsLevelListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      where: { isDeleted: false },
    });
  },

  async findById(id: string) {
    return prisma.catalogNewsLevel.findUnique({
      where: { id },
      select: catalogNewsLevelListSelect,
    });
  },

  async create(data: CatalogNewsLevelInput) {
    return prisma.catalogNewsLevel.create({
      data,
      select: catalogNewsLevelListSelect,
    });
  },

  async update(id: string, data: Partial<CatalogNewsLevelInput>) {
    return prisma.catalogNewsLevel.update({
      where: { id },
      data,
      select: catalogNewsLevelListSelect,
    });
  },

  async delete(id: string) {
    return prisma.catalogNewsLevel.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  },
};
