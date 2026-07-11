# ECOMMERCE-TAO-TIEU-DE-SAN-PHAM-IMPLEMENTATION.md
## Hướng dẫn code — Tạo Tiêu Đề Sản Phẩm (ECOMMERCE Tools)

> Phân tích từ: https://aiktp.com/vi/product-meta-generator  
> Chuẩn: `DEV-PAGE-ROUTING-NOTE.md` — **Nhóm B** (Stateless, không lưu DB)  
> Route: `/tao-tieu-de-san-pham`  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Gemini API

---

## 0. Bức tranh tổng — ECOMMERCE Tools Family

Đây là tool đầu tiên trong **bộ 5 công cụ ecommerce**, có tab navigation liên kết.  
Dev code 1 lần, 4 tool còn lại dùng chung cấu trúc.

| # | Tool | Route | Output | Spec |
|---|------|-------|--------|------|
| 1 | **Tạo Tiêu Đề SP** | `/tao-tieu-de-san-pham` | 5 Meta Title + 1 Meta Desc + SERP Preview | **File này** |
| 2 | Tạo Tên Sản Phẩm | `/tao-ten-san-pham` | 10 tên SP + lý do | ✅ |
| 3 | Giới Thiệu Sản Phẩm | `/gioi-thieu-san-pham` | Đoạn mô tả 150–300 từ | ✅ |
| 4 | Đánh Giá Sản Phẩm | `/danh-gia-san-pham-nhanh` | Review 300–500 từ | ✅ |
| 5 | FAQ Sản Phẩm | `/faq-san-pham` | 5–10 Q&A pairs | ✅ |

**Tab navigation** ở đầu mỗi tool — user click qua lại giữa 5 tool.

---

## 1. So sánh aiktp vs Local

| # | Điểm | aiktp | Local (file này) |
|---|------|-------|-----------------|
| 1 | **Transport** | WebSocket | **SSE** (consistent với stack) |
| 2 | **Số tone** | 16 | **10** (lọc theo phù hợp nội thất) |
| 3 | **GET từ URL** | Có | **Có** — crawl URL lấy tên + mô tả SP |
| 4 | **Brand inject** | Không | **Có** — shopName + forbidden words nhẹ |
| 5 | **Output** | Meta Title + Meta Desc | **5 title variants + 1 desc + SERP Preview** |
| 6 | **Char counter** | Có (số từ) | **Có** (số ký tự, đổi màu khi vượt limit) |
| 7 | **Ngôn ngữ** | 70+ | **15** (SUPPORTED_LANGUAGES từ shared) |
| 8 | **Lưu DB** | Không | **Không** (stateless) — có nút Copy |
| 9 | **Auth** | Không | **Không** |
| 10 | **SERP Preview** | Không | **Có** — live preview Google search result |

---

## 2. Kiến trúc

### Nhóm B — 1 route, không redirect, không DB Article

```
/tao-tieu-de-san-pham     ← Toàn bộ tool: input + output cùng trang
```

### Cấu trúc file

```
web/
├── app/
│   ├── tao-tieu-de-san-pham/
│   │   └── page.tsx                    ← Tool 2 cột
│   └── api/
│       └── tao-tieu-de-san-pham/
│           ├── generate/
│           │   └── route.ts            ← SSE: stream 5 titles + 1 desc
│           └── fetch-url/
│               └── route.ts            ← POST: crawl URL lấy thông tin SP
└── lib/
    └── tao-tieu-de-san-pham/
        ├── types.ts
        ├── options.ts                  ← 10 PRODUCT_TONES, ECOMMERCE_TABS
        └── prompt-builder.ts           ← buildProductMetaPrompt()
```

### File tái sử dụng

| File | Dùng để |
|------|---------|
| `lib/shared/options.ts` | `SUPPORTED_LANGUAGES` |
| `lib/tinh-gon/model.ts` | `buildTinhGonModel()` |

---

## 3. Types — `web/lib/tao-tieu-de-san-pham/types.ts`

```typescript
export type ProductToneValue =
  | 'seo_focus'      // Tối ưu keyword, ngắn gọn chuẩn SERP
  | 'persuasive'     // Thuyết phục, có CTA ngầm
  | 'friendly'       // Gần gũi, tự nhiên
  | 'professional'   // Chuyên nghiệp, B2B
  | 'luxury'         // Cao cấp, sang trọng
  | 'bold'           // Nổi bật, mạnh mẽ
  | 'engaging'       // Kéo click, curiosity gap
  | 'confident'      // Tự tin, khẳng định
  | 'direct'         // Thẳng thắn, đúng trọng tâm
  | 'casual';        // Thoải mái, đời thường

export interface ProductMetaConfig {
  productName:    string;   // Tên sản phẩm
  productFeatures: string;  // Mô tả, tính năng, chất liệu...
  tone:           ProductToneValue;
  language:       string;
  modelId:        string;
  // Brand nhẹ (optional, không bắt buộc)
  brandName:      string;   // Nội Thất Minh Quân
  forbidden:      string;   // từ không dùng
}

// Kết quả generate
export interface ProductMetaResult {
  titles:      TitleVariant[];   // 5 variants
  description: string;           // 1 meta desc
}

export interface TitleVariant {
  id:        string;
  text:      string;
  charCount: number;
  score:     TitleScore;
  copied:    boolean;
}

export interface TitleScore {
  length:   'ok' | 'short' | 'long';   // 50-60 ok, <50 short, >60 long
  hasKeyword: boolean;
  hasBrand:   boolean;
  hasCta:     boolean;
}

// SSE events
export type MetaSSEEvent =
  | { type: 'title';  index: number; text: string }     // stream từng title
  | { type: 'desc';   text: string }                    // stream desc
  | { type: 'done' }
  | { type: 'error';  message: string };
```

---

## 4. Options — `web/lib/tao-tieu-de-san-pham/options.ts`

```typescript
import type { ProductToneValue } from './types';

export const PRODUCT_TONES: Array<{
  value:  ProductToneValue;
  label:  string;
  emoji:  string;
  note:   string;
  hot?:   boolean;
}> = [
  { value: 'seo_focus',    label: 'SEO Focus',    emoji: '🎯', note: 'Tối ưu keyword, chuẩn SERP 50–60 ký tự', hot: true },
  { value: 'persuasive',   label: 'Thuyết phục',  emoji: '💡', note: 'Có hook, khuyến khích nhấp', hot: true },
  { value: 'friendly',     label: 'Thân thiện',   emoji: '🙂', note: 'Gần gũi, phù hợp khách lần đầu' },
  { value: 'professional', label: 'Chuyên nghiệp',emoji: '💼', note: 'B2B, trang trọng, ít emoji' },
  { value: 'luxury',       label: 'Cao cấp',      emoji: '💎', note: 'Dùng cho dòng premium, flagship' },
  { value: 'bold',         label: 'Nổi bật',      emoji: '🦄', note: 'Mạnh mẽ, memorable, dễ nhớ' },
  { value: 'engaging',     label: 'Kéo click',    emoji: '👍', note: 'Curiosity gap, tăng CTR', hot: true },
  { value: 'confident',    label: 'Tự tin',       emoji: '💪', note: 'Khẳng định chất lượng, ít do dự' },
  { value: 'direct',       label: 'Trực tiếp',    emoji: '➡️', note: 'Thẳng tắp, không hoa mỹ' },
  { value: 'casual',       label: 'Thoải mái',    emoji: '😎', note: 'Ngôn ngữ bình dân, gần gũi' },
];

// 5 tabs liên kết ECOMMERCE Tools family
export const ECOMMERCE_TABS = [
  { label: 'Tiêu đề SP',    href: '/tao-tieu-de-san-pham',   active: true  },
  { label: 'Tên SP',        href: '/tao-ten-san-pham',        active: false },
  { label: 'Giới thiệu SP', href: '/gioi-thieu-san-pham',     active: false },
  { label: 'Đánh giá SP',   href: '/danh-gia-san-pham-nhanh', active: false },
  { label: 'FAQ SP',        href: '/faq-san-pham',            active: false },
] as const;

// Char limits
export const TITLE_CHAR_LIMIT       = 60;    // Google truncate > 60
export const TITLE_CHAR_MIN         = 50;    // Quá ngắn = lãng phí
export const DESC_CHAR_LIMIT        = 160;   // Google truncate > 160
export const DESC_CHAR_MIN          = 150;   // < 150 = lãng phí

// Số titles cần generate
export const TITLE_VARIANTS_COUNT   = 5;
```

---

## 5. Prompt Builder — `web/lib/tao-tieu-de-san-pham/prompt-builder.ts`

```typescript
import type { ProductMetaConfig } from './types';
import {
  TITLE_CHAR_LIMIT,
  TITLE_CHAR_MIN,
  DESC_CHAR_LIMIT,
  DESC_CHAR_MIN,
  TITLE_VARIANTS_COUNT,
} from './options';

const TONE_INSTRUCTIONS: Record<string, string> = {
  seo_focus:    'Đặt keyword chính lên đầu. Ngắn gọn, súc tích. Không dùng từ lãng phí.',
  persuasive:   'Có hook cảm xúc. Dùng từ ngữ kích thích hành động (Mua ngay, Miễn phí ship, Giá tốt).',
  friendly:     'Giọng thân thiện, ấm áp. Như người bán hàng tư vấn thật sự.',
  professional: 'Ngôn ngữ trang trọng, không cảm thán. Phù hợp B2B và trang doanh nghiệp.',
  luxury:       'Sang trọng, tinh tế. Dùng từ ngữ premium (chính hãng, cao cấp, thủ công).',
  bold:         'Nổi bật, mạnh mẽ. Dùng số liệu cụ thể nếu có (10 năm BH, khung 2mm).',
  engaging:     'Tạo curiosity gap — user phải click để biết thêm. Ví dụ: "Lý do 80% KH chọn..."',
  confident:    'Khẳng định mạnh mẽ. Không dùng "có thể", "có lẽ". Chắc chắn, đáng tin.',
  direct:       'Thẳng vào thông số quan trọng nhất. Không vòng vo.',
  casual:       'Ngôn ngữ đời thường, thoải mái. Có thể dùng từ lóng nhẹ.',
};

export function buildProductMetaPrompt(config: ProductMetaConfig): string {
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.seo_focus;

  const brandBlock = config.brandName
    ? `\nThương hiệu: ${config.brandName}${config.forbidden ? ` — KHÔNG dùng: ${config.forbidden}` : ''}`
    : '';

  return `
Bạn là chuyên gia SEO ecommerce. Tạo meta title và meta description tối ưu cho sản phẩm nội thất.

## Thông tin sản phẩm
- Tên sản phẩm: ${config.productName}
- Mô tả / tính năng: ${config.productFeatures}${brandBlock}

## Phong cách: ${config.tone}
${toneInstruction}

## Ngôn ngữ output: ${config.language}

## Yêu cầu Meta Title (quan trọng nhất):
- Tạo đúng ${TITLE_VARIANTS_COUNT} phiên bản KHÁC NHAU
- Mỗi title: ${TITLE_CHAR_MIN}–${TITLE_CHAR_LIMIT} ký tự (ĐẾM CHÍNH XÁC, không vượt ${TITLE_CHAR_LIMIT})
- Keyword chính (tên SP hoặc loại SP) phải xuất hiện trong title
- Mỗi title có cách tiếp cận khác nhau: keyword-first, brand-first, benefit-first, price-signal, question
- KHÔNG lặp ý giữa 5 titles

## Yêu cầu Meta Description:
- Đúng 1 đoạn: ${DESC_CHAR_MIN}–${DESC_CHAR_LIMIT} ký tự
- Có keyword + benefit + CTA nhẹ
- KHÔNG là bản rút gọn của title — phải bổ sung thêm thông tin

## Format output BẮT BUỘC (không thêm chú thích, không đánh số ngoài quy định):
TITLES:
1. [title 1]
2. [title 2]
3. [title 3]
4. [title 4]
5. [title 5]

DESCRIPTION:
[meta description]
`.trim();
}
```

---

## 6. API Routes

### 6.1 Generate — `/api/tao-tieu-de-san-pham/generate/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildProductMetaPrompt } from '@/lib/tao-tieu-de-san-pham/prompt-builder';
import { TITLE_VARIANTS_COUNT, TITLE_CHAR_LIMIT } from '@/lib/tao-tieu-de-san-pham/options';
import type { MetaSSEEvent } from '@/lib/tao-tieu-de-san-pham/types';

export const runtime = 'nodejs';

const schema = z.object({
  productName:     z.string().min(1).max(200),
  productFeatures: z.string().max(2000).default(''),
  tone:            z.string().default('seo_focus'),
  language:        z.string().default('Vietnamese'),
  modelId:         z.string().default('gemini-flash'),
  brandName:       z.string().default(''),
  forbidden:       z.string().default(''),
});

function sse(ctrl: ReadableStreamDefaultController, data: MetaSSEEvent) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Parse AI output → extract titles và description
function parseOutput(raw: string): { titles: string[]; description: string } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  const titles: string[]  = [];
  let   description       = '';
  let   inDesc            = false;

  for (const line of lines) {
    // Bắt đầu section description
    if (/^DESCRIPTION[:\s]/i.test(line)) { inDesc = true; continue; }
    if (/^TITLES?[:\s]/i.test(line))     { inDesc = false; continue; }

    if (inDesc) {
      // Gộp nhiều dòng thành 1 description
      description += (description ? ' ' : '') + line;
      continue;
    }

    // Parse title: "1. text" hoặc "1) text"
    const titleMatch = line.match(/^\d+[\.\)]\s*(.+)/);
    if (titleMatch && titles.length < TITLE_VARIANTS_COUNT) {
      titles.push(titleMatch[1].trim());
    }
  }

  return { titles, description: description.trim() };
}

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ type: 'error', message: parsed.error.errors[0]?.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const model  = buildTinhGonModel(parsed.data.modelId);
    const prompt = buildProductMetaPrompt(parsed.data as any);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Không stream chunk-by-chunk vì cần parse toàn bộ output
          const result  = await model.generateContent(prompt);
          const rawText = result.response.text();

          const { titles, description } = parseOutput(rawText);

          // Stream từng title ra FE (để hiệu ứng xuất hiện tuần tự)
          for (let i = 0; i < titles.length; i++) {
            sse(controller, { type: 'title', index: i, text: titles[i] ?? '' });
            // Delay nhỏ để FE có hiệu ứng
            await new Promise((r) => setTimeout(r, 80));
          }

          // Stream description
          if (description) {
            sse(controller, { type: 'desc', text: description });
          }

          sse(controller, { type: 'done' });
        } catch (err) {
          sse(controller, {
            type:    'error',
            message: err instanceof Error ? err.message : 'Lỗi AI',
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
  } catch (err) {
    return new Response(
      JSON.stringify({ type: 'error', message: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
```

---

### 6.2 Fetch URL — `/api/tao-tieu-de-san-pham/fetch-url/route.ts`

User dán URL sản phẩm → hệ thống crawl → tự điền tên SP + mô tả.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { url, modelId } = await request.json() as { url: string; modelId?: string };

  if (!url?.startsWith('http')) {
    return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 });
  }

  try {
    // Crawl URL
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ error: `Không thể tải trang (${res.status})` }, { status: 400 });
    }

    const html = await res.text();

    // Extract text
    const cleanText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 3000);

    // AI extract product name + features
    const model  = buildTinhGonModel(modelId ?? 'gemini-flash');
    const prompt = `
Từ nội dung trang sản phẩm sau, trích xuất:
1. Tên sản phẩm (ngắn gọn, chính xác)
2. Tính năng / mô tả chính (tối đa 200 từ: chất liệu, kích thước, bảo hành, ưu điểm)

Trả về JSON: {"productName": "...", "productFeatures": "..."}
Chỉ trả JSON, không giải thích thêm.

Nội dung trang:
${cleanText}
`.trim();

    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();

    // Parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Không parse được thông tin sản phẩm' }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]) as { productName: string; productFeatures: string };
    return NextResponse.json(extracted);

  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout — trang tải quá chậm' }, { status: 408 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

---

## 7. Page — `web/app/tao-tieu-de-san-pham/page.tsx`

Layout: **2 cột** — trái (input config), phải (output kết quả + SERP Preview).

```tsx
'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import {
  ECOMMERCE_TABS,
  PRODUCT_TONES,
  TITLE_CHAR_LIMIT,
  TITLE_CHAR_MIN,
  DESC_CHAR_LIMIT,
  DESC_CHAR_MIN,
} from '@/lib/tao-tieu-de-san-pham/options';
import type {
  MetaSSEEvent,
  ProductMetaConfig,
  ProductMetaResult,
  TitleVariant,
} from '@/lib/tao-tieu-de-san-pham/types';

const DEFAULT_CONFIG: ProductMetaConfig = {
  productName:     '',
  productFeatures: '',
  tone:            'seo_focus',
  language:        'Vietnamese',
  modelId:         '',   // load từ /api/ai-models default
  brandName:       'Nội Thất Minh Quân',
  forbidden:       '',
};

export default function TaoTieuDeSanPhamPage() {
  const uid = useId();

  const [config, setConfig]       = useState<ProductMetaConfig>(DEFAULT_CONFIG);
  const [titles, setTitles]       = useState<TitleVariant[]>([]);
  const [desc, setDesc]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [fetchingUrl, setFetchUrl] = useState(false);
  const [urlInput, setUrlInput]   = useState('');
  const [urlError, setUrlError]   = useState('');
  const [error, setError]         = useState('');
  const [allCopied, setAllCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cardIdx  = useRef(0);

  const update = (p: Partial<ProductMetaConfig>) =>
    setConfig((prev) => ({ ...prev, ...p }));

  // ── Fetch from URL ──────────────────────────────────────────────────────────

  const handleFetchUrl = async () => {
    if (!urlInput.startsWith('http')) {
      setUrlError('Nhập URL hợp lệ bắt đầu bằng http://');
      return;
    }
    setFetchUrl(true);
    setUrlError('');
    try {
      const res  = await fetch('/api/tao-tieu-de-san-pham/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput, modelId: config.modelId }),
      });
      const data = await res.json() as { productName?: string; productFeatures?: string; error?: string };
      if (data.error) { setUrlError(data.error); return; }
      update({
        productName:     data.productName     ?? config.productName,
        productFeatures: data.productFeatures ?? config.productFeatures,
      });
    } catch (err) {
      setUrlError(String(err));
    } finally {
      setFetchUrl(false);
    }
  };

  // ── Generate ────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!config.productName.trim()) {
      setError('Vui lòng nhập tên sản phẩm.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    cardIdx.current  = 0;

    setLoading(true);
    setError('');
    setTitles([]);
    setDesc('');
    setAllCopied(false);

    try {
      const res = await fetch('/api/tao-tieu-de-san-pham/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
        signal:  abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('Lỗi kết nối');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as MetaSSEEvent;

            if (event.type === 'title') {
              const charCount = event.text.length;
              const newCard: TitleVariant = {
                id:     `${uid}-${++cardIdx.current}`,
                text:   event.text,
                charCount,
                score: {
                  length:     charCount >= TITLE_CHAR_MIN && charCount <= TITLE_CHAR_LIMIT ? 'ok'
                              : charCount < TITLE_CHAR_MIN ? 'short' : 'long',
                  hasKeyword: event.text.toLowerCase().includes(
                    config.productName.toLowerCase().split(' ')[0] ?? ''
                  ),
                  hasBrand:  config.brandName
                    ? event.text.toLowerCase().includes(config.brandName.toLowerCase())
                    : false,
                  hasCta: /mua|đặt|xem|giao|giá|miễn phí|ship/i.test(event.text),
                },
                copied: false,
              };
              setTitles((prev) => [...prev, newCard]);

            } else if (event.type === 'desc') {
              setDesc(event.text);

            } else if (event.type === 'error') {
              setError(event.message);

            } else if (event.type === 'done') {
              // nothing
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
  }, [config, uid]);

  // ── Copy helpers ────────────────────────────────────────────────────────────

  function copyTitle(id: string) {
    const t = titles.find((t) => t.id === id);
    if (!t) return;
    void navigator.clipboard.writeText(t.text).then(() => {
      setTitles((prev) => prev.map((x) => x.id === id ? { ...x, copied: true } : x));
      setTimeout(() =>
        setTitles((prev) => prev.map((x) => x.id === id ? { ...x, copied: false } : x)),
      1500);
    });
  }

  function copyAllTitles() {
    const all = titles.map((t, i) => `${i + 1}. ${t.text}`).join('\n');
    void navigator.clipboard.writeText(all).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // SERP preview — dùng title đầu tiên và desc
  const previewTitle = titles[0]?.text ?? '';
  const previewDesc  = desc;
  const previewUrl   = 'noithatminhquan.vn/san-pham/' +
    config.productName.toLowerCase().replace(/\s+/g, '-').slice(0, 40);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── ECOMMERCE Tabs ─────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0 px-4 overflow-x-auto">
        {ECOMMERCE_TABS.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab.active
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* ── 2 cột chính ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Input */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 overflow-y-auto p-4 space-y-5">

          <div>
            <h1 className="text-base font-bold text-gray-900">Tạo Tiêu Đề Sản Phẩm</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              5 Meta Title + 1 Meta Description chuẩn SEO
            </p>
          </div>

          {/* Fetch từ URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Lấy thông tin từ URL sản phẩm
            </label>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => void handleFetchUrl()}
                disabled={fetchingUrl || !urlInput.trim()}
                className="flex-shrink-0 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-40"
              >
                {fetchingUrl ? '...' : 'GET'}
              </button>
            </div>
            {urlError && <p className="text-xs text-red-600 mt-1">{urlError}</p>}
          </div>

          {/* Tên sản phẩm */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              value={config.productName}
              onChange={(e) => update({ productName: e.target.value })}
              placeholder="VD: Giường sắt 1m8 khung vuông sơn tĩnh điện"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Mô tả / tính năng */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Mô tả / Tính năng sản phẩm
            </label>
            <textarea
              value={config.productFeatures}
              onChange={(e) => update({ productFeatures: e.target.value })}
              placeholder="Chất liệu sắt hộp 4×6cm, sơn tĩnh điện chống gỉ, tải 300kg, bảo hành 12 tháng, giao toàn quốc..."
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Phong cách viết
            </label>
            <div className="space-y-1.5">
              {PRODUCT_TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  title={t.note}
                  onClick={() => update({ tone: t.value })}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                    config.tone === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm flex-shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-xs font-semibold">{t.label}</span>
                    {t.hot && (
                      <span className="text-[9px] bg-orange-100 text-orange-600 px-1 rounded font-medium">
                        HOT
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ngôn ngữ</label>
            <select
              value={config.language}
              onChange={(e) => update({ language: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={() => void handleGenerate()}
            disabled={loading || !config.productName.trim()}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang tạo...
              </span>
            ) : '✨ Tạo tiêu đề'}
          </button>

        </div>

        {/* RIGHT: Output */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

          {/* Output header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">
              {titles.length > 0 ? `${titles.length} tiêu đề` : 'Kết quả'}
            </span>
            {titles.length > 0 && (
              <button
                onClick={copyAllTitles}
                className={`text-xs px-3 py-1.5 border rounded-lg transition-colors ${
                  allCopied
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {allCopied ? '✓ Đã copy' : 'Copy tất cả'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* Empty state */}
            {titles.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-5xl mb-3">🏷️</span>
                <p className="text-sm font-medium">Chưa có tiêu đề nào</p>
                <p className="text-xs mt-1">Nhập tên sản phẩm và bấm "Tạo tiêu đề"</p>
              </div>
            )}

            {/* Title variants */}
            {titles.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Meta Title ({titles.length}/{5})
                </h2>
                <div className="space-y-2.5">
                  {titles.map((t, i) => (
                    <TitleCard
                      key={t.id}
                      title={t}
                      index={i + 1}
                      onCopy={() => copyTitle(t.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Loading skeleton for pending titles */}
            {loading && titles.length < 5 && (
              <div className="space-y-2.5">
                {Array.from({ length: 5 - titles.length }, (_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Meta Description */}
            {desc && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Meta Description
                </h2>
                <DescriptionCard desc={desc} />
              </section>
            )}

            {/* SERP Preview */}
            {(previewTitle || previewDesc) && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  SERP Preview
                </h2>
                <SerpPreviewCard
                  title={previewTitle}
                  description={previewDesc}
                  url={previewUrl}
                />
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TitleCard({
  title, index, onCopy,
}: { title: TitleVariant; index: number; onCopy: () => void }) {
  const lengthColor =
    title.score.length === 'ok'    ? 'text-green-600' :
    title.score.length === 'short' ? 'text-amber-500' :
                                     'text-red-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        {/* Index */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center mt-0.5">
          {index}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title text */}
          <p className="text-sm text-gray-900 font-medium leading-snug break-words">
            {title.text}
          </p>

          {/* Scores */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`text-[11px] font-semibold ${lengthColor}`}>
              {title.charCount} ký tự
              {title.score.length === 'long'  && ' ⚠️ dài'}
              {title.score.length === 'short' && ' ⚠️ ngắn'}
            </span>
            {title.score.hasKeyword && (
              <span className="text-[11px] text-green-600">✓ Keyword</span>
            )}
            {title.score.hasBrand && (
              <span className="text-[11px] text-blue-600">✓ Brand</span>
            )}
            {title.score.hasCta && (
              <span className="text-[11px] text-purple-600">✓ CTA</span>
            )}
          </div>
        </div>

        {/* Copy */}
        <button
          onClick={onCopy}
          className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-lg border transition-all ${
            title.copied
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {title.copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function DescriptionCard({ desc }: { desc: string }) {
  const [copied, setCopied] = useState(false);
  const charCount = desc.length;
  const charColor =
    charCount > 160 ? 'text-red-500' :
    charCount < 150 ? 'text-amber-500' :
                      'text-green-600';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-800 leading-relaxed">{desc}</p>
      <div className="flex items-center justify-between mt-2">
        <span className={`text-[11px] font-semibold ${charColor}`}>
          {charCount}/160 ký tự
        </span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(desc).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
            copied
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function SerpPreviewCard({
  title, description, url,
}: { title: string; description: string; url: string }) {
  // Truncate để preview chính xác như Google
  const displayTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
  const displayDesc  = description.length > 160 ? description.slice(0, 157) + '...' : description;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* SERP Mock */}
      <div className="font-sans">
        {/* URL breadcrumb */}
        <p className="text-xs text-gray-500 mb-0.5 truncate">
          {url}
        </p>
        {/* Title */}
        <p className="text-[#1a0dab] text-lg font-normal leading-snug hover:underline cursor-pointer truncate">
          {displayTitle || 'Tiêu đề sản phẩm'}
        </p>
        {/* Description */}
        <p className="text-sm text-gray-600 mt-1 leading-snug">
          {displayDesc || 'Meta description sẽ hiện ở đây...'}
        </p>
      </div>

      {/* Title char warning */}
      {title.length > 60 && (
        <p className="text-[11px] text-red-500 mt-2">
          ⚠️ Title {title.length} ký tự — Google sẽ cắt sau {60} ký tự
        </p>
      )}
    </div>
  );
}
```

---

## 8. Sidebar — cập nhật `web/components/Sidebar.tsx`

```typescript
// Thêm section mới "ECOMMERCE":
{
  label: 'Ecommerce',
  items: [
    { href: '/tao-tieu-de-san-pham',   icon: '🏷️', label: 'Tiêu đề sản phẩm'   },
    { href: '/tao-ten-san-pham',        icon: '✏️', label: 'Tên sản phẩm'        },
    { href: '/gioi-thieu-san-pham',     icon: '📄', label: 'Giới thiệu sản phẩm' },
    { href: '/danh-gia-san-pham-nhanh', icon: '⭐', label: 'Đánh giá sản phẩm'   },
    { href: '/faq-san-pham',            icon: '❓', label: 'FAQ sản phẩm'         },
  ],
},
```

---

## 9. Cập nhật DEV-PAGE-ROUTING-NOTE.md

Thêm vào **Nhóm B**:

```markdown
| Tạo Tiêu Đề Sản Phẩm     | `/tao-tieu-de-san-pham`   | ✅ |
| Tạo Tên Sản Phẩm          | `/tao-ten-san-pham`        | ⏳ |
| Giới Thiệu Sản Phẩm       | `/gioi-thieu-san-pham`     | ⏳ |
| Đánh Giá Sản Phẩm (nhanh) | `/danh-gia-san-pham-nhanh` | ⏳ |
| FAQ Sản Phẩm              | `/faq-san-pham`            | ⏳ |
```

---

## 10. Thứ tự cài đặt

| Bước | File | Test |
|------|------|------|
| 1 | `lib/tao-tieu-de-san-pham/types.ts` | — |
| 2 | `lib/tao-tieu-de-san-pham/options.ts` | — |
| 3 | `lib/tao-tieu-de-san-pham/prompt-builder.ts` | Log prompt ra console, kiểm tra format |
| 4 | `api/tao-tieu-de-san-pham/fetch-url/route.ts` | Postman: POST với URL sp thật |
| 5 | `api/tao-tieu-de-san-pham/generate/route.ts` | Postman: POST, kiểm tra SSE events |
| 6 | `app/tao-tieu-de-san-pham/page.tsx` | Test flow đầy đủ: nhập SP → generate → SERP preview |
| 7 | `components/Sidebar.tsx` | Thêm section Ecommerce |

---

## 11. QA Checklist

### Input
- [ ] Tên SP: required, submit disabled khi trống
- [ ] URL GET: chỉ submit khi bắt đầu `http`, error rõ ràng nếu crawl fail
- [ ] GET thành công → tự điền productName + productFeatures vào form
- [ ] Tone: hover tooltip hiện `note`, click chọn highlight đúng
- [ ] Language: 15 options từ SUPPORTED_LANGUAGES

### Generate
- [ ] Click "Tạo tiêu đề" → loading spinner
- [ ] 5 title cards xuất hiện tuần tự (80ms delay giữa mỗi title)
- [ ] Skeleton loading hiện cho các title chưa xuất hiện
- [ ] Description card hiện sau khi tất cả titles đã render
- [ ] Abort (click Generate lần 2) → reset cards, huỷ request cũ

### Title Cards
- [ ] Char count màu xanh khi 50–60, vàng khi < 50, đỏ khi > 60
- [ ] Badge `✓ Keyword` hiện khi title chứa từ đầu của tên SP
- [ ] Badge `✓ Brand` hiện khi title chứa `brandName`
- [ ] Badge `✓ CTA` hiện khi title có từ khuyến khích mua
- [ ] Copy button hiện khi hover, ẩn khi không hover
- [ ] Click Copy → clipboard đúng → `✓` 1.5s → reset

### Meta Description Card
- [ ] Char count 150–160 → xanh; < 150 → vàng; > 160 → đỏ
- [ ] Copy button hoạt động

### SERP Preview
- [ ] Hiện URL dạng breadcrumb
- [ ] Title màu `#1a0dab` (Google blue)
- [ ] Title > 60 ký tự → truncate `...` + warning đỏ
- [ ] Description > 160 ký tự → truncate `...`
- [ ] Preview cập nhật realtime khi title đầu tiên xuất hiện

### Edge Cases
- [ ] SP tên rất dài (> 100 ký tự) → titles vẫn ≤ 60 ký tự
- [ ] Crawl URL 403/timeout → error message rõ, không crash page
- [ ] AI trả output sai format → `parseOutput` fallback, không crash
- [ ] Language = English → output bằng tiếng Anh

---

## 12. Bugs thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Parse titles = `[]` | AI thêm giải thích trước/sau format | Tìm pattern `^\d+[\.\)]` thay vì match exact "TITLES:" |
| Title > 60 ký tự | AI không đếm ký tự chính xác | Thêm vào prompt: "QUAN TRỌNG: ĐẾM CHÍNH XÁC, tối đa 60 ký tự" |
| Description ngắn < 150 | AI viết xong sớm | Nhắc trong prompt: "đủ 150–160 ký tự, không ngắn hơn" |
| SERP preview không cập nhật | `titles[0]` undefined khi titles = `[]` | Optional chaining `titles[0]?.text ?? ''` đã handle |
| `fetch-url` trả lỗi 403 | Site block bot | Báo user "Trang này không cho phép đọc tự động" |
| `parseOutput` mất description | AI không có "DESCRIPTION:" header | Fallback: lấy dòng cuối cùng dài nhất nếu không có header |
