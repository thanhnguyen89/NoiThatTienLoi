import { adminRoleRepository } from '@/server/repositories/admin-role.repository';
import { adminActivityLogRepository } from '@/server/repositories/admin-activity-log.repository';
import { validateAdminRole } from '@/server/validators/admin-role.validator';
import { NotFoundError, ValidationError, ConflictError } from '@/server/errors';

export const adminRoleService = {
  async getAllRoles(opts?: { page?: number; pageSize?: number; search?: string }) {
    return adminRoleRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      search: opts?.search,
    });
  },

  async getRoleById(id: string) {
    const role = await adminRoleRepository.findById(id);
    if (!role) throw new NotFoundError('Không tìm thấy vai trò');
    return role;
  },

  async getAllPermissions() {
    return adminRoleRepository.getAllPermissions();
  },

  async createRole(input: Record<string, unknown>, permissionIds: string[], createdById: string) {
    const result = validateAdminRole(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // Check duplicate code
    const existing = await adminRoleRepository.findByCode(result.data.code);
    if (existing) {
      throw new ConflictError('Mã vai trò đã tồn tại');
    }

    const role = await adminRoleRepository.create(result.data);

    if (permissionIds.length > 0) {
      await adminRoleRepository.setPermissions(role.id, permissionIds);
    }

    await adminActivityLogRepository.create({
      userId: createdById,
      action: 'CREATE',
      resource: 'roles',
      resourceId: role.id,
      description: `Tạo vai trò: ${role.name}`,
    });

    return adminRoleRepository.findById(role.id);
  },

  async updateRole(id: string, input: Record<string, unknown>, permissionIds: string[], updatedById: string) {
    const oldRole = await adminRoleRepository.findById(id);
    if (!oldRole) throw new NotFoundError('Không tìm thấy vai trò');

    if (oldRole.isSystem) {
      throw new ValidationError('Không thể sửa vai trò hệ thống');
    }

    const result = validateAdminRole(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // Check duplicate code (nếu thay đổi)
    if (result.data.code !== oldRole.code) {
      const existing = await adminRoleRepository.findByCode(result.data.code);
      if (existing) throw new ConflictError('Mã vai trò đã tồn tại');
    }

    const role = await adminRoleRepository.update(id, result.data);

    if (permissionIds !== undefined) {
      await adminRoleRepository.setPermissions(role.id, permissionIds);
    }

    await adminActivityLogRepository.create({
      userId: updatedById,
      action: 'UPDATE',
      resource: 'roles',
      resourceId: role.id,
      description: `Cập nhật vai trò: ${role.name}`,
      oldData: JSON.stringify({ name: oldRole.name, code: oldRole.code, isActive: oldRole.isActive }),
      newData: JSON.stringify({ name: role.name, code: role.code, isActive: role.isActive }),
    });

    return adminRoleRepository.findById(role.id);
  },

  async deleteRole(id: string, deletedById: string) {
    const role = await adminRoleRepository.findById(id);
    if (!role) throw new NotFoundError('Không tìm thấy vai trò');

    if (role.isSystem) {
      throw new ValidationError('Không thể xóa vai trò hệ thống');
    }

    if (role._count.users > 0) {
      throw new ConflictError(`Vai trò đang được sử dụng bởi ${role._count.users} người dùng`);
    }

    await adminRoleRepository.delete(id);

    await adminActivityLogRepository.create({
      userId: deletedById,
      action: 'DELETE',
      resource: 'roles',
      resourceId: id,
      description: `Xóa vai trò: ${role.name}`,
    });
  },
};
