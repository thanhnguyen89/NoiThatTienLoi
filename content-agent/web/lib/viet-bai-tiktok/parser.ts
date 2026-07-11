import type { TiktokParsedOutput } from './types';

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripEmoji(text: string): string {
  return text
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTag(tag: string): string {
  const clean = tag
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}_]/gu, '')
    .trim();
  return clean ? `#${clean}` : '';
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags.map(normalizeTag).filter(Boolean)) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }

  return result;
}

function extractHashtags(text: string): string[] {
  return uniqueTags(text.match(/#[\p{L}\p{N}_-]+/gu) || []);
}

function extractSection(text: string, labels: string[], stopLabels: string[]): string {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const stopPattern = stopLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${stopPattern})\\s*:|$)`, 'iu');
  return text.match(regex)?.[1]?.trim() || '';
}

function cleanCaption(text: string): string {
  return text
    .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, '')
    .replace(/^\s*(?:CAPTION|MÔ TẢ|MO TA|DESCRIPTION)\s*:\s*/gimu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fallbackTitle(caption: string): string {
  const firstLine = caption.split('\n').map((line) => line.trim()).find(Boolean) || caption;
  const firstSentence = firstLine.split(/[.!?…]/u)[0]?.trim() || firstLine;
  return firstSentence;
}

export function parseTiktokOutput(rawText: string): TiktokParsedOutput {
  const raw = stripMarkdown(rawText);
  const allStopLabels = ['TITLE', 'TIÊU ĐỀ', 'TIEU DE', 'CAPTION', 'MÔ TẢ', 'MO TA', 'DESCRIPTION', 'HASHTAGS', 'HASHTAG'];

  let title = extractSection(raw, ['TITLE', 'TIÊU ĐỀ', 'TIEU DE'], allStopLabels);
  let caption = extractSection(raw, ['CAPTION', 'MÔ TẢ', 'MO TA', 'DESCRIPTION'], allStopLabels);
  const hashtagSection = extractSection(raw, ['HASHTAGS', 'HASHTAG'], allStopLabels);
  const hashtags = uniqueTags([
    ...extractHashtags(hashtagSection),
    ...extractHashtags(raw),
  ]);

  if (!caption) {
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^(?:TITLE|TIÊU ĐỀ|TIEU DE|CAPTION|MÔ TẢ|MO TA|DESCRIPTION|HASHTAGS?)\s*:/iu.test(line));

    if (!title && lines.length > 1) {
      title = lines[0] || '';
      caption = lines.slice(1).join('\n');
    } else {
      caption = lines.join('\n');
    }
  }

  caption = cleanCaption(caption);
  if (!title) title = fallbackTitle(caption);
  title = stripEmoji(title.replace(/^["'“”]+|["'“”]+$/g, '')).slice(0, 50).trim();

  return {
    title,
    caption,
    hashtags,
  };
}
