import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export type NewsRewriteStyle =
  | 'neutral'
  | 'breaking'
  | 'formal'
  | 'friendly'
  | 'analysis'
  | 'magazine';

export interface NewsRewriteConfig {
  originalHtml: string;
  originalTitle: string;
  keyword: string;
  seoMode: boolean;
  style: NewsRewriteStyle;
  language: string;
  mainKeywordUrl: string;
  additionalLinks: Array<{ keyword: string; url: string }>;
  appendContent: string;
  autoBold: 'none' | 'keyword' | 'headings' | 'both';
  model: string;
  brandConfig?: TinhGonBrandConfig;
}

export interface NewsRewriteStartResponse {
  articleId: string;
  runId: string;
  wordCount: number;
}

export interface NewsRewriteResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
  originalWordCount: number;
}
