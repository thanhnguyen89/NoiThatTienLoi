import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const schema = z.object({
  url: z.string().url(),
});

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractHeadingsFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0)',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const headings: string[] = [];
  const allMatches: Array<{ index: number; level: 'h2' | 'h3'; text: string }> = [];

  for (const match of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)) {
    const text = decodeEntities(match[1].replace(/<[^>]+>/g, ' '));
    if (text.length > 3 && text.length < 200) {
      allMatches.push({ index: match.index ?? 0, level: 'h2', text });
    }
  }

  for (const match of html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)) {
    const text = decodeEntities(match[1].replace(/<[^>]+>/g, ' '));
    if (text.length > 3 && text.length < 200) {
      allMatches.push({ index: match.index ?? 0, level: 'h3', text });
    }
  }

  allMatches.sort((a, b) => a.index - b.index);

  for (const item of allMatches.slice(0, 20)) {
    headings.push(`[${item.level}] ${item.text}`);
  }

  if (headings.length === 0) {
    throw new Error('Không tìm thấy heading nào trên trang này.');
  }

  return headings.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 });
    }

    const outline = await extractHeadingsFromUrl(parsed.data.url);
    return NextResponse.json({ outline });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể crawl URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
