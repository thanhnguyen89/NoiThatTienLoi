import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export type DanBaiWriteMethod = 'balance' | 'detail';

export type DanBaiTone = 'seo_focus' | 'confident' | 'friendly';

export type DanBaiOutlineTab = 'ai_suggest' | 'from_search' | 'ai_serp_url' | 'from_url' | 'manual';

export interface ParsedHeading {
  level: 'h2' | 'h3';
  text: string;
}

export interface DanBaiConfig {
  keyword: string;
  language: string;
  postTitle: string;
  outline: string;
  parsedHeadings: ParsedHeading[];
  writeMethod: DanBaiWriteMethod;
  tone: DanBaiTone;
  model: string;
  targetLength: number;
  brandConfig?: TinhGonBrandConfig;
}

export interface DanBaiStartResponse {
  articleId: string;
  runId: string;
}

export interface DanBaiStreamResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
}

export interface SuggestOutlineResponse {
  outline: string;
  headings: ParsedHeading[];
}
