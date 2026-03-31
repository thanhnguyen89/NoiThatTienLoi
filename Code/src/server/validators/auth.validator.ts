import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập là bắt buộc').max(100),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export function validateLogin(data: unknown) {
  return loginSchema.safeParse(data);
}
