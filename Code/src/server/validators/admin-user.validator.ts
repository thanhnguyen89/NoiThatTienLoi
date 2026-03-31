import { z } from 'zod';

const slugRegex = /^[a-zA-Z0-9_]+$/;

export const adminUserSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập tối thiểu 3 ký tự').max(100).regex(slugRegex, 'Chỉ chứa a-z, A-Z, 0-9, dấu gạch dưới'),
  email: z.string().email('Email không hợp lệ').max(255),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(100).optional(),
  fullName: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  avatar: z.string().max(1000).optional().nullable(),
  roleId: z.string().min(1, 'Vai trò là bắt buộc'),
  isActive: z.boolean().default(true),
  isSuperAdmin: z.boolean().default(false),
});

export type AdminUserInput = z.infer<typeof adminUserSchema>;

export function validateAdminUser(data: unknown) {
  return adminUserSchema.safeParse(data);
}
