import { z } from 'zod';

export const catalogEmbedCodeSchema = z.object({
  title: z.string().optional().nullable(),
  positionId: z.number().optional().nullable(),
  embedCode: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CatalogEmbedCodeInput = z.infer<typeof catalogEmbedCodeSchema>;

export function validateCatalogEmbedCode(data: unknown) {
  return catalogEmbedCodeSchema.safeParse(data);
}
