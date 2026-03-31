import { z } from 'zod';

export const seoConfigSchema = z.object({
  pageName: z.string().optional().nullable(),
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(255),
  contentBefore: z.string().optional().nullable(),
  contentAfter: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  seName: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  seoNoindex: z.boolean().default(false),
  seoCanonical: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0).default(0),
});

export type SeoConfigInput = z.infer<typeof seoConfigSchema>;

export function validateSeoConfig(data: unknown) {
  return seoConfigSchema.safeParse(data);
}
