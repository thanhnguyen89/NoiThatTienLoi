import { z } from 'zod';

export const newsCategorySchema = z.object({
  parentId:        z.string().optional().nullable(),
  categoryLevel:   z.number().min(0).optional().nullable(),
  title:           z.string().max(200).optional().nullable(),
  seName:          z.string().max(255).optional().nullable(),
  summary:         z.string().max(400).optional().nullable(),
  content:         z.string().optional().nullable(),
  imageUrl:        z.string().optional().nullable(),
  icon:            z.string().optional().nullable(),
  banner:          z.string().optional().nullable(),
  sortOrder:       z.coerce.number().min(0).optional().nullable(),
  isShowHome:      z.boolean().default(true),
  // SEO Website
  metaKeywords:    z.string().max(400).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  metaTitle:       z.string().max(60).optional().nullable(),
  seoCanonical:    z.string().max(1000).optional().nullable(),
  seoNoindex:      z.boolean().default(false),
  ogTitle:         z.string().max(200).optional().nullable(),
  ogDescription:   z.string().max(300).optional().nullable(),
  ogImage:         z.string().optional().nullable(),
  robots:          z.string().optional().nullable(),
  // SEO Facebook
  fbTitle:         z.string().optional().nullable(),
  fbDescription:   z.string().optional().nullable(),
  fbKeywords:      z.string().optional().nullable(),
  fbHashtags:      z.string().optional().nullable(),
  fbImage:         z.string().optional().nullable(),
  fbLinkPosted:    z.string().optional().nullable(),
  // SEO TikTok
  ttTitle:         z.string().optional().nullable(),
  ttDescription:   z.string().optional().nullable(),
  ttKeywords:      z.string().optional().nullable(),
  ttHashtags:      z.string().optional().nullable(),
  ttImage:         z.string().optional().nullable(),
  ttLinkPosted:    z.string().optional().nullable(),
  // SEO YouTube
  ytTitle:         z.string().optional().nullable(),
  ytDescription:   z.string().optional().nullable(),
  ytTags:          z.string().optional().nullable(),
  ytHashtags:      z.string().optional().nullable(),
  ytImage:         z.string().optional().nullable(),
  ytLinkPosted:    z.string().optional().nullable(),
  // Redirect
  slugRedirect:    z.string().max(1000).optional().nullable(),
  isRedirect:      z.boolean().optional().nullable(),
  // Misc
  isActive:        z.boolean().default(true),
  isMobile:        z.boolean().optional().nullable(),
  viewCount:       z.coerce.number().min(0).optional().nullable(),
});

export type NewsCategoryInput = z.infer<typeof newsCategorySchema>;

export function validateNewsCategory(data: unknown) {
  return newsCategorySchema.safeParse(data);
}
