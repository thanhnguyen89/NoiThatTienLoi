import { Prisma } from '@prisma/client';

type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike | undefined };

function toJsonValue(value: JsonLike | undefined): Prisma.InputJsonValue | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toJsonValue(item))
      .filter((item): item is Prisma.InputJsonValue | null => item !== undefined);
  }

  const next: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = toJsonValue(item);
    if (normalized !== undefined) {
      next[key] = normalized;
    }
  }
  return next;
}

export function buildArticleMeta(
  flow: string,
  details: Record<string, JsonLike | undefined> = {},
): Prisma.InputJsonValue {
  const normalized = toJsonValue({
    flow,
    startedAt: new Date().toISOString(),
    ...details,
  });

  return normalized === null || normalized === undefined ? {} : normalized;
}
