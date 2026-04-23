import { prisma } from '@/lib/prisma';
import type { CatalogTextToLinkInput } from '@/server/validators/catalog-text-to-link.validator';

export interface PaginatedCatalogTextToLinks {
  data: ReturnType<typeof catalogTextToLinkRepository.findAll>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const catalogTextToLinkRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { keyword: { contains: opts.search, mode: 'insensitive' } },
        { link: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [rows, total] = await Promise.all([
      prisma.catalogTextToLink.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.catalogTextToLink.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({ ...r, categoryId: r.categoryId ?? null })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    const rows = await prisma.catalogTextToLink.findMany({
      where: { isDeleted: false },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => ({
      ...r,
      categoryId: r.categoryId ?? null,
    }));
  },

  async findById(id: string) {
    const row = await prisma.catalogTextToLink.findUnique({
      where: { id, isDeleted: false },
    });
    if (!row) return null;
    return {
      ...row,
      categoryId: row.categoryId ?? null,
    };
  },

  async create(data: CatalogTextToLinkInput, createdBy?: string) {
    return prisma.catalogTextToLink.create({
      data: { ...data, createdBy: createdBy ?? null, isDeleted: false } as Parameters<typeof prisma.catalogTextToLink.create>[0]['data'],
    });
  },

  async update(id: string, data: Partial<CatalogTextToLinkInput>, updatedBy?: string) {
    return prisma.catalogTextToLink.update({
      where: { id, isDeleted: false },
      data: { ...data, updatedBy: updatedBy ?? null } as Parameters<typeof prisma.catalogTextToLink.update>[0]['data'],
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.catalogTextToLink.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },
};
