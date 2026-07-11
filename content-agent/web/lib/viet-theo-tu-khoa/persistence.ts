import { slugify } from '@/lib/tinh-gon/text';
import type { KeywordArticleConfig, KeywordOutlineSnapshot } from './types';

export function createKeywordRunId(keyword: string): string {
  const slug = slugify(keyword).slice(0, 40) || 'viet-theo-tu-khoa';
  return `${slug}-${Date.now()}`;
}

export function buildKeywordSnapshot(params: {
  stage: 'config' | 'generate';
  config: KeywordArticleConfig;
  aiCheck?: unknown;
}): string {
  const snapshot: KeywordOutlineSnapshot = {
    flow: 'viet_theo_tu_khoa',
    stage: params.stage,
    config: params.config,
    ...(params.aiCheck !== undefined ? { aiCheck: params.aiCheck } : {}),
  };

  return JSON.stringify(snapshot);
}

export function parseKeywordSnapshot(raw: unknown): KeywordOutlineSnapshot | null {
  let parsed: unknown = raw;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Partial<KeywordOutlineSnapshot>;
  if (candidate.flow !== 'viet_theo_tu_khoa' || !candidate.config) return null;

  return {
    flow: 'viet_theo_tu_khoa',
    stage: candidate.stage === 'generate' ? 'generate' : 'config',
    config: candidate.config,
    ...(candidate.aiCheck !== undefined ? { aiCheck: candidate.aiCheck } : {}),
  };
}
