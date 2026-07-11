import type { BrandSectionState } from '@/components/BrandSection';
import type { AutoBoldOption, ImageOption } from '@/lib/shared/options';
import type { SourceItem } from '@/lib/viet-theo-nguon/types';
import type { ParsedHeading } from '@/lib/viet-theo-dan-bai/types';
import type { BulkFeatureId, DuplicateMode, TitleMode } from './features';

export interface BulkKeywordItem {
  keyword: string;
  postTitle?: string;
  secondaryKeywords: string[];
  raw: string;
}

export interface BulkSeoAdvancedConfig {
  mainLink: string;
  keywordLinks: string;
  autoBold: AutoBoldOption;
  footerContent: string;
}

export interface BulkArticleConfig {
  featureId: BulkFeatureId;
  keywordsRaw: string;
  duplicateMode: DuplicateMode;
  titleMode: TitleMode;
  language: string;
  imageOption: ImageOption;
  imageCount: number;
  targetLength: number;
  tone: string;
  modelId: string;
  brand: BrandSectionState;
  seoAdvanced: BulkSeoAdvancedConfig;
  outlineMode: 'no_outline' | 'ai_outline';
  aiOutlineObjective: string;
  aiOutlineSize: string;
  dataSourceMode: 'ai_only' | 'google_search';
  contentType: string;
  topicalMapRole: string;
  outlineType: string;
  searchResultCount: 3 | 5 | 10;
  crawlMode: 'auto' | 'search_only' | 'no_crawl';
  addFreshnessDate: boolean;
  structure: string;
  outlineAIType: string;
  sourceUrls: string[];
  crawledSources?: SourceItem[];
  sharedOutline: string;
  parsedHeadings?: ParsedHeading[];
  writeMethod: string;
}

export interface BulkEnqueueRequest {
  config: BulkArticleConfig;
  brandConfig?: unknown;
  crawledSources?: SourceItem[];
}

export interface BulkQueueArticle {
  id: string;
  keyword: string;
  selectedTitle: string;
  status: string;
  wordCount: number;
  humannessScore: number | null;
  seoScore: number | null;
  bulkIndex: number | null;
  meta: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface BulkJobResponse {
  id: string;
  jobType: string;
  status: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  config: BulkArticleConfig;
  articles: BulkQueueArticle[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export type BulkSseEvent =
  | { type: 'item_start'; index: number; articleId: string; keyword: string }
  | { type: 'item_step'; index: number; articleId: string; step: string; detail: string; progress: number }
  | { type: 'item_done'; index: number; articleId: string; title: string; wordCount: number; humanness: number; seoScore: number }
  | { type: 'item_error'; index: number; articleId: string; message: string }
  | { type: 'job_done'; jobId: string; successCount: number; errorCount: number }
  | { type: 'paused'; jobId: string }
  | { type: 'error'; message: string };
