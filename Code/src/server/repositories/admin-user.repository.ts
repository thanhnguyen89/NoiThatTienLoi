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

export const adminUserRepository = {
  async findByUsername(username: string) {
    return prisma.adminUser.findUnique({
      where: { username },
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
      where: { email },
      select: { id: true, email: true },
    });
  },

  async findById(id: string) {
    return prisma.adminUser.findUnique({
      where: { id },
      select: adminUserDetailSelect,
    });
  },

  async findAll() {
    return prisma.adminUser.findMany({
      select: adminUserListSelect,
      orderBy: [{ isSuperAdmin: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async create(data: AdminUserInput & { password: string }) {
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
      },
      select: adminUserListSelect,
    });
  },

  async update(id: string, data: Partial<AdminUserInput & { password?: string }>) {
    const { password, ...rest } = data;
    return prisma.adminUser.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { password } : {}),
      },
      select: adminUserListSelect,
    });
  },

  async delete(id: string) {
    return prisma.adminUser.delete({ where: { id } });
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
