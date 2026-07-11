# FACEBOOK-POST-GENERATOR-IMPLEMENTATION.md
## Hướng dẫn code tính năng "Tạo Facebook Post bằng AI"

> Phân tích từ: https://aiktp.com/vi/facebook-post-generator  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Gemini API  
> Tab liên kết: `/facebook-comment` (cùng nhóm CÔNG CỤ SOCIAL)

---

## ⚠️ Điểm khác biệt & chú ý khi implement

| # | Điểm | Ghi chú |
|---|------|---------|
| 1 | **Input là "Chủ đề"** — không phải bài gốc | User nhập topic ngắn hoặc dài → AI summarize + format thành Facebook post |
| 2 | **Output là 1 bài post duy nhất** | Khác hoàn toàn comment generator (1–50 items) |
| 3 | **Có toggle Emoji** | Option riêng biệt — không phụ thuộc style |
| 4 | **AI tự tóm tắt nếu input dài** | Prompt phải hướng AI tóm tắt khi topic > 200 từ |
| 5 | **Không có DB / Article record** | Pure generation tool — stateless |
| 6 | **Shared styles với comment generator** | Reuse `COMMENT_STYLES` từ `lib/facebook-comment/options.ts` |
| 7 | **Có thể chọn "Post target"** | Group / Fanpage / Trang cá nhân → ảnh hưởng tone (optional enhancement) |
| 8 | **aiktp.com dùng WebSocket — ta dùng SSE** | Nhất quán với toàn bộ stack |
| 9 | **Không requireAuth** | Free tool — word limit input cho unauthenticated user |
| 10 | **Character counter output** | Facebook post recommended < 500 từ, hard limit 63,206 ký tự |

---

## 1. Tổng quan kiến trúc

### So sánh với Tạo Facebook Comment

| | Tạo Facebook Comment | **Tạo Facebook Post** |
|---|---|---|
| Input | Nội dung bài post có sẵn | **Chủ đề / topic (mới)** |
| Output | Nhiều comment cards (1–50) | **1 bài post hoàn chỉnh** |
| Count selector | 1–50 | **Không có — luôn ra 1 bài** |
| Emoji | Theo style (funny) | **Toggle riêng on/off** |
| Post target | Không có | **Group / Fanpage / Cá nhân** |
| Output length | 1–3 câu / comment | **100–300 từ** |
| Batch AI call | Có (N > 10) | **Không — 1 call duy nhất** |

### Flow hoạt động

```
User nhập Chủ đề + Ngôn ngữ + Style + Emoji toggle + Target
     ↓ click "Generator"
     POST /api/facebook-post/generate (SSE)
     → Validate: chủ đề không trống, không vượt limit
     → buildFacebookPostPrompt()
     → AI stream plain text bài post
     → Hiển thị real-time vào output panel
     → Done: hiện word count + character count + copy button
```

### Cấu trúc file cần tạo

```
web/
├── app/
│   ├── facebook-post/
│   │   └── page.tsx                    ← Tool 2 cột
│   └── api/
│       └── facebook-post/
│           └── generate/
│               └── route.ts            ← SSE generator
└── lib/
    └── facebook-post/
        ├── types.ts                    ← Types (nhỏ gọn)
        └── options.ts                  ← Constants + re-export từ facebook-comment
```

### File tái sử dụng (KHÔNG tạo mới)

- `lib/tinh-gon/model.ts` → `buildTinhGonModel()`
- `lib/facebook-comment/options.ts` → `COMMENT_STYLES`, `COMMENT_LANGUAGES` (re-export)

---

## 2. Types — `web/lib/facebook-post/types.ts`

```typescript
// Re-use style type từ comment generator
export type { CommentStyle } from '@/lib/facebook-comment/types';

export type PostTarget =
  | 'personal'  // Trang cá nhân — thân mật, chia sẻ
  | 'fanpage'   // Fanpage — chuyên nghiệp hơn, CTA rõ
  | 'group';    // Group — kêu gọi thảo luận, câu hỏi mở

export interface FacebookPostConfig {
  topic:      string;      // Chủ đề / nội dung input (câu, đoạn, bài viết)
  language:   string;      // Ngôn ngữ output
  style:      string;      // CommentStyle value
  useEmoji:   boolean;     // Toggle emoji
  target:     PostTarget;  // Loại trang đăng
}

// SSE events
export interface PostChunkEvent {
  type: 'chunk';
  text: string;
}

export interface PostDoneEvent {
  type:      'done';
  wordCount: number;
  charCount: number;
}

export interface PostErrorEvent {
  type:    'error';
  message: string;
}

export type FacebookPostSSEEvent = PostChunkEvent | PostDoneEvent | PostErrorEvent;
```

---

## 3. Options — `web/lib/facebook-post/options.ts`

```typescript
import type { PostTarget } from './types';

// Re-export từ comment generator (styles giống nhau)
export { COMMENT_STYLES, COMMENT_LANGUAGES } from '@/lib/facebook-comment/options';

export const FREE_USER_MAX_INPUT_WORDS = 500;   // Giới hạn input

export const POST_TARGETS: Array<{
  value: PostTarget;
  label: string;
  note:  string;
  emoji: string;
}> = [
  {
    value: 'personal',
    label: 'Trang cá nhân',
    emoji: '👤',
    note:  'Thân mật, chia sẻ cá nhân, kết nối bạn bè',
  },
  {
    value: 'fanpage',
    label: 'Fanpage / Thương hiệu',
    emoji: '📣',
    note:  'Chuyên nghiệp hơn, CTA rõ ràng, kêu gọi hành động',
  },
  {
    value: 'group',
    label: 'Facebook Group',
    emoji: '👥',
    note:  'Kêu gọi thảo luận, câu hỏi mở, tương tác cao',
  },
];

// Gợi ý độ dài bài post (words)
export const POST_LENGTH_HINTS: Record<PostTarget, string> = {
  personal: '80–150 từ — đủ thông tin, không quá dài',
  fanpage:  '100–200 từ — có hook, body, CTA',
  group:    '80–150 từ — câu hỏi/thảo luận ở cuối',
};
```

---

## 4. API: `/api/facebook-post/generate/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { FREE_USER_MAX_INPUT_WORDS, POST_LENGTH_HINTS } from '@/lib/facebook-post/options';
import type { FacebookPostSSEEvent, PostTarget } from '@/lib/facebook-post/types';

export const runtime = 'nodejs';

// ─── Style instructions (giống comment generator, điều chỉnh cho post dài hơn) ──

const STYLE_INSTRUCTIONS: Record<string, string> = {
  funny:        'Vui vẻ, hài hước nhẹ nhàng. Dùng emoji nếu useEmoji = true. Hook mở bài bất ngờ.',
  shorten:      'Súc tích, mỗi câu một ý. Bài ngắn nhưng đủ thông điệp.',
  creative:     'Sáng tạo, góc nhìn độc đáo, từ ngữ mới lạ. Tránh clichés.',
  friendly:     'Thân thiện, ấm áp. Viết như đang kể chuyện cho bạn bè.',
  casual:       'Thoải mái, thân mật. Có thể dùng câu hỏi tu từ, gợi cảm xúc.',
  professional: 'Chuyên nghiệp, rõ ràng. Thông tin đặt lên đầu. CTA cuối bài.',
};

// ─── Target instructions ──────────────────────────────────────────────────────

const TARGET_INSTRUCTIONS: Record<PostTarget, string> = {
  personal: 'Đây là bài đăng trên trang cá nhân. Viết theo ngôi thứ nhất, chia sẻ quan điểm hoặc trải nghiệm cá nhân. Không CTA cứng.',
  fanpage:  'Đây là bài đăng cho Fanpage / thương hiệu. Có hook mở bài, body rõ ràng, kết bài bằng CTA (VD: "Liên hệ ngay", "Xem thêm", "Để lại bình luận").',
  group:    'Đây là bài đăng trong Facebook Group. Kết bài bằng câu hỏi mở để kêu gọi thảo luận. Tone thân thiện, kết nối cộng đồng.',
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildFacebookPostPrompt(config: {
  topic:    string;
  language: string;
  style:    string;
  useEmoji: boolean;
  target:   PostTarget;
}): string {
  const styleInstruction  = STYLE_INSTRUCTIONS[config.style] ?? STYLE_INSTRUCTIONS.friendly;
  const targetInstruction = TARGET_INSTRUCTIONS[config.target];
  const lengthHint        = POST_LENGTH_HINTS[config.target];
  const emojiInstruction  = config.useEmoji
    ? 'Dùng emoji phù hợp (không lạm dụng — tối đa 3–5 emoji trong toàn bài).'
    : 'KHÔNG dùng emoji.';

  const topicWordCount = config.topic.trim().split(/\s+/).length;
  const summarizeNote  = topicWordCount > 200
    ? 'Input khá dài — hãy tóm tắt ý chính rồi viết thành Facebook post. Không cần đưa hết nội dung vào bài.'
    : 'Dùng nội dung input làm cơ sở để viết bài post.';

  return `
Bạn là AI chuyên viết nội dung Facebook hấp dẫn, tự nhiên.

## Chủ đề / Nội dung input
${config.topic}

## Yêu cầu bài post
- Ngôn ngữ: ${config.language}
- Phong cách: ${styleInstruction}
- Mục tiêu đăng: ${targetInstruction}
- Độ dài khuyến nghị: ${lengthHint}
- Emoji: ${emojiInstruction}
- ${summarizeNote}

## Cấu trúc bài post Facebook chuẩn
1. Hook (1–2 câu đầu): thu hút người đọc ngay lập tức
2. Body: thông tin / câu chuyện / ý kiến chính
3. Close: kết bài theo target (CTA / câu hỏi / chia sẻ cảm xúc)

## Quy tắc output
- Chỉ trả nội dung bài post — KHÔNG thêm tiêu đề, nhãn, giải thích.
- Không dùng markdown (**, *, #) — plain text thuần tuý.
- Xuống dòng tự nhiên như Facebook post thật.
- Không bắt đầu bằng "Xin chào", "Bài post:", "Đây là bài".
`.trim();
}

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sseEvent(
  controller: ReadableStreamDefaultController,
  data: FacebookPostSSEEvent,
) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const generateSchema = z.object({
  topic:    z.string().min(3, 'Chủ đề quá ngắn').max(20000),
  language: z.string().default('Vietnamese'),
  style:    z.string().default('friendly'),
  useEmoji: z.boolean().default(true),
  target:   z.enum(['personal', 'fanpage', 'group']).default('personal'),
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
        } satisfies FacebookPostSSEEvent),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const config = parsed.data as {
      topic:    string;
      language: string;
      style:    string;
      useEmoji: boolean;
      target:   PostTarget;
    };

    // Word count check
    const wordCount = config.topic.trim().split(/\s+/).length;
    if (wordCount > FREE_USER_MAX_INPUT_WORDS) {
      return new Response(
        JSON.stringify({
          type:    'error',
          message: `Nội dung vượt quá ${FREE_USER_MAX_INPUT_WORDS} từ (hiện tại: ${wordCount} từ).`,
        } satisfies FacebookPostSSEEvent),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const prompt = buildFacebookPostPrompt(config);
    const model  = buildTinhGonModel('gemini-flash');

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: FacebookPostSSEEvent) => sseEvent(controller, data);

        try {
          let fullText = '';

          try {
            // Stream chunk-by-chunk để hiện real-time
            const aiStream = await model.generateContentStream(prompt);
            for await (const chunk of aiStream) {
              const text = chunk.text();
              if (!text) continue;
              fullText += text;
              send({ type: 'chunk', text });
            }
          } catch {
            // Fallback: non-stream
            const result = await model.generateContent(prompt);
            fullText = result.response.text();
            send({ type: 'chunk', text: fullText });
          }

          // Post-process: strip markdown nếu AI vô tình trả
          // (Facebook post nên là plain text, không có *bold* hay **strong**)
          const cleaned = fullText
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/^#+\s+/gm, '')
            .trim();

          // Nếu AI thêm markdown, gửi lại bản cleaned (replace toàn bộ)
          if (cleaned !== fullText) {
            send({ type: 'chunk', text: '' });   // signal để FE reset
            send({ type: 'chunk', text: cleaned });
          }

          send({
            type:      'done',
            wordCount: cleaned.split(/\s+/).filter(Boolean).length,
            charCount: cleaned.length,
          });
        } catch (error) {
          send({
            type:    'error',
            message: error instanceof Error ? error.message : 'Lỗi AI',
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
      } satisfies FacebookPostSSEEvent),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
```

---

## 5. Page — `web/app/facebook-post/page.tsx`

Layout 2 cột: trái (form nhỏ gọn), phải (output + actions).

```tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import {
  COMMENT_LANGUAGES,
  COMMENT_STYLES,
  FREE_USER_MAX_INPUT_WORDS,
  POST_TARGETS,
} from '@/lib/facebook-post/options';
import type { FacebookPostConfig, FacebookPostSSEEvent, PostTarget } from '@/lib/facebook-post/types';

const DEFAULT_CONFIG: FacebookPostConfig = {
  topic:    '',
  language: 'Vietnamese',
  style:    'friendly',
  useEmoji: true,
  target:   'personal',
};

export default function FacebookPostPage() {
  const [config, setConfig]       = useState<FacebookPostConfig>(DEFAULT_CONFIG);
  const [output, setOutput]       = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState(false);
  const abortRef                  = useRef<AbortController | null>(null);

  const inputWordCount = config.topic.trim()
    ? config.topic.trim().split(/\s+/).length
    : 0;

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!config.topic.trim()) {
      setError('Vui lòng nhập chủ đề bài post.');
      return;
    }
    if (inputWordCount > FREE_USER_MAX_INPUT_WORDS) {
      setError(`Nội dung vượt ${FREE_USER_MAX_INPUT_WORDS} từ.`);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError('');
    setOutput('');
    setWordCount(0);
    setCharCount(0);
    setCopied(false);

    try {
      const response = await fetch('/api/facebook-post/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
        signal:  abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const err = await response.json() as { message?: string };
        throw new Error(err.message ?? 'Lỗi kết nối');
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';
      // Track toàn bộ text để handle reset signal
      let   accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6)) as FacebookPostSSEEvent;

            if (event.type === 'chunk') {
              if (event.text === '') {
                // Reset signal — AI sent cleaned version next
                accumulated = '';
                setOutput('');
              } else {
                accumulated += event.text;
                setOutput(accumulated);
              }
            } else if (event.type === 'done') {
              setWordCount(event.wordCount);
              setCharCount(event.charCount);
            } else if (event.type === 'error') {
              setError(event.message);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  }, [config, inputWordCount]);

  // ── Copy ─────────────────────────────────────────────────────────────────

  function handleCopy() {
    if (!output) return;
    void navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Regenerate ───────────────────────────────────────────────────────────

  function handleRegenerate() {
    void handleGenerate();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Tab nav */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0 px-4">
        {[
          { label: 'Tạo Facebook Post',    href: '/facebook-post',    active: true  },
          { label: 'Tạo Facebook Comment', href: '/facebook-comment', active: false },
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

      {/* Main 2-column */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Form ── */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 overflow-y-auto p-4">

          <h1 className="text-base font-bold text-gray-900 mb-0.5">Tạo Facebook Post</h1>
          <p className="text-xs text-gray-500 mb-4">
            Nhập chủ đề — AI viết bài post hoàn chỉnh.
          </p>

          {/* Topic input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Chủ đề <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${
                inputWordCount > FREE_USER_MAX_INPUT_WORDS ? 'text-red-500 font-medium' : 'text-gray-400'
              }`}>
                {inputWordCount} từ
              </span>
            </div>
            <textarea
              value={config.topic}
              onChange={(e) => setConfig((prev) => ({ ...prev, topic: e.target.value }))}
              placeholder={
                'VD: Khuyến mãi giảm 20% giường sắt tháng này\n\nHoặc paste cả bài viết dài — AI tự tóm tắt.'
              }
              rows={7}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Nhập câu ngắn hoặc paste bài dài — AI tự xử lý.
            </p>
          </div>

          {/* Post target */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Đăng lên đâu?
            </label>
            <div className="space-y-1.5">
              {POST_TARGETS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setConfig((prev) => ({ ...prev, target: t.value }))}
                  title={t.note}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                    config.target === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{t.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{t.note}</p>
                  </div>
                </button>
              ))}
            </div>
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
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                    config.style === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm">{s.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold">{s.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{s.note}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Emoji toggle */}
          <div className="mb-5 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-gray-700">Sử dụng Emoji</p>
              <p className="text-[10px] text-gray-400">AI thêm emoji phù hợp vào bài</p>
            </div>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, useEmoji: !prev.useEmoji }))}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                config.useEmoji ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              aria-label="Toggle emoji"
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                config.useEmoji ? 'translate-x-5' : ''
              }`} />
            </button>
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
            disabled={loading || !config.topic.trim()}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang viết...
              </span>
            ) : 'Generator'}
          </button>

        </div>

        {/* ── RIGHT: Output Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

          {/* Output header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">Bài post</span>
              {(wordCount > 0 || charCount > 0) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{wordCount} từ</span>
                  <span className="text-gray-300">·</span>
                  <span className={`text-xs ${charCount > 500 * 5 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {charCount} ký tự
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {output && !loading && (
                <>
                  {/* Regenerate */}
                  <button
                    onClick={handleRegenerate}
                    className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Tạo lại bài khác"
                  >
                    🔄 Tạo lại
                  </button>

                  {/* Copy */}
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      copied
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {copied ? '✓ Đã copy' : 'Copy'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Output content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Empty state */}
            {!output && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-5xl mb-4">📝</span>
                <p className="text-sm font-medium">Chưa có bài post nào</p>
                <p className="text-xs mt-1 text-center max-w-xs">
                  Nhập chủ đề bên trái và bấm "Generator" để AI viết bài.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-sm">
                  {[
                    'Khuyến mãi giảm 20% giường sắt tháng này',
                    'Chia sẻ kinh nghiệm chọn nội thất phòng nhỏ',
                    'Ra mắt bộ sưu tập tủ quần áo mới 2026',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setConfig((prev) => ({ ...prev, topic: example }))}
                      className="text-left text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {!output && loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">AI đang viết bài post...</p>
              </div>
            )}

            {/* Post output */}
            {output && (
              <div className="max-w-lg mx-auto">
                {/* Facebook post preview card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Facebook-like header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      MQ
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Nội Thất Minh Quân</p>
                      <p className="text-xs text-gray-400">
                        {POST_TARGETS.find((t) => t.value === config.target)?.label ?? 'Facebook'}
                        {' · '}
                        <span className="capitalize">{config.style}</span>
                        {config.useEmoji && ' · 😊'}
                      </p>
                    </div>
                  </div>

                  {/* Post body */}
                  <div className="px-4 py-4">
                    <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {output}
                    </p>
                    {loading && (
                      <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse rounded-sm" />
                    )}
                  </div>

                  {/* Facebook-like footer */}
                  {!loading && output && (
                    <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4">
                      <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                        👍 Thích
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                        💬 Bình luận
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                        ↗️ Chia sẻ
                      </button>
                      <div className="ml-auto">
                        <button
                          onClick={handleCopy}
                          className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                            copied
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {copied ? '✓ Đã copy' : 'Copy bài post'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                {!loading && wordCount > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400 px-1">
                    <span>{wordCount} từ · {charCount} ký tự</span>
                    <button
                      onClick={handleRegenerate}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      🔄 Tạo bài khác
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Sidebar — cập nhật `web/components/Sidebar.tsx`

```typescript
// Section "Social" — đã có từ facebook-comment, thêm entry Tạo Facebook Post:
{
  label: 'Social',
  items: [
    { href: '/facebook-post',    icon: '📝', label: 'Tạo Facebook Post'    },
    { href: '/facebook-comment', icon: '💬', label: 'Tạo Facebook Comment' },
  ],
},
```

---

## 7. Reset signal pattern — giải thích chi tiết

Khi AI stream markdown (`**bold**`) nhưng ta cần plain text, ta gửi reset signal:

```
Server side:
  if (cleaned !== fullText) {
    send({ type: 'chunk', text: '' })    // ← empty string = reset signal
    send({ type: 'chunk', text: cleaned })
  }

Client side:
  if (event.text === '') {
    accumulated = ''    // reset accumulated buffer
    setOutput('')       // clear UI instantly
  } else {
    accumulated += event.text
    setOutput(accumulated)
  }
```

> ⚠️ Nếu không dùng reset pattern, UI sẽ hiện `**Khuyến mãi**` rồi thêm `Khuyến mãi` → double text.

---

## 8. Facebook Post Preview Card — thiết kế

Thay vì textarea thuần, ta dùng "Facebook-like preview card" để UX trực quan hơn:

```
┌─────────────────────────────────────────────┐
│  [MQ]  Nội Thất Minh Quân                   │  ← Header giả lập FB
│        Fanpage · Friendly · 😊              │
├─────────────────────────────────────────────┤
│                                             │
│  Tháng 5 này, Minh Quân có chương trình    │  ← Post body (whitespace-pre-wrap)
│  giảm giá đặc biệt...                       │
│                                             │
├─────────────────────────────────────────────┤
│  👍 Thích  💬 Bình luận  ↗️ Chia sẻ    Copy │  ← Footer actions
└─────────────────────────────────────────────┘
```

Header dùng **avatar placeholder "MQ"** (2 chữ đầu thương hiệu). Không cần ảnh thật.

---

## 9. Use cases trong prompt — 4 kịch bản chính

Từ description aiktp.com, ta hỗ trợ 4 luồng use case qua cùng 1 endpoint:

| Kịch bản | Input user | Target | Gợi ý style |
|----------|-----------|--------|-------------|
| Bài đăng tương tác | "Câu hỏi về chọn màu sắc nội thất" | Group | Friendly / Casual |
| Từ bài web → Facebook | Paste URL/content bài blog | Fanpage | Professional |
| Viết lại post | Paste post có sẵn | Personal | Creative / Funny |
| Seeding content | Topic ngắn + style khác nhau | Group | Mỗi lần 1 style |

> AI tự nhận biết input ngắn hay dài và xử lý phù hợp — không cần user chọn kịch bản.

---

## 10. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `lib/facebook-post/types.ts` | Types nhỏ gọn |
| 2 | `lib/facebook-post/options.ts` | Re-export + POST_TARGETS |
| 3 | `api/facebook-post/generate/route.ts` | Test bằng Postman — thử 3 targets + 2 styles |
| 4 | `app/facebook-post/page.tsx` | UI — test toàn bộ flow |
| 5 | `components/Sidebar.tsx` | Thêm nav entry Social |
| 6 | Verify: emoji toggle | style=funny + emoji=false → không có emoji |
| 7 | Verify: long input | Paste bài 500+ từ → AI vẫn trả post ngắn |
| 8 | Verify: reset signal | Check console network — empty chunk xuất hiện đúng chỗ |

---

## 11. QA Checklist

### Input & Form
- [ ] Textarea nhận text, paste, emoji trong chủ đề
- [ ] Word count realtime: "X từ" cập nhật khi gõ
- [ ] Vượt 500 từ → text đếm đỏ + error khi bấm Generator
- [ ] Topic trống → error "Vui lòng nhập chủ đề"
- [ ] 3 Post target: click → highlight đúng → note text thay đổi
- [ ] 6 style: click row → highlight đúng
- [ ] Emoji toggle: bật/tắt smooth animation
- [ ] Ngôn ngữ select: chọn English → output ra tiếng Anh

### Generate & Stream
- [ ] Bấm Generator → loading spinner + "Đang viết..."
- [ ] Output xuất hiện real-time từng chunk
- [ ] Cursor blink hiện trong lúc streaming
- [ ] Bấm Generator lần 2 khi đang stream → abort + reset + start mới
- [ ] Markdown bị strip: `**text**` → `text` trong output
- [ ] Reset signal không gây double text

### Output Card
- [ ] Avatar "MQ" hiện đúng
- [ ] Target + style + emoji badge hiện đúng ở header
- [ ] Post body có `whitespace-pre-wrap` — xuống dòng đúng
- [ ] Word count + char count hiện sau khi done
- [ ] "Copy bài post" → clipboard → "✓ Đã copy" 2s → reset
- [ ] "Tạo lại" / "🔄 Tạo bài khác" → generate lại với cùng config
- [ ] Copy button ở top bar và card footer đều work

### Use case edge cases
- [ ] Input ngắn (5 từ) → AI tạo post đầy đủ (~100 từ)
- [ ] Input dài (500 từ bài blog) → AI tóm tắt → post ngắn gọn, không dump nguyên bài
- [ ] Style = "shorten" → output < 80 từ (ngắn hơn các style khác)
- [ ] Style = "funny" + emoji=false → không có emoji trong output
- [ ] Style = "funny" + emoji=true → có emoji trong output
- [ ] Target = "group" → cuối bài có câu hỏi/kêu gọi thảo luận
- [ ] Target = "fanpage" → cuối bài có CTA ("Liên hệ", "Xem ngay")
- [ ] Target = "personal" → không có CTA cứng

### Example suggestions
- [ ] 3 example chips hiện khi output trống
- [ ] Click chip → điền vào topic textarea
- [ ] Chip biến mất khi output hiện

---

## 12. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|---------|
| Output có `**bold**` | AI trả markdown | Reset signal pattern đã xử lý — check `cleaned !== fullText` |
| Post quá dài (>400 từ) | AI viết hơn yêu cầu | Thêm vào prompt: "TUYỆT ĐỐI không vượt ${lengthHint}" |
| Post không có CTA khi target=fanpage | AI không follow instruction | Thêm "PHẢI kết thúc bằng CTA" vào TARGET_INSTRUCTIONS.fanpage |
| Emoji xuất hiện khi useEmoji=false | AI ignore instruction | Thêm "TUYỆT ĐỐI KHÔNG dùng emoji" (all caps) |
| Double text trên UI | Reset signal bị miss | Kiểm tra `event.text === ''` (strict equality, không `!event.text`) |
| Input 500 từ → output vẫn dài | AI không summarize | Thêm `summarizeNote` vào prompt rõ hơn: "Bài post KHÔNG được dài hơn 200 từ" |
| Copy không work trên localhost HTTP | Clipboard API cần secure context | Dùng `document.execCommand('copy')` fallback hoặc chỉ test trên HTTPS |
| Abort request gây React warning | setState sau unmount | `abortRef.current.abort()` trong cleanup của `useEffect` |
