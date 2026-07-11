# ECOMMERCE-FAQ-SAN-PHAM-IMPLEMENTATION.md
## Hướng dẫn code — FAQ Sản Phẩm (ECOMMERCE Tools)

> Chuẩn: `DEV-PAGE-ROUTING-NOTE.md` — **Nhóm B** (Stateless, không lưu DB)  
> Route: `/faq-san-pham`  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Gemini API  
> Đọc cùng: `ECOMMERCE-TAO-TIEU-DE-SAN-PHAM-IMPLEMENTATION.md`

---

## 0. Vị trí trong ECOMMERCE Tools Family

| # | Tool | Route | Output | Spec |
|---|------|-------|--------|------|
| 1 | Tạo Tiêu Đề SP | `/tao-tieu-de-san-pham` | 5 Meta Title + 1 Meta Desc | ✅ |
| 2 | Tạo Tên Sản Phẩm | `/tao-ten-san-pham` | 10 tên SP + lý do | ✅ |
| 3 | Giới Thiệu Sản Phẩm | `/gioi-thieu-san-pham` | Mô tả 150–300 từ | ✅ |
| 4 | Đánh Giá Sản Phẩm | `/danh-gia-san-pham-nhanh` | Review 300–500 từ | ✅ |
| 5 | **FAQ Sản Phẩm** | `/faq-san-pham` | 5–10 Q&A pairs | **File này** |

---

## 1. Mục đích

Tạo bộ **câu hỏi thường gặp (FAQ)** cho sản phẩm. Output là danh sách Q&A pairs — dùng để:

- Section "Câu hỏi thường gặp" trên trang sản phẩm
- Schema FAQ (structured data) cho SEO
- Nội dung cho chatbot tư vấn
- Phần FAQ trong bài viết blog

**Điểm mạnh SEO của FAQ:** Google hiển thị FAQ rich snippets — tăng click rate và chiếm không gian SERP.

---

## 2. So sánh aiktp vs Local

| # | Điểm | aiktp | Local |
|---|------|-------|-------|
| 1 | Transport | WebSocket | **SSE** |
| 2 | Output | Q&A text | **Q&A pairs + JSON Schema export** |
| 3 | Số câu | Cố định | **Tùy chọn: 5 / 7 / 10 câu** |
| 4 | FAQ types | Không phân loại | **3 loại: Chung / Kỹ thuật / Mua hàng** |
| 5 | Schema export | Không | **Export FAQ Schema JSON-LD** |
| 6 | Copy options | Copy all | **Copy text + Copy JSON-LD** |
| 7 | GET từ URL | Không | **Có** |
| 8 | Lưu DB | Không | **Không** (stateless) |

---

## 3. Kiến trúc

### Cấu trúc file

```
web/
├── app/
│   ├── faq-san-pham/
│   │   └── page.tsx
│   └── api/
│       └── faq-san-pham/
│           ├── generate/
│           │   └── route.ts        ← Generate all → stream tuần tự (như tao-tieu-de)
│           └── fetch-url/
│               └── route.ts
└── lib/
    └── faq-san-pham/
        ├── types.ts
        ├── options.ts
        └── prompt-builder.ts
```

> **Dùng `generate/route.ts`** (không phải `stream/`) vì output là structured Q&A pairs,  
> cần parse toàn bộ trước khi stream tuần tự ra FE — giống pattern của `tao-tieu-de-san-pham`.

---

## 4. Types — `web/lib/faq-san-pham/types.ts`

```typescript
export type FaqType =
  | 'general'    // Câu hỏi chung về sản phẩm
  | 'technical'  // Thông số kỹ thuật, chất liệu, kích thước
  | 'purchase';  // Liên quan mua hàng: ship, bảo hành, đổi trả

export type FaqCount = 5 | 7 | 10;

export interface FaqConfig {
  productName:     string;
  specs:           string;
  useCase:         string;    // Bối cảnh dùng sản phẩm
  commonConcerns:  string;    // Khách hàng hay hỏi gì (optional)
  faqTypes:        FaqType[]; // Multi-select: 1–3 loại
  count:           FaqCount;
  includeSchema:   boolean;   // Có tạo JSON-LD không
  language:        string;
  modelId:         string;
  brandName:       string;
  shopPhone:       string;    // Số điện thoại shop cho câu trả lời mua hàng
  shopAddress:     string;    // Địa chỉ cho FAQ giao hàng
}

export interface FaqPair {
  id:       string;
  question: string;
  answer:   string;
  type:     FaqType;
  copied:   boolean;
}

// SSE events
export type FaqSSEEvent =
  | { type: 'faq'; index: number; question: string; answer: string; faqType: FaqType }
  | { type: 'done' }
  | { type: 'error'; message: string };
```

---

## 5. Options — `web/lib/faq-san-pham/options.ts`

```typescript
import type { FaqType, FaqCount } from './types';

export const FAQ_TYPE_OPTIONS: Array<{
  value: FaqType;
  label: string;
  emoji: string;
  note:  string;
}> = [
  {
    value: 'general',
    label: 'Câu hỏi chung',
    emoji: '💬',
    note:  'Sản phẩm là gì, phù hợp ai, dùng được bao lâu...',
  },
  {
    value: 'technical',
    label: 'Kỹ thuật',
    emoji: '🔧',
    note:  'Kích thước, chất liệu, tải trọng, lắp ráp...',
  },
  {
    value: 'purchase',
    label: 'Mua hàng',
    emoji: '🛒',
    note:  'Giao hàng, bảo hành, đổi trả, thanh toán...',
  },
];

export const FAQ_COUNT_OPTIONS: Array<{ value: FaqCount; label: string }> = [
  { value: 5,  label: '5 câu hỏi — Compact'  },
  { value: 7,  label: '7 câu hỏi — Chuẩn'    },
  { value: 10, label: '10 câu hỏi — Đầy đủ'  },
];

// Distribution of FAQ types when multiple selected
export const FAQ_TYPE_DISTRIBUTION: Record<string, Record<FaqType, number>> = {
  // key: sorted types joined, value: count per type
  'general':                    { general: 5, technical: 0, purchase: 0 },
  'technical':                  { general: 0, technical: 5, purchase: 0 },
  'purchase':                   { general: 0, technical: 0, purchase: 5 },
  'general,technical':          { general: 3, technical: 2, purchase: 0 },
  'general,purchase':           { general: 3, technical: 0, purchase: 2 },
  'technical,purchase':         { general: 0, technical: 3, purchase: 2 },
  'general,purchase,technical': { general: 2, technical: 2, purchase: 1 },
};
```

---

## 6. Prompt Builder — `web/lib/faq-san-pham/prompt-builder.ts`

```typescript
import type { FaqConfig, FaqType } from './types';

const TYPE_INSTRUCTIONS: Record<FaqType, string> = {
  general: `
- Sản phẩm này phù hợp cho ai?
- Có bền không, dùng được bao lâu?
- Có cần lắp ráp không?
- Màu sắc / kiểu dáng có nhiều lựa chọn không?
→ Trả lời thực tế, cụ thể, không nói chung chung.`,

  technical: `
- Kích thước chính xác (chiều dài × rộng × cao)?
- Chất liệu làm từ gì? Độ dày? Tải trọng?
- Có cần bảo dưỡng không? Cách vệ sinh?
- Có tiêu chuẩn an toàn không?
→ Dùng số liệu từ thông số đã cung cấp. KHÔNG bịa số.`,

  purchase: `
- Giao hàng bao lâu? Phí ship?
- Bảo hành bao lâu, bảo hành những gì?
- Đổi trả như thế nào nếu hàng lỗi?
- Thanh toán những hình thức nào?
→ Cung cấp thông tin shop nếu có (địa chỉ, hotline).`,
};

export function buildFaqPrompt(config: FaqConfig): string {
  const typeInstructions = config.faqTypes
    .map((t) => `### ${t.toUpperCase()}\n${TYPE_INSTRUCTIONS[t]}`)
    .join('\n\n');

  const shopBlock = [
    config.brandName   && `Thương hiệu: ${config.brandName}`,
    config.shopPhone   && `Hotline: ${config.shopPhone}`,
    config.shopAddress && `Địa chỉ: ${config.shopAddress}`,
  ].filter(Boolean).join('\n');

  const concernsBlock = config.commonConcerns
    ? `\nKhách hàng hay băn khoăn: ${config.commonConcerns}`
    : '';

  return `
Bạn là chuyên gia ecommerce. Tạo ${config.count} câu hỏi thường gặp (FAQ) cho sản phẩm nội thất.

## Thông tin sản phẩm
- Tên: ${config.productName}
- Thông số: ${config.specs}
- Bối cảnh dùng: ${config.useCase}${concernsBlock}
${shopBlock ? `\n## Thông tin shop\n${shopBlock}` : ''}

## Loại câu hỏi cần tạo:
${typeInstructions}

## Ngôn ngữ: ${config.language}

## Yêu cầu:
- Tổng đúng ${config.count} cặp Q&A
- Câu hỏi: ngắn, tự nhiên như người mua thật hỏi (không hỏi kiểu văn phòng)
- Câu trả lời: cụ thể, đủ thông tin, 2–5 câu, KHÔNG nói "Vui lòng liên hệ..."
- Câu trả lời mua hàng (purchase): dùng thông tin shop nếu có
- KHÔNG dùng: "quan trọng", "vô cùng", "cực kỳ", "siêu phẩm", "hoàn hảo"

## Format output BẮT BUỘC:
FAQ:
Q1 [type: general/technical/purchase]: [câu hỏi]
A1: [câu trả lời]

Q2 [type: ...]: [câu hỏi]
A2: [câu trả lời]

...

Q${config.count} [type: ...]: [câu hỏi]
A${config.count}: [câu trả lời]
`.trim();
}

// Build FAQ Schema JSON-LD
export function buildFaqSchema(faqs: Array<{ question: string; answer: string }>): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type':          'Question',
      name:             faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    faq.answer,
      },
    })),
  };
  return JSON.stringify(schema, null, 2);
}
```

---

## 7. API Routes

### 7.1 Generate — `/api/faq-san-pham/generate/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildFaqPrompt } from '@/lib/faq-san-pham/prompt-builder';
import type { FaqSSEEvent, FaqType } from '@/lib/faq-san-pham/types';

export const runtime = 'nodejs';

const schema = z.object({
  productName:    z.string().min(1).max(200),
  specs:          z.string().max(1000).default(''),
  useCase:        z.string().max(200).default(''),
  commonConcerns: z.string().max(500).default(''),
  faqTypes:       z.array(z.enum(['general', 'technical', 'purchase'])).min(1).default(['general']),
  count:          z.number().int().refine((n) => [5, 7, 10].includes(n)).default(7),
  includeSchema:  z.boolean().default(true),
  language:       z.string().default('Vietnamese'),
  modelId:        z.string().default('gemini-flash'),
  brandName:      z.string().default(''),
  shopPhone:      z.string().default(''),
  shopAddress:    z.string().default(''),
});

function sse(ctrl: ReadableStreamDefaultController, data: FaqSSEEvent) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Parse format:
// Q1 [type: general]: câu hỏi
// A1: câu trả lời
function parseFaqOutput(
  raw: string,
  count: number,
): Array<{ question: string; answer: string; faqType: FaqType }> {
  const lines  = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const VALID_TYPES: FaqType[] = ['general', 'technical', 'purchase'];
  const results: Array<{ question: string; answer: string; faqType: FaqType }> = [];

  let currentQ: string | null   = null;
  let currentType: FaqType       = 'general';
  let currentA: string | null   = null;

  const flush = () => {
    if (currentQ && currentA) {
      results.push({ question: currentQ, answer: currentA, faqType: currentType });
      currentQ = null;
      currentA = null;
    }
  };

  for (const line of lines) {
    // Q line: "Q1 [type: general]: câu hỏi"
    const qMatch = line.match(/^Q\d+\s*(?:\[type:\s*(\w+)\])?\s*[:\.]\s*(.+)/i);
    if (qMatch) {
      flush();
      const typeRaw = qMatch[1]?.toLowerCase();
      currentType   = VALID_TYPES.includes(typeRaw as FaqType) ? (typeRaw as FaqType) : 'general';
      currentQ      = qMatch[2].trim();
      continue;
    }

    // A line: "A1: câu trả lời"
    const aMatch = line.match(/^A\d+\s*[:\.]\s*(.+)/i);
    if (aMatch && currentQ) {
      currentA = (currentA ? currentA + ' ' : '') + aMatch[1].trim();
      continue;
    }

    // Continuation of answer
    if (currentQ && currentA && !line.match(/^Q\d+/i)) {
      currentA += ' ' + line;
    }
  }
  flush();

  return results.slice(0, count);
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
    const prompt = buildFaqPrompt(parsed.data as any);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result  = await model.generateContent(prompt);
          const rawText = result.response.text();
          const faqs    = parseFaqOutput(rawText, parsed.data.count);

          for (let i = 0; i < faqs.length; i++) {
            const faq = faqs[i]!;
            sse(controller, {
              type:     'faq',
              index:    i,
              question: faq.question,
              answer:   faq.answer,
              faqType:  faq.faqType,
            });
            await new Promise((r) => setTimeout(r, 80));
          }

          sse(controller, { type: 'done' });
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

### 7.2 Fetch URL — tái dùng pattern, trả về `{ productName, specs, useCase, commonConcerns }`

---

## 8. Page — `web/app/faq-san-pham/page.tsx`

Layout: **2 cột** — trái (input), phải (FAQ accordion list + schema export).

### Input (cột trái — `w-80`)

| Field | Component | Notes |
|-------|-----------|-------|
| URL fetch | input + GET button | — |
| Tên sản phẩm | `input` required | — |
| Thông số | `textarea` rows=3 | — |
| Bối cảnh dùng | `input` | "phòng trọ HCM", "nhà có trẻ 5 tuổi" |
| Khách hay hỏi gì | `textarea` rows=2 | "hay hỏi về giao hàng nhanh, có lắp ráp không" |
| Loại FAQ | **Multi-select checkboxes** | Chọn ≥ 1 loại |
| Số câu | 3 radio | 5 / 7 / 10 |
| Bao gồm Schema | Toggle switch | Có tạo JSON-LD hay không |
| Hotline shop | `input` | Optional, điền vào câu trả lời purchase |
| Địa chỉ shop | `input` | Optional |
| Ngôn ngữ | `select` | — |

### Multi-select Checkboxes (Loại FAQ)

```tsx
<div className="space-y-2">
  {FAQ_TYPE_OPTIONS.map((opt) => (
    <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={config.faqTypes.includes(opt.value)}
        onChange={(e) => {
          const next = e.target.checked
            ? [...config.faqTypes, opt.value]
            : config.faqTypes.filter((t) => t !== opt.value);
          if (next.length > 0) update({ faqTypes: next });
          // Không cho bỏ hết — phải chọn ≥ 1
        }}
        className="mt-0.5 w-4 h-4 rounded text-blue-600"
      />
      <div>
        <span className="text-sm font-medium">{opt.emoji} {opt.label}</span>
        <p className="text-xs text-gray-500">{opt.note}</p>
      </div>
    </label>
  ))}
</div>
```

### Output (cột phải — `flex-1`)

**Header:** FAQ count badge + `[Copy text]` + `[Copy JSON-LD]` (hiện khi `includeSchema = true`)

**FAQ Accordion:**
```
┌─────────────────────────────────────────────────┐
│  [general] 🔵  Sản phẩm phù hợp cho ai?    ▼  │
│  ─────────────────────────────────────────────  │
│  Giường sắt 1m8 này phù hợp với gia đình...    │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  [technical] 🟠  Kích thước chính xác là?   ▼  │
│  (collapsed)                                    │
└─────────────────────────────────────────────────┘
```

**Type badge màu:**
- `general` → xanh lam
- `technical` → cam
- `purchase` → xanh lá

**FAQ Accordion state:** Mặc định expanded tất cả khi mới generate, user click để collapse.

**JSON-LD Preview box** (chỉ hiện khi `includeSchema = true`, sau khi done):
```
┌─────────────────────────────────────────────────┐
│  📋 FAQ Schema JSON-LD            [Copy JSON-LD] │
│  ─────────────────────────────────────────────  │
│  <script type="application/ld+json">            │
│  {                                              │
│    "@context": "https://schema.org",            │
│    "@type": "FAQPage",                          │
│    ...                                          │
│  }                                              │
│  </script>                                      │
└─────────────────────────────────────────────────┘
```

### Logic FE quan trọng

```typescript
// Khi FAQ xong, build JSON-LD từ pairs đã nhận:
const [faqs, setFaqs]         = useState<FaqPair[]>([]);
const [schemaJson, setSchema] = useState('');
const [loading, setLoading]   = useState(false);

// onDone event:
if (event.type === 'done' && config.includeSchema) {
  const schema = buildFaqSchemaClient(faqs);
  setSchema(schema);
}

// Build schema ở FE (không cần API) — dùng hàm từ lib/faq-san-pham/prompt-builder.ts
// (export buildFaqSchema, import vào page)
```

**Copy JSON-LD** = bao wrap trong `<script type="application/ld+json">...</script>` rồi copy.

---

## 9. Thứ tự cài đặt

| Bước | File | Test |
|------|------|------|
| 1 | `lib/faq-san-pham/types.ts` | — |
| 2 | `lib/faq-san-pham/options.ts` | — |
| 3 | `lib/faq-san-pham/prompt-builder.ts` | Log prompt + test `buildFaqSchema()` |
| 4 | `api/faq-san-pham/fetch-url/route.ts` | Postman |
| 5 | `api/faq-san-pham/generate/route.ts` | Postman: count=5, count=10, multi faqTypes |
| 6 | `app/faq-san-pham/page.tsx` | Full flow: chọn 3 loại, count=10, JSON-LD |

---

## 10. QA Checklist

### Input
- [ ] Multi-select checkboxes: chọn được ≥ 1, không cho bỏ hết
- [ ] Count: 5/7/10 đúng số lượng output
- [ ] Schema toggle: ảnh hưởng hiện/ẩn JSON-LD box và copy button
- [ ] Hotline/Địa chỉ: điền vào → câu trả lời purchase chứa thông tin này

### Generate
- [ ] FAQ cards xuất hiện tuần tự (80ms delay)
- [ ] Skeleton cho các cards chưa hiện
- [ ] Type badge đúng màu + đúng loại
- [ ] Count = 7 → đúng 7 cặp Q&A

### Accordion
- [ ] Mặc định expanded hết
- [ ] Click header → toggle collapse/expand
- [ ] Nội dung câu trả lời không bị truncate khi expanded

### JSON-LD
- [ ] Chỉ hiện khi `includeSchema = true`
- [ ] Schema parse được bởi Google Rich Results Test
- [ ] Số lượng `mainEntity` = số câu FAQ đúng
- [ ] Copy JSON-LD = bao trong `<script>...</script>`

### Copy
- [ ] Copy text: mỗi cặp "Q: ...\nA: ...\n" format
- [ ] Copy từng câu: click icon copy → clipboard đúng câu đó

### Edge Cases
- [ ] productName rỗng → button disabled
- [ ] count=10 nhưng AI chỉ trả 8 → hiện 8 cards, không crash
- [ ] FAQ loại `purchase` nhưng không có shopPhone/Address → trả lời vẫn hợp lý

---

## 11. Bugs thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Parse thiếu câu | AI dùng "Question 1" thay "Q1" | Regex pattern mở rộng: `/^(?:Q\d+\|Question\s*\d+)/i` |
| Type sai (tất cả `general`) | AI không viết `[type: ...]` | Parser fallback: phân loại theo keywords trong câu hỏi |
| Câu trả lời cắt nửa chừng | Answer nằm nhiều dòng, parser bỏ | `currentA += ' ' + line` cho continuation lines |
| JSON-LD không valid | Answer có `"` chưa escape | `JSON.stringify` tự xử lý — đảm bảo dùng `JSON.stringify()` không tự concat |
| Schema hiện trống khi toggle | State `schemaJson` chưa rebuild | Rebuild schema mỗi khi faqs thay đổi qua `useEffect` |

---

## 12. Cập nhật DEV-PAGE-ROUTING-NOTE.md

Sau khi hoàn thành cả 5 ECOMMERCE tools, cập nhật bảng Nhóm B:

```markdown
| Tạo Tiêu Đề Sản Phẩm     | `/tao-tieu-de-san-pham`   | ✅ |
| Tạo Tên Sản Phẩm          | `/tao-ten-san-pham`        | ✅ |
| Giới Thiệu Sản Phẩm       | `/gioi-thieu-san-pham`     | ✅ |
| Đánh Giá Sản Phẩm (nhanh) | `/danh-gia-san-pham-nhanh` | ✅ |
| FAQ Sản Phẩm              | `/faq-san-pham`            | ✅ |
```
