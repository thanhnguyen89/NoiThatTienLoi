import type { BulkKeywordItem } from './types';
import type { DuplicateMode } from './features';

export function parseBulkKeywordLine(line: string, pipeMode = false): BulkKeywordItem | null {
  const raw = line.trim();
  if (!raw) return null;

  if (pipeMode) {
    const pipeIndex = raw.indexOf('|');
    if (pipeIndex > 0) {
      const postTitle = raw.slice(0, pipeIndex).trim();
      const keyword = raw.slice(pipeIndex + 1).trim();
      if (!keyword) return null;
      return { keyword, postTitle, secondaryKeywords: [], raw };
    }
    return { keyword: raw, postTitle: '', secondaryKeywords: [], raw };
  }

  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  const keyword = parts[0] ?? '';
  if (!keyword) return null;
  return {
    keyword,
    secondaryKeywords: parts.slice(1, 11),
    raw,
  };
}

export function parseBulkKeywords(
  rawText: string,
  options: {
    duplicateMode: DuplicateMode;
    maxKeywords: number;
    pipeMode?: boolean;
  },
): { items: BulkKeywordItem[]; skippedCount: number; overLimitCount: number } {
  const parsed = rawText
    .split('\n')
    .map((line) => parseBulkKeywordLine(line, Boolean(options.pipeMode)))
    .filter((item): item is BulkKeywordItem => Boolean(item));

  const result: BulkKeywordItem[] = [];
  const seen = new Set<string>();
  let skippedCount = 0;

  for (const item of parsed) {
    const key = item.keyword.toLowerCase();
    if (options.duplicateMode === 'reject' && seen.has(key)) {
      skippedCount += 1;
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  const overLimitCount = Math.max(0, result.length - options.maxKeywords);
  return {
    items: result.slice(0, options.maxKeywords),
    skippedCount,
    overLimitCount,
  };
}

export function estimateBulkMinutes(itemCount: number, secondsPerItem: number): number {
  return Math.max(1, Math.ceil((itemCount * secondsPerItem) / 60));
}
