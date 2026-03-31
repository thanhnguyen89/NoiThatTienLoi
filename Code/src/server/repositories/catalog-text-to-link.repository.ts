import { prisma } from '@/lib/prisma';
import type { CatalogTextToLinkInput } from '@/server/validators/catalog-text-to-link.validator';

export const catalogTextToLinkRepository = {
  async findAll() {
    const rows = await prisma.catalogTextToLink.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => ({
      ...r,
      categoryId: r.categoryId ?? null,
    }));
  },

  async findById(id: string) {
    const row = await prisma.catalogTextToLink.findUnique({
      where: { id },
    });
    if (!row) return null;
    return {
      ...row,
      categoryId: row.categoryId ?? null,
    };
  },

  async create(data: CatalogTextToLinkInput) {
    return prisma.catalogTextToLink.create({ data: data as Parameters<typeof prisma.catalogTextToLink.create>[0]['data'] });
  },

  async update(id: string, data: Partial<CatalogTextToLinkInput>) {
    return prisma.catalogTextToLink.update({
      where: { id },
      data: data as Parameters<typeof prisma.catalogTextToLink.update>[0]['data'],
    });
  },

  async delete(id: string) {
    return prisma.catalogTextToLink.delete({ where: { id } });
  },
};
