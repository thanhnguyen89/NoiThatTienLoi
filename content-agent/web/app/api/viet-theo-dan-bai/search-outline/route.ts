import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { parseOutline } from '@/lib/viet-theo-dan-bai/outline-parser';

export const runtime = 'nodejs';

const schema = z.object({
  keyword: z.string().min(1).max(200),
  language: z.string().default('Vietnamese'),
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

function extractHeadingsFromHtml(html: string, maxHeadings = 15): Array<{ level: 'h2' | 'h3'; text: string }> {
  const allMatches: Array<{ index: number; level: 'h2' | 'h3'; text: string }> = [];

  for (const [level, regex] of [
    ['h2', /<h2[^>]*>([\s\S]*?)<\/h2>/gi],
    ['h3', /<h3[^>]*>([\s\S]*?)<\/h3>/gi],
  ] as const) {
    for (const match of html.matchAll(regex)) {
      const text = decodeEntities(match[1].replace(/<[^>]+>/g, ' '));
      if (text.length > 3 && text.length < 200) {
        allMatches.push({ index: match.index ?? 0, level, text });
      }
    }
  }

  return allMatches
    .sort((a, b) => a.index - b.index)
    .slice(0, maxHeadings)
    .map(({ level, text }) => ({ level, text }));
}

async function crawlHeadings(url: string): Promise<Array<{ level: 'h2' | 'h3'; text: string }>> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const html = await response.text();
    return extractHeadingsFromHtml(html);
  } catch {
    return [];
  }
}

async function fetchTopUrls(keyword: string, language: string, num = 5): Promise<Array<{ title: string; url: string }>> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    throw new Error('Google Search chưa được cấu hình hoặc không trả kết quả. Kiểm tra GOOGLE_SEARCH_API_KEY và GOOGLE_SEARCH_CX trong .env.local.');
  }

  const langCode = language === 'Vietnamese' ? 'vi' : 'en';
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: keyword,
    num: String(Math.min(num, 10)),
    lr: `lang_${langCode}`,
    gl: langCode === 'vi' ? 'vn' : 'us',
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 429) {
    throw new Error('Google Search quota vượt giới hạn 100 truy vấn/ngày.');
  }
  if (!res.ok) {
    throw new Error(`Google Search API lỗi ${res.status}`);
  }

  const payload = await res.json() as {
    items?: Array<{ title?: string; link?: string }>;
  };

  return (payload.items ?? [])
    .filter((item) => item.link)
    .map((item) => ({ title: item.title ?? item.link!, url: item.link! }));
}

async function synthesizeOutline(
  keyword: string,
  language: string,
  sources: Array<{ title: string; headings: Array<{ level: 'h2' | 'h3'; text: string }> }>,
): Promise<string> {
  const sourcesText = sources
    .map((source, index) => {
      if (source.headings.length === 0) return null;
      const headingLines = source.headings.map((heading) => `  [${heading.level}] ${heading.text}`).join('\n');
      return `### Nguồn ${index + 1}: ${source.title}\n${headingLines}`;
    })
    .filter(Boolean)
    .join('\n\n');

  if (!sourcesText) {
    throw new Error('Không có heading nào thu được từ SERP.');
  }

  const prompt = `
Bạn là SEO analyst. Từ các heading thu thập được từ top SERP cho keyword "${keyword}", hãy tổng hợp thành 1 dàn bài chuẩn.

## Headings từ top ${sources.length} trang SERP:
${sourcesText}

## Yêu cầu dàn bài output:
- 6–10 heading tổng cộng (mix h2 và h3)
- Ngôn ngữ: ${language}
- Bao phủ các góc độ quan trọng nhất từ nhiều nguồn
- Loại bỏ heading trùng lặp hoặc quá chung chung
- Thêm angle chưa ai cover nếu phù hợp
- Format: mỗi dòng bắt đầu bằng [h2] hoặc [h3]
- Chỉ trả danh sách heading, không thêm giải thích

Ví dụ format:
[h2] So sánh giường sắt 1m2 và 1m4: nên chọn loại nào?
[h3] Phù hợp phòng dưới 12m2
[h3] Chi phí chênh lệch thực tế
[h2] Khung 1.4mm có thực sự bền hơn 1.2mm không?
`.trim();

  const model = buildTinhGonModel('gemini-flash');
  const result = await model.generateContent(prompt);
  let outline = result.response.text().trim();

  if (!/\[h[23]\]/i.test(outline)) {
    outline = outline
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `[h2] ${line.replace(/^[-*•]\s*/, '')}`)
      .join('\n');
  }

  return outline;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { keyword, language } = parsed.data;
    const topUrls = await fetchTopUrls(keyword, language, 5);
    if (topUrls.length === 0) {
      return NextResponse.json(
        { error: 'Google Search chưa được cấu hình hoặc không trả kết quả. Kiểm tra GOOGLE_SEARCH_API_KEY và GOOGLE_SEARCH_CX trong .env.local.' },
        { status: 503 },
      );
    }

    const headingResults = await Promise.all(
      topUrls.map(async ({ title, url }) => ({
        title,
        url,
        headings: await crawlHeadings(url),
      })),
    );

    const validSources = headingResults.filter((source) => source.headings.length > 0);
    const outline = await synthesizeOutline(keyword, language, validSources);
    const headings = parseOutline(outline);

    return NextResponse.json({
      outline,
      headings,
      sources: validSources.map(({ title, url, headings: extractedHeadings }) => ({
        title,
        url,
        headingCount: extractedHeadings.length,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể lấy dữ liệu từ Search';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
