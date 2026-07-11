import type { GoogleSearchData, GoogleSearchItem } from './types';
import { crawlUrl } from './extract';

export async function fetchGoogleSearchData(
  keyword: string,
  options: { num?: number; crawl?: boolean; language?: string } = {},
): Promise<GoogleSearchData | null> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    console.warn('[google-search] GOOGLE_SEARCH_API_KEY hoặc GOOGLE_SEARCH_CX chưa cấu hình — skip');
    return null;
  }

  const num = Math.min(options.num ?? 5, 10);
  const shouldCrawl = options.crawl !== false;
  const langCode = options.language === 'Vietnamese' ? 'vi' : 'en';

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: keyword,
      num: String(num),
      lr: `lang_${langCode}`,
      gl: langCode === 'vi' ? 'vn' : 'us',
    });

    const apiUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    console.log(`[google-search] Searching: "${keyword}" lang=${langCode}`);

    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 429) {
      console.warn('[google-search] Quota exceeded (429) — skip Google Search');
      return null;
    }

    if (!response.ok) {
      console.error(`[google-search] API error ${response.status}`);
      return null;
    }

    const payload = await response.json() as {
      searchInformation?: { totalResults?: string };
      items?: Array<{ title?: string; link?: string; snippet?: string }>;
    };

    const rawItems = payload.items ?? [];
    console.log(`[google-search] Got ${rawItems.length} results`);

    const items: GoogleSearchItem[] = await Promise.all(
      rawItems.slice(0, num).map(async (item) => {
        const link = item.link ?? '';
        const extractedText = shouldCrawl && link ? await crawlUrl(link) : undefined;

        return {
          title: item.title ?? '',
          link,
          snippet: item.snippet ?? '',
          extractedText: extractedText || undefined,
        };
      }),
    );

    return {
      keyword,
      totalResults: payload.searchInformation?.totalResults ?? '0',
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[google-search] Fetch error:', error);
    return null;
  }
}
