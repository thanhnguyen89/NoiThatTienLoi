import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export interface SourceItem {
  url: string;
  title: string;
  content: string;
  wordCount: number;
  isUnique: boolean;
  isManual: boolean;
  error?: string;
}

export type OutlineMode = 'none' | 'ai' | 'custom';

export type OutlineAIType =
  | 'h2h3_detail'
  | 'h2_10'
  | 'h2_8'
  | 'h2_6'
  | 'h2_4'
  | 'problem'
  | 'step'
  | 'compare'
  | 'story';

export type ArticleStructure =
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

export type ArticleTone =
  | 'intimate'
  | 'formal'
  | 'friendly'
  | 'expert'
  | 'humorous'
  | 'inspirational'
  | 'nostalgic'
  | 'shocking'
  | 'conversational';

export interface SeoOptions {
  mainLink?: string;
  keywordLinks?: string;
  boldKeyword: boolean;
  boldHeading: boolean;
  footerContent?: string;
}

export interface SourceConfig {
  keyword: string;
  secondaryKeywords: string[];
  language: string;
  outlineMode: OutlineMode;
  outlineAIType: OutlineAIType;
  customOutline: string;
  structure: ArticleStructure;
  tone: ArticleTone;
  model: string;
  targetLength: number;
  imageOption: '0' | 'yandex' | 'ai' | 'shutterstock';
  seoOptions: SeoOptions;
  brandConfig?: TinhGonBrandConfig;
}

export interface SourceStreamResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
  sources: SourceItem[];
}

export interface SourceStartResponse {
  articleId: string;
  runId: string;
}
