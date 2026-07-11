import { z } from 'zod';

export const brandConfigSchema = z.object({
  name: z.string().trim().min(1).optional(),
  pronouns: z.string().trim().optional(),
  audience: z.string().trim().optional(),
  forbiddenExtra: z.string().trim().optional(),
  toneNotes: z.string().trim().optional(),
  description: z.string().trim().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  openingHours: z.string().trim().optional(),
  priceRange: z.string().trim().optional(),
});

export const tinhGonConfigSchema = z.object({
  keyword: z.string().trim().min(3).max(200),
  outlineType: z.enum([
    'review_product',
    'how_to_choose',
    'compare',
    'faq',
    'listicle',
    'problem_solution',
    'step_guide',
    'story_brand',
    'use_case',
    'buying_guide',
  ]),
  language: z.string().trim().min(2).max(30),
  model: z.string().trim().min(2).max(50),
  targetLength: z.coerce.number().int().min(800).max(1500),
  secondaryKeywords: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  notes: z.string().max(2000).default(''),
  dataSource: z.enum(['ai_only', 'google_search']).default('ai_only'),
  brandConfig: brandConfigSchema.optional(),
});

export const outlineSectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().trim().min(3).max(200),
  notes: z.string().max(500).default(''),
  targetWords: z.coerce.number().int().min(80).max(260),
});

export const tinhGonOutlineSchema = z.object({
  titleOptions: z.array(z.string().trim().min(3).max(220)).min(1).max(5),
  selectedTitle: z.string().trim().min(3).max(220),
  sections: z.array(outlineSectionSchema).min(1).max(12),
  angle: z.string().trim().min(3).max(500),
  searchIntent: z.string().trim().min(3).max(500),
  contentGaps: z.array(z.string().trim().min(2).max(300)).max(8).default([]),
  estimatedWords: z.coerce.number().int().min(800).max(1500),
  userNotes: z.string().max(2000).default(''),
});

export const suggestKeywordsRequestSchema = z.object({
  keyword: z.string().trim().min(2).max(200),
  count: z.coerce.number().int().min(3).max(12).default(8),
  model: z.string().trim().optional(),
});

export const outlineRequestSchema = z.object({
  config: tinhGonConfigSchema,
  articleId: z.string().trim().optional(),
});

export const startRequestSchema = z.object({
  config: tinhGonConfigSchema,
});

export const streamRequestSchema = z.object({
  articleId: z.string().trim().min(1),
  runId: z.string().trim().min(4).max(80),
  config: tinhGonConfigSchema,
  outline: tinhGonOutlineSchema,
});

export const humannessRequestSchema = z.object({
  html: z.string().trim().min(20),
  forbiddenExtra: z.union([z.string(), z.array(z.string())]).optional(),
  mode: z.enum(['default', 'news']).optional(),
});

export const aiEditRequestSchema = z.object({
  selectedText: z.string().trim().min(10),
  command: z.enum(['shorten', 'expand', 'humanize', 'more_spec', 'stronger_cta', 'rewrite']),
  context: z.object({
    keyword: z.string().trim().min(2).max(200),
    model: z.string().trim().optional(),
    brandConfig: brandConfigSchema.optional(),
  }),
});

export const internalLinksRequestSchema = z.object({
  keyword: z.string().trim().min(2).max(200),
  html: z.string().default(''),
});
