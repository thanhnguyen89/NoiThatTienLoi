import { prisma } from '@/lib/prisma';
import type { CatalogEmbedCodeInput } from '@/server/validators/catalog-embed-code.validator';

const catalogEmbedCodeListSelect = {
  id: true,
  title: true,
  positionId: true,
  embedCode: true,
  note: true,
  isActive: true,
  createdBy: true,
  createdAt: true,
  updatedBy: true,
  updatedAt: true,
};

export const catalogEmbedCodeRepository = {
  async findAll() {
    return prisma.catalogEmbedCode.findMany({
      where: { isDeleted: false },
      select: catalogEmbedCodeListSelect,
      orderBy: [{ createdAt: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.catalogEmbedCode.findFirst({
      where: { id, isDeleted: false },
      select: catalogEmbedCodeListSelect,
    });
  },

  async create(data: CatalogEmbedCodeInput) {
    return prisma.catalogEmbedCode.create({
      data,
      select: catalogEmbedCodeListSelect,
    });
  },

  async update(id: string, data: Partial<CatalogEmbedCodeInput>) {
    return prisma.catalogEmbedCode.update({
      where: { id },
      data,
      select: catalogEmbedCodeListSelect,
    });
  },

  async delete(id: string) {
    return prisma.catalogEmbedCode.update({
      where: { id },
      data: { isDeleted: true },
    });
  },
};
