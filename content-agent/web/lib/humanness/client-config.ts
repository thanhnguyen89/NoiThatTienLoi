import type { AIConfigData } from './types';

const EMPTY_CONFIG: AIConfigData = {
  FORBIDDEN_WORDS: [],
  CLICHE_OPENINGS: [],
};

let cachedConfig: AIConfigData | null = null;
let inflightConfig: Promise<AIConfigData> | null = null;

function normalizeConfig(input: unknown): AIConfigData {
  if (!input || typeof input !== 'object') {
    return EMPTY_CONFIG;
  }

  const config = input as Partial<AIConfigData>;
  return {
    FORBIDDEN_WORDS: Array.isArray(config.FORBIDDEN_WORDS)
      ? config.FORBIDDEN_WORDS.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    CLICHE_OPENINGS: Array.isArray(config.CLICHE_OPENINGS)
      ? config.CLICHE_OPENINGS.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
  };
}

export async function loadAiConfig(forceRefresh = false): Promise<AIConfigData> {
  if (!forceRefresh && cachedConfig) {
    return cachedConfig;
  }

  if (!forceRefresh && inflightConfig) {
    return inflightConfig;
  }

  inflightConfig = fetch('/api/ai-config', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) {
        return EMPTY_CONFIG;
      }

      const json = await response.json() as { success?: boolean; data?: unknown };
      if (!json.success) {
        return EMPTY_CONFIG;
      }

      return normalizeConfig(json.data);
    })
    .catch(() => EMPTY_CONFIG)
    .finally(() => {
      inflightConfig = null;
    });

  cachedConfig = await inflightConfig;
  return cachedConfig;
}
