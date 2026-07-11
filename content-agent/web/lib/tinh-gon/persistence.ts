import { slugify, stripHtml } from './text';
import type { TinhGonConfig, TinhGonOutlineData, TinhGonOutlineType } from './types';

export type TinhGonStage = 'config' | 'outline' | 'generate';

export interface TinhGonArticleSnapshot {
  flow: 'tinh_gon';
  stage: TinhGonStage;
  config: TinhGonConfig;
  outline: TinhGonOutlineData | null;
  aiCheck?: unknown;
}

export function buildTinhGonContentType(outlineType: TinhGonOutlineType): string {
  return `tinh_gon:${outlineType}`;
}

export function createTinhGonRunId(keyword: string): string {
  const slug = slugify(keyword).slice(0, 40) || 'tinh-gon';
  return `${slug}-${Date.now()}`;
}

export function buildTinhGonSnapshot(params: {
  stage: TinhGonStage;
  config: TinhGonConfig;
  outline?: TinhGonOutlineData | null;
  aiCheck?: unknown;
}): string {
  return JSON.stringify({
    flow: 'tinh_gon',
    stage: params.stage,
    config: params.config,
    outline: params.outline ?? null,
    ...(params.aiCheck !== undefined ? { aiCheck: params.aiCheck } : {}),
  } satisfies TinhGonArticleSnapshot);
}

export function parseTinhGonSnapshot(raw: unknown): TinhGonArticleSnapshot | null {
  let parsed: unknown = raw;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const candidate = parsed as Partial<TinhGonArticleSnapshot>;
  if (candidate.flow !== 'tinh_gon' || !candidate.config) return null;

  return {
    flow: 'tinh_gon',
    stage:
      candidate.stage === 'config' || candidate.stage === 'outline' || candidate.stage === 'generate'
        ? candidate.stage
        : 'config',
    config: candidate.config,
    outline: candidate.outline ?? null,
    ...(candidate.aiCheck !== undefined ? { aiCheck: candidate.aiCheck } : {}),
  } as TinhGonArticleSnapshot;
}

export function buildPlainTextFromHtml(html: string): string {
  return stripHtml(html);
}
