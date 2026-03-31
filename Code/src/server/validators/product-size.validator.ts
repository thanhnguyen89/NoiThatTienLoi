import { z } from 'zod';

export const productSizeSchema = z.object({
  sizeLabel: z.string().min(1, 'Tên kích thước là bắt buộc').max(100, 'Tên kích thước tối đa 100 ký tự'),
  widthCm: z.coerce.number().min(0).optional().nullable(),
  lengthCm: z.coerce.number().min(0).optional().nullable(),
  heightCm: z.coerce.number().min(0).optional().nullable(),
  sortOrder: z.coerce.number().min(0, 'Thứ tự phải >= 0').default(0),
  isActive: z.boolean().default(true),
});

export type ProductSizeInput = z.infer<typeof productSizeSchema>;

export function validateProductSize(data: unknown) {
  return productSizeSchema.safeParse(data);
}
