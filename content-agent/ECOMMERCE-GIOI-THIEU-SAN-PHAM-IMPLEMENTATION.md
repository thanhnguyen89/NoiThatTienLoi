# ECOMMERCE-GIOI-THIEU-SAN-PHAM-IMPLEMENTATION.md
## Hướng dẫn code — Giới Thiệu Sản Phẩm (ECOMMERCE Tools)

> Chuẩn: `DEV-PAGE-ROUTING-NOTE.md` — **Nhóm B** (Stateless, không lưu DB)  
> Route: `/gioi-thieu-san-pham`  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Gemini API  
> Đọc cùng: `ECOMMERCE-TAO-TIEU-DE-SAN-PHAM-IMPLEMENTATION.md`

---

## 0. Vị trí trong ECOMMERCE Tools Family

| # | Tool | Route | Output | Spec |
|---|------|-------|--------|------|
| 1 | Tạo Tiêu Đề SP | `/tao-tieu-de-san-pham` | 5 Meta Title + 1 Meta Desc | ✅ |
| 2 | Tạo Tên Sản Phẩm | `/tao-ten-san-pham` | 10 tên SP + lý do | ✅ |
| 3 | **Giới Thiệu Sản Phẩm** | `/gioi-thieu-san-pham` | Mô tả 150–300 từ | **File này** |
| 4 | Đánh Giá Sản Phẩm | `/danh-gia-san-pham-nhanh` | Review 300–500 từ | ✅ |
| 5 | FAQ Sản Phẩm | `/faq-san-pham` | 5–10 Q&A pairs | ✅ |

---

## 1. Mục đích

Tạo **đoạn mô tả sản phẩm** (product description) chuẩn ecommerce để dùng trên:
- Trang sản phẩm (product page body)
- Listing Shopee / Lazada / Tiki
- Tab "Mô tả" trên website

Output là **1 đoạn văn liền mạch** (hoặc có heading nhỏ), 150–300 từ, nhấn mạnh công dụng + cảm xúc + CTA mua.

---

## 2. So sánh aiktp vs Local

| # | Điểm | aiktp | Local |
|---|------|-------|-------|
| 1 | Transport | WebSocket | **SSE** (chunk-by-chunk) |
| 2 | Output | Đoạn mô tả | **Đoạn mô tả có heading tùy chọn** |
| 3 | Độ dài | Cố định | **3 mức: Ngắn 150w / Chuẩn 250w / Chi tiết 400w** |
| 4 | Output format | Plain text | **Plain text hoặc HTML với `<h3>` + `<ul>`** |
| 5 | Từ cấm | Không | **Inject CLAUDE.md forbidden list** |
| 6 | GET từ URL | Không | **Có** |
| 7 | Lưu DB | Không | **Không** (có nút Copy + Copy HTML) |

---

## 3. Kiến trúc

### Cấu trúc file

```
web/
├── app/
│   ├── gioi-thieu-san-pham/
│   │   └── page.tsx
│   └── api/
│       └── gioi-thieu-san-pham/
│           ├── stream/
│           │   └── route.ts        ← SSE streaming (chunk-by-chunk)
│           └── fetch-url/
│               └── route.ts        ← Tái dùng pattern
└── lib/
    └── gioi-thieu-san-pham/
        ├── types.ts
        ├── options.ts
        └── prompt-builder.ts
```

> **Điểm khác biệt:** Dùng `stream/route.ts` (streaming text thật sự chunk-by-chunk),  
> không phải `generate/route.ts` (generate all rồi stream tuần tự).  
> Vì output là đoạn văn dài — user muốn thấy text hiện ra real-time.

---

## 4. Types — `web/lib/gioi-thieu-san-pham/types.ts`

```typescript
export type DescriptionLength = 'short' | 'standard' | 'detailed';
export type DescriptionFormat = 'prose' | 'structured';  // prose = plain text; structured = có <h3>/<ul>

export interface ProductDescConfig {
  productName:     string;
  specs:           string;   // Kích thước, chất liệu, thông số kỹ thuật
  keyBenefits:     string;   // Lợi ích chính, điểm bán hàng
  targetCustomer:  string;   // Đối tượng mua hàng
  length:          DescriptionLength;
  format:          DescriptionFormat;
  tone:            'friendly' | 'professional' | 'persuasive' | 'casual';
  language:        string;
  modelId:         string;
  brandName:       string;
  forbidden:       string;
}

// SSE streaming text
export type DescSSEEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done';  wordCount: number }
  | { type: 'error'; message: string };
```

---

## 5. Options — `web/lib/gioi-thieu-san-pham/options.ts`

```typescript
import type { DescriptionLength, DescriptionFormat } from './types';

export const LENGTH_OPTIONS: Array<{
  value: DescriptionLength;
  label: string;
  note:  string;
  words: string;
}> = [
  { value: 'short',    label: 'Ngắn',    note: 'Shopee/Lazada — đọc nhanh',   words: '~150 từ'  },
  { value: 'standard', label: 'Chuẩn',   note: 'Trang sản phẩm website',       words: '~250 từ'  },
  { value: 'detailed', label: 'Chi tiết', note: 'Bài viết mô tả đầy đủ',       words: '~400 từ'  },
];

export const FORMAT_OPTIONS: Array<{
  value: DescriptionFormat;
  label: string;
  note:  string;
}> = [
  { value: 'prose',      label: 'Đoạn văn',  note: 'Plain text — dùng được ở mọi nơi'   },
  { value: 'structured', label: 'Có heading', note: 'HTML với <h3> + <ul> — cho website'  },
];

export const DESCRIPTION_TONES = [
  { value: 'friendly',     label: 'Thân thiện',   emoji: '🙂' },
  { value: 'professional', label: 'Chuyên nghiệp', emoji: '💼' },
  { value: 'persuasive',   label: 'Thuyết phục',   emoji: '💡' },
  { value: 'casual',       label: 'Thoải mái',     emoji: '😎' },
] as const;

// Target word counts per length
export const LENGTH_TARGET_WORDS: Record<DescriptionLength, number> = {
  short:    150,
  standard: 250,
  detailed: 400,
};
```

---

## 6. Prompt Builder — `web/lib/gioi-thieu-san-pham/prompt-builder.ts`

```typescript
import type { ProductDescConfig } from './types';
import { LENGTH_TARGET_WORDS } from './options';

const TONE_GUIDE: Record<string, string> = {
  friendly:     'Gần gũi, ấm áp. Như người bán hàng thân thiện tư vấn thật sự cho bạn.',
  professional: 'Chuyên nghiệp, trang trọng. Đầy đủ thông số, không cảm thán.',
  persuasive:   'Thuyết phục, có hook cảm xúc. Nêu vấn đề của khách → sản phẩm giải quyết → CTA.',
  casual:       'Thoải mái, đời thường. Có thể dùng từ ngữ gần gũi.',
};

const FORMAT_GUIDE: Record<string, string> = {
  prose:
    'Viết đoạn văn liền mạch. KHÔNG dùng heading, bullet point. Kết bằng 1 câu CTA mua.',
  structured:
    'Dùng heading HTML <h3> và danh sách <ul><li> cho thông số kỹ thuật. Kết bằng 1 đoạn <p> CTA.',
};

// Forbidden words từ CLAUDE.md
const FORBIDDEN_WORDS = [
  'quan trọng', 'hiệu quả', 'tuy nhiên', 'bên cạnh đó', 'toàn diện', 'tối ưu hóa',
  'Trong cuộc sống hiện đại', 'Ngày nay', 'đa dạng và phong phú', 'vô cùng', 'cực kỳ',
  'tuyệt vời', 'siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo', 'không chỉ ... mà còn',
];

export function buildProductDescPrompt(config: ProductDescConfig): string {
  const targetWords  = LENGTH_TARGET_WORDS[config.length];
  const toneGuide    = TONE_GUIDE[config.tone]   ?? TONE_GUIDE.friendly;
  const formatGuide  = FORMAT_GUIDE[config.format] ?? FORMAT_GUIDE.prose;

  const allForbidden = [
    ...FORBIDDEN_WORDS,
    ...(config.forbidden ? config.forbidden.split(',').map((s) => s.trim()) : []),
  ].join(', ');

  const brandBlock = config.brandName
    ? `\nThương hiệu: ${config.brandName}`
    : '';

  return `
Bạn là chuyên gia viết mô tả sản phẩm nội thất ecommerce.

## Thông tin sản phẩm
- Tên sản phẩm: ${config.productName}
- Thông số kỹ thuật: ${config.specs}
- Lợi ích / điểm bán: ${config.keyBenefits}
- Khách hàng mục tiêu: ${config.targetCustomer}${brandBlock}

## Giọng văn: ${config.tone}
${toneGuide}

## Format output: ${config.format}
${formatGuide}

## Ngôn ngữ: ${config.language}

## Độ dài: khoảng ${targetWords} từ (±20 từ)

## Quy tắc bắt buộc:
- KHÔNG dùng: ${allForbidden}
- Số liệu phải chính xác theo thông số đã cung cấp, không bịa thêm
- Không bắt đầu bằng "Sản phẩm này...", "Đây là...", "Giới thiệu..."
- CTA cuối phải cụ thể: "giao hàng trong ngày", "báo giá miễn phí", "đặt ngay hôm nay"
- Xưng "Minh Quân" hoặc "chúng tôi" nếu có thương hiệu, không xưng "shop"

Viết ngay, không giải thích, không lời mở đầu.
`.trim();
}
```

---

## 7. API Routes

### 7.1 Stream — `/api/gioi-thieu-san-pham/stream/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildProductDescPrompt } from '@/lib/gioi-thieu-san-pham/prompt-builder';
import type { DescSSEEvent } from '@/lib/gioi-thieu-san-pham/types';

export const runtime = 'nodejs';

const schema = z.object({
  productName:    z.string().min(1).max(200),
  specs:          z.string().max(1000).default(''),
  keyBenefits:    z.string().max(500).default(''),
  targetCustomer: z.string().max(200).default(''),
  length:         z.enum(['short', 'standard', 'detailed']).default('standard'),
  format:         z.enum(['prose', 'structured']).default('prose'),
  tone:           z.enum(['friendly', 'professional', 'persuasive', 'casual']).default('friendly'),
  language:       z.string().default('Vietnamese'),
  modelId:        z.string().default('gemini-flash'),
  brandName:      z.string().default(''),
  forbidden:      z.string().default(''),
});

function sse(ctrl: ReadableStreamDefaultController, data: DescSSEEvent) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
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
    const prompt = buildProductDescPrompt(parsed.data as any);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';

          // Streaming thật — chunk-by-chunk
          const result = await model.generateContentStream(prompt);

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              fullText += text;
              sse(controller, { type: 'chunk', text });
            }
          }

          // Đếm từ khi xong
          const wordCount = fullText.trim().split(/\s+/).length;
          sse(controller, { type: 'done', wordCount });

        } catch (err) {
          sse(controller, { type: 'error', message: err instanceof Error ? err.message : 'Lỗi AI' });
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

### 7.2 Fetch URL — `/api/gioi-thieu-san-pham/fetch-url/route.ts`

Tái dùng pattern tương tự `tao-tieu-de-san-pham/fetch-url`. Trả về `{ productName, specs, keyBenefits }`.

---

## 8. Page — `web/app/gioi-thieu-san-pham/page.tsx`

Layout: **2 cột** — trái (input), phải (output text editor-like + actions).

### Input (cột trái — `w-80`)

| Field | Component | Notes |
|-------|-----------|-------|
| URL fetch | input + GET button | Điền productName + specs + keyBenefits |
| Tên sản phẩm | `input` required | — |
| Thông số kỹ thuật | `textarea` rows=4 | Kích thước, chất liệu, tải trọng |
| Lợi ích / điểm bán | `textarea` rows=3 | Tại sao mua SP này |
| Khách hàng mục tiêu | `input` | "sinh viên", "gia đình" |
| Độ dài | 3 radio cards | short / standard / detailed + word count |
| Format | 2 toggle buttons | Đoạn văn / Có heading |
| Giọng văn | 4 buttons | friendly / professional / persuasive / casual |
| Ngôn ngữ | `select` | SUPPORTED_LANGUAGES |

### Output (cột phải — `flex-1`)

```
┌─────────────────────────────────────────────────┐
│  Header: [word count badge] [Copy] [Copy HTML]  │
│─────────────────────────────────────────────────│
│                                                 │
│  Giường sắt 1m8 phù hợp cho phòng ngủ nhỏ...  │
│  Khung sắt hộp 4×6cm, sơn tĩnh điện cao cấp... │
│  [streaming text hiện ra real-time]             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Hai nút copy:**
- `Copy text` — plain text (strip HTML tags nếu format = structured)
- `Copy HTML` — raw HTML (chỉ hiện khi format = structured)

**Word count badge:**
- Xanh: trong range ±20% target
- Vàng: ngoài range nhưng chấp nhận được
- Đỏ: quá ngắn hoặc quá dài

### Streaming display

```typescript
// FE nhận chunk → append vào output state
const [output, setOutput] = useState('');
const [wordCount, setWordCount] = useState(0);

// Event handler:
if (event.type === 'chunk') {
  setOutput(prev => prev + event.text);
} else if (event.type === 'done') {
  setWordCount(event.wordCount);
}

// Render — nếu format = structured: dùng dangerouslySetInnerHTML
// Nếu format = prose: dùng whitespace-pre-wrap text
```

---

## 9. Thứ tự cài đặt

| Bước | File | Test |
|------|------|------|
| 1 | `lib/gioi-thieu-san-pham/types.ts` | — |
| 2 | `lib/gioi-thieu-san-pham/options.ts` | — |
| 3 | `lib/gioi-thieu-san-pham/prompt-builder.ts` | Log prompt với từng length |
| 4 | `api/gioi-thieu-san-pham/fetch-url/route.ts` | Postman |
| 5 | `api/gioi-thieu-san-pham/stream/route.ts` | Postman: kiểm tra streaming chunks |
| 6 | `app/gioi-thieu-san-pham/page.tsx` | Test cả 3 length × 2 format |

---

## 10. QA Checklist

### Input
- [ ] Tên SP: required, button disabled khi trống
- [ ] URL GET: crawl thành công → điền form
- [ ] Độ dài: 3 options, hiện word count target
- [ ] Format toggle: Đoạn văn / Có heading — ảnh hưởng display output

### Generate
- [ ] Text stream chunk-by-chunk (không phải đột ngột xuất hiện)
- [ ] Word count badge cập nhật sau khi xong
- [ ] Format = prose: không có HTML tags trong output
- [ ] Format = structured: có `<h3>` và `<ul>` trong HTML, hiện đẹp khi render

### Copy
- [ ] `Copy text`: plain text không có HTML
- [ ] `Copy HTML`: raw HTML (nút ẩn khi format = prose)
- [ ] Cả 2: clipboard đúng → `✓` 1.5s → reset

### Nội dung
- [ ] Không chứa từ cấm từ CLAUDE.md
- [ ] Có CTA cụ thể ở cuối
- [ ] Số liệu khớp với input specs

---

## 11. Bugs thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| AI dùng từ cấm | Prompt thiếu emphasis | Thêm "**QUAN TRỌNG: KHÔNG ĐƯỢC DÙNG**" + list đầy đủ |
| Structured format ra markdown thay vì HTML | AI dùng `##` thay `<h3>` | Prompt: "Dùng HTML `<h3>` và `<ul>` — KHÔNG dùng markdown `##`" |
| Text ngắn hơn target | AI không đếm từ | Thêm: "Đếm từ trước khi trả — phải đạt ${targetWords} từ" |
| Streaming bị stuck | `generateContentStream` lỗi với model cũ | Fallback sang `generateContent` rồi stream giả |
| `dangerouslySetInnerHTML` XSS | AI thêm `<script>` | Strip `<script>`, `<style>`, `on*` attrs trước khi render |
