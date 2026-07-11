import type { SourceItem } from './types';

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractTextFromHtml(html: string): { title: string; content: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch?.[1]?.trim() ?? '';
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text = h1Match?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
  const title = decodeEntities(rawTitle || h1Text || 'Không có tiêu đề');

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  const content = decodeEntities(cleaned.replace(/<[^>]+>/g, ' ')).slice(0, 8000);
  return { title, content };
}

function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((word) => word.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((word) => word.length > 3));
  const intersection = [...words1].filter((word) => words2.has(word)).length;
  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

async function crawlSingleUrl(url: string): Promise<{ title: string; content: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0; +https://noithatminhquan.vn)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { title: '', content: '', error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return { title: '', content: '', error: 'URL không phải trang HTML' };
    }

    const html = await response.text();
    const { title, content } = extractTextFromHtml(html);
    if (!content || content.length < 100) {
      return { title, content: '', error: 'Không đọc được nội dung (< 100 ký tự)' };
    }

    return { title, content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể kết nối';
    return { title: '', content: '', error: message.slice(0, 100) };
  }
}

export async function crawlUrls(urls: string[]): Promise<SourceItem[]> {
  const results = await Promise.all(urls.map((url) => crawlSingleUrl(url)));

  const sources: SourceItem[] = results.map((result, index) => ({
    url: urls[index],
    title: result.title,
    content: result.content,
    wordCount: result.content.split(/\s+/).filter(Boolean).length,
    isUnique: true,
    isManual: false,
    error: result.error,
  }));

  for (let index = 1; index < sources.length; index += 1) {
    if (sources[index].error) continue;
    for (let compareIndex = 0; compareIndex < index; compareIndex += 1) {
      if (sources[compareIndex].error) continue;
      const similarity = jaccardSimilarity(sources[index].content, sources[compareIndex].content);
      if (similarity > 0.5) {
        sources[index].isUnique = false;
        break;
      }
    }
  }

  return sources;
}
