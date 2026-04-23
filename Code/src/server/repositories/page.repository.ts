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
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
};

export interface PaginatedPages {
  data: Awaited<ReturnType<typeof pageRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const pageRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { pageName: { contains: opts.search, mode: 'insensitive' } },
        { title: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.page.findMany({
        where,
        select: pageListSelect,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.page.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.page.findMany({
      where: { isDeleted: false },
      select: pageListSelect,
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.page.findUnique({ where: { id, isDeleted: false } });
  },

  async create(data: PageInput, createdBy?: string) {
    return prisma.page.create({
      data: {
        ...data,
        createdBy: createdBy ?? null,
        isDeleted: false,
      } as Parameters<typeof prisma.page.create>[0]['data'],
    });
  },

  async update(id: string, data: Partial<PageInput>, updatedBy?: string) {
    return prisma.page.update({
      where: { id, isDeleted: false },
      data: {
        ...data,
        updatedBy: updatedBy ?? null,
      } as Parameters<typeof prisma.page.update>[0]['data'],
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.page.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },

  async unsetHomePage() {
    return prisma.page.updateMany({
      where: { isShowHome: true },
      data: { isShowHome: false },
    });
  },

  async unsetHomePageExcept(id: string) {
    return prisma.page.updateMany({
      where: { isShowHome: true, id: { not: id } },
      data: { isShowHome: false },
    });
  },
};
