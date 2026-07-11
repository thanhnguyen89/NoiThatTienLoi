import type { BrandSectionState } from '@/components/BrandSection';
import type { AutoBoldOption, ImageOption } from '@/lib/shared/options';
import type { TinhGonDecision } from '@/lib/tinh-gon/types';

export type ContentType =
  | 'blog_seo'
  | 'how_to'
  | 'listicle'
  | 'comparison'
  | 'review'
  | 'pillar'
  | 'local_seo';

export type TopicalMapRole = 'hub' | 'spoke' | 'standalone';

export type DataSourceMode =
  | 'ai_only'
  | 'url_crawl'
  | 'manual_text'
  | 'google_search';

export type OutlineMode = 'no_outline' | 'user_outline' | 'ai_outline';

export type SearchIntent = 'informational' | 'navigational' | 'commercial' | 'transactional';

export interface VbtStep1State {
  keyword: string;
  secondaryKeywordsRaw: string;
  contentType: ContentType;
  topicalMapRole: TopicalMapRole;
  competitorUrls: string[];
  dataSourceMode: DataSourceMode;
  dataSourceUrls: string[];
  dataSourceText: string;
  language: string;
}

export interface SemanticAnalysis {
  macroContext: string;
  searchIntent: SearchIntent;
  intentExplanation: string;
  rppMap: Array<{
    pain: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  attributeMap: Array<{
    attribute: string;
    importance: 'must' | 'should' | 'nice_to_have';
  }>;
  semanticKeywords: string[];
  suggestedContentType: ContentType;
  estimatedWordCount: number;
  competitorInsights?: string;
}

export interface VbtStep3State {
  titleOptions: string[];
  selectedTitleIndex: number;
  customTitle: string;
  outlineMode: OutlineMode;
  userOutlineText: string;
  aiOutlineText: string;
  aiOutlineObjective: string;
  aiOutlineSize: string;
  imageOption: ImageOption;
  targetLength: number;
  tone: string;
  model: string;
  brand: BrandSectionState;
  seoMainLink: string;
  seoKeywordLinks: string;
  autoBold: AutoBoldOption;
  footerContent: string;
}

export interface VbtStartRequest extends VbtStep1State {
  title: string;
  outline: string;
  secondaryKeywords: string[];
  semantic: SemanticAnalysis | null;
  step3: VbtStep3State;
}

export interface VbtArticleConfig {
  keyword: string;
  title: string;
  outline: string;
  contentType: ContentType;
  topicalMapRole: TopicalMapRole;
  secondaryKeywords: string[];
  competitorUrls: string[];
  dataSourceMode: DataSourceMode;
  dataSourceUrls: string[];
  dataSourceText: string;
  language: string;
  semantic: SemanticAnalysis | null;
  step3: VbtStep3State;
  articleId: string;
  runId: string;
}

export interface VbtStreamResult {
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
  semanticScore?: number;
  semanticDecision?: 'OK' | 'NEEDS_FIX' | 'FAIL';
  issues: string[];
  forbiddenFound: string[];
}
