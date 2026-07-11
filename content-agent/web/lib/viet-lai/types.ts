import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export type RewriteStyle =
  | 'standard'
  | 'creative'
  | 'structured'
  | 'shorten'
  | 'expand'
  | 'funny'
  | 'friendly'
  | 'casual'
  | 'professional'
  | 'rewrite_struct'
  | 'rewrite_persp'
  | 'rewrite_kw'
  | 'emoji';

export interface ParagraphRewriteConfig {
  originalText: string;
  style: RewriteStyle;
  language: string;
  model: string;
}

export type RewriteMethod =
  | 'keep_headings'
  | 'rewrite_all'
  | 'deep_rewrite';

export interface ArticleRewriteConfig {
  originalHtml: string;
  originalTitle: string;
  keyword: string;
  seoMode: boolean;
  method: RewriteMethod;
  style: RewriteStyle;
  language: string;
  mainKeywordUrl: string;
  additionalLinks: Array<{ keyword: string; url: string }>;
  appendContent: string;
  autoBold: 'none' | 'keyword' | 'headings' | 'both';
  model: string;
  brandConfig?: TinhGonBrandConfig;
}

export interface ArticleSection {
  headingLevel: 'h1' | 'h2' | 'h3' | 'h4' | null;
  headingText: string;
  headingHtml: string;
  bodyHtml: string;
}

export interface ArticleRewriteStartResponse {
  articleId: string;
  runId: string;
  sections: ArticleSection[];
  wordCount: number;
}

export interface ArticleRewriteResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
  originalWordCount: number;
}
