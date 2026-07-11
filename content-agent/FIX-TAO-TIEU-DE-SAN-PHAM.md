# FIX-TAO-TIEU-DE-SAN-PHAM.md
## Danh sách bug & hướng dẫn fix — `/tao-tieu-de-san-pham`

> Audit ngày 2026-06-08 · 6 vấn đề · 2 mức độ
> Files: `web/lib/tao-tieu-de-san-pham/prompt-builder.ts`, `web/app/api/tao-tieu-de-san-pham/generate/route.ts`
>
> Lưu ý: File `fix-bug-tao-tieu-de-san-pham.md` trong lib/ được viết 2026-06-07 và đề cập 8 bug.
> Qua kiểm tra code hiện tại, các bug #3 (stripCodeFence leading whitespace), #4 (safeJsonParse array),
> #7 (cleanTitle N: prefix) đã được fix. File này chỉ document các bug còn tồn tại.
>
> Thứ tự fix: P2 → Minor

---

## MỤC LỤC

| # | Vấn đề | File | Dòng ước tính | Mức |
|---|--------|------|---------------|-----|
| 1 | `schema.tone = z.string()` — không validate enum, unknown tone silent fallback | `generate/route.ts` | 15 | P2 |
| 2 | `buildProductMetaPrompt` — empty `productFeatures` renders dòng trống | `prompt-builder.ts` | 31 | P2 |
| 3 | Không validate char length title (50-60) và description (150-160) sau parse | `generate/route.ts` | 37–40 | P2 |
| 4 | `TONE_INSTRUCTIONS` vs `PRODUCT_TONES` — không có enforcement nếu diverge | `prompt-builder.ts` | 12–23 | Minor |
| 5 | `COMMON_FORBIDDEN_WORDS` không được inject vào prompt | `prompt-builder.ts` | 26–52 | Minor |
| 6 | `fallbackParseProductMeta` trả `{ titles: [], description: '' }` → silent empty | `generate/route.ts` | 35–41 | Minor |

---

## FIX 1 — `schema.tone` không validate enum (P2)

**File:** `web/app/api/tao-tieu-de-san-pham/generate/route.ts`
**Dòng:** 15

`tone: z.string().default('seo_focus')` chấp nhận bất kỳ string nào. Client gửi `tone: "invalid_xyz"` → route không báo lỗi → `TONE_INSTRUCTIONS['invalid_xyz']` trả `undefined` → fallback về `seo_focus` instruction → bài được gen theo tone sai hoàn toàn, user không biết.

**Reproduce:**
```typescript
// Client gửi
{ productName: 'Giường sắt', tone: 'invalid_xyz' }
// Route: status 200, không có error
// Prompt dùng seo_focus instruction dù user chọn tone khác
```

```typescript
// ❌ TRƯỚC — dòng 15
tone: z.string().default('seo_focus'),
```

```typescript
// ✅ SAU — enum validation
import { PRODUCT_TONES } from '@/lib/ecommerce-tools/core';

const TONE_VALUES = PRODUCT_TONES.map((t) => t.value) as [string, ...string[]];

// Trong schema:
tone: z.enum(TONE_VALUES).default('seo_focus'),
```

**Lưu ý:** Cần import `PRODUCT_TONES` — source of truth duy nhất cho valid tones.

---

## FIX 2 — `buildProductMetaPrompt` empty `productFeatures` renders dòng trống (P2)

**File:** `web/lib/tao-tieu-de-san-pham/prompt-builder.ts`
**Dòng:** 31

Khi user để trống `productFeatures`, prompt chứa `"- Mô tả/tính năng/chất liệu: "` với không có nội dung. AI có thể tự bịa thông số kỹ thuật không có thật cho meta title.

**Reproduce:**
```typescript
buildProductMetaPrompt({ productName: 'Giường sắt', productFeatures: '', ... })
// Prompt chứa:
// - Mô tả/tính năng/chất liệu:
// (empty)
```

```typescript
// ❌ TRƯỚC — dòng 31
- Mô tả/tính năng/chất liệu: ${config.productFeatures}
```

```typescript
// ✅ SAU — conditional inclusion
const featureLine = config.productFeatures
  ? `- Mô tả/tính năng/chất liệu: ${config.productFeatures}`
  : '';

const productBlock = [
  `- Tên sản phẩm: ${config.productName}`,
  featureLine,
].filter(Boolean).join('\n');

// Trong template:
Sản phẩm:
${productBlock}
```

**Tác động:** Khi không có features, prompt vẫn có `productName` → AI gen title dựa trên tên SP mà không bịa specs.

---

## FIX 3 — Không validate char length title/description sau parse (P2)

**File:** `web/app/api/tao-tieu-de-san-pham/generate/route.ts`
**Dòng:** 37–40

Prompt yêu cầu title 50-60 ký tự, description 150-160 ký tự. Nhưng sau khi parse JSON hoặc `fallbackParseProductMeta`, không có step nào filter/warn các giá trị ngoài khoảng này. AI thường trả title 30-70 chars — chỉ một phần đạt chuẩn SERP.

**Hậu quả:**
- Title < 50 chars → SERP snippet có khoảng trống → CTR thấp
- Title > 60 chars → Google truncate `...` → mất keyword cuối
- Description ngoài 150-160 → không tối ưu snippet

```typescript
// ❌ TRƯỚC — không filter
output.titles?.slice(0, 5).forEach((title, index) => {
  sseEvent(controller, { type: 'title', index, text: title });
});
sseEvent(controller, { type: 'desc', text: output.description ?? '' });
```

```typescript
// ✅ SAU — thêm metadata về char count để UI hiển thị warning
output.titles?.slice(0, 5).forEach((title, index) => {
  const len = title.length;
  const lengthOk = len >= 50 && len <= 60;
  sseEvent(controller, {
    type: 'title',
    index,
    text: title,
    charCount: len,
    lengthWarning: lengthOk ? null : len < 50 ? 'too_short' : 'too_long',
  });
});

const descLen = (output.description ?? '').length;
sseEvent(controller, {
  type: 'desc',
  text: output.description ?? '',
  charCount: descLen,
  lengthWarning: descLen >= 150 && descLen <= 160 ? null : descLen < 150 ? 'too_short' : 'too_long',
});
```

**Alternative (stricter):** Filter out titles entirely ngoài khoảng 40-70 chars (range linh hoạt hơn) và chỉ emit valid ones. Nếu < 3 valid titles → vẫn emit tất cả kèm warning.

---

## FIX 4 — `TONE_INSTRUCTIONS` và `PRODUCT_TONES` có thể diverge (Minor)

**File:** `web/lib/tao-tieu-de-san-pham/prompt-builder.ts`
**Dòng:** 12–23

`TONE_INSTRUCTIONS` là `Record<string, string>` với 10 keys hardcoded. `PRODUCT_TONES` từ `core.ts` cũng có 10 values. Nếu ai thêm một tone mới vào `PRODUCT_TONES` mà quên update `TONE_INSTRUCTIONS`, fallback về `seo_focus` xảy ra im lặng — không có compile error, không có runtime error.

**Reproduce:**
```typescript
// Thêm vào PRODUCT_TONES trong core.ts:
{ value: 'minimalist', label: 'Tối giản' }

// TONE_INSTRUCTIONS['minimalist'] = undefined
// Fallback về seo_focus silently
```

```typescript
// ❌ TRƯỚC — fallback im lặng
${TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.seo_focus}
```

```typescript
// ✅ SAU — Option A: throw at dev time (build fails if TONE_INSTRUCTIONS incomplete)
// Trong prompt-builder.ts, thêm type assertion:
import { PRODUCT_TONES } from '@/lib/ecommerce-tools/core';
type ToneValue = typeof PRODUCT_TONES[number]['value'];
const TONE_INSTRUCTIONS: Record<ToneValue, string> = { ... };
// TypeScript sẽ báo lỗi compile nếu thiếu key

// ✅ SAU — Option B: log warning khi fallback
const toneInstruction = TONE_INSTRUCTIONS[config.tone as keyof typeof TONE_INSTRUCTIONS];
if (!toneInstruction) {
  console.warn(`[buildProductMetaPrompt] Unknown tone: "${config.tone}", falling back to seo_focus`);
}
const instruction = toneInstruction ?? TONE_INSTRUCTIONS.seo_focus;
```

**Đề xuất:** Dùng Option A (type-safe Record) vì bắt lỗi sớm hơn tại compile time.

---

## FIX 5 — `COMMON_FORBIDDEN_WORDS` không được inject vào prompt (Minor)

**File:** `web/lib/tao-tieu-de-san-pham/prompt-builder.ts`
**Dòng:** 39–45

Prompt chỉ inject `config.forbidden` (user-provided). `COMMON_FORBIDDEN_WORDS` (16 từ) định nghĩa trong `core.ts` như một shared list nhưng không được wire vào `buildProductMetaPrompt`. AI thoải mái dùng `"tuy nhiên"`, `"vô cùng"` trong meta title/description.

**Hậu quả cho meta title cụ thể:** Meta title với `"vô cùng bền chắc"` hoặc `"đặc biệt"` là AI-signature rõ ràng → CTR thấp hơn title tự nhiên.

```typescript
// ❌ TRƯỚC — không có system forbidden
- Không dùng các từ cấm nếu đã cung cấp.
```

```typescript
// ✅ SAU — inject system forbidden list
import { COMMON_FORBIDDEN_WORDS } from '@/lib/ecommerce-tools/core';

// Trong buildProductMetaPrompt:
const systemForbidden = COMMON_FORBIDDEN_WORDS
  .filter((w) => !w.includes('...'))  // loại pattern "không chỉ ... mà còn"
  .join(', ');

// Trong template Yêu cầu:
- Từ cấm hệ thống (không dùng): ${systemForbidden}.
${config.forbidden ? `- Từ cấm bổ sung của thương hiệu: ${config.forbidden}.` : ''}
```

---

## FIX 6 — `fallbackParseProductMeta` empty result → silent empty response (Minor)

**File:** `web/app/api/tao-tieu-de-san-pham/generate/route.ts`
**Dòng:** 35–41

Khi AI trả về response không có structure nào nhận ra (`"Xin lỗi tôi không thể..."` hoặc raw prose), `fallbackParseProductMeta` trả `{ titles: [], description: '' }`. Route hiện tại emit `done` mà không có bất kỳ `title` event nào → UI hiển thị loading xong, sau đó trống rỗng, không báo lỗi.

**Reproduce:**
```typescript
const raw = 'Tôi không thể tạo meta title cho sản phẩm này.';
const output = fallbackParseProductMeta(raw);
// output = { titles: [], description: '' }
// Route: emit done → UI trống, user không biết có lỗi
```

```typescript
// ❌ TRƯỚC — không check empty result
const output = json?.titles?.length ? json : fallbackParseProductMeta(raw);
output.titles?.slice(0, 5).forEach((title, index) => {
  sseEvent(controller, { type: 'title', index, text: title });
});
sseEvent(controller, { type: 'desc', text: output.description ?? '' });
sseEvent(controller, { type: 'done' });
```

```typescript
// ✅ SAU — emit error nếu empty result
const output = json?.titles?.length ? json : fallbackParseProductMeta(raw);

const hasUsableOutput = (output.titles?.length ?? 0) > 0 || (output.description ?? '').length > 0;
if (!hasUsableOutput) {
  sseEvent(controller, {
    type: 'error',
    message: 'AI không trả về kết quả hợp lệ. Vui lòng thử lại.',
  });
  return;
}

output.titles?.slice(0, 5).forEach((title, index) => {
  sseEvent(controller, { type: 'title', index, text: title });
});
sseEvent(controller, { type: 'desc', text: output.description ?? '' });
sseEvent(controller, { type: 'done' });
```

---

## Thứ tự fix đề xuất

```
1. FIX 1 (schema.tone enum)            — 3 dòng import + enum, ngăn silent tone fallback
   → Tone sai → meta title không phù hợp phong cách → cần gen lại
2. FIX 2 (empty productFeatures)       — conditional include, ngăn AI hallucinate specs
   → Meta title bịa specs ("Khung 2.0mm") khi user không nhập → misleading content
3. FIX 3 (char length validation)      — thêm charCount/warning vào SSE event
   → 40-60% titles AI gen ngoài khoảng 50-60 chars → SERP truncation
4. FIX 6 (empty result error)          — 5 dòng check + error event
   → Tốt hơn silent empty: user biết để retry
5. FIX 4 (TONE_INSTRUCTIONS type-safe) — thay Record<string,string> thành Record<ToneValue,string>
   → Compile-time safety khi thêm tone mới
6. FIX 5 (COMMON_FORBIDDEN_WORDS)      — import + inject 2 dòng
   → Meta title sẽ không có AI-signature words
```

---

## Bugs đã được fix trong code hiện tại (khác vs fix-bug-tao-tieu-de-san-pham.md)

| Bug cũ | Status | Ghi chú |
|--------|--------|---------|
| #3 stripCodeFence leading whitespace | ✅ Fixed | `.trim()` được thêm trước replace |
| #4 safeJsonParse array fallback | ✅ Fixed | Array extraction đã có trong core.ts |
| #7 fallbackParse N: prefix | ✅ Fixed | `cleanTitle` dùng `/^\d+[.):]\s*/` đã có `:` |
| #2 description threshold 80 chars | ✅ Fixed | Dùng longest-line strategy, không có hardcoded threshold |

---

## Chạy tests để verify

```bash
# Toàn bộ tests (cũ + mới)
cd web && npx tsx --test \
  lib/tao-tieu-de-san-pham/prompt-builder.test.ts \
  lib/tao-tieu-de-san-pham/tao-tieu-de-san-pham.test.ts

# Chỉ tests mới
cd web && npx tsx --test lib/tao-tieu-de-san-pham/tao-tieu-de-san-pham.test.ts
```

**Trạng thái trước khi fix source:**
- `[BUG #1]` → PASS (schema nhận unknown tone)
- `[BUG #2]` → PASS (empty line tồn tại)
- `[BUG #3]` → PASS (validateTitleLength xác nhận short/long titles không bị filter)
- `[BUG #4]` → PASS (unknown tone silent fallback)
- `[BUG #5]` → PASS (tuy nhiên/bên cạnh đó vắng mặt)
- `[BUG #6]` → PASS (hasUsableOutput phát hiện empty result)
- `[FIX #...]` → PASS ngay (local fixed copies)
