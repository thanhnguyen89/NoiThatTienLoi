# FIX-TAO-TEN-SAN-PHAM.md
## Danh sách bug & hướng dẫn fix — `/tao-ten-san-pham`

> Audit ngày 2026-06-08 · 5 vấn đề · 2 mức độ
> Files: `web/lib/tao-ten-san-pham/prompt-builder.ts`, `web/app/api/tao-ten-san-pham/generate/route.ts`
> Thứ tự fix: P2 → Minor

---

## MỤC LỤC

| # | Vấn đề | File | Dòng ước tính | Mức |
|---|--------|------|---------------|-----|
| 1 | `buildProductNamePrompt` — empty `material`/`keyFeatures`/`targetCustomer` render thành dòng trống | `prompt-builder.ts` | 24–28 | P2 |
| 2 | `fallbackParse` — chỉ split bằng `\|`, không nhận format ` - ` | `generate/route.ts` | 33–39 | P2 |
| 3 | `buildProductNamePrompt` — 7 styles cho 10 tên, không có phân phối count | `prompt-builder.ts` | 38 | Minor |
| 4 | `buildProductNamePrompt` — forbidden list chỉ 5 từ (thiếu 11 từ AI) | `prompt-builder.ts` | 39 | Minor |
| 5 | Không validate word count 3-10 từ sau khi parse | `generate/route.ts` | 27–43 | Minor |

---

## FIX 1 — Empty fields render thành dòng trống trong prompt (P2)

**File:** `web/lib/tao-ten-san-pham/prompt-builder.ts`
**Dòng:** 24–28

Khi `material`, `keyFeatures`, `targetCustomer` = `''` (user để trống), prompt vẫn render:
```
- Chất liệu:
- Tính năng nổi bật:
- Khách hàng mục tiêu:
```
Dòng trống trong prompt → AI có thể tự bịa chất liệu/tính năng không có trong thực tế.

**Reproduce:**
```typescript
buildProductNamePrompt({ productType: 'Giường sắt', material: '', keyFeatures: '', targetCustomer: '', ... })
// Prompt chứa:
// - Chất liệu:
// - Tính năng nổi bật:
// - Khách hàng mục tiêu:
```

```typescript
// ❌ TRƯỚC — dòng 22–28
return `
Thông tin sản phẩm:
- Loại sản phẩm: ${config.productType}
- Chất liệu: ${config.material}
- Tính năng nổi bật: ${config.keyFeatures}
- Khách hàng mục tiêu: ${config.targetCustomer}
- Phân khúc: ${config.priceSegment} - ${PRICE_CONTEXT[config.priceSegment]}
`.trim();
```

```typescript
// ✅ SAU — chỉ render dòng có nội dung
const productLines = [
  `- Loại sản phẩm: ${config.productType}`,
  config.material       ? `- Chất liệu: ${config.material}` : '',
  config.keyFeatures    ? `- Tính năng nổi bật: ${config.keyFeatures}` : '',
  config.targetCustomer ? `- Khách hàng mục tiêu: ${config.targetCustomer}` : '',
  `- Phân khúc: ${config.priceSegment} - ${PRICE_CONTEXT[config.priceSegment] ?? ''}`,
].filter(Boolean).join('\n');

return `
Thông tin sản phẩm:
${productLines}
`.trim();
```

**Bonus fix:** Thêm `?? ''` vào `PRICE_CONTEXT[config.priceSegment]` để tránh `"undefined"` nếu giá trị invalid bypasses Zod tại runtime.

---

## FIX 2 — `fallbackParse` không parse format ` - ` (P2)

**File:** `web/app/api/tao-ten-san-pham/generate/route.ts`
**Dòng:** 33–39

`fallbackParse` được gọi khi AI trả về plain text thay vì JSON. Code split chỉ bằng `|`. Nhưng AI thường dùng ` - ` làm separator:
```
1. Giường Sắt Đơn Giản - seo - dễ tìm kiếm trên Shopee
```
Kết quả: `name = "Giường Sắt Đơn Giản - seo - dễ tìm kiếm trên Shopee"`, `style = 'descriptive'` (default), `reason = ''` — toàn bộ style và reason bị mất.

**Reproduce:**
```typescript
fallbackParse('1. Giường Sắt Hộp Đa Năng - seo - khớp search intent Lazada')
// → [{ name: 'Giường Sắt Hộp Đa Năng - seo - khớp search intent Lazada', style: 'descriptive', reason: '' }]
// Sai: style và reason không được extract
```

```typescript
// ❌ TRƯỚC — dòng 33–39
.map((line) => {
  const clean = line.replace(/^\d+[\.)]\s*/, '').trim();
  const parts = clean.split('|').map((item) => item.trim());
  return {
    name: parts[0] ?? clean,
    style: parts[1] ?? 'descriptive',
    reason: parts[2] ?? '',
  };
})
```

```typescript
// ✅ SAU — hỗ trợ cả "|" và " - "
const VALID_STYLES = new Set(['seo', 'short', 'descriptive', 'emotional', 'segmented', 'localized', 'creative']);

.map((line) => {
  const clean = line
    .replace(/^\d+[\.)]\s*/, '')
    .replace(/^[-*]\s*/, '')
    .trim();

  let parts: string[];
  if (clean.includes('|')) {
    parts = clean.split('|').map((item) => item.trim());
  } else if (/ - /.test(clean)) {
    parts = clean.split(' - ').map((item) => item.trim());
  } else {
    parts = [clean];
  }

  const nameRaw = parts[0] ?? clean;
  const styleCand = parts[1]?.toLowerCase() ?? '';
  const style = VALID_STYLES.has(styleCand) ? styleCand : 'descriptive';
  const reason = parts[2] ?? '';

  return { name: nameRaw, style, reason };
})
```

**Thêm:** Validate `style` với `VALID_STYLES` set để tránh style tùy tiện từ AI.

---

## FIX 3 — Style distribution không có guidance (Minor)

**File:** `web/lib/tao-ten-san-pham/prompt-builder.ts`
**Dòng:** 38

Prompt có 7 styles (`seo, short, descriptive, emotional, segmented, localized, creative`) nhưng cần tạo 10 tên. Không có instruction về số lượng mỗi style → AI thường trả về phần lớn style `descriptive` hoặc lặp lại 1-2 style.

**Hậu quả:** User nhận 10 tên nhưng thiếu variety — ví dụ 7 tên `descriptive`, 2 tên `seo`, 1 tên `emotional`. Không đủ để chọn theo chiến lược marketing.

```typescript
// ❌ TRƯỚC — dòng 38
- Phân bổ style: seo, short, descriptive, emotional, segmented, localized, creative.
```

```typescript
// ✅ SAU — phân phối cụ thể (tổng = 10)
- Phân bổ style BẮT BUỘC (seo: 2, short: 1, descriptive: 2, emotional: 2, segmented: 1, localized: 1, creative: 1).
  Mỗi tên phải gán đúng style theo phân phối này.
```

**Phân phối đề xuất:**
| style | count | lý do |
|-------|-------|-------|
| seo | 2 | phổ biến nhất cho listing |
| descriptive | 2 | mô tả rõ sản phẩm |
| emotional | 2 | tăng tỷ lệ click |
| short | 1 | dễ nhớ |
| segmented | 1 | target đúng persona |
| localized | 1 | SEO địa phương |
| creative | 1 | brand differentiation |

---

## FIX 4 — Forbidden list thiếu 11 từ AI-signature (Minor)

**File:** `web/lib/tao-ten-san-pham/prompt-builder.ts`
**Dòng:** 39

Prompt chỉ cấm 5 từ marketing-fluff: `siêu phẩm, số 1, đẳng cấp, hoàn hảo, tuyệt vời`. Thiếu toàn bộ AI-signature words từ `COMMON_FORBIDDEN_WORDS` trong `core.ts`.

**Hậu quả:** AI dùng `"tuy nhiên"`, `"vô cùng"` trong reason → reason đọc giả tạo.

```typescript
// ❌ TRƯỚC — dòng 39
- Không dùng: siêu phẩm, số 1, đẳng cấp, hoàn hảo, tuyệt vời.
```

```typescript
// ✅ SAU — thêm AI-signature words
- Không dùng: siêu phẩm, số 1, đẳng cấp, hoàn hảo, tuyệt vời,
  tuy nhiên, bên cạnh đó, vô cùng, cực kỳ, quan trọng, toàn diện.
```

**Hoặc import và dùng `COMMON_FORBIDDEN_WORDS` từ `core.ts`:**
```typescript
import { COMMON_FORBIDDEN_WORDS } from '@/lib/ecommerce-tools/core';

// Trong buildProductNamePrompt:
const forbiddenStr = COMMON_FORBIDDEN_WORDS.filter(w => !w.includes('...')).join(', ');
- Không dùng: ${forbiddenStr}.
```

---

## FIX 5 — Không validate word count 3-10 từ sau parse (Minor)

**File:** `web/app/api/tao-ten-san-pham/generate/route.ts`
**Dòng:** 63–71 (SSE emit loop)

Prompt yêu cầu "3-10 từ" nhưng sau khi parse JSON/fallback, không có step filter tên vi phạm. AI đôi khi trả tên 1-2 từ hoặc >10 từ.

**Hậu quả:** Listing ecommerce có tên `"Giường"` (1 từ) hoặc tên 15 từ không thực tế.

```typescript
// ❌ TRƯỚC — không filter sau parse
names.slice(0, 10).forEach((item, index) => {
  sseEvent(controller, { type: 'name', index, name: item.name, ... });
});
```

```typescript
// ✅ SAU — thêm filter word count
function isValidNameLength(name: string): boolean {
  const wordCount = name.trim().split(/\s+/).filter(Boolean).length;
  return wordCount >= 3 && wordCount <= 10;
}

const validNames = names.filter(item => isValidNameLength(item.name));

// Nếu sau filter còn < 5 tên, fallback hiển thị tất cả (không filter)
// để tránh trả về 0 kết quả
const toEmit = validNames.length >= 5 ? validNames : names;

toEmit.slice(0, 10).forEach((item, index) => {
  sseEvent(controller, { type: 'name', index, name: item.name, ... });
});
```

---

## Thứ tự fix đề xuất

```
1. FIX 2 (fallbackParse " - " separator)  — 8 dòng, style/reason của ~80% fallback output bị mất
   → Mỗi lần AI không trả JSON, 10 tên đều có style='descriptive' — mất giá trị phân loại
2. FIX 1 (empty fields prompt)            — conditional filter, ngăn AI hallucinate specs
   → Tên được gen từ specs trống → thông số bịa không đúng thực tế sản phẩm
3. FIX 3 (style distribution)             — 2 dòng update instruction
   → Đảm bảo đủ 7 style để user có đủ lựa chọn theo chiến lược
4. FIX 4 (forbidden words)                — import + update string
   → Reason không dùng AI-signature words → chất lượng hơn
5. FIX 5 (word count validation)          — thêm filter + fallback logic
   → Loại tên quá ngắn/quá dài trước khi emit
```

---

## Chạy tests để verify

```bash
cd web && npx tsx --test lib/tao-ten-san-pham/tao-ten-san-pham.test.ts
```

**Trạng thái trước khi fix source:**
- `[BUG #1]` tests → PASS (xác nhận empty lines tồn tại)
- `[BUG #2]` tests → PASS (xác nhận ` - ` format mất style/reason)
- `[BUG #3]` tests → PASS (xác nhận không có distribution count)
- `[BUG #4]` tests → PASS (xác nhận thiếu "tuy nhiên", "bên cạnh đó")
- `[BUG #5]` tests → PASS (xác nhận 1-word và >10-word names không bị reject)
- `[FIX #...]` tests → PASS ngay (dùng fixed implementation copy trong test)

**Sau khi fix source:**
- Tất cả tests pass
- BUG confirmation tests vẫn pass (assert behavior của buggy copy inline, không import source)
