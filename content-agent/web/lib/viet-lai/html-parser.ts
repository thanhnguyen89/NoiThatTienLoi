import type { ArticleSection } from './types';

export function extractSectionsByHeading(html: string): ArticleSection[] {
  const normalized = html.replace(/>\s+</g, '><').trim();
  const headingRegex = /<(h[1-4])([^>]*)>([\s\S]*?)<\/h[1-4]>/gi;

  const matches: Array<{
    index: number;
    endIndex: number;
    level: 'h1' | 'h2' | 'h3' | 'h4';
    fullHtml: string;
    innerHtml: string;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(normalized)) !== null) {
    matches.push({
      index: match.index,
      endIndex: match.index + match[0].length,
      level: match[1].toLowerCase() as 'h1' | 'h2' | 'h3' | 'h4',
      fullHtml: match[0],
      innerHtml: match[3],
    });
  }

  if (matches.length === 0) {
    return [{
      headingLevel: null,
      headingText: '',
      headingHtml: '',
      bodyHtml: normalized,
    }];
  }

  const sections: ArticleSection[] = [];
  const beforeFirst = normalized.slice(0, matches[0].index).trim();
  if (beforeFirst) {
    sections.push({
      headingLevel: null,
      headingText: '',
      headingHtml: '',
      bodyHtml: beforeFirst,
    });
  }

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const nextIndex = matches[index + 1]?.index ?? normalized.length;
    const bodyHtml = normalized.slice(current.endIndex, nextIndex).trim();
    const headingText = current.innerHtml.replace(/<[^>]+>/g, '').trim();

    sections.push({
      headingLevel: current.level,
      headingText,
      headingHtml: current.fullHtml,
      bodyHtml,
    });
  }

  return sections;
}

export function extractArticleTitle(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

export function countHtmlWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(Boolean).length;
}
