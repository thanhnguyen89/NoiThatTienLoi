import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export type ToplistTopN = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type ToplistStructure =
  | 'auto'
  | 'intro_features'
  | 'intro_features_pros_cons'
  | 'intro_features_faq'
  | 'intro_features_pros_cons_faq';

export type ToplistTone =
  | 'formal_seo'
  | 'expert_seo'
  | 'friendly_ai_bypass'
  | 'humorous_ai_bypass'
  | 'technical_seo';

export type ToplistDataSource = 'google_search' | 'ai_only';

export type ToplistImageOption = 'none' | 'yandex' | 'ai_generated' | 'shutterstock';

export interface ToplistConfig {
  keyword: string;
  secondaryKeywords: string[];
  topN: ToplistTopN;
  structure: ToplistStructure;
  tone: ToplistTone;
  dataSource: ToplistDataSource;
  imageOption: ToplistImageOption;
  language: string;
  model: string;
  brandConfig?: TinhGonBrandConfig;
}

export interface ToplistStartResponse {
  articleId: string;
  runId: string;
  serpData?: string;
}

export interface ToplistStreamResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
  imagesInjected: number;
}

export interface SuggestKeywordsResponse {
  keywords: string[];
}
