# FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md
## Hướng dẫn code tính năng "Tạo Facebook Comment"

> Phân tích từ: https://aiktp.com/vi/facebook-post-comments-generator  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Gemini API  
> Cùng nhóm với: `/facebook-post-generator` (tab navigation liên kết)

---

## ⚠️ Điểm khác biệt & chú ý khi implement

| # | Điểm | Ghi chú |
|---|------|---------|
| 1 | **Không có DB Article** | Pure generation tool — không tạo Article record, không redirect |
| 2 | **Output là plain text** (không phải HTML) | Mỗi comment = 1 đoạn text ngắn, không có heading/tag |
| 3 | **Bulk generation: tối đa 50 comment** | N ≤ 10 → 1 AI call; N 11–30 → 2 batch; N 31–50 → 3 batch |
| 4 | **Parse numbered list từ AI output** | AI trả `1. [text]\n2. [text]...` → parse thành `string[]` |
| 5 | **Copy individual + Copy All** | Mỗi card có nút Copy riêng + nút "Copy tất cả" ở đầu |
| 6 | **aiktp.com dùng WebSocket — ta dùng SSE** | SSE đơn giản hơn, consistent với stack hiện tại |
| 7 | **Không requireAuth** | Free tool — có word limit cho unauthenticated user |
| 8 | **6 style options** | Khác với `REWRITE_STYLES` (13 options) — comment có style riêng |
| 9 | **Hiện comments dạng cards** — không phải textarea | Mỗi comment 1 card, có index badge + copy button |
| 10 | **Word count input limit** | Hiển thị "số từ: X / max Y" — free user giới hạn 500 từ input |

---

## 1. Tổng quan kiến trúc

### So sánh với các tool đơn giản khác

| | Viết lại đoạn văn | **Tạo Facebook Comment** |
|---|---|---|
| Layout | 2 cột (input / output text) | 2 cột (input form / output cards) |
| DB Article | Không | **Không** |
| Output format | Plain text | **Mảng comments (cards)** |
| Số output | 1 | **1–50** |
| Batch AI call | Không | **Có (N > 10)** |
| Auth | Không bắt buộc | **Không bắt buộc** |
| Style options | 13 (rewrite styles) | **6 (comment styles)** |

### Flow hoạt động

```
User nhập nội dung bài post Facebook
     + Chọn ngôn ngữ, style, số lượng comment
     ↓ click "Generator"
     POST /api/facebook-comment/generate
     → Validate input (min 5 từ, max 500 từ)
     → Chia thành batch nếu N > 10
     → Mỗi batch: AI generate → parse → append cards
     → SSE stream: type='batch' chứa mảng comments
     → FE nhận batch → render từng comment card
     → Khi done: enable "Copy tất cả"
```

### Cấu trúc file cần tạo

```
web/
├── app/
│   ├── facebook-comment/
│   │   └── page.tsx                    ← Tool 2 cột
│   └── api/
│       └── facebook-comment/
│           └── generate/
│               └── route.ts            ← SSE generator (batch support)
└── lib/
    └── facebook-comment/
        ├── types.ts                    ← Types
        ├── options.ts                  ← Constants (styles, counts)
        └── parser.ts                   ← parseCommentList() từ AI output
```

### File tái sử dụng (KHÔNG tạo mới)

- `lib/tinh-gon/model.ts` → `buildTinhGonModel()` (dùng gemini-flash mặc định)

---

## 2. Types — `web/lib/facebook-comment/types.ts`

```typescript
export type CommentStyle =
  | 'funny'         // Funny - Thêm cảm xúc vui vẻ 😊
  | 'shorten'       // Rút ngắn - Rút gọn hơn, dễ đọc hơn
  | 'creative'      // Creative - Sáng tạo hơn
  | 'friendly'      // Friendly - Thân thiện hơn
  | 'casual'        // Casual - Thân mật hơn
  | 'professional'; // Professional - Chuyên nghiệp hơn

// Các giá trị hợp lệ cho số lượng comment
export type CommentCount = 1|2|3|4|5|6|7|8|9|10|20|30|40|50;

export interface CommentGeneratorConfig {
  postContent: string;       // Nội dung bài post Facebook
  language:    string;       // Ngôn ngữ output (Vietnamese, English, ...)
  style:       CommentStyle; // Phong cách viết
  count:       CommentCount; // Số lượng comment cần tạo
}

// SSE event: một batch comments
export interface CommentBatchEvent {
  type:       'batch';
  comments:   string[];   // Mảng comment text trong batch này
  batchIndex: number;     // 0-based batch index
  totalBatch: number;     // Tổng số batch
}

// SSE event: hoàn thành
export interface CommentDoneEvent {
  type:  'done';
  total: number;   // Tổng số comment đã generate
}

// SSE event: lỗi
export interface CommentErrorEvent {
  type:    'error';
  message: string;
}

export type CommentSSEEvent = CommentBatchEvent | CommentDoneEvent | CommentErrorEvent;

// State của từng comment card trong UI
export interface CommentCard {
  id:       string;   // unique id cho React key
  text:     string;
  copied:   boolean;  // để hiện "Đã copy" momentarily
}
```

---

## 3. Options — `web/lib/facebook-comment/options.ts`

```typescript
import type { CommentStyle, CommentCount } from './types';

export const COMMENT_STYLES: Array<{
  value: CommentStyle;
  label: string;
  emoji: string;
  note:  string;
}> = [
  {
    value: 'funny',
    label: 'Funny',
    emoji: '😊',
    note:  'Thêm cảm xúc vui vẻ, hài hước nhẹ nhàng',
  },
  {
    value: 'shorten',
    label: 'Rút ngắn',
    emoji: '✂️',
    note:  'Rút gọn hơn, dễ đọc hơn — comment cực ngắn',
  },
  {
    value: 'creative',
    label: 'Creative',
    emoji: '✨',
    note:  'Sáng tạo, góc nhìn mới lạ, từ ngữ độc đáo',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    emoji: '🤝',
    note:  'Thân thiện, ấm áp, ủng hộ người đăng',
  },
  {
    value: 'casual',
    label: 'Casual',
    emoji: '💬',
    note:  'Thân mật, thoải mái như nói chuyện hàng ngày',
  },
  {
    value: 'professional',
    label: 'Professional',
    emoji: '👔',
    note:  'Chuyên nghiệp, nhận xét sâu sắc, súc tích',
  },
];

// Các giá trị số lượng comment có thể chọn
export const COMMENT_COUNTS: CommentCount[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50];

// Giới hạn input word count cho free user
export const FREE_USER_MAX_WORDS = 500;

// Batch size: AI generate tối đa N comment mỗi lần
export const BATCH_SIZE = 10;

// Dùng lại từ viet-lai (hoặc định nghĩa inline)
export const COMMENT_LANGUAGES = [
  { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
  { value: 'English',    label: '🇬🇧 English' },
  { value: 'Portuguese', label: '🇵🇹 Português' },
  // ... 80+ ngôn ngữ — cùng danh sách với viet-lai-url/options.ts
] as const;
```

---

## 4. Parser — `web/lib/facebook-comment/parser.ts`

Đây là phần dễ gây lỗi nhất: AI không phải lúc nào cũng trả output đúng format.

```typescript
/**
 * Parse danh sách comment từ AI output.
 *
 * AI được yêu cầu trả:
 *   1. [comment text]
 *   2. [comment text]
 *   ...
 *
 * Nhưng thực tế có thể trả:
 *   - "1) text"
 *   - "1- text"
 *   - "Comment 1: text"
 *   - Blank lines giữa các comment
 *   - Lẫn lộn text giải thích
 */
export function parseCommentList(rawText: string, expectedCount: number): string[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const comments: string[] = [];

  for (const line of lines) {
    // Bỏ qua dòng quá ngắn (< 5 ký tự) — thường là số thứ tự đơn thuần
    if (line.length < 5) continue;

    // Strip prefix: "1.", "1)", "1-", "Comment 1:", "• ", "- "
    const stripped = line
      .replace(/^\d+[\.\)\-]\s*/, '')         // "1. " / "1) " / "1- "
      .replace(/^Comment\s+\d+\s*[:.]?\s*/i, '') // "Comment 1: "
      .replace(/^[\•\-\*]\s*/, '')             // "• " / "- " / "* "
      .trim();

    // Bỏ qua dòng vẫn trống sau strip, hoặc là heading/meta text
    if (!stripped || stripped.length < 3) continue;
    if (/^(comment|bình luận|ghi chú|note|output|result)/i.test(stripped)) continue;

    comments.push(stripped);
    if (comments.length >= expectedCount) break;   // Đủ số lượng cần thiết
  }

  return comments;
}

/**
 * Gộp tất cả comments thành 1 string để copy all.
 */
export function joinComments(comments: string[], separator = '\n\n'): string {
  return comments.join(separator);
}
```

---

## 5. API: `/api/facebook-comment/generate/route.ts`

SSE endpoint — xử lý batch generation cho N > 10.

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { BATCH_SIZE, FREE_USER_MAX_WORDS } from '@/lib/facebook-comment/options';
import { parseCommentList } from '@/lib/facebook-comment/parser';
import type { CommentBatchEvent, CommentDoneEvent, CommentErrorEvent } from '@/lib/facebook-comment/types';

export const runtime = 'nodejs';

// ─── Style instructions ───────────────────────────────────────────────────────

const STYLE_INSTRUCTIONS: Record<string, string> = {
  funny:        'Vui vẻ, hài hước nhẹ nhàng. Có thể dùng emoji. Comment cảm xúc, dễ thương.',
  shorten:      'Cực ngắn — tối đa 1-2 câu. Súc tích, đúng điểm, không dư thừa.',
  creative:     'Sáng tạo, độc đáo, góc nhìn bất ngờ. Tránh các cụm từ thông thường.',
  friendly:     'Thân thiện, ấm áp, ủng hộ. Như comment của người bạn tốt.',
  casual:       'Thoải mái, thân mật như nói chuyện. Có thể dùng từ lóng nhẹ.',
  professional: 'Nhận xét sâu sắc, chuyên nghiệp. Không emoji thừa, câu cú chỉnh chu.',
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildCommentPrompt(
  postContent:  string,
  count:        number,
  style:        string,
  language:     string,
): string {
  const styleInstruction = STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.friendly;

  return `
Bạn là AI chuyên tạo comment Facebook đa dạng và tự nhiên.

## Bài post Facebook cần comment:
${postContent}

## Yêu cầu:
- Tạo đúng ${count} comment KHÁC NHAU cho bài post trên.
- Ngôn ngữ: ${language}
- Phong cách: ${styleInstruction}
- Mỗi comment phải có cảm xúc khác nhau, cách diễn đạt khác nhau.
- Comment ngắn như comment Facebook thật: thường 1–3 câu.
- Không dùng từ "bình luận", "comment", "post" trong nội dung comment.
- Không lặp lại ý giống nhau giữa các comment.

## Format output bắt buộc:
1. [nội dung comment 1]
2. [nội dung comment 2]
...
${count}. [nội dung comment ${count}]

Chỉ trả danh sách số thứ tự. Không giải thích thêm.
`.trim();
}

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sseEvent(
  controller: ReadableStreamDefaultController,
  data: CommentBatchEvent | CommentDoneEvent | CommentErrorEvent,
) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const generateSchema = z.object({
  postContent: z.string().min(5, 'Nội dung post quá ngắn').max(10000),
  language:    z.string().default('Vietnamese'),
  style:       z.string().default('friendly'),
  count:       z.number().int().min(1).max(50).default(5),
});

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed  = generateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          type:    'error',
          message: parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { postContent, language, style, count } = parsed.data;

    // Word count check — free user limit
    const wordCount = postContent.trim().split(/\s+/).length;
    if (wordCount > FREE_USER_MAX_WORDS) {
      return new Response(
        JSON.stringify({
          type:    'error',
          message: `Nội dung vượt quá ${FREE_USER_MAX_WORDS} từ (hiện tại: ${wordCount} từ).`,
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Chia thành batches
    const batches: number[] = [];
    let remaining = count;
    while (remaining > 0) {
      const batchCount = Math.min(remaining, BATCH_SIZE);
      batches.push(batchCount);
      remaining -= batchCount;
    }

    const model = buildTinhGonModel('gemini-flash');   // Hardcode fast model

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: CommentBatchEvent | CommentDoneEvent | CommentErrorEvent) =>
          sseEvent(controller, data);

        try {
          let totalGenerated = 0;

          for (let i = 0; i < batches.length; i++) {
            const batchCount  = batches[i]!;
            const prompt      = buildCommentPrompt(postContent, batchCount, style, language);

            let rawOutput = '';

            try {
              // Không stream chunk-by-chunk — đợi cả batch xong mới parse
              const result = await model.generateContent(prompt);
              rawOutput = result.response.text();
            } catch {
              // Retry với generateContentStream fallback
              try {
                const aiStream = await model.generateContentStream(prompt);
                for await (const chunk of aiStream) {
                  rawOutput += chunk.text() ?? '';
                }
              } catch (retryError) {
                send({
                  type:    'error',
                  message: `Lỗi batch ${i + 1}: ${retryError instanceof Error ? retryError.message : 'AI error'}`,
                });
                continue; // Tiếp tục batch tiếp theo thay vì dừng hẳn
              }
            }

            // Parse comments từ raw output
            const comments = parseCommentList(rawOutput, batchCount);

            if (comments.length === 0) {
              // AI trả về không parse được — thử lại với format đơn giản hơn
              send({
                type:    'error',
                message: `Batch ${i + 1}: AI trả về không đúng format. Thử lại.`,
              });
              continue;
            }

            totalGenerated += comments.length;

            send({
              type:       'batch',
              comments,
              batchIndex: i,
              totalBatch: batches.length,
            });

            // Delay nhỏ giữa các batch để tránh rate limit
            if (i < batches.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          send({ type: 'done', total: totalGenerated });
        } catch (error) {
          send({
            type:    'error',
            message: error instanceof Error ? error.message : 'Lỗi không xác định',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection:      'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        type:    'error',
        message: error instanceof Error ? error.message : 'Lỗi server',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
```

---

## 6. Page — `web/app/facebook-comment/page.tsx`

Layout 2 cột: trái (form input), phải (comment cards output).

```tsx
'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { COMMENT_COUNTS, COMMENT_LANGUAGES, COMMENT_STYLES, FREE_USER_MAX_WORDS } from '@/lib/facebook-comment/options';
import { joinComments } from '@/lib/facebook-comment/parser';
import type {
  CommentCard,
  CommentCount,
  CommentGeneratorConfig,
  CommentSSEEvent,
  CommentStyle,
} from '@/lib/facebook-comment/types';

const DEFAULT_CONFIG: CommentGeneratorConfig = {
  postContent: '',
  language:    'Vietnamese',
  style:       'friendly',
  count:       5,
};

export default function FacebookCommentPage() {
  const uid = useId();   // prefix cho card IDs

  const [config, setConfig]     = useState<CommentGeneratorConfig>(DEFAULT_CONFIG);
  const [cards, setCards]       = useState<CommentCard[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [allCopied, setAllCopied] = useState(false);

  const abortRef    = useRef<AbortController | null>(null);
  const cardCounter = useRef(0);

  const inputWordCount = config.postContent.trim()
    ? config.postContent.trim().split(/\s+/).length
    : 0;

  // ── Generate ────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!config.postContent.trim()) {
      setError('Vui lòng nhập nội dung bài post Facebook.');
      return;
    }
    if (inputWordCount > FREE_USER_MAX_WORDS) {
      setError(`Nội dung vượt ${FREE_USER_MAX_WORDS} từ (hiện tại: ${inputWordCount} từ).`);
      return;
    }

    // Huỷ request trước
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setDone(false);
    setError('');
    setCards([]);
    setAllCopied(false);
    cardCounter.current = 0;

    // Tính số batch để hiện progress
    const batchCount = Math.ceil(config.count / 10);
    setProgress({ current: 0, total: batchCount });

    try {
      const response = await fetch('/api/facebook-comment/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
        signal:  abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const errData = await response.json() as { message?: string };
        throw new Error(errData.message ?? 'Lỗi kết nối');
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6)) as CommentSSEEvent;

            if (event.type === 'batch') {
              // Append new cards
              const newCards: CommentCard[] = event.comments.map((text) => ({
                id:     `${uid}-${++cardCounter.current}`,
                text,
                copied: false,
              }));
              setCards((prev) => [...prev, ...newCards]);
              setProgress((prev) => ({ ...prev, current: event.batchIndex + 1 }));

            } else if (event.type === 'done') {
              setDone(true);

            } else if (event.type === 'error') {
              // Lỗi batch đơn lẻ — hiện nhưng không dừng
              setError((prev) =>
                prev ? `${prev} | ${event.message}` : event.message
              );
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  }, [config, inputWordCount, uid]);

  // ── Copy single ─────────────────────────────────────────────────────────────

  function handleCopyCard(id: string) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;

    void navigator.clipboard.writeText(card.text).then(() => {
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, copied: true } : c))
      );
      setTimeout(() => {
        setCards((prev) =>
          prev.map((c) => (c.id === id ? { ...c, copied: false } : c))
        );
      }, 1500);
    });
  }

  // ── Copy all ────────────────────────────────────────────────────────────────

  function handleCopyAll() {
    const allText = joinComments(cards.map((c) => c.text));
    void navigator.clipboard.writeText(allText).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Tab nav: liên kết với Facebook Post Generator */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0 px-4">
        {[
          { label: 'Tạo Facebook Post',    href: '/facebook-post',    active: false },
          { label: 'Tạo Facebook Comment', href: '/facebook-comment', active: true  },
        ].map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab.active
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Input + Controls ── */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 overflow-y-auto p-4">

          <h1 className="text-base font-bold text-gray-900 mb-1">Tạo Facebook Comment</h1>
          <p className="text-xs text-gray-500 mb-4">
            Tạo hàng loạt comment đa dạng cho bài post Facebook.
          </p>

          {/* Post content input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Nội dung bài post Facebook <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${inputWordCount > FREE_USER_MAX_WORDS ? 'text-red-500' : 'text-gray-400'}`}>
                số từ: {inputWordCount}
                {inputWordCount > FREE_USER_MAX_WORDS && ` / ${FREE_USER_MAX_WORDS}`}
              </span>
            </div>
            <textarea
              value={config.postContent}
              onChange={(e) => setConfig((prev) => ({ ...prev, postContent: e.target.value }))}
              placeholder="Dán nội dung bài post Facebook vào đây..."
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Language */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ngôn ngữ</label>
            <select
              value={config.language}
              onChange={(e) => setConfig((prev) => ({ ...prev, language: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMMENT_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* Style */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">Phong cách viết</label>
            <div className="space-y-1.5">
              {COMMENT_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setConfig((prev) => ({ ...prev, style: s.value }))}
                  title={s.note}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    config.style === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base flex-shrink-0">{s.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold">{s.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{s.note}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Số lượng comment
            </label>
            <div className="grid grid-cols-7 gap-1">
              {COMMENT_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setConfig((prev) => ({ ...prev, count: n as CommentCount }))}
                  className={`py-1.5 rounded text-xs font-medium transition-colors ${
                    config.count === n
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {config.count > 10 && (
              <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded px-2 py-1">
                ⚡ {Math.ceil(config.count / 10)} lần gọi AI — có thể mất vài giây
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={() => void handleGenerate()}
            disabled={loading || !config.postContent.trim()}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {progress.total > 1
                  ? `Batch ${progress.current}/${progress.total}...`
                  : 'Đang tạo comment...'}
              </span>
            ) : 'Generator'}
          </button>

        </div>

        {/* ── RIGHT: Comment Cards Output ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

          {/* Output header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">
                {cards.length > 0
                  ? `${cards.length} comment${loading ? ' (đang tạo...)' : ''}`
                  : 'Kết quả'}
              </span>
              {loading && progress.total > 1 && (
                <div className="flex gap-1">
                  {Array.from({ length: progress.total }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < progress.current ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {cards.length > 0 && (
              <button
                onClick={handleCopyAll}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  allCopied
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {allCopied ? '✓ Đã copy tất cả' : 'Copy tất cả'}
              </button>
            )}
          </div>

          {/* Cards list */}
          <div className="flex-1 overflow-y-auto p-4">
            {cards.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-4xl mb-3">💬</span>
                <p className="text-sm font-medium">Chưa có comment nào</p>
                <p className="text-xs mt-1">Nhập nội dung post và bấm "Generator"</p>
              </div>
            )}

            {cards.length === 0 && loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">Đang tạo comment...</p>
              </div>
            )}

            <div className="space-y-3">
              {cards.map((card, index) => (
                <CommentCardItem
                  key={card.id}
                  card={card}
                  index={index + 1}
                  onCopy={() => handleCopyCard(card.id)}
                />
              ))}
            </div>

            {/* Loading skeleton cho batch tiếp theo */}
            {loading && cards.length > 0 && (
              <div className="mt-3 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Comment Card Component ───────────────────────────────────────────────────

interface CommentCardItemProps {
  card:   CommentCard;
  index:  number;
  onCopy: () => void;
}

function CommentCardItem({ card, index, onCopy }: CommentCardItemProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        {/* Index badge */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
          {index}
        </span>

        {/* Comment text */}
        <p className="flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {card.text}
        </p>

        {/* Copy button — hiện khi hover hoặc copied */}
        <button
          onClick={onCopy}
          className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-lg border transition-all ${
            card.copied
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {card.copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
```

---

## 7. Sidebar — thêm vào `web/components/Sidebar.tsx`

```typescript
// Thêm vào navGroups, section "CÔNG CỤ SOCIAL":
{
  label: 'Social',
  items: [
    { href: '/facebook-post',    icon: '📝', label: 'Tạo Facebook Post'    },
    { href: '/facebook-comment', icon: '💬', label: 'Tạo Facebook Comment' },
  ],
},
```

---

## 8. Logic Batch — giải thích chi tiết

### Tại sao cần batch?

```
User chọn 50 comments → 1 prompt duy nhất = ~3000 tokens output
→ Model context limit có thể cắt ngang
→ Parsing không ổn định với danh sách dài

→ Giải pháp: Chia thành batch 10 comments mỗi lần
  50 comments = 5 AI calls x 10 comments
  30 comments = 3 AI calls x 10 comments
  5 comments  = 1 AI call x 5 comments
```

### Batch calculation

```typescript
// Ví dụ với count = 25:
// batches = [10, 10, 5]
// Batch 0: generate 10 comments → send type:'batch', batchIndex:0, totalBatch:3
// Batch 1: generate 10 comments → send type:'batch', batchIndex:1, totalBatch:3
// Batch 2: generate 5 comments  → send type:'batch', batchIndex:2, totalBatch:3
// Done: send type:'done', total:25
```

### Progress bar UI

```
count = 30 → 3 batches → [●●○] sau batch 2
count = 50 → 5 batches → [●●●●○] sau batch 4
count ≤ 10 → 1 batch → không hiện progress dots
```

---

## 9. Parser — edge cases

### AI output thực tế (có thể khác nhau)

```
// Case 1: Standard (dễ parse)
1. Bài viết hay quá! Cảm ơn bạn đã chia sẻ 🙏
2. Thông tin hữu ích, mình sẽ thử ngay.

// Case 2: Variant bullet
• Bài viết hay quá!
• Mình đồng ý hoàn toàn!

// Case 3: "Comment N:" prefix
Comment 1: Quá hay luôn!
Comment 2: Cảm ơn bạn nhé!

// Case 4: AI thêm intro text
"Dưới đây là 5 comment:"
1. Hay quá!
2. Tuyệt vời!

// Case 5: AI trả JSON (hiếm khi)
["Comment 1", "Comment 2"]
```

### parseCommentList xử lý tất cả cases trên

```typescript
// Case 4: Dòng "Dưới đây là 5 comment:" bị bỏ qua vì:
// /^(comment|bình luận|ghi chú|note|output|result)/i sẽ match "comment" ở đầu
// → Nhưng không match "Dưới đây..." → Cần thêm rule

// Fix: Thêm vào parseCommentList:
if (/^(dưới đây|here are|voici|以下)/i.test(stripped)) continue;

// Case 5: JSON array
// Thêm detect JSON trước loop:
const trimmed = rawText.trim();
if (trimmed.startsWith('[')) {
  try {
    const arr = JSON.parse(trimmed) as string[];
    return arr.slice(0, expectedCount).filter((s) => typeof s === 'string' && s.length > 2);
  } catch { /* fall through to line parser */ }
}
```

---

## 10. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `lib/facebook-comment/types.ts` | Types đơn giản |
| 2 | `lib/facebook-comment/options.ts` | 6 styles, counts, languages |
| 3 | `lib/facebook-comment/parser.ts` | Test parser với nhiều edge cases |
| 4 | `api/facebook-comment/generate/route.ts` | Test với Postman — thử count=1, 10, 20 |
| 5 | `app/facebook-comment/page.tsx` | UI — test toàn bộ flow |
| 6 | `components/Sidebar.tsx` | Thêm nav entries Social |
| 7 | Verify: copy single, copy all | Clipboard API cần HTTPS |
| 8 | Verify: batch progress dots | Test count=30, 50 |

---

## 11. QA Checklist

### Input & Validation
- [ ] Textarea nhận paste, xuống dòng, emoji
- [ ] Word count realtime: "số từ: X" cập nhật khi gõ
- [ ] Vượt 500 từ → badge đỏ + lỗi khi bấm Generator
- [ ] Nội dung trống → error "Vui lòng nhập nội dung"
- [ ] Style: click vào row chuyển highlight đúng
- [ ] Count: click số → highlight đúng + warning nếu > 10

### Generate & Streaming
- [ ] count ≤ 10 → 1 AI call, không hiện progress dots
- [ ] count = 20 → 2 batch, progress dots hiện đúng: [●○]→[●●]
- [ ] count = 50 → 5 batch, progress dots đầy đủ
- [ ] Mỗi batch nhận được → cards append real-time (không đợi hết)
- [ ] Skeleton loading hiện khi đang chờ batch tiếp theo
- [ ] Huỷ (click Generate lần 2) → abort request cũ, reset cards
- [ ] Lỗi 1 batch → hiện warning nhưng batch khác vẫn tiếp tục

### Comment Cards
- [ ] Index badge đúng số thứ tự (1, 2, 3...)
- [ ] Text hiển thị đầy đủ, có whitespace-pre-wrap cho xuống dòng
- [ ] Copy button hiện khi hover card
- [ ] Click Copy → text vào clipboard → "✓ Copied" 1.5s → reset
- [ ] "Copy tất cả" → tất cả comments vào clipboard, mỗi cái cách nhau 2 dòng
- [ ] "Đã copy tất cả" 2s → reset

### Edge Cases
- [ ] AI trả 8 comments khi yêu cầu 10 → parse 8 → hiện đúng 8 cards (không crash)
- [ ] AI trả JSON array → parser xử lý được
- [ ] AI có intro text "Dưới đây là..." → bị bỏ qua, không thành comment
- [ ] Ngôn ngữ English → comments ra tiếng Anh
- [ ] Style "funny" → có emoji trong comments
- [ ] Style "shorten" → comments ngắn (1-2 câu)

---

## 12. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|---------|
| `parseCommentList` trả `[]` | AI trả intro text hoặc JSON | Thêm JSON detect và intro text filter |
| Comment bị cắt giữa chừng | AI output bị truncate khi batch lớn | `BATCH_SIZE = 10` là giới hạn an toàn |
| Các comment giống nhau | Prompt thiếu instruction "KHÁC NHAU" | Đã có "Mỗi comment phải có cảm xúc khác nhau" |
| Copy button không work | `clipboard.writeText()` cần HTTPS | Ổn trên production; dev dùng localhost (xem như HTTPS) |
| Batch 2+ chậm hơn | Rate limit AI | Delay 500ms giữa batches đã có |
| `CommentCard.copied` không reset | `setTimeout` bị memory leak | Không vấn đề — component không unmount trong lúc timer chạy |
| `cards.length` hiện sai sau abort | State không reset kịp | `setCards([])` ngay đầu `handleGenerate()` |
| Progress dots không match số batch | `batches.length` tính sai | Verify: `Math.ceil(50/10) = 5` ✓ |
| AI không follow style instruction | Model yếu hoặc prompt thiếu emphasis | Thêm ALL CAPS: "PHẢI viết theo phong cách ${style}" |
