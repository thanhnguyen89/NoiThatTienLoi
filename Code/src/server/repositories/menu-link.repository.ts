import { prisma } from '@/lib/prisma';
import type { MenuLinkInput } from '@/server/validators/menu-link.validator';

const menuLinkListSelect = {
  id: true,
  title: true,
  slug: true,
  target: true,
  menuId: true,
  icon: true,
  parentId: true,
  entityId: true,
  entityName: true,
  nofollow: true,
  level: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
};

export interface PaginatedMenuLinks {
  data: Awaited<ReturnType<typeof menuLinkRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const menuLinkRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: string; menuId?: string }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { slug: { contains: opts.search, mode: 'insensitive' } },
        { entityName: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive === 'active') where.nofollow = false;
    else if (opts?.isActive === 'inactive') where.nofollow = true;
    if (opts?.menuId) {
      const num = Number(opts.menuId);
      if (!isNaN(num) && Number.isSafeInteger(num)) {
        where.menuId = BigInt(opts.menuId);
      }
    }

    const [result, total] = await Promise.all([
      prisma.menuLink.findMany({
        where,
        select: menuLinkListSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.menuLink.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.menuLink.findMany({
      where: { isDeleted: false },
      select: menuLinkListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async findByMenuId(menuId: bigint) {
    return prisma.menuLink.findMany({
      where: { menuId, isDeleted: false },
      select: menuLinkListSelect,
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.menuLink.findUnique({
      where: { id, isDeleted: false },
      select: menuLinkListSelect,
    });
  },

  async findMaxSortOrder(menuId: bigint, parentId: string | null) {
    const result = await prisma.menuLink.aggregate({
      where: { menuId, parentId: parentId ?? null, isDeleted: false },
      _max: { sortOrder: true },
    });
    return result._max.sortOrder ?? 0;
  },

  async create(data: MenuLinkInput, createdBy?: string) {
    return prisma.menuLink.create({
      data: { ...data, createdBy: createdBy ?? null, isDeleted: false } as Parameters<typeof prisma.menuLink.create>[0]['data'],
      select: menuLinkListSelect,
    });
  },

  async update(id: string, data: Partial<MenuLinkInput>, updatedBy?: string) {
    return prisma.menuLink.update({
      where: { id, isDeleted: false },
      data: { ...data, updatedBy: updatedBy ?? null } as Parameters<typeof prisma.menuLink.update>[0]['data'],
      select: menuLinkListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.menuLink.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
      select: menuLinkListSelect,
    });
  },

  async deleteWithChildren(id: string, deletedBy?: string) {
    // Get all children first
    const children = await prisma.menuLink.findMany({
      where: { parentId: id, isDeleted: false },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);

    // Soft delete children recursively, then self
    if (childIds.length > 0) {
      await prisma.menuLink.updateMany({
        where: { id: { in: childIds } },
        data: {
          isDeleted: true,
          deletedBy: deletedBy ?? null,
          deletedAt: new Date(),
        },
      });
    }
    return prisma.menuLink.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
      select: menuLinkListSelect,
    });
  },

  async updateSortOrders(updates: Array<{ id: string; sortOrder: number; parentId?: string | null }>) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.menuLink.update({
          where: { id: u.id, isDeleted: false },
          data: {
            sortOrder: Math.round(u.sortOrder),
            ...(u.parentId !== undefined ? { parentId: u.parentId } : {}),
          },
        })
      )
    );
  },

  async upsertLinks(
    menuId: bigint,
    items: Array<{
      id?: string;
      title: string | null;
      slug: string | null;
      target: string | null;
      parentId: string | null;
      sortOrder: number;
      level: number | null;
    }>
  ) {
    // Delete items not in the new list (only existing ids, skip new items)
    const existingIds = items.filter((i) => i.id).map((i) => i.id as string);
    if (existingIds.length > 0) {
      await prisma.menuLink.updateMany({
        where: {
          menuId,
          id: { notIn: existingIds },
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }

    // Upsert each item
    const results = await prisma.$transaction(
      items.map((item) =>
        item.id
          ? prisma.menuLink.update({
              where: { id: item.id, isDeleted: false },
              data: {
                title: item.title,
                slug: item.slug,
                target: item.target,
                parentId: item.parentId,
                sortOrder: item.sortOrder,
                level: item.level,
              },
              select: menuLinkListSelect,
            })
          : prisma.menuLink.create({
              data: {
                menuId,
                title: item.title,
                slug: item.slug,
                target: item.target,
                parentId: item.parentId,
                sortOrder: item.sortOrder,
                level: item.level ?? 0,
                isDeleted: false,
              },
              select: menuLinkListSelect,
            })
      )
    );

    return results;
  },
};
