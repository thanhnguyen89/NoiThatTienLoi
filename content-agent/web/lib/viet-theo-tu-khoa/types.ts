import type { ImageOption } from '@/lib/shared/options';
import type { TinhGonBrandConfig, TinhGonDecision, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export type OutlineMode = 'no_outline' | 'user_outline' | 'ai_outline';

export type AiOutlineObjective =
  | 'basic'
  | 'problem_solution'
  | 'listicle'
  | 'comparison'
  | 'step_by_step'
  | 'story';

export type AiOutlineSize =
  | '2_3_h2'
  | '3_4_h2'
  | '5_6_h2'
  | '7_8_h2'
  | '9_10_h2';

export type KeywordTone =
  | 'seo_basic'
  | 'seo_focus'
  | 'seo_extended'
  | 'seo_longform'
  | 'seo_nofaq'
  | 'how_to'
  | 'listicle'
  | 'comparison'
  | 'story'
  | 'technical'
  | 'friendly'
  | 'formal'
  | 'confident'
  | 'year_in_title'
  | 'cooking'
  | 'random';

export interface KeywordSeoLink {
  keyword: string;
  url: string;
}

export interface KeywordArticleConfig {
  keyword: string;
  secondaryKeywords: string[];
  isToplist: boolean;
  outlineMode: OutlineMode;
  targetLength: number;
  aiOutlineObjective?: AiOutlineObjective;
  aiOutlineSize?: AiOutlineSize;
  resolvedOutline?: string;
  imageOption: ImageOption;
  language: string;
  tone: KeywordTone;
  model: string;
  seoMainLink?: string;
  seoKeywordLinks?: KeywordSeoLink[];
  footerContent?: string;
  boldMainKeyword: boolean;
  boldHeadings: boolean;
  brandProfileId?: number;
  brandConfig?: TinhGonBrandConfig;
  dataSource?: 'ai_only' | 'google_search';
  competitorUrls?: string[];
}

export interface KeywordOutlineSnapshot {
  flow: 'viet_theo_tu_khoa';
  stage: 'config' | 'generate';
  config: KeywordArticleConfig;
  aiCheck?: unknown;
}

export interface KeywordStartResponse {
  articleId: string;
  runId: string;
  outline: string;
  previewHtml: string;
  warning?: string;
}

export interface KeywordStreamEventStatus {
  type: 'status';
  message: string;
}

export interface KeywordStreamEventChunk {
  type: 'chunk';
  html: string;
}

export interface KeywordStreamEventHumanness {
  type: 'humanness';
  score: number;
  decision: TinhGonDecision;
  humanness?: TinhGonHumannessResult;
}

export interface KeywordStreamEventDone {
  type: 'done';
  articleId: string;
  wordCount: number;
}

export interface KeywordStreamEventError {
  type: 'error';
  message: string;
}

export type KeywordStreamEvent =
  | KeywordStreamEventStatus
  | KeywordStreamEventChunk
  | KeywordStreamEventHumanness
  | KeywordStreamEventDone
  | KeywordStreamEventError;
