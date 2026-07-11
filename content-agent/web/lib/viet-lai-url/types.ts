import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';
import type { NewsStructure, NewsTone } from '@/lib/viet-tin-tuc/types';

export type UrlIdeaType =
  | 'features'
  | 'overview'
  | 'who_is'
  | 'biography'
  | 'who_uses'
  | 'what_is'
  | 'where'
  | 'when'
  | 'how_to'
  | 'pros_cons'
  | 'similar'
  | 'advice'
  | 'opinions'
  | 'examples'
  | 'comparison'
  | 'pricing'
  | 'faq3'
  | 'faq5';

export type UrlImageOption = 'none' | 'yandex' | 'ai_generated' | 'shutterstock';

export interface UrlLinkItem {
  keyword: string;
  url: string;
}

export interface UrlRewriteConfig {
  sourceUrl: string;
  extractedHeadings: string;
  extractedContent: string;
  sourceTitle: string;
  keyword: string;
  secondaryKeywords: string;
  seoMode: boolean;
  selectedIdeas: UrlIdeaType[];
  structure: NewsStructure;
  tone: NewsTone;
  language: string;
  imageOption: UrlImageOption;
  mainKeywordUrl: string;
  additionalLinks: UrlLinkItem[];
  appendContent: string;
  autoBold: 'none' | 'keyword' | 'headings' | 'both';
  model: string;
  brandConfig?: TinhGonBrandConfig;
}

export interface UrlCrawlResult {
  url: string;
  title: string;
  headings: string;
  content: string;
  warning?: string;
}

export interface UrlRewriteStartResponse {
  articleId: string;
  runId: string;
}

export interface UrlRewriteResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
  imagesInjected?: number;
}
