import { z } from 'zod';

export const productColorSchema = z.object({
  colorName: z.string().min(1, 'Tên màu sắc là bắt buộc').max(100, 'Tên màu sắc tối đa 100 ký tự'),
  colorCode: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0, 'Thứ tự phải >= 0').default(0),
  isActive: z.boolean().default(true),
});

export type ProductColorInput = z.infer<typeof productColorSchema>;

export function validateProductColor(data: unknown) {
  return productColorSchema.safeParse(data);
}
