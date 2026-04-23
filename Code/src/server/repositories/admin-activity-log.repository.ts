import { prisma } from '@/lib/prisma';

export interface PaginatedActivityLogs {
  items: Awaited<ReturnType<typeof adminActivityLogRepository.findAll>>['items'];
  total: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const adminActivityLogRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; action?: string; dateFrom?: string; dateTo?: string }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = {};
    if (opts?.action) where.action = opts.action;
    if (opts?.dateFrom) {
      where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), gte: new Date(opts.dateFrom) };
    }
    if (opts?.dateTo) {
      const to = new Date(opts.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), lte: to };
    }

    const [items, total] = await Promise.all([
      prisma.adminActivityLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          description: true,
          ipAddress: true,
          createdAt: true,
          user: { select: { id: true, username: true, fullName: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.adminActivityLog.count({ where }),
    ]);
    return { items, total, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  },

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
  }, createdBy?: string) {
    return prisma.adminActivityLog.create({
      data: {
        ...data,
        createdBy: createdBy ?? null,
      },
    });
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
