export type TinhGonOutlineType =
  | 'review_product'
  | 'how_to_choose'
  | 'compare'
  | 'faq'
  | 'listicle'
  | 'problem_solution'
  | 'step_guide'
  | 'story_brand'
  | 'use_case'
  | 'buying_guide';

export type TinhGonModelId =
  | 'gemini-flash'
  | 'gemini-pro'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'grok'
  | 'claude';

export type TinhGonDataSource = 'ai_only' | 'google_search';

export type TinhGonDecision = 'PUBLISH' | 'REVIEW' | 'REWRITE';

export type TinhGonEditCommand =
  | 'shorten'
  | 'expand'
  | 'humanize'
  | 'more_spec'
  | 'stronger_cta'
  | 'rewrite';

export interface TinhGonBrandConfig {
  name?: string;
  pronouns?: string;
  audience?: string;
  forbiddenExtra?: string;
  toneNotes?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  priceRange?: string;
}

export interface TinhGonConfig {
  keyword: string;
  outlineType: TinhGonOutlineType;
  language: string;
  model: string;
  targetLength: number;
  secondaryKeywords: string[];
  notes: string;
  dataSource?: TinhGonDataSource;
  brandConfig?: TinhGonBrandConfig;
}

export interface TinhGonOutlineSection {
  id: string;
  heading: string;
  notes: string;
  targetWords: number;
}

export interface TinhGonOutlineData {
  titleOptions: string[];
  selectedTitle: string;
  sections: TinhGonOutlineSection[];
  angle: string;
  searchIntent: string;
  contentGaps: string[];
  estimatedWords: number;
  userNotes: string;
}

export interface TinhGonHumannessMetrics {
  sentenceCount: number;
  averageSentenceLength: number;
  passiveVoiceHits: number;
  specificDataHits: number;
  repeatedStarterHits: number;
  uniformSentencePattern: boolean;
}

export interface TinhGonHumannessResult {
  score: number;
  decision: TinhGonDecision;
  issues: string[];
  forbiddenFound: string[];
  metrics: TinhGonHumannessMetrics;
  scoreBreakdown: {
    language_natural: number;
    structure: number;
    eeat_signals: number;
    engagement: number;
  };
}

export interface TinhGonStreamResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
}

export interface TinhGonStartResponse {
  articleId: string;
  runId: string;
  outline: TinhGonOutlineData;
  source: 'ai' | 'fallback';
  warning?: string;
}

export interface TinhGonInternalLinkSuggestion {
  title: string;
  slug: string;
  url: string;
  relevance: number;
  suggestText: string;
  keyword?: string | null;
}
