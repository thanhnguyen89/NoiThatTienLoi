import { z } from 'zod';

export const catalogNewsLevelSchema = z.object({
  name: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
  isActive: z.boolean().default(false),
});

export type CatalogNewsLevelInput = z.infer<typeof catalogNewsLevelSchema>;

export function validateCatalogNewsLevel(data: unknown) {
  return catalogNewsLevelSchema.safeParse(data);
}
