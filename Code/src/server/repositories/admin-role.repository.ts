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
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
  _count: { select: { users: true } },
};

export interface PaginatedAdminRoles {
  data: Awaited<ReturnType<typeof adminRoleRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const adminRoleRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { code: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const [result, total] = await Promise.all([
      prisma.adminRole.findMany({
        where,
        select: roleListSelect,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminRole.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.adminRole.findMany({
      where: { isDeleted: false },
      select: roleListSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.adminRole.findUnique({
      where: { id, isDeleted: false },
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
      where: { code, isDeleted: false },
      select: { id: true, code: true, name: true },
    });
  },

  async create(data: AdminRoleInput, createdBy?: string) {
    return prisma.adminRole.create({
      data: {
        ...data,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: roleListSelect,
    });
  },

  async update(id: string, data: Partial<AdminRoleInput>, updatedBy?: string) {
    return prisma.adminRole.update({
      where: { id, isDeleted: false },
      data: {
        ...data,
        updatedBy: updatedBy ?? null,
      },
      select: roleListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.adminRole.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
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
