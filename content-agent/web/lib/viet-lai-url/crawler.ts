export interface CrawledUrlData {
  title: string;
  headings: string;
  content: string;
  warning?: string;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#\d+;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).trim();
}

function extractTitle(html: string): string {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = stripTags(h1Match?.[1] ?? '');
  if (h1) return h1.slice(0, 200);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripTags(titleMatch?.[1] ?? '').slice(0, 200);
}

function extractHeadingsList(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  const lines: string[] = [];
  const headingRegex = /<(h[2-4])[^>]*>([\s\S]*?)<\/h[2-4]>/gi;

  for (const match of cleaned.matchAll(headingRegex)) {
    const level = match[1].toLowerCase();
    const text = stripTags(match[2] ?? '');
    if (!text || text.length < 2) continue;
    const indent = level === 'h2' ? '' : level === 'h3' ? '  ' : '    ';
    lines.push(`${indent}${text}`);
  }

  return lines.join('\n');
}

function extractBodyText(html: string): string {
  let text = html
    .replace(/<(script|style|noscript|nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<main[^>]*>/gi, ' ')
    .replace(/<\/main>/gi, ' ')
    .replace(/<article[^>]*>/gi, ' ')
    .replace(/<\/article>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  text = decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length > 6000) {
    return `${text.slice(0, 6000)}...[nội dung bị cắt để tối ưu prompt]`;
  }

  return text;
}

export async function crawlUrlWithHeadings(url: string): Promise<CrawledUrlData> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL phải dùng http hoặc https');
    }
  } catch {
    throw new Error('URL không hợp lệ');
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0; +https://noithatminhquan.vn)',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`URL trả về lỗi ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error('URL không phải trang HTML');
  }

  const html = await response.text();
  const title = extractTitle(html);
  const headings = extractHeadingsList(html);
  const content = extractBodyText(html);

  let warning: string | undefined;
  if (!headings) warning = 'Không trích được heading rõ ràng, AI sẽ tự tổ chức lại cấu trúc.';
  if (!content) warning = warning || 'Không trích được nhiều nội dung từ URL, AI sẽ suy luận nhiều hơn.';

  return {
    title,
    headings,
    content,
    warning,
  };
}
