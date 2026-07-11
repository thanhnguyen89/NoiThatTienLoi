import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildBrandPrompt, buildForbiddenList, BrandConfig } from '../_context';
import { buildGeminiModel } from '../_gemini';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import type { GenerateContentResult } from '@google/generative-ai';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface Step1Data {
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
}

interface Step2Data {
  selectedTitle: string;
  approvedSections: OutlineSection[];
  userNotes: string;
}

interface WriteRequest {
  runId: string;
  provider: 'gemini-flash' | 'gemini-pro' | 'claude' | 'gpt-4o' | 'gpt-4o-mini' | 'grok';
  step1: Step1Data;
  step2: Step2Data;
  outline: OutlineData;
  competitorUrls?: string[];
  brandConfig?: BrandConfig;
  dataSource?: 'ai_only' | 'from_url' | 'manual_input' | 'google_search';
  referenceUrls?: string[];   // nhiều URL tham khảo (step 3 mới)
  referenceUrl?: string;      // backward compat
  manualData?: string;
}

interface ScoreBreakdown {
  language_natural: number;
  structure: number;
  eeat_signals: number;
  engagement: number;
}

interface WriteResult {
  html: string;
  humanness_score: number;
  decision: 'PUBLISH' | 'REVIEW' | 'REWRITE';
  title: string;
  wordCount: number;
  metaDescription: string;
  scoreBreakdown: ScoreBreakdown;
}

// ─── Brand rules loaded dynamically — xem _context.ts ────────────────────────

// ─── Gemini Client (via proxy) ────────────────────────────────────────────────

function getGeminiModel(provider: string) {
  const variant = provider === 'gemini-pro' ? 'pro' : 'flash';
  return buildGeminiModel(variant);
}

// ─── Retry wrapper cho rate limit ─────────────────────────────────────────────

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 25000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota');

      if (is429 && attempt < maxRetries) {
        // Trích xuất retryDelay từ message nếu có (ví dụ "retry in 21s")
        const retryMatch = msg.match(/retry[^\d]*(\d+)/i);
        const waitMs = retryMatch ? parseInt(retryMatch[1]) * 1000 + 2000 : baseDelayMs * (attempt + 1);

        console.warn(`[Gemini] 429 Rate limit — đợi ${Math.round(waitMs / 1000)}s rồi thử lại (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      throw err;
    }
  }
  throw new Error('Hết số lần thử lại sau nhiều lỗi rate limit');
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
      signal: AbortSignal.timeout(10000),
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
      .slice(0, 3000);
  } catch {
    return '';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function analyzeCompetitors(model: any, keyword: string, urls: string[]): Promise<string> {
  if (!urls.length) return '';
  const contents = await Promise.all(
    urls.slice(0, 5).map(async (url) => ({ url, text: await fetchCompetitorContent(url) }))
  );
  const valid = contents.filter((c) => c.text.length > 100);
  if (!valid.length) return '';

  const competitorText = valid.map((c, i) => `### Đối thủ ${i + 1}: ${c.url}\n${c.text}`).join('\n\n---\n\n');
  const prompt = `Bạn là SEO Analyst. Phân tích nội dung đối thủ cho từ khóa: "${keyword}"

${competitorText}

Phân tích ngắn gọn (dưới 500 từ):
## 1. Cấu trúc chung (Các mục H2 thường có)
## 2. Điểm mạnh của đối thủ
## 3. Content Gap (Chưa đề cập hoặc sơ sài)
## 4. Từ khóa phụ nổi bật
## 5. Yêu cầu bài mới để vượt đối thủ

Trả về plain text, không markdown code block.`;

  try {
    const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
    return result.response.text();
  } catch {
    return '';
  }
}

// ─── Agent 1: Writer ──────────────────────────────────────────────────────────

async function runWriter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  step1: Step1Data,
  step2: Step2Data,
  outline: OutlineData,
  brandPrompt: string,
  competitorAnalysis: string = '',
  referenceData: string = ''
): Promise<string> {
  const sectionsText = step2.approvedSections
    .map((s) => `${s.level}: ${s.heading}${s.notes ? ` (ghi chú: ${s.notes})` : ''}`)
    .join('\n');

  const prompt = `Bạn là Writer Agent chuyên viết bài SEO.

${brandPrompt}

## Nhiệm vụ:
Viết bài SEO hoàn chỉnh dạng HTML theo outline dưới đây.

## Thông tin bài viết:
- Tiêu đề: ${step2.selectedTitle}
- Từ khóa chính: ${outline.primaryKeyword}
- Từ khóa phụ: ${outline.secondaryKeywords.join(', ')}
- Loại bài: ${step1.contentType}
- Độ dài mục tiêu: ${step1.targetLength} từ
- Góc độ: ${outline.angle}
${step2.userNotes ? `- Ghi chú từ editor: ${step2.userNotes}` : ''}

## Dàn ý:
${sectionsText}

## Content gaps cần khai thác:
${outline.contentGaps.join('\n')}
${referenceData ? `\n## Dữ liệu tham khảo (PHẢI dùng số liệu này, không bịa thêm):\n${referenceData}\n` : ''}${competitorAnalysis ? `\n## Phân tích đối thủ (viết bài vượt trội hơn):\n${competitorAnalysis}\n\n⚠️ Bài viết MỚI phải: bao phủ content gap, bổ sung điểm đối thủ thiếu, chi tiết hơn.\n` : ''}
## Yêu cầu output:
- Trả về HTML hoàn chỉnh (từ <article> đến </article>)
- Dùng thẻ <h1> cho tiêu đề chính, <h2> và <h3> cho các mục
- Mỗi đoạn văn trong thẻ <p>
- Danh sách dùng <ul>/<ol>/<li>
- KHÔNG thêm CSS, script, hay thẻ HTML ngoài nội dung bài
- Viết bằng ${step1.language === 'Vietnamese' ? 'tiếng Việt' : 'English'}
- Keyword "${outline.primaryKeyword}" xuất hiện tự nhiên với mật độ 1.0–1.5%
- Không được dùng bất kỳ từ cấm nào đã liệt kê

Chỉ trả về HTML, không giải thích gì thêm.`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text = result.response.text();

  // Trích xuất phần HTML nếu model trả về markdown code block
  const htmlMatch = text.match(/```html\n?([\s\S]*?)\n?```/i);
  if (htmlMatch) return htmlMatch[1].trim();

  // Nếu không có code block, tìm <article>...</article>
  const articleMatch = text.match(/<article[\s\S]*<\/article>/i);
  if (articleMatch) return articleMatch[0];

  return text.trim();
}

// ─── Agent 2: SEO Specialist ──────────────────────────────────────────────────

async function runSeoSpecialist(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  html: string,
  keyword: string,
  title: string
): Promise<{ html: string; metaDescription: string }> {
  const prompt = `Bạn là SEO Specialist Agent cho Nội Thất Minh Quân.

## Nhiệm vụ:
Tối ưu technical SEO cho bài HTML sau. KHÔNG được thay đổi giọng văn, nội dung ý nghĩa, hay cấu trúc bài.

## Keyword chính: ${keyword}
## Tiêu đề: ${title}

## Bài HTML cần tối ưu:
${html}

## Các việc cần làm:
1. Kiểm tra keyword "${keyword}" xuất hiện trong 100 từ đầu tiên. Nếu chưa có, thêm tự nhiên.
2. Đảm bảo mỗi <h2> có ít nhất 1 từ khóa liên quan (không nhồi nhét).
3. Thêm thuộc tính alt cho <img> nếu có.
4. Đảm bảo không có từ khóa bị lặp liền kề (keyword stuffing).
5. Tạo meta description 150–160 ký tự từ nội dung bài, chứa keyword, không dùng từ cấm.

## Output format (JSON):
{
  "html": "[HTML đã tối ưu — giữ nguyên nội dung, chỉ sửa SEO]",
  "metaDescription": "[meta description 150-160 ký tự]"
}

Chỉ trả về JSON, không giải thích.`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text = result.response.text();

  try {
    // Trích xuất JSON từ response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        html: parsed.html || html,
        metaDescription: parsed.metaDescription || `${keyword} - Nội Thất Minh Quân cung cấp giá xưởng, giao hàng nhanh toàn quốc.`,
      };
    }
  } catch {
    // Nếu parse JSON thất bại, giữ nguyên HTML gốc
  }

  return {
    html,
    metaDescription: `${keyword} chất lượng cao, giá xưởng tại Nội Thất Minh Quân. Giao hàng nhanh toàn quốc, bảo hành dài hạn.`,
  };
}

// ─── Agent 3: Editor QC ───────────────────────────────────────────────────────

async function runEditorQC(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  html: string,
  forbiddenList: string[]
): Promise<{ html: string; scoreBreakdown: ScoreBreakdown }> {
  const prompt = `Bạn là Editor QC Agent chuyên nghiệp.

## Nhiệm vụ kép:
1. Humanize: xóa dấu vết AI, sửa câu máy móc, giữ nguyên ý nghĩa
2. Chấm điểm Humanness Score /100

## Từ CẤM (xóa hoặc thay thế):
${forbiddenList.join(', ')}

## Bài HTML cần kiểm tra:
${html}

## Hướng dẫn humanize:
- Thay câu bị động bằng câu chủ động
- Thêm 1-2 chi tiết cụ thể (số liệu, ví dụ thực tế) vào đoạn văn trừu tượng
- Chia câu quá dài (>25 từ) thành 2 câu
- Xóa mọi từ trong danh sách cấm, thay bằng từ tự nhiên hơn
- KHÔNG thay đổi cấu trúc HTML hay headings

## Chấm điểm Humanness Score (mỗi mục 0-25):
- language_natural: Ngôn ngữ tự nhiên, không máy móc, không dùng từ cấm (0-25)
- structure: Cấu trúc bài mạch lạc, đoạn văn hợp lý, headings rõ ràng (0-25)
- eeat_signals: Có kinh nghiệm thực tế, số liệu cụ thể, quan điểm rõ ràng (0-25)
- engagement: Hấp dẫn người đọc, CTA thực tế, không sáo rỗng (0-25)

## Output format (JSON):
{
  "html": "[HTML sau khi humanize — chỉ thay đổi nội dung văn bản]",
  "scoreBreakdown": {
    "language_natural": 0,
    "structure": 0,
    "eeat_signals": 0,
    "engagement": 0
  }
}

Chỉ trả về JSON, không giải thích.`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const breakdown: ScoreBreakdown = {
        language_natural: Math.min(25, Math.max(0, Number(parsed.scoreBreakdown?.language_natural) || 18)),
        structure: Math.min(25, Math.max(0, Number(parsed.scoreBreakdown?.structure) || 18)),
        eeat_signals: Math.min(25, Math.max(0, Number(parsed.scoreBreakdown?.eeat_signals) || 16)),
        engagement: Math.min(25, Math.max(0, Number(parsed.scoreBreakdown?.engagement) || 16)),
      };
      return {
        html: parsed.html || html,
        scoreBreakdown: breakdown,
      };
    }
  } catch {
    // Fallback nếu JSON parse lỗi
  }

  // Fallback score
  return {
    html,
    scoreBreakdown: {
      language_natural: 18,
      structure: 18,
      eeat_signals: 16,
      engagement: 16,
    },
  };
}

// ─── Helper: đếm từ trong HTML ────────────────────────────────────────────────

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(Boolean).length;
}

// ─── Helper: quyết định publish ──────────────────────────────────────────────

function makeDecision(score: number): 'PUBLISH' | 'REVIEW' | 'REWRITE' {
  if (score >= 76) return 'PUBLISH';
  if (score >= 60) return 'REVIEW';
  return 'REWRITE';
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: WriteRequest = await request.json();
    const { provider, step1, step2, outline } = body;

    // Validate
    if (!step2?.selectedTitle) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tiêu đề bài viết' },
        { status: 400 }
      );
    }
    if (!outline?.sections?.length) {
      return NextResponse.json(
        { success: false, error: 'Thiếu dàn ý bài viết' },
        { status: 400 }
      );
    }

    // ── Khởi tạo model adapter ────────────────────────────────────────────────
    const isOpenAI = provider === 'gpt-4o' || provider === 'gpt-4o-mini';
    const isClaude = provider === 'claude';

    if (isClaude) {
      return NextResponse.json(
        { success: false, error: 'Claude provider chưa được cấu hình — vui lòng thêm ANTHROPIC_API_KEY' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: any;
    if (isOpenAI) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'OPENAI_API_KEY chưa được cấu hình trong .env.local' },
          { status: 400 }
        );
      }
      // Tạo OpenAI adapter có cùng interface generateContent() với Gemini
      const openaiClient = new OpenAI({ apiKey });
      const openaiModelName = provider === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';
      model = {
        generateContent: async (prompt: string) => {
          const completion = await callWithRetry(() =>
            openaiClient.chat.completions.create({
              model: openaiModelName,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
            })
          );
          return {
            response: {
              text: () => completion.choices[0]?.message?.content ?? '',
            },
          };
        },
      };
    } else {
      model = getGeminiModel(provider);
    }

    console.log(`[pipeline/write] runId=${body.runId} provider=${provider} keyword="${outline.primaryKeyword}"`);

    // ── Load brand context ─────────────────────────────────────────────────────
    const brandPrompt   = await buildBrandPrompt(body.brandConfig);
    const forbiddenList = buildForbiddenList(body.brandConfig?.forbiddenExtra);
    const brandName = body.brandConfig?.name?.trim() || 'Nội Thất Minh Quân';
    console.log(`[pipeline/write] Brand: ${brandName}`);
    let googleDataBlock = '';
    if (body.dataSource === 'google_search') {
      console.log('[pipeline/write] Fetching Google Search data...');
      const googleData = await fetchGoogleSearchData(step1.keyword.trim(), {
        num: 5,
        crawl: true,
        language: step1.language,
      });
      if (googleData) {
        googleDataBlock = buildDataBlock(googleData);
        console.log(`[pipeline/write] Google data ready - ${googleData.items.length} results`);
      } else {
        console.warn('[pipeline/write] Google Search unavailable - fallback to AI only');
      }
    }

    // ── Bước 0a: Fetch reference URLs (nếu chọn from_url) ────────────────────
    let referenceData = '';
    if (body.dataSource === 'from_url') {
      // Ưu tiên referenceUrls (array mới), fallback sang referenceUrl (cũ)
      const urlsToFetch: string[] = [];
      if (body.referenceUrls?.length) {
        urlsToFetch.push(...body.referenceUrls.slice(0, 5));
      } else if (body.referenceUrl) {
        urlsToFetch.push(body.referenceUrl);
      }

      if (urlsToFetch.length > 0) {
        console.log(`[pipeline/write] Fetching ${urlsToFetch.length} reference URL(s)...`);
        const fetched = await Promise.allSettled(urlsToFetch.map(fetchCompetitorContent));
        const parts = fetched
          .map((r, i) => r.status === 'fulfilled' && r.value ? `### Tham khảo ${i + 1}: ${urlsToFetch[i]}\n${r.value}` : '')
          .filter(Boolean);
        referenceData = parts.join('\n\n---\n\n');
        console.log(`[pipeline/write] Reference URLs fetched: ${parts.length}/${urlsToFetch.length} ✓`);
      }
    } else if (body.dataSource === 'manual_input' && body.manualData) {
      referenceData = body.manualData;
      console.log('[pipeline/write] Using manual data input ✓');
    }

    // ── Bước 0b: Phân tích đối thủ (nếu có URL) ───────────────────────────────
    let competitorAnalysis = '';
    if (body.competitorUrls?.length) {
      console.log(`[pipeline/write] Analyzing ${body.competitorUrls.length} competitor URLs...`);
      competitorAnalysis = await analyzeCompetitors(model, outline.primaryKeyword, body.competitorUrls);
      console.log(competitorAnalysis ? '[pipeline/write] Competitor analysis done ✓' : '[pipeline/write] Competitor URLs returned empty');
    }

    // ── Bước 1: Writer viết bài HTML ─────────────────────────────────────────
    console.log('[pipeline/write] Step 1: Writer agent...');
    const rawHtml = await runWriter(
      model,
      step1,
      step2,
      outline,
      googleDataBlock ? `${brandPrompt}\n\n${googleDataBlock}` : brandPrompt,
      competitorAnalysis,
      referenceData,
    );

    // ── Bước 2: SEO Specialist tối ưu ─────────────────────────────────────────
    console.log('[pipeline/write] Step 2: SEO Specialist...');
    const { html: seoHtml, metaDescription } = await runSeoSpecialist(
      model,
      rawHtml,
      outline.primaryKeyword,
      step2.selectedTitle
    );

    // ── Bước 3: Editor QC humanize + chấm điểm ───────────────────────────────
    console.log('[pipeline/write] Step 3: Editor QC...');
    const { html: finalHtml, scoreBreakdown } = await runEditorQC(model, seoHtml, forbiddenList);

    // Tính tổng điểm
    const humanness_score =
      scoreBreakdown.language_natural +
      scoreBreakdown.structure +
      scoreBreakdown.eeat_signals +
      scoreBreakdown.engagement;

    const decision = makeDecision(humanness_score);
    const wordCount = countWords(finalHtml);

    console.log(`[pipeline/write] Done — score=${humanness_score} decision=${decision} words=${wordCount}`);

    const result: WriteResult = {
      html: finalHtml,
      humanness_score,
      decision,
      title: step2.selectedTitle,
      wordCount,
      metaDescription,
      scoreBreakdown,
    };

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('[pipeline/write] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server không xác định';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
