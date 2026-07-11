import type { SearchResult } from '@/lib/viet-tu-google-search/types';
import type { ImageOption } from '@/lib/shared/options';

export type BulkGsOutlineMode = 'no_outline' | 'ai_outline';
export type DuplicateMode = 'allow' | 'reject';

export interface BulkGsConfig {
  keywords: string[];
  duplicateMode: DuplicateMode;
  searchResultCount: 3 | 5 | 10;
  crawlMode: 'auto' | 'search_only' | 'no_crawl';
  addFreshnessDate: boolean;
  imageOption: ImageOption;
  imageCount: number;
  language: string;
  outlineMode: BulkGsOutlineMode;
  targetLength: number;
  aiOutlineObjective?: string;
  aiOutlineSize?: string;
  tone: string;
  modelId: string;
  brandName?: string;
  brandPhone?: string;
  brandAddress?: string;
  brandCta?: string;
  brandSelectedProfileId?: string;
  seoInternalLinks?: string;
  seoAppendContent?: string;
  seoAutoBold?: string;
  seoCustomSlug?: string;
  seoNoIndex?: boolean;
}

export type BulkGsStep = 'searching' | 'crawling' | 'synthesizing' | 'writing' | 'scoring';

export type VhlgsSSEEvent =
  | { type: 'item_start'; index: number; keyword: string }
  | { type: 'item_step'; index: number; step: BulkGsStep; detail?: string; progress: number }
  | { type: 'item_done'; index: number; articleId: string; title: string; wordCount: number; humanness: number; sourcesCount: number }
  | { type: 'item_error'; index: number; message: string }
  | { type: 'job_done'; successCount: number; errorCount: number }
  | { type: 'error'; message: string };

export interface BulkGsProcessResult {
  title: string;
  wordCount: number;
  humanness: number;
  sourcesCount: number;
  searchResult: SearchResult | null;
  html: string;
  metaDescription: string;
  slug: string;
  seoScore: number;
}
