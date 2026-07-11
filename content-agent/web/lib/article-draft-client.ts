export interface DraftRef {
  articleId: string;
  runId: string;
}

function normalizeKey(key: string): string {
  return key.startsWith('draft:') ? key : `draft:${key}`;
}

export function loadDraftRef(key: string): DraftRef | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(normalizeKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftRef>;
    if (!parsed.articleId || !parsed.runId) return null;
    return { articleId: parsed.articleId, runId: parsed.runId };
  } catch {
    return null;
  }
}

export function saveDraftRef(key: string, value: DraftRef): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(normalizeKey(key), JSON.stringify(value));
}

export function clearDraftRef(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(normalizeKey(key));
}

export const readDraftRef = loadDraftRef;
export const persistDraftRef = saveDraftRef;
export const removeDraftRef = clearDraftRef;

interface UpsertArticleDraftInput {
  draftRef: DraftRef | null;
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
  aiProvider: string;
  brandConfig?: unknown;
  selectedTitle: string;
  userNotes?: string | null;
  secondaryKeywords?: string[];
  competitorUrls?: string[];
  outline?: unknown;
  status?: string;
  htmlContent?: string;
  metaDescription?: string;
}

export async function upsertArticleDraft(input: UpsertArticleDraftInput): Promise<DraftRef> {
  const response = await fetch('/api/articles/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articleId: input.draftRef?.articleId,
      draft: {
        feature: input.contentType,
        keyword: input.keyword,
        language: input.language,
        contentType: input.contentType,
        targetLength: input.targetLength,
        aiProvider: input.aiProvider,
        brandConfig: input.brandConfig,
        selectedTitle: input.selectedTitle,
        userNotes: input.userNotes ?? null,
        secondaryKeywords: input.secondaryKeywords ?? [],
        competitorUrls: input.competitorUrls ?? [],
        outline: input.outline,
      },
    }),
  });

  const payload = await response.json() as { articleId?: string; runId?: string; error?: string };
  if (!response.ok || !payload.articleId || !payload.runId) {
    throw new Error(payload.error || 'Không thể lưu draft');
  }

  return {
    articleId: payload.articleId,
    runId: payload.runId,
  };
}
