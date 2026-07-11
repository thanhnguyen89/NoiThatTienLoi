import type { AutoBoldOption, ImageOption, SupportedLanguage } from '@/lib/shared/options';
import type { BrandSectionState } from '@/components/BrandSection';
import type { TinhGonBrandConfig, TinhGonDecision } from '@/lib/tinh-gon/types';

export type OutlineMode = 'no_outline' | 'user_outline' | 'ai_outline';
export type CrawlMode = 'auto' | 'search_only' | 'no_crawl';

export interface VtgsSeoAdvancedState {
  mainLink: string;
  keywordLinks: string;
  autoBold: AutoBoldOption;
  footerContent: string;
  customSlug: string;
  noIndex: boolean;
  focusKeyphrase: string;
  enableFeaturedSnippet: boolean;
}

export interface VtgsConfig {
  keyword: string;
  secondaryKeywords: string[];
  imageOption: ImageOption;
  language: SupportedLanguage | string;
  outlineMode: OutlineMode;
  targetLength: number;
  userOutlineText: string;
  aiOutlineObjective: string;
  aiOutlineSize: string;
  editedOutline: string;
  tone: string;
  modelId: string;
  brand: BrandSectionState;
  brandConfig?: TinhGonBrandConfig;
  seoAdvanced: VtgsSeoAdvancedState;
  searchResultCount: 3 | 5 | 10;
  crawlMode: CrawlMode;
  addFreshnessDate: boolean;
}

export interface SearchSource {
  url: string;
  title: string;
  snippet: string;
  content: string | null;
  crawled: boolean;
  wordCount: number;
}

export interface SearchResult {
  keyword: string;
  sources: SearchSource[];
  synthesis: string;
  relatedKeywords: string[];
  searchedAt: string;
}

export interface VtgsStreamResult {
  articleId: string;
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  slug: string;
  wordCount: number;
  seoScore: number;
  humannessScore: number;
  decision: TinhGonDecision;
  sources: SearchSource[];
}
