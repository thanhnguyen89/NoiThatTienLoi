export function readSessionAICheckState(storageKey?: string): unknown | null {
  if (!storageKey || typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}

export function writeSessionAICheckState(storageKey: string | undefined, state: unknown): void {
  if (!storageKey || typeof window === 'undefined') return;

  try {
    if (state === null || state === undefined) {
      sessionStorage.removeItem(storageKey);
      return;
    }

    sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore persistence issues
  }
}
