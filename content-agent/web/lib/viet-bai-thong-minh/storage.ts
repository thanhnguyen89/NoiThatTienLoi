export const VBT_STORAGE_KEYS = {
  step1: 'vbt_step1',
  semantic: 'vbt_semantic',
  step3: 'vbt_step3',
  runId: 'vbt_runId',
  brand: 'vbt_brand_info',
} as const;

export type VbtStorageKey = keyof typeof VBT_STORAGE_KEYS;

const SESSION_KEYS: VbtStorageKey[] = ['step1', 'semantic', 'step3', 'runId'];

function storageFor(key: VbtStorageKey): Storage | null {
  if (typeof window === 'undefined') return null;
  return key === 'brand' ? window.localStorage : window.sessionStorage;
}

export function readVbtStorage(key: VbtStorageKey): string | null {
  return storageFor(key)?.getItem(VBT_STORAGE_KEYS[key]) ?? null;
}

export function writeVbtStorage(key: VbtStorageKey, value: string): void {
  storageFor(key)?.setItem(VBT_STORAGE_KEYS[key], value);
}

export function removeVbtStorage(key: VbtStorageKey): void {
  storageFor(key)?.removeItem(VBT_STORAGE_KEYS[key]);
}

export function clearVbtWorkflowStorage(): void {
  SESSION_KEYS.forEach(removeVbtStorage);
}

export function parseStoredJson<T>(key: VbtStorageKey): T | null {
  const raw = readVbtStorage(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    removeVbtStorage(key);
    return null;
  }
}
