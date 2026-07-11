import { fetchGoogleSearchData } from '@/lib/google-search/search';
import type { SearchResult } from '@/lib/viet-tu-google-search/types';

export async function searchAndCrawl(
  keyword: string,
  options: { searchResultCount: 3 | 5 | 10; crawlMode: 'auto' | 'search_only' | 'no_crawl'; language: string },
): Promise<SearchResult> {
  const data = await fetchGoogleSearchData(keyword, {
    num: options.searchResultCount,
    crawl: options.crawlMode === 'auto',
    language: options.language,
  });

  if (!data) {
    return {
      keyword,
      sources: [],
      synthesis: `No live Google Search context for "${keyword}". Write from evergreen knowledge and avoid unverifiable claims.`,
      relatedKeywords: [],
      searchedAt: new Date().toISOString(),
    };
  }

  return {
    keyword: data.keyword,
    sources: data.items.map((item) => ({
      url: item.link,
      title: item.title,
      snippet: item.snippet,
      content: item.extractedText ?? null,
      crawled: Boolean(item.extractedText),
      wordCount: item.extractedText ? item.extractedText.split(/\s+/).filter(Boolean).length : 0,
    })),
    synthesis: data.items
      .slice(0, 5)
      .map((item, index) => `${index + 1}. ${item.title}: ${item.snippet}`)
      .join('\n'),
    relatedKeywords: [],
    searchedAt: data.fetchedAt,
  };
}
