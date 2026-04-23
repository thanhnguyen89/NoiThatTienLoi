import { prisma } from '@/lib/prisma';
import type { MenuInput } from '@/server/validators/menu.validator';

export interface PaginatedMenus {
  data: Awaited<ReturnType<typeof menuRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const menuRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean; menuTypeId?: string }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.name = { contains: opts.search, mode: 'insensitive' };
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;
    if (opts?.menuTypeId) {
      const tid = BigInt(opts.menuTypeId);
      where.menuTypeId = tid;
    }

    const [result, total] = await Promise.all([
      prisma.menu.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.menu.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.menu.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.menu.findUnique({ where: { id, isDeleted: false } });
  },

  async create(data: MenuInput, createdBy?: string) {
    return prisma.menu.create({
      data: { ...data, createdBy: createdBy ?? null, isDeleted: false } as Parameters<typeof prisma.menu.create>[0]['data'],
    });
  },

  async update(id: string, data: Partial<MenuInput>, updatedBy?: string) {
    return prisma.menu.update({
      where: { id, isDeleted: false },
      data: { ...data, updatedBy: updatedBy ?? null } as Parameters<typeof prisma.menu.update>[0]['data'],
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.menu.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },
};
