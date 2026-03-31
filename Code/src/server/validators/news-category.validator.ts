import { z } from 'zod';

export const newsCategorySchema = z.object({
  title: z.string().max(200).optional().nullable(),
  summary: z.string().max(400).optional().nullable(),
  content: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0).optional().nullable(),
  isShowHome: z.boolean().default(true),
  seName: z.string().max(255).optional().nullable(),
  metaKeywords: z.string().max(400).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaTitle: z.string().max(400).optional().nullable(),
  isPublished: z.boolean().default(true),
  isActive: z.boolean().default(true),
  slugRedirect: z.string().max(1000).optional().nullable(),
  isRedirect: z.boolean().default(false),
  isMobile: z.boolean().default(false),
  viewCount: z.coerce.number().min(0).optional().nullable(),
  seoCanonical: z.string().max(1000).optional().nullable(),
  seoNoindex: z.boolean().default(false),
});

export type NewsCategoryInput = z.infer<typeof newsCategorySchema>;

export function validateNewsCategory(data: unknown) {
  return newsCategorySchema.safeParse(data);
}
