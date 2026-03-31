import { z } from 'zod';

export const catalogTextToLinkSchema = z.object({
  categoryId: z.string().optional().nullable(), // BigInt stored as string
  keyword: z.string().min(1, 'Từ khóa là bắt buộc').max(550),
  priority: z.coerce.number().min(0).default(0),
  link: z.string().min(1, 'Liên kết là bắt buộc'),
  matchCount: z.coerce.number().min(0).optional().nullable(),
  domain: z.string().optional().nullable(),
  refAttribute: z.string().optional().nullable(),
  otherAttribute: z.string().optional().nullable(),
  frUnique: z.boolean().default(false),
  matchLinks: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CatalogTextToLinkInput = z.infer<typeof catalogTextToLinkSchema>;

export function validateCatalogTextToLink(data: unknown) {
  return catalogTextToLinkSchema.safeParse(data);
}
