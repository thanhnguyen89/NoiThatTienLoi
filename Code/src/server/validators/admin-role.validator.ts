import { z } from 'zod';

const slugRegex = /^[A-Z_]+$/;

export const adminRoleSchema = z.object({
  name: z.string().min(1, 'Tên vai trò là bắt buộc').max(100),
  code: z.string().min(1, 'Mã vai trò là bắt buộc').max(50).regex(slugRegex, 'Chỉ chứa A-Z và dấu gạch dưới'),
  description: z.string().max(500).optional().nullable(),
  isSystem: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().min(0).default(0),
});

export type AdminRoleInput = z.infer<typeof adminRoleSchema>;

export function validateAdminRole(data: unknown) {
  return adminRoleSchema.safeParse(data);
}

export const adminPermissionSchema = z.object({
  action: z.enum(['VIEW', 'CREATE', 'UPDATE', 'DELETE']),
  resource: z.string().min(1, 'Resource là bắt buộc'),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type AdminPermissionInput = z.infer<typeof adminPermissionSchema>;

export function validateAdminPermission(data: unknown) {
  return adminPermissionSchema.safeParse(data);
}
