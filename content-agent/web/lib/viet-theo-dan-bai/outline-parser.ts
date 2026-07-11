import type { ParsedHeading } from './types';

export function parseOutline(rawOutline: string): ParsedHeading[] {
  if (!rawOutline.trim()) return [];

  const lines = rawOutline
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const headings: ParsedHeading[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const tagMatch = trimmed.match(/^\[(h[23])\]\s*(.+)/i);
    if (tagMatch) {
      const text = tagMatch[2]
        .replace(/\[\/h[23]\]\s*$/i, '')
        .trim();
      if (!text) continue;

      headings.push({
        level: tagMatch[1].toLowerCase() as 'h2' | 'h3',
        text,
      });
      continue;
    }

    const text = trimmed.replace(/^[-*•]\s*/, '').trim();
    if (!text) continue;

    const isIndented = line !== trimmed && /^\s+/.test(line);
    headings.push({
      level: isIndented ? 'h3' : 'h2',
      text,
    });
  }

  return headings;
}

export function validateOutline(headings: ParsedHeading[]): string | null {
  if (headings.length < 2) return 'Dàn bài cần ít nhất 2 heading.';
  if (headings.length > 30) return 'Dàn bài quá dài (tối đa 30 heading).';
  return null;
}

export function renderOutlineForPrompt(headings: ParsedHeading[]): string {
  return headings
    .map((heading) => {
      const indent = heading.level === 'h3' ? '  ' : '';
      return `${indent}[${heading.level.toUpperCase()}] ${heading.text}`;
    })
    .join('\n');
}
