import { prisma } from '@/lib/prisma';
import type { CatalogRedirectInput } from '@/server/validators/catalog-redirect.validator';

const catalogRedirectListSelect = {
  id: true,
  urlFrom: true,
  urlTo: true,
  errorCode: true,
  isActive: true,
  createdAt: true,
};

export const catalogRedirectRepository = {
  async findAll() {
    return prisma.catalogRedirect.findMany({
      select: catalogRedirectListSelect,
      orderBy: [{ createdAt: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.catalogRedirect.findUnique({
      where: { id },
      select: catalogRedirectListSelect,
    });
  },

  async create(data: CatalogRedirectInput) {
    return prisma.catalogRedirect.create({
      data,
      select: catalogRedirectListSelect,
    });
  },

  async update(id: string, data: Partial<CatalogRedirectInput>) {
    return prisma.catalogRedirect.update({
      where: { id },
      data,
      select: catalogRedirectListSelect,
    });
  },

  async delete(id: string) {
    return prisma.catalogRedirect.delete({ where: { id } });
  },
};
