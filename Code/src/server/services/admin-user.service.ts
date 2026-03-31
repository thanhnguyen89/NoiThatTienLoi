import { adminUserRepository } from '@/server/repositories/admin-user.repository';
import { adminActivityLogRepository } from '@/server/repositories/admin-activity-log.repository';
import { validateAdminUser } from '@/server/validators/admin-user.validator';
import { hashPassword, isStrongPassword } from '@/lib/auth/password';
import { NotFoundError, ValidationError, ConflictError } from '@/server/errors';

export const adminUserService = {
  async getAllUsers() {
    return adminUserRepository.findAll();
  },

  async getUserById(id: string) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');
    return user;
  },

  async createUser(input: Record<string, unknown>, createdById: string) {
    if (!input.password) {
      throw new ValidationError('Mật khẩu là bắt buộc khi tạo người dùng');
    }
    if (!isStrongPassword(input.password as string)) {
      throw new ValidationError('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số');
    }

    const result = validateAdminUser(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // Check duplicate username
    const existing = await adminUserRepository.findByUsername(result.data.username);
    if (existing) {
      throw new ConflictError('Tên đăng nhập đã tồn tại');
    }

    // Check duplicate email
    const existingEmail = await adminUserRepository.findByEmail(result.data.email);
    if (existingEmail) {
      throw new ConflictError('Email đã được sử dụng');
    }

    const hashedPassword = await hashPassword(result.data.password!);
    const user = await adminUserRepository.create({
      ...result.data,
      password: hashedPassword,
    });

    await adminActivityLogRepository.create({
      userId: createdById,
      action: 'CREATE',
      resource: 'users',
      resourceId: user.id,
      description: `Tạo người dùng: ${user.username}`,
    });

    return user;
  },

  async updateUser(id: string, input: Record<string, unknown>, updatedById: string) {
    // Lấy dữ liệu cũ để log
    const oldUser = await adminUserRepository.findById(id);
    if (!oldUser) throw new NotFoundError('Không tìm thấy người dùng');

    // Validate
    const result = validateAdminUser(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // Check duplicate username (nếu thay đổi)
    if (result.data.username !== oldUser.username) {
      const existing = await adminUserRepository.findByUsername(result.data.username);
      if (existing) throw new ConflictError('Tên đăng nhập đã tồn tại');
    }

    // Check duplicate email (nếu thay đổi)
    if (result.data.email !== oldUser.email) {
      const existingEmail = await adminUserRepository.findByEmail(result.data.email);
      if (existingEmail) throw new ConflictError('Email đã được sử dụng');
    }

    // Validate password nếu có thay đổi
    if (result.data.password) {
      if (!isStrongPassword(result.data.password)) {
        throw new ValidationError('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số');
      }
      result.data.password = await hashPassword(result.data.password);
    }

    const user = await adminUserRepository.update(id, result.data);

    await adminActivityLogRepository.create({
      userId: updatedById,
      action: 'UPDATE',
      resource: 'users',
      resourceId: user.id,
      description: `Cập nhật người dùng: ${user.username}`,
      oldData: JSON.stringify({ username: oldUser.username, email: oldUser.email, isActive: oldUser.isActive }),
      newData: JSON.stringify({ username: user.username, email: user.email, isActive: user.isActive }),
    });

    return user;
  },

  async deleteUser(id: string, deletedById: string) {
    const user = await adminUserRepository.findById(id);
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');

    await adminUserRepository.delete(id);

    await adminActivityLogRepository.create({
      userId: deletedById,
      action: 'DELETE',
      resource: 'users',
      resourceId: id,
      description: `Xóa người dùng: ${user.username}`,
    });
  },
};
