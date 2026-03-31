import { z } from 'zod';

export const catalogRedirectSchema = z.object({
  urlFrom: z.string().min(1, 'Url cũ là bắt buộc'),
  urlTo: z.string().min(1, 'Url mới là bắt buộc'),
  errorCode: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CatalogRedirectInput = z.infer<typeof catalogRedirectSchema>;

export function validateCatalogRedirect(data: unknown) {
  return catalogRedirectSchema.safeParse(data);
}
