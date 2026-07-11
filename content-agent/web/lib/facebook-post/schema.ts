import { z } from 'zod';
import {
  FACEBOOK_POST_DEFAULT_WORD_COUNT,
  FACEBOOK_POST_QUICK_MAX_WORDS,
  FACEBOOK_POST_QUICK_MIN_WORDS,
  FACEBOOK_POST_ROUTE_MAX_WORDS,
} from './constants';
import type { FacebookPostRequest } from './types';

const toneSchema = z.enum(['friendly', 'professional', 'casual', 'sales', 'rewrite', 'shorten']);
const namedTemplateSchema = z.enum(['product_intro', 'combo_wholesale', 'bulk_b2b', 'friendly_stock', 'branding']);

const facebookPostInputSchema = z.object({
  modelId: z.string().trim().min(2).max(100).optional(),
  provider: z.string().trim().min(2).max(100).optional(),
  keyword: z.string().trim().min(3).max(5000),
  wordCount: z.coerce.number().int().min(FACEBOOK_POST_QUICK_MIN_WORDS).max(FACEBOOK_POST_ROUTE_MAX_WORDS).default(FACEBOOK_POST_DEFAULT_WORD_COUNT),
  tone: toneSchema.default('friendly'),
  template: z.union([namedTemplateSchema, z.literal(''), z.null()]).default(null),
  shopName: z.string().max(200).default(''),
  industry: z.string().max(200).default(''),
  brandPronouns: z.string().max(200).default(''),
  brandAudience: z.string().max(500).default(''),
  brandToneNotes: z.string().max(2000).default(''),
  phone: z.string().max(100).default(''),
  address: z.string().max(500).default(''),
  brandDesc: z.string().max(2000).default(''),
  brandForbidden: z.string().max(1000).default(''),
  ctaStandard: z.string().max(500).default(''),
  mainProducts: z.string().max(1000).default(''),
  includeEmojis: z.boolean().default(true),
  includeHashtags: z.boolean().default(true),
  freeShip: z.boolean().default(false),
  urgency: z.boolean().default(false),
});

export function normalizeFacebookPostRequest(input: unknown): FacebookPostRequest {
  const parsed = facebookPostInputSchema.parse(input);

  return {
    modelId: (parsed.modelId || parsed.provider || 'gemini-flash').trim(),
    keyword: parsed.keyword.trim(),
    wordCount: parsed.wordCount,
    tone: parsed.tone,
    template: parsed.template || null,
    shopName: parsed.shopName.trim(),
    industry: parsed.industry.trim(),
    brandPronouns: parsed.brandPronouns.trim(),
    brandAudience: parsed.brandAudience.trim(),
    brandToneNotes: parsed.brandToneNotes.trim(),
    phone: parsed.phone.trim(),
    address: parsed.address.trim(),
    brandDesc: parsed.brandDesc.trim(),
    brandForbidden: parsed.brandForbidden.trim(),
    ctaStandard: parsed.ctaStandard.trim(),
    mainProducts: parsed.mainProducts.trim(),
    includeEmojis: parsed.includeEmojis,
    includeHashtags: parsed.includeHashtags,
    freeShip: parsed.freeShip,
    urgency: parsed.urgency,
  };
}

export function clampFacebookPostQuickWordCount(value: number): number {
  if (!Number.isFinite(value) || value < FACEBOOK_POST_QUICK_MIN_WORDS) {
    return FACEBOOK_POST_DEFAULT_WORD_COUNT;
  }

  return Math.min(Math.round(value), FACEBOOK_POST_QUICK_MAX_WORDS);
}
