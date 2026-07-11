import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import type { CrawlMode, SearchResult, SearchSource } from '@/lib/viet-tu-google-search/types';

export const runtime = 'nodejs';

const schema = z.object({
  keyword: z.string().min(2),
  count: z.number().min(1).max(10).default(5),
  crawlMode: z.enum(['auto', 'search_only', 'no_crawl']).default('auto'),
  language: z.string().default('Vietnamese'),
});

interface RawSearchItem {
  title: string;
  link: string;
  snippet: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function searchWithSerpApi(keyword: string, count: number, language: string): Promise<RawSearchItem[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', keyword);
  url.searchParams.set('num', String(count));
  url.searchParams.set('hl', language === 'Vietnamese' ? 'vi' : 'en');
  url.searchParams.set('api_key', apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    throw new Error(`SerpAPI returned ${response.status}`);
  }

  const data = await response.json() as {
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return (data.organic_results || [])
    .filter((item) => item.link)
    .slice(0, count)
    .map((item) => ({
      title: item.title || item.link || '',
      link: item.link || '',
      snippet: item.snippet || '',
    }));
}

async function searchWithGoogleCse(keyword: string, count: number): Promise<RawSearchItem[]> {
  const apiKey = process.env.GOOGLE_CSE_KEY || process.env.GOOGLE_SEARCH_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID || process.env.GOOGLE_SEARCH_CX;
  if (!apiKey || !cseId) return [];

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cseId);
  url.searchParams.set('q', keyword);
  url.searchParams.set('num', String(Math.min(count, 10)));

  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    throw new Error(`Google CSE returned ${response.status}`);
  }

  const data = await response.json() as {
    items?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return (data.items || [])
    .filter((item) => item.link)
    .slice(0, count)
    .map((item) => ({
      title: item.title || item.link || '',
      link: item.link || '',
      snippet: item.snippet || '',
    }));
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0; +https://localhost)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi,en;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return '';
    const html = await response.text();
    return stripHtml(html).slice(0, 3500);
  } catch {
    return '';
  }
}

function synthesize(keyword: string, sources: SearchSource[], crawlMode: CrawlMode): string {
  if (!sources.length) {
    return `No search sources were found for "${keyword}". Use general SEO knowledge and avoid fresh claims.`;
  }

  const crawledCount = sources.filter((source) => source.crawled).length;
  const details = sources
    .map((source, index) => {
      const basis = source.content || source.snippet;
      return `${index + 1}. ${source.title}: ${basis.slice(0, 260)}`;
    })
    .join('\n');

  return [
    `Keyword: ${keyword}`,
    `Mode: ${crawlMode}. Sources: ${sources.length}. Crawled: ${crawledCount}.`,
    'Use these angles and facts as reference, but write an original article:',
    details,
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { keyword, count, crawlMode, language } = parsed.data;
    if (crawlMode === 'no_crawl') {
      const result: SearchResult = {
        keyword,
        sources: [],
        synthesis: synthesize(keyword, [], crawlMode),
        relatedKeywords: [],
        searchedAt: new Date().toISOString(),
      };
      return NextResponse.json(result);
    }

    let rawItems = await searchWithSerpApi(keyword, count, language);
    if (rawItems.length === 0) {
      rawItems = await searchWithGoogleCse(keyword, count);
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: 'No search provider configured. Add SERPAPI_KEY or GOOGLE_CSE_KEY/GOOGLE_SEARCH_API_KEY + GOOGLE_CSE_ID/GOOGLE_SEARCH_CX.' },
        { status: 503 },
      );
    }

    const sources = await Promise.all(
      rawItems.map(async (item) => {
        const content = crawlMode === 'auto' ? await fetchPageText(item.link) : '';
        const text = content || item.snippet;
        return {
          url: item.link,
          title: item.title,
          snippet: item.snippet,
          content: content || null,
          crawled: Boolean(content),
          wordCount: countWords(text),
        } satisfies SearchSource;
      }),
    );

    const result: SearchResult = {
      keyword,
      sources,
      synthesis: synthesize(keyword, sources, crawlMode),
      relatedKeywords: sources
        .flatMap((source) => source.title.split(/[|:-]/).map((part) => part.trim()))
        .filter((part) => part.length > 4)
        .slice(0, 8),
      searchedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
