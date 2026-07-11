import { z } from 'zod';
import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export interface ProductData {
  name: string;
  info: string;
  price?: string;
  rating?: string;
  imageUrl?: string;
  sourceUrl?: string;
  scrapedAt?: string;
}

export type ReviewStructure = 'full' | 'focused';

export type ReviewStyle =
  | 'expert'
  | 'user'
  | 'friendly'
  | 'fun'
  | 'technical'
  | 'informational';

export interface ReviewConfig {
  productUrl?: string;
  productName: string;
  productInfo: string;
  keyword: string;
  affiliateLink?: string;
  reviewStructure: ReviewStructure;
  reviewStyle: ReviewStyle;
  language: string;
  model: string;
  brandConfig?: TinhGonBrandConfig;
}

export interface ScrapeResponse {
  success: boolean;
  data?: ProductData;
  error?: string;
}

export interface ReviewStreamResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
}

export interface ReviewStartResponse {
  articleId: string;
  runId: string;
}

export interface ReviewStreamEvent {
  type: 'step' | 'step_done' | 'chunk' | 'done' | 'error';
  step?: string;
  label?: string;
  text?: string;
  message?: string;
  data?: ReviewStreamResult;
}

export const brandConfigSchema = z.object({
  name: z.string().trim().optional(),
  pronouns: z.string().trim().optional(),
  audience: z.string().trim().optional(),
  forbiddenExtra: z.string().trim().optional(),
  toneNotes: z.string().trim().optional(),
});

export const reviewConfigSchema = z.object({
  productUrl: z.string().url().optional().or(z.literal('')),
  productName: z.string().trim().min(2).max(300),
  productInfo: z.string().trim().min(10).max(5000),
  keyword: z.string().trim().min(2).max(200),
  affiliateLink: z.string().url().optional().or(z.literal('')),
  reviewStructure: z.enum(['full', 'focused']),
  reviewStyle: z.enum(['expert', 'user', 'friendly', 'fun', 'technical', 'informational']),
  language: z.string().trim().min(2).max(50).default('Vietnamese'),
  model: z.string().trim().min(2).max(50).default('gemini-flash'),
  brandConfig: brandConfigSchema.optional(),
});

export const scrapeRequestSchema = z.object({
  url: z.string().url(),
});

export const streamRequestSchema = z.object({
  articleId: z.string().trim().min(1),
  runId: z.string().trim().min(4).max(80),
  config: reviewConfigSchema,
});
