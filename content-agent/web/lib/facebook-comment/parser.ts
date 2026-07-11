function cleanCommentLine(line: string): string {
  return line
    .replace(/^\s*(?:[-*]|\u2022|[\d]+[.):\-])\s*/, '')
    .replace(/^Comment\s+\d+\s*[:.]?\s*/i, '')
    .replace(/^\s*["']+|["']+\s*$/g, '')
    .trim();
}

export function parseCommentList(rawOutput: string, expectedCount?: number): string[] {
  const trimmed = rawOutput.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const items = parsed
          .map((item) => (typeof item === 'string' ? cleanCommentLine(item) : ''))
          .filter(Boolean);
        return expectedCount ? items.slice(0, expectedCount) : items;
      }
    } catch {
      // fall through to line parser
    }
  }

  const lines = rawOutput
    .replace(/\r/g, '')
    .split('\n')
    .map(cleanCommentLine)
    .filter(Boolean)
    .filter((line) => !/^```/.test(line))
    .filter((line) => !/^(comments?|output|result|danh sach|ket qua|danh sach comment|here are|duoi day la)\b/i.test(line));

  const seen = new Set<string>();
  const comments: string[] = [];

  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    comments.push(line);
    if (expectedCount && comments.length >= expectedCount) break;
  }

  if (comments.length > 0) return comments;

  const fallback = rawOutput
    .split(/\n{2,}/)
    .map(cleanCommentLine)
    .filter(Boolean);

  return expectedCount ? fallback.slice(0, expectedCount) : fallback;
}

export function joinComments(comments: string[]): string {
  return comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n');
}

export function joinPlainComments(comments: string[], separator = '\n\n'): string {
  return comments.join(separator);
}
