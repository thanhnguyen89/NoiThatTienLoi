import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildGeminiModel } from '../_gemini';
import { prisma } from '@/lib/prisma';
import { buildArticleMeta } from '@/lib/shared/article-meta';
import { requireAuth } from '@/lib/server-auth';
import type { GenerateContentResult } from '@google/generative-ai';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StartRequest {
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
  provider?: string;
  manualCompetitorUrls?: string[];  // URL đối thủ user tự nhập
}

// Domains bị chặn hoặc không phù hợp để crawl
const BLOCKED_DOMAINS = [
  'facebook.com', 'youtube.com', 'twitter.com', 'instagram.com',
  'tiktok.com', 'zalo.me', 'shopee.vn', 'lazada.vn', 'tiki.vn',
  'sendo.vn', 'wikipedia.org', 'google.com', 'duckduckgo.com',
];

// ─── Competitor Crawling ──────────────────────────────────────────────────────

async function searchCompetitorUrls(keyword: string): Promise<string[]> {
  const urls: string[] = [];

  try {
    // DuckDuckGo HTML (không cần JS, hoạt động server-side)
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const html = await res.text();
      // DDG trả về link dạng /l/?uddg=URL_ENCODED hoặc href="https://..."
      const uddgMatches = [...html.matchAll(/uddg=([^"&\s]+)/g)];
      for (const match of uddgMatches) {
        try {
          const decoded = decodeURIComponent(match[1]);
          if (!decoded.startsWith('http')) continue;
          const domain = new URL(decoded).hostname.replace('www.', '');
          if (BLOCKED_DOMAINS.some((d) => domain.includes(d))) continue;
          if (!urls.includes(decoded)) urls.push(decoded);
          if (urls.length >= 7) break;
        } catch { /* skip */ }
      }

      // Thử pattern khác nếu ít kết quả
      if (urls.length < 3) {
        const hrefMatches = [...html.matchAll(/class="result__a"[^>]*href="([^"]+)"/g)];
        for (const match of hrefMatches) {
          try {
            const href = match[1];
            if (!href.startsWith('http')) continue;
            const domain = new URL(href).hostname.replace('www.', '');
            if (BLOCKED_DOMAINS.some((d) => domain.includes(d))) continue;
            if (!urls.includes(href)) urls.push(href);
            if (urls.length >= 7) break;
          } catch { /* skip */ }
        }
      }
    }
  } catch (err) {
    console.warn('[searchCompetitorUrls] DuckDuckGo fetch failed:', err instanceof Error ? err.message : err);
  }

  console.log(`[searchCompetitorUrls] Found ${urls.length} URLs for "${keyword}"`);
  return urls.slice(0, 5);
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2500);
  } catch {
    return '';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function analyzeCompetitorContent(model: any, keyword: string, urls: string[]): Promise<{ analysis: string; crawledUrls: string[] }> {
  if (!urls.length) return { analysis: '', crawledUrls: [] };

  console.log(`[analyzeCompetitorContent] Crawling ${urls.length} URLs...`);
  const results = await Promise.allSettled(
    urls.map(async (url) => ({ url, text: await fetchPageContent(url) }))
  );

  const valid = results
    .filter((r): r is PromiseFulfilledResult<{ url: string; text: string }> =>
      r.status === 'fulfilled' && r.value.text.length > 150
    )
    .map((r) => r.value);

  console.log(`[analyzeCompetitorContent] ${valid.length}/${urls.length} URLs crawled successfully`);
  if (!valid.length) return { analysis: '', crawledUrls: [] };

  const competitorText = valid
    .map((c, i) => `### Bài viết đối thủ ${i + 1}: ${c.url}\n${c.text}`)
    .join('\n\n---\n\n');

  const prompt = `Bạn là SEO Analyst chuyên nội thất Việt Nam.
Phân tích ${valid.length} bài viết đang rank top Google cho từ khóa: "${keyword}"

${competitorText}

Phân tích ngắn gọn (dưới 400 từ):
## 1. Cấu trúc phổ biến (H2 nào thường xuất hiện nhất)
## 2. Điểm mạnh của đối thủ (làm tốt gì)
## 3. Content Gap (Thiếu hoặc sơ sài — đây là cơ hội!)
## 4. Từ khóa phụ nổi bật
## 5. Chiến lược để bài mới vượt trội

Trả về plain text, không markdown code block.`;

  try {
    const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
    return { analysis: result.response.text(), crawledUrls: valid.map((v) => v.url) };
  } catch (err) {
    console.warn('[analyzeCompetitorContent] AI analysis failed:', err instanceof Error ? err.message : err);
    return { analysis: '', crawledUrls: valid.map((v) => v.url) };
  }
}


interface OutlineSection {
  heading: string;
  level: 'H2' | 'H3';
  notes: string;
}

interface OutlineData {
  suggestedTitles: string[];
  sections: OutlineSection[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  estimatedWords: number;
  angle: string;
  searchIntent: string;
  contentGaps: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createRunId(keyword: string): string {
  const slug = keyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return `${slug}-${Date.now()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildModel(provider: string): any {
  if (provider === 'gpt-4o' || provider === 'gpt-4o-mini') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY chưa được cấu hình trong .env.local');
    const client = new OpenAI({ apiKey });
    const modelName = provider === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';
    return {
      generateContent: async (prompt: string) => {
        const completion = await client.chat.completions.create({
          model: modelName, messages: [{ role: 'user', content: prompt }], temperature: 0.7,
        });
        return { response: { text: () => completion.choices[0]?.message?.content ?? '' } };
      },
    };
  }
  if (provider === 'grok') {
    const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    if (!apiKey) throw new Error('GROK_API_KEY chưa được cấu hình trong .env.local');
    const client = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
    return {
      generateContent: async (prompt: string) => {
        const completion = await client.chat.completions.create({
          model: 'grok-3', messages: [{ role: 'user', content: prompt }], temperature: 0.7,
        });
        return { response: { text: () => completion.choices[0]?.message?.content ?? '' } };
      },
    };
  }
  if (provider === 'claude') {
    throw new Error('Claude provider chưa được cấu hình — vui lòng thêm ANTHROPIC_API_KEY');
  }
  // Mặc định: Gemini
  return buildGeminiModel('flash');
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota');
      if (is429 && attempt < maxRetries) {
        const retryMatch = msg.match(/retry[^\d]*(\d+)/i);
        const waitMs = retryMatch ? parseInt(retryMatch[1]) * 1000 + 2000 : 25000 * (attempt + 1);
        console.warn(`[Gemini] 429 — đợi ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Hết số lần retry');
}

function extractJson(text: string): unknown {
  // Thử parse trực tiếp
  try { return JSON.parse(text); } catch { /* tiếp tục */ }
  // Trích từ markdown code block
  const block = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
  if (block) { try { return JSON.parse(block[1]); } catch { /* tiếp tục */ } }
  // Trích phần {...} đầu tiên
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch { /* tiếp tục */ } }
  return null;
}

// ─── Agent 1: Researcher ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runResearcher(input: StartRequest, model: any) {

  const prompt = `Bạn là Researcher Agent chuyên SEO cho thương hiệu nội thất Việt Nam.

Phân tích từ khóa sau và trả về JSON:

Từ khóa: "${input.keyword}"
Loại bài: ${input.contentType}
Ngôn ngữ: ${input.language}

Yêu cầu output JSON (chỉ trả JSON, không giải thích):
{
  "searchIntent": "commercial | informational | navigational | transactional",
  "primaryKeyword": "từ khóa chính đã chuẩn hóa",
  "secondaryKeywords": ["3-5 từ khóa phụ liên quan"],
  "lsiKeywords": ["3-5 từ khóa LSI ngữ nghĩa"],
  "peopleAlsoAsk": ["3 câu hỏi người dùng thường tìm kiếm liên quan"],
  "contentGaps": ["3 điểm mà các bài viết cùng chủ đề thường bỏ sót"],
  "angle": "góc tiếp cận độc đáo cho bài viết này"
}`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text = result.response.text();
  const parsed = extractJson(text) as Record<string, unknown> | null;

  if (!parsed) {
    // Fallback nếu parse lỗi
    return {
      keyword: input.keyword,
      searchIntent: 'commercial',
      primaryKeyword: input.keyword,
      secondaryKeywords: [`${input.keyword} tphcm`, `${input.keyword} giá rẻ`, `mua ${input.keyword} online`],
      lsiKeywords: ['chất liệu', 'kích thước', 'bảo hành', 'giao hàng'],
      peopleAlsoAsk: [
        `${input.keyword} loại nào tốt nhất?`,
        `Mua ${input.keyword} ở đâu uy tín?`,
        `${input.keyword} giá bao nhiêu?`,
      ],
      contentGaps: [
        'Thiếu thông số kỹ thuật cụ thể (kg, mm)',
        'Không có so sánh chi phí vận chuyển',
        'Chưa có góc nhìn từ xưởng sản xuất',
      ],
      angle: 'Góc nhìn từ xưởng — số liệu cụ thể, không hoa mỹ',
    };
  }

  return {
    keyword: input.keyword,
    searchIntent: String(parsed.searchIntent ?? 'commercial'),
    primaryKeyword: String(parsed.primaryKeyword ?? input.keyword),
    secondaryKeywords: Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords as string[] : [],
    lsiKeywords: Array.isArray(parsed.lsiKeywords) ? parsed.lsiKeywords as string[] : [],
    peopleAlsoAsk: Array.isArray(parsed.peopleAlsoAsk) ? parsed.peopleAlsoAsk as string[] : [],
    contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps as string[] : [],
    angle: String(parsed.angle ?? ''),
  };
}

// ─── Section cap helper ───────────────────────────────────────────────────────

function calcMaxSections(contentType: string, targetLength: number): { maxH2: number; maxH3PerH2: number } {
  // Product pages: short, focused, no deep nesting
  if (contentType === 'product') return { maxH2: 5, maxH3PerH2: 1 };
  // Long-form content types allow more structure
  if (contentType === 'guide' || contentType === 'comparison') return { maxH2: 12, maxH3PerH2: 1 };
  // Scale by word count
  if (targetLength <= 800)  return { maxH2: 6,  maxH3PerH2: 1 };
  if (targetLength <= 1200) return { maxH2: 8,  maxH3PerH2: 1 };
  if (targetLength <= 2000) return { maxH2: 10, maxH3PerH2: 1 };
  return { maxH2: 12, maxH3PerH2: 1 };
}

/** Trim sections array so we never exceed maxH2 H2 headings (and maxH3PerH2 H3s under each H2) */
function trimSections(sections: OutlineSection[], maxH2: number, maxH3PerH2: number): OutlineSection[] {
  const result: OutlineSection[] = [];
  let h2Count = 0;
  let h3UnderCurrent = 0;

  for (const s of sections) {
    if (s.level === 'H2') {
      if (h2Count >= maxH2) break; // Hard stop
      result.push(s);
      h2Count++;
      h3UnderCurrent = 0;
    } else if (s.level === 'H3') {
      if (h3UnderCurrent < maxH3PerH2) {
        result.push(s);
        h3UnderCurrent++;
      }
      // else: silently drop excess H3s
    }
  }
  return result;
}

// ─── Agent 2: Architect ───────────────────────────────────────────────────────

async function runArchitect(
  research: Awaited<ReturnType<typeof runResearcher>>,
  input: StartRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  competitorAnalysis: string = ''
): Promise<OutlineData> {

  const contentTypeMap: Record<string, string> = {
    auto:       'Tự chọn loại phù hợp nhất dựa trên từ khóa và search intent',
    product:    'Mô tả sản phẩm ngắn gọn: tên, thông số kỹ thuật, lợi ích, CTA mua hàng — không cần FAQ dài',
    listicle:   'Listicle dạng Top N, mỗi mục có heading riêng',
    'how-to':   'Hướng dẫn từng bước đánh số Step 1, 2, 3...',
    review:     'Đánh giá sản phẩm có bảng ưu/nhược điểm, thông số kỹ thuật',
    guide:      'Bài chuyên sâu nhiều H2/H3, đầy đủ khía cạnh',
    comparison: 'So sánh A vs B có bảng so sánh trực quan',
  };

  const { maxH2, maxH3PerH2 } = calcMaxSections(input.contentType, input.targetLength);
  const maxTotalSections = maxH2 + maxH2 * maxH3PerH2;

  const prompt = `Bạn là Architect Agent SEO cho thương hiệu Nội Thất Minh Quân (xưởng nội thất, bán giường/tủ/bàn ghế giá xưởng toàn quốc).

Dựa trên research data, tạo outline bài viết:

Từ khóa chính: "${research.primaryKeyword}"
Từ khóa phụ: ${research.secondaryKeywords.join(', ')}
Search intent: ${research.searchIntent}
Góc tiếp cận: ${research.angle}
Loại bài: ${contentTypeMap[input.contentType] ?? input.contentType}
Độ dài mục tiêu: ${input.targetLength} từ
Content gaps cần khai thác: ${research.contentGaps.join(' | ')}
Câu hỏi PAA: ${research.peopleAlsoAsk.join(' | ')}
${competitorAnalysis ? `\n## Phân tích đối thủ đang rank top (PHẢI khai thác content gap này):\n${competitorAnalysis}\n` : ''}
Luật viết của Nội Thất Minh Quân:
- Xưng "Minh Quân" / "chúng tôi", gọi khách "anh/chị"
- Số liệu cụ thể (kg, mm, ngày giao) thay tính từ chung chung
- KHÔNG dùng: "tuy nhiên", "bên cạnh đó", "tuyệt vời", "siêu phẩm", "đẳng cấp"
- CTA phải thực tế: "có sẵn – giao liền" / "báo giá trong ngày"

Trả về JSON (chỉ JSON, không giải thích):
{
  "suggestedTitles": [
    "Tiêu đề 1 — góc transactional: nhắm người muốn mua ngay, có từ 'giá xưởng' hoặc 'mua ở đâu', 55-65 ký tự",
    "Tiêu đề 2 — góc informational: dạng hướng dẫn/so sánh, bắt đầu bằng số (Top X / X loại / X lý do), 55-65 ký tự",
    "Tiêu đề 3 — góc question: dạng câu hỏi người dùng hay tìm (Loại nào tốt? / Có đáng mua?), 55-65 ký tự",
    "Tiêu đề 4 — góc địa lý / giao hàng: mention TPHCM hoặc toàn quốc, 55-65 ký tự",
    "Tiêu đề 5 — góc review / chuyên sâu: dạng đánh giá thực tế hoặc kinh nghiệm chọn mua, 55-65 ký tự",
    "Tiêu đề 6 — góc sáng tạo: cách diễn đạt khác biệt, vẫn chứa từ khóa chính, 55-65 ký tự"
  ],
  "sections": [
    { "heading": "tên mục", "level": "H2", "notes": "ghi chú ngắn cho writer" },
    { "heading": "tên mục con", "level": "H3", "notes": "ghi chú" }
  ],
  "primaryKeyword": "${research.primaryKeyword}",
  "secondaryKeywords": ${JSON.stringify(research.secondaryKeywords)},
  "estimatedWords": ${input.targetLength},
  "angle": "${research.angle}",
  "searchIntent": "${research.searchIntent}",
  "contentGaps": ${JSON.stringify(research.contentGaps)}
}

Lưu ý sections (BẮT BUỘC tuân thủ):
- Số H2 TỐI ĐA: ${maxH2} mục (bao gồm FAQ cuối) — KHÔNG được vượt quá
- Mỗi H2 chỉ được có TỐI ĐA ${maxH3PerH2} H3 con — chỉ thêm H3 khi thực sự cần phân chia nội dung
- Tổng phần tử trong mảng "sections" KHÔNG được quá ${maxTotalSections}
- Mục cuối phải là FAQ với 3 câu hỏi từ PAA
- KHÔNG tạo section thừa — chất lượng hơn số lượng, mỗi mục phải có nội dung thực sự khác biệt`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text = result.response.text();
  const parsed = extractJson(text) as Record<string, unknown> | null;

  if (!parsed || !Array.isArray(parsed.sections) || !Array.isArray(parsed.suggestedTitles)) {
    // Fallback nếu parse lỗi
    const kw = research.primaryKeyword;
    return {
      suggestedTitles: [
        `Mua ${kw} Giá Xưởng Ở Đâu? Giao Nhanh Toàn Quốc`,
        `Top 5 ${kw} Bán Chạy 2025 – So Sánh Giá & Chất Lượng`,
        `${kw} Loại Nào Tốt? Kinh Nghiệm Chọn Mua Từ Xưởng`,
        `${kw} Tại TPHCM – Giá Xưởng, Giao Hàng Trong Ngày`,
        `Đánh Giá ${kw}: Thực Tế Sau 3 Năm Dùng Tại Gia Đình`,
        `${kw} Giá Rẻ Chất Lượng – Hướng Dẫn Chọn Mua Chi Tiết`,
      ],
      sections: [
        { heading: `${kw} là gì? Ưu và nhược điểm`, level: 'H2', notes: 'Giải thích ngắn, có số liệu' },
        { heading: `Các loại ${kw} phổ biến`, level: 'H2', notes: 'Phân loại theo chất liệu, giá' },
        { heading: `Cách chọn ${kw} phù hợp`, level: 'H2', notes: 'Checklist 5 tiêu chí' },
        { heading: `Mua ${kw} ở đâu giá xưởng?`, level: 'H2', notes: 'Mention Nội Thất Minh Quân' },
        { heading: 'Câu hỏi thường gặp (FAQ)', level: 'H2', notes: research.peopleAlsoAsk.join(' / ') },
      ],
      primaryKeyword: research.primaryKeyword,
      secondaryKeywords: research.secondaryKeywords,
      estimatedWords: input.targetLength,
      angle: research.angle,
      searchIntent: research.searchIntent,
      contentGaps: research.contentGaps,
    };
  }

  const rawSections = (parsed.sections as OutlineSection[]).map((s) => ({
    heading: String(s.heading ?? ''),
    level: (s.level === 'H3' ? 'H3' : 'H2') as 'H2' | 'H3',
    notes: String(s.notes ?? ''),
  }));

  // Hard-cap: trim even if the AI ignored the prompt instruction
  const sections = trimSections(rawSections, maxH2, maxH3PerH2);
  if (rawSections.length !== sections.length) {
    console.log(`[runArchitect] Trimmed sections: ${rawSections.length} → ${sections.length} (cap: ${maxH2} H2, ${maxH3PerH2} H3/H2)`);
  }

  return {
    suggestedTitles: (parsed.suggestedTitles as string[]).slice(0, 6),
    sections,
    primaryKeyword: String(parsed.primaryKeyword ?? research.primaryKeyword),
    secondaryKeywords: Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords as string[] : research.secondaryKeywords,
    estimatedWords: input.targetLength,
    angle: String(parsed.angle ?? research.angle),
    searchIntent: String(parsed.searchIntent ?? research.searchIntent),
    contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps as string[] : research.contentGaps,
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body: StartRequest = await request.json();
    const { keyword, language, contentType, targetLength } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({ success: false, error: 'Từ khóa không được để trống' }, { status: 400 });
    }
    if (keyword.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Từ khóa quá ngắn' }, { status: 400 });
    }

    const runId = createRunId(keyword.trim());
    const input: StartRequest = { keyword: keyword.trim(), language, contentType, targetLength, provider: body.provider };

    const provider = body.provider || 'gemini-flash';
    console.log(`[pipeline/start] runId=${runId} keyword="${input.keyword}" provider=${provider}`);

    const model = buildModel(provider);

    // Bước 1: Researcher phân tích từ khóa
    console.log('[pipeline/start] Bước 1 — Researcher...');
    const research = await runResearcher(input, model);

    // Bước 2: Tìm kiếm URL đối thủ — kết hợp tự crawl + user nhập tay
    console.log('[pipeline/start] Bước 2 — Tìm bài top Google...');
    const autoUrls = await searchCompetitorUrls(input.keyword);

    // Merge: URL user nhập tay ưu tiên trước, rồi đến auto, deduplicate, tối đa 7
    const manualUrls = (input.manualCompetitorUrls ?? []).filter((u) => u.startsWith('http'));
    const mergedUrls = [...manualUrls];
    for (const u of autoUrls) {
      if (!mergedUrls.includes(u)) mergedUrls.push(u);
      if (mergedUrls.length >= 7) break;
    }
    console.log(`[pipeline/start] Tổng URL để crawl: ${mergedUrls.length} (${manualUrls.length} tay + ${autoUrls.length} auto)`);

    // Bước 3: Crawl & phân tích nội dung đối thủ
    let competitorAnalysis = '';
    let crawledUrls: string[] = [];
    if (mergedUrls.length > 0) {
      console.log(`[pipeline/start] Bước 3 — Crawl & phân tích ${mergedUrls.length} bài đối thủ...`);
      const result = await analyzeCompetitorContent(model, input.keyword, mergedUrls);
      competitorAnalysis = result.analysis;
      crawledUrls = result.crawledUrls;
      console.log(competitorAnalysis
        ? `[pipeline/start] Phân tích đối thủ xong ✓ (${crawledUrls.length} bài)`
        : '[pipeline/start] Crawl thất bại — bỏ qua phân tích đối thủ'
      );
    } else {
      console.log('[pipeline/start] Bước 3 — Không có URL đối thủ nào, bỏ qua');
    }

    // Bước 4: Architect tạo outline + tiêu đề (có dữ liệu đối thủ thực)
    console.log('[pipeline/start] Bước 4 — Architect...');
    const outline = await runArchitect(research, input, model, competitorAnalysis);

    console.log(`[pipeline/start] Done — ${outline.suggestedTitles.length} titles, ${outline.sections.length} sections`);

    // Bước 5: Tạo Article record trong database
    console.log('[pipeline/start] Bước 5 — Tạo Article record...');
    const article = await prisma.article.create({
      data: {
        runId,
        keyword: input.keyword,
        selectedTitle: outline.suggestedTitles[0] || input.keyword, // Default to first suggested title
        status: 'DRAFT',
        language,
        contentType: `legacy_pipeline:${contentType}`,
        sourceType: crawledUrls.length > 0 ? 'google_search' : 'ai_only',
        targetLength,
        aiProvider: provider,
        meta: buildArticleMeta('viet_bai_thong_minh', {
          contentType,
          competitorUrlCount: crawledUrls.length,
          manualCompetitorCount: manualUrls.length,
          autoCompetitorCount: autoUrls.length,
        }),
        outline: JSON.stringify(outline),
        competitorUrls: crawledUrls,
        competitorAnalysis,
        secondaryKeywords: outline.secondaryKeywords || [],
        htmlContent: '', // Empty initially, will be filled in step 3
        userId: user.userId,
      },
    });

    console.log(`[pipeline/start] Article created: id=${article.id}`);

    return NextResponse.json({
      success: true,
      data: {
        runId,
        articleId: article.id,
        outline,
        research: {
          peopleAlsoAsk: research.peopleAlsoAsk,
          contentGaps: research.contentGaps,
        },
        competitor: {
          urls: crawledUrls,
          analysis: competitorAnalysis,
          manualCount: manualUrls.length,
          autoCount: autoUrls.length,
        },
      },
    });

  } catch (error) {
    console.error('[pipeline/start] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server không xác định';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
