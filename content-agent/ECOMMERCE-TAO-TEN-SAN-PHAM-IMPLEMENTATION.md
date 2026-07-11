# ECOMMERCE-TAO-TEN-SAN-PHAM-IMPLEMENTATION.md
## Hướng dẫn code — Tạo Tên Sản Phẩm (ECOMMERCE Tools)

> Chuẩn: `DEV-PAGE-ROUTING-NOTE.md` — **Nhóm B** (Stateless, không lưu DB)  
> Route: `/tao-ten-san-pham`  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Gemini API  
> Đọc cùng: `ECOMMERCE-TAO-TIEU-DE-SAN-PHAM-IMPLEMENTATION.md` (tool đầu tiên trong family)

---

## 0. Vị trí trong ECOMMERCE Tools Family

| # | Tool | Route | Output | Spec |
|---|------|-------|--------|------|
| 1 | Tạo Tiêu Đề SP | `/tao-tieu-de-san-pham` | 5 Meta Title + 1 Meta Desc | ✅ |
| 2 | **Tạo Tên Sản Phẩm** | `/tao-ten-san-pham` | 10 tên SP + lý do | **File này** |
| 3 | Giới Thiệu Sản Phẩm | `/gioi-thieu-san-pham` | Mô tả 150–300 từ | ✅ |
| 4 | Đánh Giá Sản Phẩm | `/danh-gia-san-pham-nhanh` | Review 300–500 từ | ✅ |
| 5 | FAQ Sản Phẩm | `/faq-san-pham` | 5–10 Q&A pairs | ✅ |

Tab navigation ở đầu page — user click qua lại giữa 5 tool.

---

## 1. Mục đích

Tạo **10 phương án tên sản phẩm** đa dạng phong cách: ngắn gọn, có từ khóa SEO, gợi cảm xúc, định vị phân khúc. Mỗi tên kèm **lý do ngắn** (1 câu) giải thích vì sao phù hợp.

**Dùng khi:**
- Ra sản phẩm mới, cần đặt tên
- Test A/B tên sản phẩm trên listing
- Tối ưu tên cũ cho SEO

---

## 2. So sánh aiktp vs Local

| # | Điểm | aiktp | Local |
|---|------|-------|-------|
| 1 | Transport | WebSocket | **SSE** |
| 2 | Output | Danh sách tên | **10 tên + lý do từng cái** |
| 3 | Name styles | Không phân loại | **6 style categories** |
| 4 | Brand inject | Không | **Có** — forbidden words |
| 5 | GET từ URL | Không | **Có** — tái dùng fetch-url pattern |
| 6 | Lưu DB | Không | **Không** (stateless) |

---

## 3. Kiến trúc

### Cấu trúc file

```
web/
├── app/
│   ├── tao-ten-san-pham/
│   │   └── page.tsx
│   └── api/
│       └── tao-ten-san-pham/
│           ├── generate/
│           │   └── route.ts
│           └── fetch-url/
│               └── route.ts      ← Tái dùng logic từ tao-tieu-de-san-pham
└── lib/
    └── tao-ten-san-pham/
        ├── types.ts
        ├── options.ts
        └── prompt-builder.ts
```

### File tái sử dụng

| File | Dùng để |
|------|---------|
| `lib/shared/options.ts` | `SUPPORTED_LANGUAGES` |
| `lib/tinh-gon/model.ts` | `buildTinhGonModel()` |
| `lib/tao-tieu-de-san-pham/options.ts` | `ECOMMERCE_TABS` (import và set `active` đúng tab) |

> **Lưu ý:** `ECOMMERCE_TABS` định nghĩa ở `tao-tieu-de-san-pham/options.ts`.  
> Mỗi tool import và override `active` cho tab của mình — không copy-paste.

---

## 4. Types — `web/lib/tao-ten-san-pham/types.ts`

```typescript
export type ProductNameStyle =
  | 'seo'          // Có từ khóa tìm kiếm rõ ràng
  | 'short'        // Ngắn gọn, dễ nhớ (2–4 từ)
  | 'descriptive'  // Mô tả đầy đủ chất liệu + tính năng
  | 'emotional'    // Gợi cảm xúc, thương hiệu
  | 'segmented'    // Định vị phân khúc (cao cấp / phổ thông / gia đình)
  | 'localized';   // Thêm vị trí / đối tượng (sinh viên, HCM, toàn quốc)

export interface ProductNameConfig {
  productType:     string;   // Loại SP: "giường sắt", "tủ quần áo", "bàn học"
  material:        string;   // Chất liệu chính: "sắt hộp 4×6cm", "gỗ ép", "inox"
  keyFeatures:     string;   // Ưu điểm nổi bật: "gấp gọn", "2 tầng", "có bánh xe"
  targetCustomer:  string;   // Khách hàng: "sinh viên thuê trọ", "gia đình HCM"
  priceSegment:    'budget' | 'mid' | 'premium';
  language:        string;
  modelId:         string;
  brandName:       string;
  forbidden:       string;
}

export interface ProductNameVariant {
  id:    string;
  name:  string;
  style: ProductNameStyle;
  reason: string;   // 1 câu lý do
  copied: boolean;
}

// SSE events
export type NameSSEEvent =
  | { type: 'name';  index: number; name: string; style: ProductNameStyle; reason: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
```

---

## 5. Options — `web/lib/tao-ten-san-pham/options.ts`

```typescript
import type { ProductNameStyle } from './types';

export const NAME_STYLE_LABELS: Record<ProductNameStyle, { label: string; note: string }> = {
  seo:         { label: 'SEO',         note: 'Chứa từ khóa tìm kiếm chính xác' },
  short:       { label: 'Ngắn gọn',    note: '2–4 từ, dễ nhớ, dễ tag' },
  descriptive: { label: 'Mô tả',       note: 'Đầy đủ chất liệu + tính năng' },
  emotional:   { label: 'Cảm xúc',     note: 'Gợi cảm giác, kết nối người dùng' },
  segmented:   { label: 'Phân khúc',   note: 'Định vị cao cấp / phổ thông rõ ràng' },
  localized:   { label: 'Địa phương',  note: 'Gắn với đối tượng hoặc khu vực cụ thể' },
};

export const PRICE_SEGMENT_OPTIONS = [
  { value: 'budget',  label: 'Phổ thông',  note: 'Giá rẻ, giao nhanh, giá trị' },
  { value: 'mid',     label: 'Tầm trung',  note: 'Cân bằng chất lượng – giá' },
  { value: 'premium', label: 'Cao cấp',    note: 'Premium, chất lượng cao' },
] as const;

export const NAME_VARIANTS_COUNT = 10;
```

---

## 6. Prompt Builder — `web/lib/tao-ten-san-pham/prompt-builder.ts`

```typescript
import type { ProductNameConfig } from './types';
import { NAME_VARIANTS_COUNT } from './options';

const PRICE_SEGMENT_CONTEXT: Record<string, string> = {
  budget:  'Giá bình dân, phù hợp sinh viên / người thu nhập thấp. Nhấn mạnh giá trị đồng tiền.',
  mid:     'Tầm trung, cân bằng chất lượng và giá. Không rẻ tiền, không quá cao cấp.',
  premium: 'Cao cấp, bền, sang. Khách hàng không ngại chi nếu chất lượng xứng đáng.',
};

export function buildProductNamePrompt(config: ProductNameConfig): string {
  const brandBlock = config.brandName
    ? `\nThương hiệu: ${config.brandName}${config.forbidden ? ` — KHÔNG dùng: ${config.forbidden}` : ''}`
    : '';

  return `
Bạn là chuyên gia đặt tên sản phẩm nội thất. Tạo ${NAME_VARIANTS_COUNT} phương án tên sản phẩm cho listing ecommerce.

## Thông tin sản phẩm
- Loại sản phẩm: ${config.productType}
- Chất liệu: ${config.material}
- Tính năng nổi bật: ${config.keyFeatures}
- Khách hàng mục tiêu: ${config.targetCustomer}
- Phân khúc giá: ${config.priceSegment} — ${PRICE_SEGMENT_CONTEXT[config.priceSegment]}${brandBlock}

## Ngôn ngữ output: ${config.language}

## Yêu cầu ${NAME_VARIANTS_COUNT} tên:
Tạo đúng ${NAME_VARIANTS_COUNT} tên, mỗi tên một phong cách khác nhau:
- 2 tên phong cách SEO (có từ khóa tìm kiếm chính xác)
- 2 tên ngắn gọn (2–4 từ, dễ nhớ)
- 2 tên mô tả đầy đủ (chất liệu + tính năng)
- 1 tên cảm xúc (gợi cảm giác, lifestyle)
- 1 tên phân khúc (định vị phân khúc rõ ràng)
- 1 tên địa phương (gắn với khu vực hoặc đối tượng)
- 1 tên sáng tạo tự do

## Quy tắc đặt tên:
- Không dùng từ cấm: "siêu phẩm", "số 1", "đẳng cấp", "hoàn hảo", "tuyệt vời"
- Không viết hoa toàn bộ
- Độ dài: 3–10 từ mỗi tên (không quá dài)
- Có thể chứa thông số nếu phù hợp (1m8, 2 tầng, gấp gọn)

## Format output BẮT BUỘC:
NAMES:
1. [tên 1] | [style: seo/short/descriptive/emotional/segmented/localized] | [lý do 1 câu ngắn]
2. [tên 2] | [style] | [lý do]
...
10. [tên 10] | [style] | [lý do]
`.trim();
}
```

---

## 7. API Routes

### 7.1 Generate — `/api/tao-ten-san-pham/generate/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildProductNamePrompt } from '@/lib/tao-ten-san-pham/prompt-builder';
import { NAME_VARIANTS_COUNT } from '@/lib/tao-ten-san-pham/options';
import type { NameSSEEvent, ProductNameStyle } from '@/lib/tao-ten-san-pham/types';

export const runtime = 'nodejs';

const schema = z.object({
  productType:    z.string().min(1).max(200),
  material:       z.string().max(500).default(''),
  keyFeatures:    z.string().max(500).default(''),
  targetCustomer: z.string().max(200).default(''),
  priceSegment:   z.enum(['budget', 'mid', 'premium']).default('mid'),
  language:       z.string().default('Vietnamese'),
  modelId:        z.string().default('gemini-flash'),
  brandName:      z.string().default(''),
  forbidden:      z.string().default(''),
});

function sse(ctrl: ReadableStreamDefaultController, data: NameSSEEvent) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Parse format: "1. Tên sản phẩm | style | lý do"
function parseNameOutput(raw: string): Array<{ name: string; style: ProductNameStyle; reason: string }> {
  const lines   = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: Array<{ name: string; style: ProductNameStyle; reason: string }> = [];

  const VALID_STYLES: ProductNameStyle[] = ['seo', 'short', 'descriptive', 'emotional', 'segmented', 'localized'];

  for (const line of lines) {
    if (results.length >= NAME_VARIANTS_COUNT) break;

    // Match: "1. text | style | reason"
    const m = line.match(/^\d+[\.\)]\s*(.+?)\s*\|\s*(\w+)\s*\|\s*(.+)/);
    if (!m) continue;

    const [, name, styleRaw, reason] = m;
    const style = VALID_STYLES.includes(styleRaw as ProductNameStyle)
      ? (styleRaw as ProductNameStyle)
      : 'descriptive';

    results.push({
      name:   name.trim(),
      style,
      reason: reason.trim(),
    });
  }

  return results;
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
    const prompt = buildProductNamePrompt(parsed.data as any);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result  = await model.generateContent(prompt);
          const rawText = result.response.text();
          const names   = parseNameOutput(rawText);

          for (let i = 0; i < names.length; i++) {
            const item = names[i]!;
            sse(controller, { type: 'name', index: i, name: item.name, style: item.style, reason: item.reason });
            await new Promise((r) => setTimeout(r, 60));
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

### 7.2 Fetch URL — `/api/tao-ten-san-pham/fetch-url/route.ts`

Tái dùng **y hệt** logic từ `tao-tieu-de-san-pham/fetch-url/route.ts`.  
Trả về `{ productType, material, keyFeatures }` thay vì `{ productName, productFeatures }`.

```typescript
// Chỉ thay đổi AI extraction prompt:
const prompt = `
Từ nội dung trang sản phẩm sau, trích xuất:
1. Loại sản phẩm (VD: "giường sắt", "tủ quần áo gỗ", "bàn học")
2. Chất liệu chính (VD: "sắt hộp 4×6cm, sơn tĩnh điện")
3. Tính năng nổi bật (tối đa 100 từ)

Trả về JSON: {"productType": "...", "material": "...", "keyFeatures": "..."}
Chỉ trả JSON, không giải thích thêm.

Nội dung trang:
${cleanText}
`.trim();
// Trả về: NextResponse.json({ productType, material, keyFeatures })
```

---

## 8. Page — `web/app/tao-ten-san-pham/page.tsx`

Layout: **2 cột** — trái (input), phải (danh sách 10 tên).

### Input (cột trái — `w-80`)

| Field | Component | Notes |
|-------|-----------|-------|
| URL fetch | input + GET button | Tái dùng pattern — điền productType + material + keyFeatures |
| Loại sản phẩm | `input` required | "giường sắt 1m8", "tủ quần áo cánh kính" |
| Chất liệu | `input` | "sắt hộp 4×6cm, sơn tĩnh điện" |
| Tính năng nổi bật | `textarea` rows=3 | "gấp gọn, tải 200kg, bảo hành 12 tháng" |
| Khách hàng mục tiêu | `input` | "sinh viên thuê trọ HCM" |
| Phân khúc giá | 3 radio buttons | budget / mid / premium với mô tả |
| Ngôn ngữ | `select` | SUPPORTED_LANGUAGES |
| Generate button | `button` | Disabled khi không có productType |

### Output (cột phải — `flex-1`)

**Header:** "10 tên sản phẩm" + nút "Copy tất cả" (copy danh sách đánh số).

**Name Card** cho mỗi tên:
```
┌─────────────────────────────────────────┐
│  1  Giường Sắt Gấp Gọn 1m8 Sinh Viên  │
│     Style badge: [SEO]                  │
│     💬 Chứa từ khóa tìm kiếm chính...   │
│                              [Copy]     │
└─────────────────────────────────────────┘
```

**Style badge màu theo loại:**
- `seo` → xanh lam
- `short` → tím
- `descriptive` → cam
- `emotional` → hồng
- `segmented` → vàng
- `localized` → xanh lá

### Logic generate (FE)

```typescript
// SSE event handler:
if (event.type === 'name') {
  setNames(prev => [...prev, {
    id:     `name-${event.index}`,
    name:   event.name,
    style:  event.style,
    reason: event.reason,
    copied: false,
  }]);
}
```

---

## 9. Cập nhật ECOMMERCE_TABS

File `lib/tao-tieu-de-san-pham/options.ts` — ECOMMERCE_TABS đã define sẵn.  
Trong page `/tao-ten-san-pham`, import và render với tab "Tên SP" active:

```typescript
// Cách đơn giản — tự xác định active dựa trên pathname:
import { usePathname } from 'next/navigation';
const pathname = usePathname();
// Render ECOMMERCE_TABS với item active khi item.href === pathname
```

---

## 10. Thứ tự cài đặt

| Bước | File | Test |
|------|------|------|
| 1 | `lib/tao-ten-san-pham/types.ts` | — |
| 2 | `lib/tao-ten-san-pham/options.ts` | — |
| 3 | `lib/tao-ten-san-pham/prompt-builder.ts` | Log prompt |
| 4 | `api/tao-ten-san-pham/fetch-url/route.ts` | Postman |
| 5 | `api/tao-ten-san-pham/generate/route.ts` | Postman: 10 names, đủ fields |
| 6 | `app/tao-ten-san-pham/page.tsx` | Full flow |

---

## 11. QA Checklist

### Input
- [ ] Loại SP: required, button disabled khi trống
- [ ] URL GET: crawl thành công → điền productType + material + keyFeatures
- [ ] Phân khúc giá: 3 options, click chọn đúng
- [ ] Ngôn ngữ: SUPPORTED_LANGUAGES dropdown

### Generate
- [ ] 10 name cards xuất hiện tuần tự (60ms delay)
- [ ] Skeleton loading cho cards chưa xuất hiện
- [ ] Mỗi card có: tên + style badge + lý do 1 câu + Copy button
- [ ] Style badge đúng màu theo loại

### Copy
- [ ] Copy từng tên: click → clipboard → `✓` 1.5s → reset
- [ ] Copy tất cả: "1. Tên\n2. Tên\n..." → clipboard

### Edge cases
- [ ] AI trả sai format `|` → `parseNameOutput` fallback không crash
- [ ] Tên có ký tự đặc biệt (/, &) → hiển thị đúng không encode HTML

---

## 12. Bugs thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Style = "descriptive" tất cả | AI không theo format `\| style \|` | Thêm ví dụ cụ thể vào prompt |
| Tên > 10 từ | AI viết dài | Thêm vào prompt: "mỗi tên tối đa 10 từ" |
| Lý do rỗng | AI bỏ phần sau `\|` thứ 2 | `parseNameOutput` fallback: `reason = 'Phù hợp với sản phẩm'` |
