export interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  extractedText?: string;
}

export interface GoogleSearchData {
  keyword: string;
  totalResults: string;
  items: GoogleSearchItem[];
  fetchedAt: string;
}

export type GoogleSearchDataSourceMode = 'ai_only' | 'google_search';
