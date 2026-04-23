import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const newsSchema = z.object({
  categoryId: z.string().optional().nullable(),
  title: z.string().max(1000).optional().nullable(),
  summary: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  isShowHome: z.boolean().default(true),
  image: z.string().optional().nullable(),
  seName: z.string().max(255).optional().nullable(),
  metaKeywords: z.string().max(400).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaTitle: z.string().max(400).optional().nullable(),
  isRemoved: z.boolean().default(false),
  viewCount: z.coerce.number().min(0).default(0),
  commentCount: z.coerce.number().min(0).default(0),
  likeCount: z.coerce.number().min(0).default(0),
  isNew: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  newTag: z.string().optional().nullable(),
  isRedirect: z.boolean().default(false),
  slugRedirect: z.string().max(1000).optional().nullable(),
  seoCanonical: z.string().max(1000).optional().nullable(),
  seoNoindex: z.boolean().default(false),
  publishedAt: z.string().optional().nullable(),
  wordCount: z.coerce.number().min(0).optional().nullable(),
  errorCode: z.string().max(50).optional().nullable(),
  authorName: z.string().max(255).optional().nullable(),
});

export type NewsInput = z.infer<typeof newsSchema>;

export function validateNews(data: unknown) {
  return newsSchema.safeParse(data);
}
