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

export interface PaginatedCatalogNewsLevels {
  data: Awaited<ReturnType<typeof catalogNewsLevelRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const catalogNewsLevelRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.name = { contains: opts.search, mode: 'insensitive' };
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.catalogNewsLevel.findMany({
        where,
        select: catalogNewsLevelListSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.catalogNewsLevel.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

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
      data: {
        ...data,
        isDeleted: false,
      },
      select: catalogNewsLevelListSelect,
    });
  },

  async update(id: string, data: Partial<CatalogNewsLevelInput>) {
    return prisma.catalogNewsLevel.update({
      where: { id, isDeleted: false },
      data,
      select: catalogNewsLevelListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.catalogNewsLevel.update({
      where: { id },
      data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() },
    });
  },
};
