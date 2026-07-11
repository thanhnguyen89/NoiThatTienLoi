import { slugify, stripHtml, stripVietnamese } from './text';
import type { TinhGonInternalLinkSuggestion } from './types';

export interface InternalLinkArticleCandidate {
  title: string;
  slug: string;
  keyword?: string | null;
}

const STOP_WORDS = new Set([
  'la',
  'va',
  'voi',
  'cho',
  'cua',
  'nhung',
  'nhung',
  'mot',
  'cac',
  'tu',
  'den',
  'tai',
  'hay',
  'khi',
  'nao',
  'sao',
]);

function tokenize(value: string): string[] {
  return stripVietnamese(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function overlapScore(a: string[], b: string[]): number {
  const set = new Set(a);
  return b.filter((item) => set.has(item)).length;
}

export function rankInternalLinks(params: {
  keyword: string;
  html?: string;
  articles: InternalLinkArticleCandidate[];
  limit?: number;
  baseUrl?: string;
}): TinhGonInternalLinkSuggestion[] {
  const { keyword, html = '', articles, limit = 5, baseUrl = process.env.SITE_URL || 'https://noithatminhquan.com' } = params;
  const normalizedKeyword = slugify(keyword);
  const articleHtml = stripVietnamese(stripHtml(html)).toLowerCase();
  const keywordTokens = tokenize(keyword);

  return articles
    .filter((article) => article.slug)
    .filter((article) => !articleHtml.includes(article.slug.toLowerCase()))
    .filter((article) => slugify(article.keyword || article.title) !== normalizedKeyword)
    .map((article) => {
      const titleTokens = tokenize(article.title);
      const keywordValueTokens = tokenize(article.keyword || '');
      const totalOverlap = overlapScore(keywordTokens, [...titleTokens, ...keywordValueTokens]);
      const titleExactBoost = slugify(article.title).includes(normalizedKeyword) ? 10 : 0;
      const keywordBoost = slugify(article.keyword || '').includes(normalizedKeyword) ? 8 : 0;
      const score = Math.min(99, 25 + totalOverlap * 15 + titleExactBoost + keywordBoost);

      return {
        title: article.title,
        slug: article.slug,
        keyword: article.keyword,
        relevance: score,
        suggestText: `Xem thêm: ${article.title}`,
        url: `${baseUrl.replace(/\/$/, '')}/${article.slug.replace(/^\//, '')}`,
      };
    })
    .filter((item) => item.relevance >= 40)
    .sort((a, b) => b.relevance - a.relevance || a.title.localeCompare(b.title))
    .slice(0, limit);
}
