import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';
import type { SeoAdvancedConfig } from '@/lib/shared/seo-advanced';

export type NewsStructure =
  | 'auto'
  | 'inverted_pyramid'
  | 'storytelling'
  | 'qa'
  | 'how_to'
  | 'pro_con'
  | 'historical'
  | 'listicle'
  | 'profile'
  | 'review';

export type NewsTone =
  | 'formal'
  | 'intimate'
  | 'friendly'
  | 'expert'
  | 'humorous'
  | 'inspirational'
  | 'nostalgic'
  | 'shocking'
  | 'conversational';

export interface NewsConfig {
  keyword: string;
  language: string;
  structure: NewsStructure;
  tone: NewsTone;
  model: string;
  targetLength: number;
  secondaryKeywords: string[];
  brandConfig?: TinhGonBrandConfig;
  seoOptions?: Partial<SeoAdvancedConfig>;
}

export function normalizeNewsConfig(input: Partial<NewsConfig>): NewsConfig {
  return {
    keyword: input.keyword ?? '',
    language: input.language ?? 'Vietnamese',
    structure: input.structure ?? 'auto',
    tone: input.tone ?? 'formal',
    model: input.model ?? 'gemini-flash',
    targetLength: input.targetLength ?? 600,
    secondaryKeywords: Array.isArray(input.secondaryKeywords)
      ? input.secondaryKeywords.map((item) => item.trim()).filter(Boolean)
      : [],
    brandConfig: input.brandConfig,
    seoOptions: input.seoOptions,
  };
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

export interface NewsStreamResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
  sources: NewsItem[];
}

export interface NewsStartResponse {
  articleId: string;
  runId: string;
  sources: NewsItem[];
  warning?: string;
}
