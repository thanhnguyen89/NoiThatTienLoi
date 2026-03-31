import { z } from 'zod';

export const pageSchema = z.object({
  pageName: z.string().max(1000).optional().nullable(),
  title: z.string().max(1000).optional().nullable(),
  body: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0).optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isShowHome: z.boolean().default(true),
  isActive: z.boolean().default(true),
  metaKeywords: z.string().max(400).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaTitle: z.string().max(400).optional().nullable(),
  slugRedirect: z.string().max(1000).optional().nullable(),
  isRedirect: z.boolean().default(false),
  seoCanonical: z.string().max(1000).optional().nullable(),
  seoNoindex: z.boolean().default(false),
  errorCode: z.string().max(50).optional().nullable(),
});

export type PageInput = z.infer<typeof pageSchema>;

export function validatePage(data: unknown) {
  return pageSchema.safeParse(data);
}
