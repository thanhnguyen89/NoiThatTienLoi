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
  createdDate: true,
  lastUpdDate: true,
};

export const menuLinkRepository = {
  async findAll() {
    return prisma.menuLink.findMany({
      select: menuLinkListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdDate: 'desc' }],
    });
  },

  async findByMenuId(menuId: bigint) {
    return prisma.menuLink.findMany({
      where: { menuId },
      select: menuLinkListSelect,
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.menuLink.findUnique({
      where: { id },
      select: menuLinkListSelect,
    });
  },

  async findMaxSortOrder(menuId: bigint, parentId: string | null) {
    const result = await prisma.menuLink.aggregate({
      where: { menuId, parentId: parentId ?? null },
      _max: { sortOrder: true },
    });
    return result._max.sortOrder ?? 0;
  },

  async create(data: MenuLinkInput) {
    return prisma.menuLink.create({
      data: data as Parameters<typeof prisma.menuLink.create>[0]['data'],
      select: menuLinkListSelect,
    });
  },

  async update(id: string, data: Partial<MenuLinkInput>) {
    return prisma.menuLink.update({
      where: { id },
      data: data as Parameters<typeof prisma.menuLink.update>[0]['data'],
      select: menuLinkListSelect,
    });
  },

  async delete(id: string) {
    return prisma.menuLink.delete({ where: { id } });
  },

  async deleteWithChildren(id: string) {
    // Get all children first
    const children = await prisma.menuLink.findMany({
      where: { parentId: id },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);

    // Delete children recursively, then delete self
    if (childIds.length > 0) {
      await prisma.menuLink.deleteMany({
        where: { id: { in: childIds } },
      });
    }
    return prisma.menuLink.delete({ where: { id } });
  },

  async updateSortOrders(updates: Array<{ id: string; sortOrder: number }>) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.menuLink.update({
          where: { id: u.id },
          data: { sortOrder: u.sortOrder },
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
      await prisma.menuLink.deleteMany({
        where: {
          menuId,
          id: { notIn: existingIds },
        },
      });
    }

    // Upsert each item
    const results = await prisma.$transaction(
      items.map((item) =>
        item.id
          ? prisma.menuLink.update({
              where: { id: item.id },
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
              },
              select: menuLinkListSelect,
            })
      )
    );

    return results;
  },
};
