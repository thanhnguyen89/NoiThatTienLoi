# Fix Bug — /tao-tieu-de-san-pham

> Dựa theo unit test coverage tại `prompt-builder.test.ts` và `lib/ecommerce-tools/core.test.ts`.  
> Ngày: 2026-06-07

---

## Chạy test

```bash
cd web
node --require tsx/esm --test \
  lib/tao-tieu-de-san-pham/prompt-builder.test.ts \
  lib/ecommerce-tools/core.test.ts
```

---

## Danh sách bug và edge case

### 1. `fallbackParse` không exported — không testable trực tiếp, dễ drift khỏi source

**File:** `app/api/tao-tieu-de-san-pham/generate/route.ts`  
**Test:** Logic inlined vào `core.test.ts` với comment nguồn  
**Mức độ:** 🟡 MEDIUM (maintainability)

`fallbackParse` là hàm quan trọng xử lý trường hợp AI không trả về JSON hợp lệ, nhưng nó inline trong route handler và không exported. Hệ quả:

- Test phải duplicate logic → nếu route.ts thay đổi, test không fail ngay mà âm thầm lỗi thời
- Không thể import để test trực tiếp

**Fix:** Extract ra `lib/tao-tieu-de-san-pham/parser.ts` và export:
```ts
// lib/tao-tieu-de-san-pham/parser.ts
export function fallbackParse(raw: string): { titles: string[]; description: string } { ... }
```

---

### 2. `fallbackParse` description threshold 80 ký tự là tùy tiện — miss descriptions ngắn

**File:** `app/api/tao-tieu-de-san-pham/generate/route.ts`  
**Test:** `fallbackParse returns empty description when no line exceeds 80 chars`  
**Mức độ:** 🟡 MEDIUM

```ts
description: lines.find((line) => line.length > 80 && !titles.includes(line)) ?? '',
```

Meta description 150-160 ký tự (yêu cầu trong prompt) thường > 80 chars, nhưng:

- Nếu AI output bị truncated hoặc ngắn hơn 80 chars → `description = ''`
- Nếu AI trả về description dưới dạng `"description": "..."` (JSON key-value trên 1 dòng nhưng chưa parse được), regex filter `!/description|titles/i.test(line)` sẽ **loại bỏ** nó
- Threshold 80 không liên quan gì đến format meta description thực tế

**Fix:** Thay bằng cách tìm dòng dài nhất không phải title, hoặc tìm dòng sau label "description":
```ts
// Option A: dòng dài nhất sau khi loại titles
const nonTitleLines = lines.filter((l) => !titles.includes(l) && !/description|titles/i.test(l));
const description = nonTitleLines.sort((a, b) => b.length - a.length)[0] ?? '';

// Option B: tìm dòng sau label "Description:" hoặc "Meta description:"
const descLabel = lines.findIndex((l) => /^meta\s*desc/i.test(l));
const description = descLabel >= 0 ? lines[descLabel + 1] ?? '' : '';
```

---

### 3. `stripCodeFence` regex `^` không match khi có leading whitespace trước fence

**File:** `lib/ecommerce-tools/core.ts`  
**Test:** `stripCodeFence with leading whitespace before fence — known issue: fence not removed`  
**Mức độ:** 🟡 MEDIUM

```ts
export function stripCodeFence(text: string): string {
  return text
    .replace(/^```(?:json|html|text)?/i, '')  // ← `^` = start of string
    .replace(/```$/i, '')
    .trim();
}
```

Nếu AI response có leading whitespace trước code fence (` ```json...`), regex `^``` ` không match vì `^` gặp space trước. Kết quả: fence còn nguyên → `JSON.parse` fail → `safeJsonParse` fallback extraction cũng fail nếu không có `{...}` sau fence.

**Fix:** Trim trước khi replace, hoặc dùng regex linh hoạt hơn:
```ts
export function stripCodeFence(text: string): string {
  return text
    .trim()  // trim TRƯỚC để ^ có hiệu lực
    .replace(/^```(?:json|html|text)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}
```

---

### 4. `safeJsonParse` fallback extraction chỉ xử lý `{...}`, không xử lý `[...]`

**File:** `lib/ecommerce-tools/core.ts`  
**Test:** `safeJsonParse fallback does NOT handle array as top-level (known issue)`  
**Mức độ:** 🟡 MEDIUM

```ts
export function safeJsonParse<T>(raw: string): T | null {
  const cleaned = stripCodeFence(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');   // ← only handles objects
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) { ... }
    return null;
  }
}
```

Function có generic type `T` — dùng được cho cả array. Nhưng fallback extraction chỉ dùng `indexOf('{')` / `lastIndexOf('}')`. Nếu AI wraps JSON array trong text thừa (`Here is result: [...]`), fallback sẽ trả `null` thay vì extract được array.

Trong `/tao-tieu-de-san-pham` cụ thể, output là object `{titles, description}` nên không bị ảnh hưởng ngay. Nhưng `safeJsonParse` được share với tất cả ecommerce tools — các tool dùng array output sẽ gặp vấn đề.

**Fix:** Thêm array extraction:
```ts
} catch {
  const cleaned2 = cleaned;
  // Try object extraction
  const objStart = cleaned2.indexOf('{');
  const objEnd = cleaned2.lastIndexOf('}');
  if (objStart >= 0 && objEnd > objStart) {
    try { return JSON.parse(cleaned2.slice(objStart, objEnd + 1)) as T; } catch { /**/ }
  }
  // Try array extraction
  const arrStart = cleaned2.indexOf('[');
  const arrEnd = cleaned2.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) {
    try { return JSON.parse(cleaned2.slice(arrStart, arrEnd + 1)) as T; } catch { /**/ }
  }
  return null;
}
```

---

### 5. `schema.tone` không validate enum — tone không hợp lệ accepted silently

**File:** `app/api/tao-tieu-de-san-pham/generate/route.ts`  
**Test:** Không có test (server behavior)  
**Mức độ:** 🟡 MEDIUM

```ts
const schema = z.object({
  tone: z.string().default('seo_focus'),  // ← accepts ANY string
  // ...
});
```

Client có thể gửi `tone: "unknown_xyz"`. Route sẽ build prompt với `TONE_INSTRUCTIONS['unknown_xyz'] ?? TONE_INSTRUCTIONS.seo_focus` — silent fallback, không báo lỗi về client.

So với `/viet-tu-facebook-comment` dùng `z.enum([...])` enforce cứng hơn.

**Fix:**
```ts
import { PRODUCT_TONES } from '@/lib/ecommerce-tools/core';

tone: z.enum(PRODUCT_TONES.map((t) => t.value) as [string, ...string[]]).default('seo_focus'),
```

---

### 6. `buildProductMetaPrompt` renders dòng `productFeatures` rỗng trong prompt

**File:** `lib/tao-tieu-de-san-pham/prompt-builder.ts`  
**Test:** `buildProductMetaPrompt includes empty productFeatures line when empty`  
**Mức độ:** 🟢 LOW

```ts
- Mô tả/tính năng/chất liệu: ${config.productFeatures}
```

Khi `productFeatures = ''`, prompt vẫn có dòng `- Mô tả/tính năng/chất liệu: ` (trailing space). AI sẽ hiểu là không có mô tả, nhưng dòng rỗng trong prompt hơi "bẩn".

**Fix:** Conditional include:
```ts
${config.productFeatures ? `- Mô tả/tính năng/chất liệu: ${config.productFeatures}` : ''}
```

---

### 7. `fallbackParse` không strip prefix `N:` — chỉ xử lý `N.` và `N)`

**File:** `app/api/tao-tieu-de-san-pham/generate/route.ts`  
**Test:** `fallbackParse does NOT strip "N:" prefix (known issue)`  
**Mức độ:** 🟢 LOW

```ts
line.replace(/^\d+[\.)]\s*/, '')  // ← handles 1. and 1) but NOT 1:
```

Một số model AI output `1: Title here` thay vì `1. Title here`. Khi đó prefix `1:` không bị strip.

**Fix:**
```ts
line.replace(/^\d+[\.):]\s*/, '')  // thêm : vào character class
```

---

### 8. `COMMON_FORBIDDEN_WORDS` không được inject vào prompt tự động

**File:** `lib/ecommerce-tools/core.ts` + `lib/tao-tieu-de-san-pham/prompt-builder.ts`  
**Test:** Không có test trực tiếp (design gap)  
**Mức độ:** 🟢 LOW

`COMMON_FORBIDDEN_WORDS` được định nghĩa trong `core.ts` nhưng **không bao giờ được dùng** trong `buildProductMetaPrompt`. Prompt chỉ inject `config.forbidden` (user-provided words). Hệ quả: AI có thể vẫn output các từ cấm như "tuy nhiên", "vô cùng", "siêu phẩm" trừ khi user tự điền vào field "Từ không dùng".

`COMMON_FORBIDDEN_WORDS` có vẻ được tạo ra để shared nhưng chưa được wire vào prompt.

**Fix:** Inject vào prompt:
```ts
// Trong buildProductMetaPrompt:
const systemForbidden = COMMON_FORBIDDEN_WORDS.join(', ');
// Thêm vào prompt:
- Từ cấm hệ thống: ${systemForbidden}
${config.forbidden ? `- Từ cấm bổ sung của thương hiệu: ${config.forbidden}` : ''}
```

---

## Tóm tắt mức độ ưu tiên

| # | Issue | Mức độ | File |
|---|-------|--------|------|
| 3 | `stripCodeFence` fails khi có leading whitespace trước fence | 🟡 MEDIUM | `core.ts` |
| 2 | `fallbackParse` description threshold 80 chars quá hẹp | 🟡 MEDIUM | `generate/route.ts` |
| 4 | `safeJsonParse` fallback không extract array JSON | 🟡 MEDIUM | `core.ts` |
| 5 | `schema.tone` không validate enum — unknown tone silent fallback | 🟡 MEDIUM | `generate/route.ts` |
| 1 | `fallbackParse` không exported — test phải inline | 🟡 MEDIUM | `generate/route.ts` |
| 6 | `productFeatures` rỗng vẫn render dòng rỗng trong prompt | 🟢 LOW | `prompt-builder.ts` |
| 7 | `fallbackParse` không strip `N:` prefix | 🟢 LOW | `generate/route.ts` |
| 8 | `COMMON_FORBIDDEN_WORDS` không được inject vào prompt | 🟢 LOW | `core.ts` + `prompt-builder.ts` |
