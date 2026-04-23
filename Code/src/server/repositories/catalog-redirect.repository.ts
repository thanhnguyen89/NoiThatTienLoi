import { prisma } from '@/lib/prisma';
import type { CatalogRedirectInput } from '@/server/validators/catalog-redirect.validator';

const catalogRedirectListSelect = {
  id: true,
  urlFrom: true,
  urlTo: true,
  errorCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
};

export interface PaginatedCatalogRedirects {
  data: Awaited<ReturnType<typeof catalogRedirectRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const catalogRedirectRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { urlFrom: { contains: opts.search, mode: 'insensitive' } },
        { urlTo: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.catalogRedirect.findMany({
        where,
        select: catalogRedirectListSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.catalogRedirect.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.catalogRedirect.findMany({
      where: { isDeleted: false },
      select: catalogRedirectListSelect,
      orderBy: [{ createdAt: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.catalogRedirect.findUnique({
      where: { id, isDeleted: false },
      select: catalogRedirectListSelect,
    });
  },

  async create(data: CatalogRedirectInput, createdBy?: string) {
    return prisma.catalogRedirect.create({
      data: {
        ...data,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: catalogRedirectListSelect,
    });
  },

  async update(id: string, data: Partial<CatalogRedirectInput>, updatedBy?: string) {
    return prisma.catalogRedirect.update({
      where: { id, isDeleted: false },
      data: {
        ...data,
        updatedBy: updatedBy ?? null,
      },
      select: catalogRedirectListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.catalogRedirect.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },
};
