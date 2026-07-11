# FIX-VIET-BAI-THONG-MINH-V2.md
## Danh sách bug & hướng dẫn fix — `/viet-bai-thong-minh` (server.ts audit)

> Audit ngày 2026-06-08 · 6 vấn đề · 3 mức độ
> File này tập trung vào `web/lib/viet-bai-thong-minh/server.ts` và `options.ts`
> Tham chiếu: `FIX-VIET-BAI-THONG-MINH.md` (audit trước — 12 bug UI/prompt)
> Thứ tự fix: P1 → P2 → Minor

---

## MỤC LỤC

| # | Vấn đề | File | Dòng | Mức |
|---|--------|------|------|-----|
| 1 | `applySeoOptions` — nested `<a>` khi keyword đã trong anchor | `server.ts` | 397–401, 416–421 | P1 |
| 2 | `applySeoOptions` — `footerContent` inject không sanitize XSS | `server.ts` | 443–448 | P2 |
| 3 | `estimateSemanticScore` — chỉ match từ đầu của attribute | `server.ts` | 493 | P2 |
| 4 | `splitSecondaryKeywords` — không dedup keyword trùng | `server.ts` | 20–25 | Minor |
| 5 | `parseTitlesResponse` — fallback titles hardcode tiếng Việt | `server.ts` | 268–273 | Minor |
| 6 | `buildVbtWritingPrompt` — `SNIPPET_RULES_BY_TONE` lookup sai key | `server.ts` | 341–344 | Minor |

---

## FIX 1 — `applySeoOptions` tạo nested `<a>` (P1)

**File:** `web/lib/viet-bai-thong-minh/server.ts`
**Dòng:** 397–401 (`replaceFirstTextOccurrence`) + 416–421 (`applySeoOptions`)

Hàm `replaceFirstTextOccurrence` dùng regex `(>[^<]*?)(KEYWORD)([^<]*?<)` để tìm keyword trong text node. Khi keyword đã nằm trong `<a href="old.com">keyword</a>`, regex vẫn khớp `>keyword<` bên trong anchor → tạo nested `<a>`.

HTML với nested `<a>` là **invalid HTML** — browser render unpredictably, Google có thể bỏ qua link, SEO bị ảnh hưởng.

**Reproduce:**
```html
<!-- Input HTML -->
<p>Xem <a href="https://old.com">giường sắt</a> ngay.</p>

<!-- Sau applySeoOptions với seoMainLink = "https://new.com" -->
<!-- BUGGY output: -->
<p>Xem <a href="https://old.com"><a href="https://new.com">giường sắt</a></a> ngay.</p>
```

```typescript
// ❌ TRƯỚC — dòng 397–401
function replaceFirstTextOccurrence(html: string, keyword: string, replacement: string): string {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(>[^<]*?)(${escaped})([^<]*?<)`, 'i');
  return html.replace(pattern, `$1${replacement}$3`);
}
// Vấn đề: match `>keyword<` ngay cả khi keyword trong <a>
```

```typescript
// ✅ SAU — split-on-tags, skip text nodes inside <a>
function replaceFirstTextOccurrence(html: string, keyword: string, replacement: string): string {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = html.split(/(<[^>]+>)/);
  let insideAnchor = 0;
  let replaced = false;
  return parts.map((part) => {
    if (/^<a[\s>]/i.test(part)) { insideAnchor++; return part; }
    if (/^<\/a>/i.test(part)) { insideAnchor = Math.max(0, insideAnchor - 1); return part; }
    if (part.startsWith('<')) return part;
    if (!replaced && insideAnchor === 0) {
      const re = new RegExp(escaped, 'i');
      if (re.test(part)) {
        replaced = true;
        return part.replace(re, replacement);
      }
    }
    return part;
  }).join('');
}
```

**Lưu ý:** Bug này tương tự `viet-tu-google-search` Bug #4 (`applySeoAdvanced`). Nếu đã fix bên đó thì áp dụng cùng pattern ở đây.

---

## FIX 2 — `applySeoOptions` XSS qua `footerContent` (P2)

**File:** `web/lib/viet-bai-thong-minh/server.ts`
**Dòng:** 443–448

`footerContent` từ `step3.footerContent` được inject trực tiếp vào HTML article mà không filter. Nếu upstream code (hoặc brand config) đặt `<script>alert("xss")</script>` vào footerContent, script được inject vào bài viết publish lên WordPress.

```typescript
// ❌ TRƯỚC — dòng 443–448
if (step3.footerContent.trim()) {
  const footer = step3.footerContent.trim().startsWith('<')
    ? step3.footerContent.trim()
    : `<p>${step3.footerContent.trim()}</p>`;
  nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${footer}</section></article>`);
}
```

```typescript
// ✅ SAU — sanitize trước khi inject
if (step3.footerContent.trim()) {
  const sanitized = step3.footerContent.trim()
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+=(["']).*?\1/gi, '')
    .replace(/\s+href=(["'])javascript:[\s\S]*?\1/gi, ' href="#"');
  const footer = sanitized.startsWith('<') ? sanitized : `<p>${sanitized}</p>`;
  nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${footer}</section></article>`);
}
```

---

## FIX 3 — `estimateSemanticScore` chỉ match từ đầu của attribute (P2)

**File:** `web/lib/viet-bai-thong-minh/server.ts`
**Dòng:** 493

Hàm dùng `.split(/\s+/)[0]` để lấy từ đầu tiên của attribute rồi check xem bài viết có chứa từ đó không. Với attribute như `"Định nghĩa và phạm vi chủ đề"`, chỉ check `"định"` — đây là từ phổ biến → score inflated, bài kém chất lượng vẫn pass.

**Ví dụ sai:**
```
attribute = "Tiêu chí đánh giá/chọn lựa"
→ chỉ check "tiêu"
→ xuất hiện trong "Tiêu đề bài viết" → BUG: mustCovered++

attribute = "Định nghĩa và phạm vi chủ đề"
→ chỉ check "định"
→ xuất hiện trong "định hướng", "định dạng" → BUG: mustCovered++
```

```typescript
// ❌ TRƯỚC — dòng 493
const mustCovered = must.filter((item) =>
  text.includes(item.attribute.toLowerCase().split(/\s+/)[0] || item.attribute.toLowerCase()),
).length;
```

```typescript
// ✅ SAU — check tất cả từ có nghĩa (>2 ký tự) của attribute
const STOP_WORDS = new Set(['và', 'hoặc', 'của', 'với', 'để', 'về', 'theo', 'các', 'những']);
const mustCovered = must.filter((item) => {
  const significantWords = item.attribute.toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return significantWords.length > 0 && significantWords.every((w) => text.includes(w));
}).length;
```

**Lưu ý:** Score sẽ giảm sau fix nhưng chính xác hơn. Threshold `OK/NEEDS_FIX/FAIL` (80/60) có thể cần re-calibrate sau khi xem data thực tế.

---

## FIX 4 — `splitSecondaryKeywords` không dedup (Minor)

**File:** `web/lib/viet-bai-thong-minh/server.ts`
**Dòng:** 20–25

Nếu user nhập `"giường sắt, giường sắt, tủ quần áo"`, kết quả có keyword trùng. Khi đưa vào prompt, AI nhận duplicate gây nhiễu keyword density instruction.

```typescript
// ❌ TRƯỚC
export function splitSecondaryKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// ✅ SAU — thêm Set dedup
export function splitSecondaryKeywords(raw: string): string[] {
  return [...new Set(
    raw.split(',').map((item) => item.trim()).filter(Boolean),
  )];
}
```

---

## FIX 5 — `parseTitlesResponse` fallback hardcode tiếng Việt (Minor)

**File:** `web/lib/viet-bai-thong-minh/server.ts`
**Dòng:** 268–273 + signature dòng 263

Khi AI trả về response không hợp lệ, fallback titles đều tiếng Việt bất kể `params.language`. Với bài tiếng Anh, user phải xoá hết và nhập lại thủ công.

```typescript
// ❌ TRƯỚC — dòng 263, 268–273
export function parseTitlesResponse(text: string, keyword: string): string[] {
  // ...
  return [
    `${keyword}: Hướng dẫn đầy đủ và cập nhật`,  // luôn Vietnamese
    `Cách chọn ${keyword} phù hợp nhu cầu thực tế`,
    `${keyword} có tốt không? Tiêu chí cần biết`,
    `Top kinh nghiệm về ${keyword} giúp ra quyết định nhanh`,
  ].slice(0, 5);
}
```

```typescript
// ✅ SAU — thêm language param
export function parseTitlesResponse(text: string, keyword: string, language = 'Vietnamese'): string[] {
  const parsed = extractJsonValue(text);
  const titles = asStringArray(parsed).filter((item) => item.length > 10);
  if (titles.length) return titles.slice(0, 5);

  if (language === 'English' || language === 'en') {
    return [
      `${keyword}: Complete Guide`,
      `How to Choose ${keyword}: Key Criteria`,
      `Is ${keyword} Worth It? An Honest Review`,
      `Top Tips for ${keyword} — Make the Right Decision`,
    ].slice(0, 5);
  }

  return [
    `${keyword}: Hướng dẫn đầy đủ và cập nhật`,
    `Cách chọn ${keyword} phù hợp nhu cầu thực tế`,
    `${keyword} có tốt không? Tiêu chí cần biết`,
    `Top kinh nghiệm về ${keyword} giúp ra quyết định nhanh`,
  ].slice(0, 5);
}
```

**Caller update:** Nơi gọi hàm cần truyền thêm `language`:
```typescript
// Trước: parseTitlesResponse(text, params.keyword)
// Sau:   parseTitlesResponse(text, params.keyword, params.language)
```

---

## FIX 6 — `buildVbtWritingPrompt` SNIPPET_RULES_BY_TONE lookup sai key (Minor)

**File:** `web/lib/viet-bai-thong-minh/server.ts`
**Dòng:** 341–344

`SNIPPET_RULES_BY_TONE` từ `@/lib/shared/prompt-rules` được map theo **tone values** (`'how_to'`, `'listicle'`, `'comparison'`, `'review'`). Nhưng code lookup theo `config.contentType` trước — `contentType` là `'blog_seo'`, `'pillar'`, v.v. nên luôn miss trừ khi contentType tình cờ trùng tone key.

**Khi contentType tình cờ trùng tone key** (ví dụ: contentType `'how_to'` + tone `'listicle'`), lookup sai rule:
```
contentType = 'how_to'  → hits SNIPPET_RULES_BY_TONE['how_to'] → numbered steps rule
tone = 'listicle'       → never reached via ||
→ BUG: bài listicle nhận snippet rule của how_to
```

```typescript
// ❌ TRƯỚC — dòng 341–344
const snippetRule =
  SNIPPET_RULES_BY_TONE[config.contentType]    // ← lookup theo contentType (sai)
  || SNIPPET_RULES_BY_TONE[config.step3.tone]
  || '';
```

```typescript
// ✅ SAU — lookup theo tone trước (đúng intent)
const snippetRule =
  SNIPPET_RULES_BY_TONE[config.step3.tone]     // ← lookup theo tone (đúng)
  || SNIPPET_RULES_BY_TONE[config.contentType] // ← fallback
  || '';
```

---

## Thứ tự fix đề xuất

```
1. FIX 1 (nested <a>)               — 1 function rewrite, impact SEO trực tiếp
   → Invalid HTML trong bài publish → Google có thể derank
2. FIX 2 (footerContent XSS)        — 3 dòng sanitize, security
   → Block script injection trước khi publish WordPress
3. FIX 3 (estimateSemanticScore)    — 4 dòng, accuracy
   → Semantic decision phản ánh đúng chất lượng bài
4. FIX 6 (SNIPPET_RULES_BY_TONE)    — hoán đổi 2 dòng thứ tự
   → Prompt nhận đúng snippet rule theo tone
5. FIX 4 (splitSecondaryKeywords)   — 1 dòng wrap Set
6. FIX 5 (parseTitlesResponse)      — thêm language param + English fallback
```

---

## Chạy tests để verify

```bash
cd web && npx tsx --test lib/viet-bai-thong-minh/viet-bai-thong-minh.test.ts
```

**Trạng thái tests trước khi fix source:**
- `[BUG #1]` tests → PASS (xác nhận nested `<a>` bug tồn tại)
- `[BUG #2]` tests → PASS (xác nhận XSS script inject)
- `[BUG #3]` tests → PASS (xác nhận buggy score ≥ fixed score)
- `[BUG #4]` tests → PASS (xác nhận duplicates không bị xoá)
- `[BUG #5]` tests → PASS (xác nhận fallback luôn tiếng Việt)
- `[BUG #6]` tests → PASS (xác nhận contentType lookup sai)
- `[FIX #...]` tests → PASS ngay (dùng fixed implementation copy trong test file)

**Sau khi fix source code:**
- Tất cả tests phải pass
- BUG confirmation tests vẫn pass (chúng assert behavior của buggy copy inline, không import source)
