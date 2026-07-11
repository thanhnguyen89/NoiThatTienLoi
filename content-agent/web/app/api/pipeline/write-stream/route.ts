import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { buildBrandPrompt, buildForbiddenList, BrandConfig } from '../_context';
import { buildGeminiModel, GeminiModel } from '../_gemini';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import { prisma } from '@/lib/prisma';
import type { GenerateContentResult } from '@google/generative-ai';
import type { Prisma } from '@prisma/client';

// ─── Types (same as write/route.ts) ──────────────────────────────────────────

interface OutlineSection { heading: string; level: 'H2' | 'H3'; notes: string }
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
interface Step1Data { keyword: string; language: string; contentType: string; targetLength: number }
interface Step2Data { selectedTitle: string; approvedSections: OutlineSection[]; userNotes: string }
interface WriteRequest {
  runId: string;
  provider: string;
  step1: Step1Data;
  step2: Step2Data;
  outline: OutlineData;
  competitorUrls?: string[];
  brandConfig?: BrandConfig;
  dataSource?: 'ai_only' | 'from_url' | 'manual_input' | 'google_search';
  referenceUrls?: string[];
  referenceUrl?: string;
  manualData?: string;
}
interface ScoreBreakdown {
  language_natural: number; structure: number; eeat_signals: number; engagement: number;
}

// ─── SSE helper ──────────────────────────────────────────────────────────────

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
  );
}

// ─── Shared utilities (copy từ write/route.ts) ───────────────────────────────

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota');
      if (is429 && attempt < maxRetries) {
        const m = msg.match(/retry[^\d]*(\d+)/i);
        const wait = m ? parseInt(m[1]) * 1000 + 2000 : 25000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Hết retry');
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Accept-Language': 'vi-VN,vi;q=0.9' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
  } catch { return ''; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildModel(provider: string): any {
  if (provider === 'gpt-4o' || provider === 'gpt-4o-mini') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY chưa được cấu hình');
    const client = new OpenAI({ apiKey });
    const name = provider === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';
    return {
      generateContent: async (prompt: string) => {
        const c = await client.chat.completions.create({ model: name, messages: [{ role: 'user', content: prompt }], temperature: 0.7 });
        return { response: { text: () => c.choices[0]?.message?.content ?? '' } };
      },
      generateContentStream: async (prompt: string) => {
        const stream = await client.chat.completions.create({ model: name, messages: [{ role: 'user', content: prompt }], temperature: 0.7, stream: true });
        async function* gen() { for await (const chunk of stream) { const d = chunk.choices[0]?.delta?.content ?? ''; if (d) yield { text: () => d }; } }
        return gen();
      },
    };
  }
  if (provider === 'grok') {
    const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    if (!apiKey) throw new Error('GROK_API_KEY chưa được cấu hình');
    const client = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
    return {
      generateContent: async (prompt: string) => {
        const c = await client.chat.completions.create({ model: 'grok-3', messages: [{ role: 'user', content: prompt }], temperature: 0.7 });
        return { response: { text: () => c.choices[0]?.message?.content ?? '' } };
      },
      generateContentStream: async (prompt: string) => {
        const stream = await client.chat.completions.create({ model: 'grok-3', messages: [{ role: 'user', content: prompt }], temperature: 0.7, stream: true });
        async function* gen() { for await (const chunk of stream) { const d = chunk.choices[0]?.delta?.content ?? ''; if (d) yield { text: () => d }; } }
        return gen();
      },
    };
  }
  return buildGeminiModel('flash');
}

// ─── Writer (streaming) ───────────────────────────────────────────────────────

async function runWriterStream(
  model: GeminiModel,
  step1: Step1Data,
  step2: Step2Data,
  outline: OutlineData,
  brandPrompt: string,
  competitorAnalysis: string,
  referenceData: string,
  onChunk: (text: string) => void
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
${referenceData ? `\n## Dữ liệu tham khảo (PHẢI dùng số liệu này, không bịa thêm):\n${referenceData}\n` : ''}${competitorAnalysis ? `\n## Phân tích đối thủ (viết bài vượt trội hơn):\n${competitorAnalysis}\n` : ''}
## Yêu cầu output:
- Trả về HTML hoàn chỉnh (từ <article> đến </article>)
- Dùng thẻ <h1> cho tiêu đề chính, <h2> và <h3> cho các mục
- Mỗi đoạn văn trong thẻ <p>
- KHÔNG thêm CSS, script, hay thẻ HTML ngoài nội dung bài
- Viết bằng ${step1.language === 'Vietnamese' ? 'tiếng Việt' : 'English'}
- Keyword "${outline.primaryKeyword}" xuất hiện tự nhiên với mật độ 1.0–1.5%
- Không dùng bất kỳ từ cấm nào

Chỉ trả về HTML, không giải thích gì thêm.`;

  let fullText = '';

  try {
    const stream = await model.generateContentStream(prompt);
    for await (const chunk of stream) {
      const delta = chunk.text();
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }
    }
  } catch {
    // fallback sang non-streaming nếu stream lỗi
    const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
    fullText = result.response.text();
    onChunk(fullText);
  }

  // Clean HTML
  const htmlMatch = fullText.match(/```html\n?([\s\S]*?)\n?```/i);
  if (htmlMatch) return htmlMatch[1].trim();
  const articleMatch = fullText.match(/<article[\s\S]*<\/article>/i);
  if (articleMatch) return articleMatch[0];
  return fullText.trim();
}

// ─── SEO Specialist (non-streaming) ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runSeoSpecialist(model: any, html: string, keyword: string, title: string) {
  const prompt = `Bạn là SEO Specialist Agent.

## Keyword: ${keyword}
## Tiêu đề: ${title}
## HTML cần tối ưu:
${html}

Các việc cần làm:
1. Keyword "${keyword}" trong 100 từ đầu — thêm nếu chưa có
2. Mỗi <h2> có ít nhất 1 từ khóa liên quan
3. Không keyword stuffing
4. Meta description 150–160 ký tự, có keyword

Output JSON:
{"html":"[HTML tối ưu]","metaDescription":"[150-160 ký tự]"}

Chỉ trả JSON.`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text = result.response.text();
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const p = JSON.parse(m[0]);
      return { html: p.html || html, metaDescription: p.metaDescription || `${keyword} - Nội Thất Minh Quân` };
    }
  } catch { /* skip */ }
  return { html, metaDescription: `${keyword} - Nội Thất Minh Quân, giá xưởng, giao hàng nhanh toàn quốc.` };
}

// ─── Editor QC (non-streaming) ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runEditorQC(model: any, html: string, forbiddenList: string[]) {
  const prompt = `Bạn là Editor QC Agent.

Từ CẤM: ${forbiddenList.join(', ')}

HTML cần kiểm tra:
${html}

Humanize: xóa từ cấm, chuyển bị động → chủ động, câu ngắn, thêm số liệu cụ thể.
Chấm điểm /100 (4 tiêu chí × 25).

Output JSON:
{"html":"[HTML sau humanize]","scoreBreakdown":{"language_natural":0,"structure":0,"eeat_signals":0,"engagement":0}}

Chỉ trả JSON.`;

  const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  const text = result.response.text();
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const p = JSON.parse(m[0]);
      const sb: ScoreBreakdown = {
        language_natural: Math.min(25, Math.max(0, Number(p.scoreBreakdown?.language_natural) || 18)),
        structure:        Math.min(25, Math.max(0, Number(p.scoreBreakdown?.structure)        || 18)),
        eeat_signals:     Math.min(25, Math.max(0, Number(p.scoreBreakdown?.eeat_signals)     || 16)),
        engagement:       Math.min(25, Math.max(0, Number(p.scoreBreakdown?.engagement)       || 16)),
      };
      return { html: p.html || html, scoreBreakdown: sb };
    }
  } catch { /* skip */ }
  return { html, scoreBreakdown: { language_natural: 18, structure: 18, eeat_signals: 16, engagement: 16 } };
}

function countWords(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body: WriteRequest = await request.json();
  const { provider, step1, step2, outline } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => sseEvent(controller, data);

      try {
        // Validate
        if (!step2?.selectedTitle) {
          send({ type: 'error', message: 'Thiếu tiêu đề bài viết' });
          controller.close();
          return;
        }

        // Build model
        const model = buildModel(provider || 'gemini-flash');

        // Brand context
        const brandPrompt   = await buildBrandPrompt(body.brandConfig);
        const forbiddenList = buildForbiddenList(body.brandConfig?.forbiddenExtra);

        // Google Search data (nếu user chọn)
        let googleDataBlock = '';
        if (body.dataSource === 'google_search') {
          send({ type: 'step', step: 'google_search', label: '🔍 Đang lấy dữ liệu từ Google...' });
          const googleData = await fetchGoogleSearchData(step1.keyword.trim(), {
            num: 5,
            crawl: true,
            language: step1.language,
          });
          if (googleData) {
            googleDataBlock = buildDataBlock(googleData);
            send({ type: 'step_done', step: 'google_search', label: `✅ Google: ${googleData.items.length} kết quả` });
          } else {
            send({ type: 'step_done', step: 'google_search', label: '⚠️ Google không khả dụng — dùng AI only' });
          }
        }

        // Fetch reference URLs
        let referenceData = '';
        if (body.dataSource === 'from_url') {
          const urls = body.referenceUrls?.length ? body.referenceUrls : body.referenceUrl ? [body.referenceUrl] : [];
          if (urls.length) {
            send({ type: 'step', step: 'fetch', label: `Đang đọc ${urls.length} link tham khảo...` });
            const fetched = await Promise.allSettled(urls.slice(0, 5).map(fetchPageContent));
            referenceData = fetched
              .map((r, i) => r.status === 'fulfilled' && r.value ? `### Tham khảo ${i + 1}:\n${r.value}` : '')
              .filter(Boolean).join('\n\n---\n\n');
          }
        } else if (body.dataSource === 'manual_input' && body.manualData) {
          referenceData = body.manualData;
        }

        // Competitor analysis (từ body nếu có)
        let competitorAnalysis = '';
        if (body.competitorUrls?.length) {
          const contents = await Promise.allSettled(body.competitorUrls.map(fetchPageContent));
          const valid = contents
            .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value.length > 100)
            .map((r) => r.value);
          if (valid.length) {
            competitorAnalysis = valid.map((t, i) => `### Đối thủ ${i + 1}:\n${t}`).join('\n\n---\n\n');
          }
        }

        // ── Bước 1: Writer (STREAMING) ────────────────────────────────────────
        send({ type: 'step', step: 'writing', label: 'Writer đang viết bài...' });

        let charCount = 0;
        const rawHtml = await runWriterStream(
          model,
          step1,
          step2,
          outline,
          googleDataBlock ? `${brandPrompt}\n\n${googleDataBlock}` : brandPrompt,
          competitorAnalysis,
          referenceData,
          (chunk) => {
            charCount += chunk.length;
            send({ type: 'chunk', text: chunk, charCount });
          }
        );

        send({ type: 'step_done', step: 'writing', charCount });

        // ── Bước 2: SEO Specialist ────────────────────────────────────────────
        send({ type: 'step', step: 'seo', label: 'SEO Specialist đang tối ưu kỹ thuật...' });
        const { html: seoHtml, metaDescription } = await runSeoSpecialist(
          model, rawHtml, outline.primaryKeyword, step2.selectedTitle
        );
        send({ type: 'step_done', step: 'seo' });

        // ── Bước 3: Editor QC ─────────────────────────────────────────────────
        send({ type: 'step', step: 'editor', label: 'Editor QC đang humanize & chấm điểm...' });
        const { html: finalHtml, scoreBreakdown } = await runEditorQC(model, seoHtml, forbiddenList);
        send({ type: 'step_done', step: 'editor' });

        // ── Kết quả cuối ──────────────────────────────────────────────────────
        const humanness_score = scoreBreakdown.language_natural + scoreBreakdown.structure + scoreBreakdown.eeat_signals + scoreBreakdown.engagement;
        const decision = humanness_score >= 76 ? 'PUBLISH' : humanness_score >= 60 ? 'REVIEW' : 'REWRITE';
        const wordCount = countWords(finalHtml);
        const scoreBreakdownJson: Prisma.InputJsonObject = {
          language_natural: scoreBreakdown.language_natural,
          structure: scoreBreakdown.structure,
          eeat_signals: scoreBreakdown.eeat_signals,
          engagement: scoreBreakdown.engagement,
        };

        // ── Lưu vào database ──────────────────────────────────────────────────
        try {
          // Find article by runId
          const article = await prisma.article.findFirst({
            where: { runId: body.runId },
          });

          if (article) {
            // Update article with content
            await prisma.article.update({
              where: { id: article.id },
              data: {
                htmlContent: finalHtml,
                selectedTitle: step2.selectedTitle,
                metaDescription,
                wordCount,
                humannessScore: humanness_score,
                seoScore: scoreBreakdown.language_natural, // Store language_natural as seo_score
                scoreBreakdown: scoreBreakdownJson,
                status: 'WRITTEN',
              },
            });
            console.log(`[write-stream] Article updated: id=${article.id}, wordCount=${wordCount}, score=${humanness_score}`);
          } else {
            console.warn(`[write-stream] Article not found for runId=${body.runId}`);
          }
        } catch (dbError) {
          console.error('[write-stream] Database error:', dbError);
          // Don't fail the request if DB update fails
        }

        send({
          type: 'done',
          data: { html: finalHtml, humanness_score, decision, title: step2.selectedTitle, wordCount, metaDescription, scoreBreakdown },
        });

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Lỗi server';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
