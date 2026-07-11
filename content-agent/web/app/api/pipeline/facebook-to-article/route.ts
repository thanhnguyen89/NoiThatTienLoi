import { NextRequest } from 'next/server';
import { buildBrandPrompt, buildForbiddenList } from '../_context';
import { buildGeminiModel } from '../_gemini';
import OpenAI from 'openai';
import type { GenerateContentResult } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FBRequest {
  provider:    string;
  keyword:     string;
  secondaryKeywords: string[];
  fbContent:   string;
  writingMode: 'expand' | 'rewrite' | 'reformat';
  targetLength: number;
  tone:        string;
  language:    string;
  title:       string;
}

interface ScoreBreakdown {
  language_natural: number;
  structure:        number;
  eeat_signals:     number;
  engagement:       number;
}

// ─── SSE helper ──────────────────────────────────────────────────────────────

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// ─── Retry helper ────────────────────────────────────────────────────────────

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

// ─── Build model (clone từ write-stream) ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildModel(provider: string): any {
  if (provider === 'gpt-4o' || provider === 'gpt-4o-mini') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY chưa được cấu hình');
    const client = new OpenAI({ apiKey });
    const name = provider === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';
    return {
      generateContent: async (prompt: string) => {
        const c = await client.chat.completions.create({ model: name, messages: [{ role: 'user', content: prompt }], temperature: 0.75 });
        return { response: { text: () => c.choices[0]?.message?.content ?? '' } };
      },
      generateContentStream: async (prompt: string) => {
        const stream = await client.chat.completions.create({ model: name, messages: [{ role: 'user', content: prompt }], temperature: 0.75, stream: true });
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
        const c = await client.chat.completions.create({ model: 'grok-3', messages: [{ role: 'user', content: prompt }], temperature: 0.75 });
        return { response: { text: () => c.choices[0]?.message?.content ?? '' } };
      },
      generateContentStream: async (prompt: string) => {
        const stream = await client.chat.completions.create({ model: 'grok-3', messages: [{ role: 'user', content: prompt }], temperature: 0.75, stream: true });
        async function* gen() { for await (const chunk of stream) { const d = chunk.choices[0]?.delta?.content ?? ''; if (d) yield { text: () => d }; } }
        return gen();
      },
    };
  }
  return buildGeminiModel('flash');
}

// ─── Writing mode descriptions ────────────────────────────────────────────────

const MODE_INSTRUCTIONS: Record<string, string> = {
  expand:   'Lấy ý tưởng chính từ bài Facebook, MỞ RỘNG thành bài blog đầy đủ. Giữ lại thông tin cốt lõi nhưng thêm chiều sâu, số liệu, ví dụ cụ thể, FAQ, và cấu trúc SEO rõ ràng.',
  rewrite:  'Dùng bài Facebook chỉ làm NGUỒN THAM KHẢO ý tưởng. Viết hoàn toàn mới, độc lập — nội dung phải khác hẳn về cách diễn đạt nhưng cùng chủ đề và hướng đến mục tiêu SEO.',
  reformat: 'Giữ NGUYÊN nội dung và ý tưởng từ bài Facebook, chỉ ĐỊA ĐỊNH LẠI cấu trúc thành bài blog: thêm tiêu đề H2/H3, chia đoạn rõ ràng, thêm intro/outro chuẩn blog. Không thêm thông tin mới ngoài bài gốc.',
};

const TONE_MAP: Record<string, string> = {
  professional: 'Chuyên nghiệp, tư vấn như chuyên gia, dùng thuật ngữ ngành rõ ràng',
  friendly:     'Thân thiện, gần gũi như người bạn tư vấn — dùng "bạn/mình"',
  formal:       'Trang trọng, học thuật — phù hợp với tài liệu kỹ thuật, báo cáo',
  casual:       'Tự nhiên, nhẹ nhàng, không quá khuôn phép',
};

// ─── Writer (streaming) ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runWriter(model: any, req: FBRequest, brandPrompt: string, onChunk: (t: string) => void): Promise<string> {
  const lang = req.language === 'Vietnamese' ? 'tiếng Việt' : 'English';
  const modeInstr = MODE_INSTRUCTIONS[req.writingMode] || MODE_INSTRUCTIONS.expand;
  const toneInstr = TONE_MAP[req.tone] || TONE_MAP.friendly;

  const prompt = `Bạn là Writer Agent chuyên chuyển đổi nội dung mạng xã hội thành bài blog SEO chuyên nghiệp.

${brandPrompt}

## Nhiệm vụ:
${modeInstr}

## Bài Facebook gốc:
"""
${req.fbContent.slice(0, 3000)}
"""

## Thông tin bài blog cần tạo:
- Tiêu đề: ${req.title}
- Từ khóa chính: ${req.keyword}
${req.secondaryKeywords.length > 0 ? `- Từ khóa phụ: ${req.secondaryKeywords.join(', ')}` : ''}
- Độ dài mục tiêu: ${req.targetLength} từ
- Giọng văn: ${toneInstr}
- Ngôn ngữ: ${lang}

## Yêu cầu output HTML:
- Bắt đầu bằng <article>, kết thúc </article>
- <h1> cho tiêu đề chính (copy từ "Tiêu đề" trên)
- <h2> và <h3> cho các mục con
- <p> cho đoạn văn
- Thêm <blockquote> cho những điểm nhấn, quote quan trọng
- Thêm bảng <table> nếu có thể so sánh/thống kê
- Từ khóa "${req.keyword}" xuất hiện tự nhiên, mật độ 1.0–1.5%
- Không có CSS, script, hay thẻ ngoài nội dung bài
- Paragraph đầu tiên phải có từ khóa chính
- Kết bài bằng CTA ngắn gọn, thực tế

Chỉ trả về HTML, không giải thích gì thêm.`;

  let full = '';
  try {
    const stream = await model.generateContentStream(prompt);
    for await (const chunk of stream.stream) {
      const d = chunk.text();
      if (d) { full += d; onChunk(d); }
    }
  } catch {
    const result = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
    full = result.response.text();
    onChunk(full);
  }

  // Clean HTML
  const htmlMatch = full.match(/```html\n?([\s\S]*?)\n?```/i);
  if (htmlMatch) return htmlMatch[1].trim();
  const articleMatch = full.match(/<article[\s\S]*<\/article>/i);
  if (articleMatch) return articleMatch[0];
  return full.trim();
}

// ─── SEO Specialist ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runSeo(model: any, html: string, keyword: string, title: string) {
  const prompt = `Bạn là SEO Specialist Agent.

## Keyword: ${keyword}
## Tiêu đề: ${title}
## HTML cần tối ưu:
${html.slice(0, 4000)}

Nhiệm vụ:
1. Từ khóa "${keyword}" trong 100 từ đầu — thêm nếu chưa có
2. Mỗi <h2> có ít nhất 1 từ liên quan đến keyword
3. Không keyword stuffing
4. Meta description 150–160 ký tự, có keyword

Trả JSON:
{"html":"[HTML tối ưu]","metaDescription":"[150-160 ký tự]"}

Chỉ trả JSON.`;

  const r = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  try {
    const m = r.response.text().match(/\{[\s\S]*\}/);
    if (m) {
      const p = JSON.parse(m[0]);
      return { html: p.html || html, metaDescription: p.metaDescription || `${keyword}` };
    }
  } catch { /* skip */ }
  return { html, metaDescription: `${keyword} - Nội Thất Minh Quân` };
}

// ─── Editor QC ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runEditor(model: any, html: string, forbiddenList: string[]) {
  const prompt = `Bạn là Editor QC Agent.

Từ CẤM: ${forbiddenList.join(', ')}

HTML:
${html.slice(0, 4000)}

Humanize: xóa từ cấm, bị động → chủ động, câu ngắn xen câu dài, giữ thông tin từ Facebook gốc.
Chấm điểm /100 (4 tiêu chí × 25).

Trả JSON:
{"html":"[HTML sau humanize]","scoreBreakdown":{"language_natural":0,"structure":0,"eeat_signals":0,"engagement":0}}

Chỉ trả JSON.`;

  const r = await callWithRetry(() => model.generateContent(prompt)) as GenerateContentResult;
  try {
    const m = r.response.text().match(/\{[\s\S]*\}/);
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

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body: FBRequest = await request.json();

  if (!body.fbContent?.trim()) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Thiếu nội dung bài Facebook' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }
  if (!body.keyword?.trim()) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Thiếu từ khóa SEO' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => sseEvent(controller, data);

      try {
        const model        = buildModel(body.provider || 'gemini-flash');
        const brandPrompt  = await buildBrandPrompt();
        const forbidden    = buildForbiddenList();

        // ── Bước 1: Writer (streaming) ────────────────────────────────────────
        send({ type: 'step', step: 'writing', label: 'Writer chuyển đổi bài Facebook...' });

        let charCount = 0;
        const rawHtml = await runWriter(model, body, brandPrompt, (chunk) => {
          charCount += chunk.length;
          send({ type: 'chunk', text: chunk, charCount });
        });

        send({ type: 'step_done', step: 'writing', charCount });

        // ── Bước 2: SEO ───────────────────────────────────────────────────────
        send({ type: 'step', step: 'seo', label: 'SEO Specialist tối ưu...' });
        const { html: seoHtml, metaDescription } = await runSeo(model, rawHtml, body.keyword, body.title);
        send({ type: 'step_done', step: 'seo' });

        // ── Bước 3: Editor QC ─────────────────────────────────────────────────
        send({ type: 'step', step: 'editor', label: 'Editor QC humanize & chấm điểm...' });
        const { html: finalHtml, scoreBreakdown } = await runEditor(model, seoHtml, forbidden);
        send({ type: 'step_done', step: 'editor' });

        // ── Done ──────────────────────────────────────────────────────────────
        const wordCount = finalHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        const totalScore = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);

        send({
          type: 'done',
          data: {
            html:             finalHtml,
            title:            body.title,
            metaDescription,
            wordCount,
            humanness_score:  totalScore,
            decision:         totalScore >= 76 ? 'PUBLISH' : totalScore >= 60 ? 'REVIEW' : 'REWRITE',
            scoreBreakdown,
          },
        });

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi server';
        console.error('[facebook-to-article]', err);
        send({ type: 'error', message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
