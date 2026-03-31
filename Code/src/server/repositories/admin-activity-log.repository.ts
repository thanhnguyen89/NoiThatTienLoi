import { prisma } from '@/lib/prisma';

export const adminActivityLogRepository = {
  async create(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    description?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    oldData?: string;
    newData?: string;
  }) {
    return prisma.adminActivityLog.create({ data });
  },

  async findAll(limit = 100, offset = 0) {
    const [items, total] = await Promise.all([
      prisma.adminActivityLog.findMany({
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          description: true,
          ipAddress: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.adminActivityLog.count(),
    ]);
    return { items, total };
  },

  async findByUser(userId: string, limit = 50) {
    return prisma.adminActivityLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        description: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
