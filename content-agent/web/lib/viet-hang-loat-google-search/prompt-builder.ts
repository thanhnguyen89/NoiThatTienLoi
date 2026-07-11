import { buildSearchWritePrompt, buildOutlinePrompt } from '@/lib/viet-tu-google-search/prompt-builder';
import type { SearchResult, VtgsConfig } from '@/lib/viet-tu-google-search/types';

export function buildGoogleSearchWritePrompt(config: VtgsConfig, searchResult: SearchResult | null, finalOutline?: string): string {
  return buildSearchWritePrompt({ config, searchResult, finalOutline });
}

export function buildGoogleSearchOutlinePrompt(config: VtgsConfig, searchResult?: SearchResult | null): string {
  return buildOutlinePrompt(config, searchResult ?? null);
}
