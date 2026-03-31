import { prisma } from '@/lib/prisma';
import type { AdminRoleInput } from '@/server/validators/admin-role.validator';
import type { AdminPermissionInput } from '@/server/validators/admin-role.validator';

const roleListSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  isSystem: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  _count: { select: { users: true } },
};

export const adminRoleRepository = {
  async findAll() {
    return prisma.adminRole.findMany({
      select: roleListSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.adminRole.findUnique({
      where: { id },
      select: {
        ...roleListSelect,
        rolePermissions: {
          select: {
            permission: {
              select: { id: true, action: true, resource: true, description: true },
            },
          },
        },
      },
    });
  },

  async findByCode(code: string) {
    return prisma.adminRole.findUnique({
      where: { code },
      select: { id: true, code: true, name: true },
    });
  },

  async create(data: AdminRoleInput) {
    return prisma.adminRole.create({
      data,
      select: roleListSelect,
    });
  },

  async update(id: string, data: Partial<AdminRoleInput>) {
    return prisma.adminRole.update({
      where: { id },
      data,
      select: roleListSelect,
    });
  },

  async delete(id: string) {
    return prisma.adminRole.delete({ where: { id } });
  },

  async setPermissions(roleId: string, permissionIds: string[]) {
    // Xóa quyền cũ
    await prisma.adminRolePermission.deleteMany({ where: { roleId } });
    // Thêm quyền mới
    if (permissionIds.length > 0) {
      await prisma.adminRolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }
  },

  async getAllPermissions() {
    return prisma.adminPermission.findMany({
      where: { isActive: true },
      select: {
        id: true,
        action: true,
        resource: true,
        description: true,
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  },
};
