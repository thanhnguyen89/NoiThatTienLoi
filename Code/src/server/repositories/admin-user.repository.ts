import { prisma } from '@/lib/prisma';
import type { AdminUserInput } from '@/server/validators/admin-user.validator';

const adminUserListSelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  phone: true,
  address: true,
  avatar: true,
  isActive: true,
  isSuperAdmin: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
  role: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
};

const adminUserDetailSelect = {
  ...adminUserListSelect,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      isSystem: true,
      rolePermissions: {
        select: {
          permission: {
            select: {
              id: true,
              action: true,
              resource: true,
              description: true,
            },
          },
        },
      },
    },
  },
};

export interface PaginatedAdminUsers {
  data: Awaited<ReturnType<typeof adminUserRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const adminUserRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { username: { contains: opts.search, mode: 'insensitive' } },
        { email: { contains: opts.search, mode: 'insensitive' } },
        { fullName: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.adminUser.findMany({
        where,
        select: adminUserListSelect,
        orderBy: [{ isSuperAdmin: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminUser.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findByUsername(username: string) {
    return prisma.adminUser.findUnique({
      where: { username, isDeleted: false },
      select: {
        id: true,
        roleId: true,
        username: true,
        email: true,
        password: true,
        fullName: true,
        phone: true,
        address: true,
        avatar: true,
        isActive: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
            rolePermissions: {
              select: {
                permission: {
                  select: { action: true, resource: true },
                },
              },
            },
          },
        },
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.adminUser.findUnique({
      where: { email, isDeleted: false },
      select: { id: true, email: true },
    });
  },

  async findById(id: string) {
    return prisma.adminUser.findUnique({
      where: { id, isDeleted: false },
      select: adminUserDetailSelect,
    });
  },

  async findAll() {
    return prisma.adminUser.findMany({
      where: { isDeleted: false },
      select: adminUserListSelect,
      orderBy: [{ isSuperAdmin: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async create(data: AdminUserInput & { password: string }, createdBy?: string) {
    return prisma.adminUser.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        avatar: data.avatar,
        roleId: data.roleId,
        isActive: data.isActive,
        isSuperAdmin: data.isSuperAdmin,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: adminUserListSelect,
    });
  },

  async update(id: string, data: Partial<AdminUserInput & { password?: string }>, updatedBy?: string) {
    const { password, ...rest } = data;
    return prisma.adminUser.update({
      where: { id, isDeleted: false },
      data: {
        ...rest,
        ...(password ? { password } : {}),
        updatedBy: updatedBy ?? null,
      },
      select: adminUserListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.adminUser.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
      select: adminUserListSelect,
    });
  },

  async updateLastLogin(id: string, ip?: string) {
    return prisma.adminUser.update({
      where: { id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip || null },
      select: { lastLoginAt: true, lastLoginIp: true },
    });
  },

  async count() {
    return prisma.adminUser.count();
  },

  async findByIdForToken(id: string) {
    return prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        isActive: true,
        isSuperAdmin: true,
        role: {
          select: { id: true, code: true },
        },
      },
    });
  },
};
