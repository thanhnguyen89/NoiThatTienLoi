import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục là bắt buộc').max(200, 'Tên danh mục tối đa 200 ký tự'),
  slug: z.string().regex(slugRegex, 'Slug không hợp lệ (chỉ chứa a-z, 0-9 và dấu gạch ngang)'),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  banner: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0, 'Thứ tự phải >= 0').default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isShowHome: z.boolean().default(false),

  // SEO base
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  robots: z.string().optional().nullable(),

  // Platform SEO (WEBSITE, FACEBOOK, TIKTOK, YOUTUBE)
  platformSeos: z.array(z.object({
    platform: z.enum(['WEBSITE', 'FACEBOOK', 'TIKTOK', 'YOUTUBE']),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    keywords: z.string().optional().nullable(),
    hashtags: z.string().optional().nullable(),
    tags: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    canonicalUrl: z.string().optional().nullable(),
    linkPosted: z.string().optional().nullable(),
    contentCate: z.string().optional().nullable(),
    ogTitle: z.string().optional().nullable(),
    ogDescription: z.string().optional().nullable(),
    ogImage: z.string().optional().nullable(),
    robots: z.string().optional().nullable(),
  })).optional(),

  // Platform images
  platformImages: z.array(z.object({
    platform: z.enum(['WEBSITE', 'FACEBOOK', 'TIKTOK', 'YOUTUBE']),
    imageUrl: z.string(),
    alt: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    caption: z.string().optional().nullable(),
    sortOrder: z.coerce.number().min(0).default(0),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })).optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export function validateCategory(data: unknown) {
  return categorySchema.safeParse(data);
}
