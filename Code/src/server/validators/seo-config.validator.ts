import { z } from 'zod';

export const PAGE_TYPES = [
  { value: 'homepage',  label: 'Trang chủ' },
  { value: 'category',  label: 'Danh mục sản phẩm' },
  { value: 'product',   label: 'Sản phẩm' },
  { value: 'page',      label: 'Trang tĩnh' },
  { value: 'blog',      label: 'Blog / Tin tức' },
  { value: 'contact',   label: 'Liên hệ' },
  { value: 'other',     label: 'Khác' },
] as const;

export const seoConfigSchema = z.object({
  pageName:        z.string().optional().nullable(),
  pageType:        z.string().optional().nullable(),
  title:           z.string().min(1, 'Tiêu đề là bắt buộc').max(255),
  contentBefore:   z.string().optional().nullable(),
  contentAfter:    z.string().optional().nullable(),
  image:           z.string().optional().nullable(),
  icon:            z.string().optional().nullable(),
  thumbnail:       z.string().optional().nullable(),
  banner:          z.string().optional().nullable(),
  seName:          z.string().optional().nullable(),
  metaTitle:       z.string().max(60).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  metaKeywords:    z.string().optional().nullable(),
  seoCanonical:    z.string().optional().nullable(),
  seoNoindex:      z.boolean().default(false),
  ogTitle:         z.string().max(200).optional().nullable(),
  ogDescription:   z.string().max(300).optional().nullable(),
  ogImage:         z.string().optional().nullable(),
  isActive:        z.boolean().default(true),
  sortOrder:       z.coerce.number().min(0).default(0),
});

export type SeoConfigInput = z.infer<typeof seoConfigSchema>;

export function validateSeoConfig(data: unknown) {
  return seoConfigSchema.safeParse(data);
}
