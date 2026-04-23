import { z } from 'zod';

export const catalogEmbedCodeSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(200, 'Tiêu đề tối đa 200 ký tự'),
  positionId: z.number().int('Position ID phải là số nguyên').optional().nullable(),
  embedCode: z.string().trim().min(1, 'Mã nhúng không được để trống'),
  note: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CatalogEmbedCodeInput = z.infer<typeof catalogEmbedCodeSchema>;

export function validateCatalogEmbedCode(data: unknown) {
  return catalogEmbedCodeSchema.safeParse(data);
}
