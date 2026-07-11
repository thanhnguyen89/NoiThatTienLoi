import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildBrandPrompt, buildForbiddenList, BrandConfig } from '../_context';
import { buildGeminiModel } from '../_gemini';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import type { GenerateContentResult } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoOptions {
  link: string;
  keywordLinks: string;
  boldKeyword: boolean;
  boldHeading: boolean;
}

interface WriteRequest {
  keyword: string;
  outline: string;
  outlineMode: 'none' | 'custom' | 'ai';
  targetLength: number;
  tone: string;
  aiModel: string;
  competitorUrls?: string[];
  language: string;
  seoOptions: SeoOptions;
  brandConfig?: BrandConfig;
  dataSource?: 'ai_only' | 'google_search';
}

interface ScoreBreakdown {
  language_natural: number;
  structure: number;
  eeat_signals: number;
  engagement: number;
}

// ─── Brand rules ──────────────────────────────────────────────────────────────
// Loaded dynamically per request via buildBrandPrompt() — xem _context.ts

const TONE_GUIDE: Record<string, string> = {
  seo_basic:   'Tập trung từ khóa, giải thích rõ ràng, FAQ cuối bài',
  seo_extend:  'Mở rộng với ví dụ thực tế, so sánh, trích dẫn số liệu',
  seo_long:    'Bài dài, bao quát toàn bộ chủ đề, mỗi mục chi tiết',
  how_to:      'Hướng dẫn từng bước đánh số, rõ ràng, thực hành được ngay',
  listicle:    'Danh sách Top N, mỗi mục có heading + mô tả ngắn',
  comparison:  'So sánh trực tiếp, có bảng so sánh, kết luận rõ ràng',
  review:      'Đánh giá khách quan, ưu/nhược điểm, điểm rating',
  friendly:    'Giọng gần gũi, tự nhiên như người bạn tư vấn, không hoa mỹ',
  newspaper:   'Văn phong tường thuật, thông tin chính xác, không quảng cáo',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.includes('quota');
      if (is429 && attempt < maxRetries) {
        const retryMatch = msg.match(/retry[^\d]*(\d+)/i);
        const waitMs = retryMatch ? parseInt(retryMatch[1]) * 1000 + 2000 : 25000 * (attempt + 1);
        console.warn(`[keyword-write] 429 — đợi ${Math.round(waitMs / 1000)}s`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Hết số lần retry');
}

function extractJson(text: string): unknown {
  try { return JSON.parse(text); } catch { /* */ }
  const block = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
  if (block) try { return JSON.parse(block[1]); } catch { /* */ }
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) try { return JSON.parse(obj[0]); } catch { /* */ }
  return null;
}

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

function makeDecision(score: number): 'PUBLISH' | 'REVIEW' | 'REWRITE' {
  if (score >= 76) return 'PUBLISH';
  if (score >= 60) return 'REVIEW';
  return 'REWRITE';
}

// ─── Parse outline [h2][h3] format → HTML structure ──────────────────────────

function outlineToSections(outline: string): string {
  if (!outline.trim()) return '';
  return outline
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('[h1]')) return `<h1>${line.slice(4).trim()}</h1>`;
      if (line.startsWith('[h2]')) return `<h2>${line.slice(4).trim()}</h2>`;
      if (line.startsWith('[h3]')) return `<h3>${line.slice(4).trim()}</h3>`;
      return line;
    })
    .join('\n');
}

// ─── Apply SEO post-processing ─────────────────────────────────────────────────

function applySeoOptions(html: string, keyword: string, seoOptions: SeoOptions): string {
  let result = html;

  // Gắn link vào từ khóa chính (lần đầu tiên xuất hiện)
  if (seoOptions.link) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'i');
    result = result.replace(regex, `<a href="${seoOptions.link}" title="${keyword}">$1</a>`);
  }

  // Gắn link theo từ khóa cụ thể
  if (seoOptions.keywordLinks) {
    const pairs = seoOptions.keywordLinks.split('\n').map((l) => l.split('|'));
    for (const [kw, link] of pairs) {
      if (kw?.trim() && link?.trim()) {
        const escaped = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!href=["'][^"']*)(${escaped})(?![^<]*>)`, 'gi');
        result = result.replace(regex, `<a href="${link.trim()}" title="${kw.trim()}">$1</a>`);
      }
    }
  }

  // In đậm từ khóa chính
  if (seoOptions.boldKeyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Chỉ bold trong <p>, không bold trong heading hay anchor
    result = result.replace(
      /(<p[^>]*>)([\s\S]*?)(<\/p>)/gi,
      (match, open, content, close) => {
        const regex = new RegExp(`(?<![">])(${escaped})(?![^<]*>)`, 'gi');
        return open + content.replace(regex, '<strong>$1</strong>') + close;
      }
    );
  }

  // In đậm heading
  if (seoOptions.boldHeading) {
    result = result.replace(/(<h[23][^>]*>)([\s\S]*?)(<\/h[23]>)/gi, '$1<strong>$2</strong>$3');
  }

  return result;
}

// ─── Build model adapter ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildModel(aiModel: string): any {
  const isOpenAI = aiModel === 'gpt-4o' || aiModel === 'gpt-4o-mini';

  if (isOpenAI) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY chưa được cấu hình trong .env.local');
    const client = new OpenAI({ apiKey });
    const modelName = aiModel === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';
    return {
      generateContent: async (prompt: string) => {
        const completion = await callWithRetry(() =>
          client.chat.completions.create({ model: modelName, messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
        );
        return { response: { text: () => completion.choices[0]?.message?.content ?? '' } };
      },
    };
  }

  // Gemini qua proxy OpenAI-compatible
  const variant = aiModel === 'gemini-pro' ? 'pro' : 'flash';
  return buildGeminiModel(variant);
}

// ─── Fetch & phân tích URL đối thủ ───────────────────────────────────────────

async function fetchCompetitorContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!res.ok) return '';

    const html = await res.text();

    // Bỏ script, style, nav, footer, header, aside
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Giữ tối đa 3000 ký tự để không tốn quá nhiều token
    return cleaned.slice(0, 3000);
  } catch {
    return '';
  }
}

async function analyzeCompetitors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  keyword: string,
  urls: string[]
): Promise<string> {
  if (!urls.length) return '';

  console.log(`[keyword-write] Fetching ${urls.length} competitor URLs...`);

  // Fetch song song tối đa 5 URL
  const contents = await Promise.all(
    urls.slice(0, 5).map(async (url) => {
      const text = await fetchCompetitorContent(url);
      return { url, text };
    })
  );

  const validContents = contents.filter((c) => c.text.length > 100);
  if (!validContents.length) return '';

  const competitorText = validContents
    .map((c, i) => `### Đối thủ ${i + 1}: ${c.url}\n${c.text}`)
    .join('\n\n---\n\n');

  const prompt = `Bạn là SEO Analyst phân tích nội dung đối thủ cho từ khóa: "${keyword}"

Dưới đây là nội dung từ ${validContents.length} bài viết đối thủ đang rank top Google:

${competitorText}

Phân tích và trả về (ngắn gọn, súc tích, dưới 500 từ):

## 1. Cấu trúc chung (Các mục H2 đối thủ thường có)
## 2. Điểm mạnh của đối thủ (Họ làm tốt gì?)
## 3. Content Gap (Điều gì họ CHƯA đề cập hoặc đề cập sơ sài?)
## 4. Từ khóa phụ nổi bật (Các cụm từ xuất hiện nhiều)
## 5. Yêu cầu cho bài viết MỚI (Phải có gì để vượt đối thủ?)

Trả về plain text, không markdown code block.`;

  try {
    const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
    return result.response.text();
  } catch {
    return '';
  }
}

// ─── Agent: Writer ────────────────────────────────────────────────────────────

async function runWriter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  body: WriteRequest,
  brandPrompt: string,
  competitorAnalysis: string = ''
): Promise<string> {
  const { keyword, outline, outlineMode, targetLength, tone, language } = body;
  const toneText = TONE_GUIDE[tone] ?? tone;

  const outlineSection = outline
    ? `\n## Dàn ý bài viết:\n${outlineMode === 'none' ? '' : outlineToSections(outline)}`
    : '';

  const competitorSection = competitorAnalysis
    ? `\n## Phân tích đối thủ (dùng để viết vượt trội hơn):\n${competitorAnalysis}\n\n⚠️ Bài viết MỚI phải: bao phủ content gap, bổ sung điểm đối thủ thiếu, giữ cấu trúc tương tự nhưng chi tiết hơn.`
    : '';

  const prompt = `Bạn là Writer Agent chuyên viết bài SEO.

${brandPrompt}
${competitorSection}
## Nhiệm vụ:
Viết bài ${language} hoàn chỉnh dạng HTML cho từ khóa: "${keyword}"

## Thông tin:
- Phong cách: ${toneText}
- Độ dài mục tiêu: ${targetLength} từ
${outlineSection || `- Tự tạo dàn ý phù hợp với từ khóa`}

## Yêu cầu output:
- HTML từ <article> đến </article>
- Dùng <h1> cho tiêu đề, <h2>/<h3> cho các mục, <p> cho đoạn văn
- KHÔNG thêm CSS hay script
- Chỉ trả HTML, không giải thích`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text: string = result.response.text();

  const htmlMatch = text.match(/```html\n?([\s\S]*?)\n?```/i);
  if (htmlMatch) return htmlMatch[1].trim();
  const articleMatch = text.match(/<article[\s\S]*<\/article>/i);
  if (articleMatch) return articleMatch[0];
  return text.trim();
}

// ─── Agent: SEO + Editor QC (gộp 1 call để giảm API calls) ──────────────────

async function runSeoAndQC(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  html: string,
  keyword: string,
  forbiddenList: string[]
): Promise<{ html: string; metaDescription: string; title: string; scoreBreakdown: ScoreBreakdown }> {
  const forbiddenStr = forbiddenList.join('", "');
  const prompt = `Bạn là SEO Specialist + Editor QC chuyên nghiệp.

## Nhiệm vụ kép (thực hiện tuần tự):

### 1. SEO Optimize:
- Đảm bảo keyword "${keyword}" trong 100 từ đầu
- H2 chứa từ khóa liên quan tự nhiên
- Tạo meta description 150–160 ký tự chứa keyword
- Trích xuất <h1> làm title

### 2. Humanize & QC:
- Xóa/thay các từ cấm: "${forbiddenStr}"
- Thay câu bị động → câu chủ động
- Chia câu dài >25 từ thành 2 câu
- Chấm điểm 4 chiều (mỗi chiều 0-25)

## Bài HTML:
${html}

## Output JSON (chỉ JSON):
{
  "html": "[HTML đã optimize + humanize]",
  "title": "[tiêu đề h1 của bài]",
  "metaDescription": "[150-160 ký tự, chứa keyword, không dùng từ cấm]",
  "scoreBreakdown": {
    "language_natural": 0,
    "structure": 0,
    "eeat_signals": 0,
    "engagement": 0
  }
}`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text: string = result.response.text();
  const parsed = extractJson(text) as Record<string, unknown> | null;

  const fallbackScore: ScoreBreakdown = { language_natural: 17, structure: 17, eeat_signals: 15, engagement: 15 };

  if (!parsed) {
    return {
      html,
      title: keyword,
      metaDescription: `${keyword} chất lượng cao, giá xưởng tại Nội Thất Minh Quân. Giao hàng nhanh toàn quốc.`,
      scoreBreakdown: fallbackScore,
    };
  }

  const breakdown: ScoreBreakdown = {
    language_natural: Math.min(25, Math.max(0, Number((parsed.scoreBreakdown as Record<string, unknown>)?.language_natural) || 17)),
    structure:        Math.min(25, Math.max(0, Number((parsed.scoreBreakdown as Record<string, unknown>)?.structure) || 17)),
    eeat_signals:     Math.min(25, Math.max(0, Number((parsed.scoreBreakdown as Record<string, unknown>)?.eeat_signals) || 15)),
    engagement:       Math.min(25, Math.max(0, Number((parsed.scoreBreakdown as Record<string, unknown>)?.engagement) || 15)),
  };

  return {
    html: String(parsed.html ?? html),
    title: String(parsed.title ?? keyword),
    metaDescription: String(parsed.metaDescription ?? `${keyword} - Nội Thất Minh Quân`),
    scoreBreakdown: breakdown,
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: WriteRequest = await request.json();
    const { keyword, aiModel, seoOptions } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu từ khóa' }, { status: 400 });
    }
    if (aiModel === 'claude') {
      return NextResponse.json({ success: false, error: 'Claude chưa được cấu hình — thêm ANTHROPIC_API_KEY' }, { status: 400 });
    }

    const model = buildModel(aiModel);
    console.log(`[keyword-write] keyword="${keyword}" model=${aiModel} tone=${body.tone}`);

    // Load brand context (từ file hoặc override từ form)
    const brandPrompt = await buildBrandPrompt(body.brandConfig);
    const forbiddenList = buildForbiddenList(body.brandConfig?.forbiddenExtra);
    const brandName = body.brandConfig?.name?.trim() || 'Nội Thất Minh Quân';
    console.log(`[keyword-write] Brand: ${brandName}`);
    let googleDataBlock = '';
    if (body.dataSource === 'google_search') {
      console.log('[keyword-write] Fetching Google Search data...');
      const googleData = await fetchGoogleSearchData(keyword.trim(), {
        num: 5,
        crawl: true,
        language: body.language,
      });
      if (googleData) {
        googleDataBlock = buildDataBlock(googleData);
        console.log(`[keyword-write] Google data ready - ${googleData.items.length} results`);
      } else {
        console.warn('[keyword-write] Google Search unavailable - fallback to AI only');
      }
    }

    // Bước 0: Phân tích đối thủ (nếu có URL)
    let competitorAnalysis = '';
    if (body.competitorUrls?.length) {
      console.log(`[keyword-write] Analyzing ${body.competitorUrls.length} competitor URLs...`);
      competitorAnalysis = await analyzeCompetitors(model, keyword.trim(), body.competitorUrls);
      if (competitorAnalysis) {
        console.log('[keyword-write] Competitor analysis done ✓');
      } else {
        console.log('[keyword-write] Competitor analysis returned empty (URLs may be blocked)');
      }
    }

    // Bước 1: Writer
    console.log('[keyword-write] Writer...');
    const rawHtml = await runWriter(
      model,
      body,
      googleDataBlock ? `${brandPrompt}\n\n${googleDataBlock}` : brandPrompt,
      competitorAnalysis,
    );

    // Bước 2: SEO + QC (gộp 1 call)
    console.log('[keyword-write] SEO + QC...');
    const { html: processedHtml, title, metaDescription, scoreBreakdown } = await runSeoAndQC(model, rawHtml, keyword.trim(), forbiddenList);

    // Bước 3: Apply SEO options (client-side processing)
    const finalHtml = applySeoOptions(processedHtml, keyword.trim(), seoOptions);

    const humanness_score = scoreBreakdown.language_natural + scoreBreakdown.structure + scoreBreakdown.eeat_signals + scoreBreakdown.engagement;
    const decision = makeDecision(humanness_score);
    const wordCount = countWords(finalHtml);

    console.log(`[keyword-write] Done — score=${humanness_score} decision=${decision} words=${wordCount}`);

    return NextResponse.json({
      success: true,
      data: {
        html: finalHtml,
        humanness_score,
        decision,
        title,
        wordCount,
        metaDescription,
        keyword: keyword.trim(),
        scoreBreakdown,
      },
    });

  } catch (error) {
    console.error('[keyword-write] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server không xác định';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
