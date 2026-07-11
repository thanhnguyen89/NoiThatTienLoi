export const REVIEW_SESSION_KEYS = {
  config: 'vdg_config',
  articleId: 'vdg_article_id',
  runId: 'vdg_run_id',
  result: 'vdg_result',
  brandInfo: 'vdg_brand_info',
} as const;

const LEGACY_REVIEW_SESSION_KEYS = {
  config: 'pr_config',
  articleId: 'pr_article_id',
  runId: 'pr_run_id',
  result: 'pr_result',
  brandInfo: 'pr_brand_info',
} as const;

type ReviewSessionKey = keyof typeof REVIEW_SESSION_KEYS;

export function getReviewSessionKey(key: ReviewSessionKey): string {
  return REVIEW_SESSION_KEYS[key];
}

export function readReviewSession(key: ReviewSessionKey): string | null {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem(REVIEW_SESSION_KEYS[key]) ??
    sessionStorage.getItem(LEGACY_REVIEW_SESSION_KEYS[key])
  );
}

export function writeReviewSession(key: ReviewSessionKey, value: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(REVIEW_SESSION_KEYS[key], value);
  sessionStorage.setItem(LEGACY_REVIEW_SESSION_KEYS[key], value);
}

export function removeReviewSession(key: ReviewSessionKey): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(REVIEW_SESSION_KEYS[key]);
  sessionStorage.removeItem(LEGACY_REVIEW_SESSION_KEYS[key]);
}

export function clearReviewWorkflowSession(): void {
  (Object.keys(REVIEW_SESSION_KEYS) as ReviewSessionKey[]).forEach(removeReviewSession);
}

export function readReviewBrandInfo(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(REVIEW_SESSION_KEYS.brandInfo) ??
    localStorage.getItem(LEGACY_REVIEW_SESSION_KEYS.brandInfo)
  );
}

export function writeReviewBrandInfo(value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REVIEW_SESSION_KEYS.brandInfo, value);
  localStorage.setItem(LEGACY_REVIEW_SESSION_KEYS.brandInfo, value);
}

export function removeReviewBrandInfo(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REVIEW_SESSION_KEYS.brandInfo);
  localStorage.removeItem(LEGACY_REVIEW_SESSION_KEYS.brandInfo);
}
