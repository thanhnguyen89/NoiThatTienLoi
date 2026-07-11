# FIX-VIET-TU-GOOGLE-SEARCH.md
## Danh sách bug & hướng dẫn fix — `/viet-tu-google-search`

> Audit ngày 2026-06-08 · 7 vấn đề · 3 mức độ
> Thứ tự fix: P1 trước → P2 → Minor

---

## MỤC LỤC

| # | Vấn đề | File | Mức |
|---|--------|------|-----|
| 1 | `prompt-builder.ts` — SEO_PROMPT_RULES local 10 rules (EN), không dùng shared 23 rules (VI) | `lib/viet-tu-google-search/prompt-builder.ts` | P1 |
| 2 | `parseKeywords` regex quá rộng — strips leading digit khỏi keyword phrase | `app/api/viet-tu-google-search/suggest-keywords/route.ts` | P1 |
| 3 | `relatedKeywords` không dedup — trả về fragments trùng lặp | `app/api/viet-tu-google-search/search/route.ts` | P2 |
| 4 | `applySeoAdvanced` mainLink tạo nested `<a>` khi keyword đã trong `<a>` | `app/api/viet-tu-google-search/stream/route.ts` | P2 |
| 5 | `footerContent` inject không sanitize — XSS risk | `app/api/viet-tu-google-search/stream/route.ts` | P2 |
| 6 | `extractTitle` không decode HTML entities từ H1 | `app/api/viet-tu-google-search/stream/route.ts` | Minor |
| 7 | `fallbackKeywords` hardcode năm 2026 | `app/api/viet-tu-google-search/suggest-keywords/route.ts` | Minor |

---

## FIX 1 — `prompt-builder.ts` dùng SEO_PROMPT_RULES local (P1)

**File:** `web/lib/viet-tu-google-search/prompt-builder.ts`
**Dòng:** 3–15

Cùng loại bug với FIX #2 trong `FIX-VIET-THEO-TU-KHOA.md`. File có `const SEO_PROMPT_RULES` riêng với **10 rules bằng tiếng Anh**. File shared `lib/shared/prompt-rules.ts` có **23 rules bằng tiếng Việt**, đầy đủ hơn gồm: E-E-A-T (rule 20), TOC (rule 17), faq-item format (rule 18), no-opener phrases (rule 21), content type rules (14-16), no HTML/body wrap (rule 23).

Hệ quả: bài viết VTGS thiếu 13 quy tắc SEO so với TTK và TinhGon.

```typescript
// ❌ TRƯỚC — dòng 3–15
const SEO_PROMPT_RULES = `
Core rules:
1. Return HTML fragment only. No markdown fence, no explanations.
2. Start with one H1 containing the main keyword.
...
10. Do not invent unverifiable facts.
`.trim();
```

```typescript
// ✅ SAU — xóa const, thêm import ở đầu file
import { SEO_PROMPT_RULES } from '@/lib/shared/prompt-rules';

// Xóa toàn bộ block `const SEO_PROMPT_RULES = ...` (dòng 3–15)
// Phần còn lại của file không thay đổi
```

**Lưu ý:** Sau khi import, bài viết VTGS sẽ dùng prompt VI, đồng bộ với TTK và TinhGon. Kiểm tra lại output để đảm bảo AI model không bị confuse giữa EN prompt header và VI rules.

---

## FIX 2 — `parseKeywords` regex strips digit đầu keyword (P1)

**File:** `web/app/api/viet-tu-google-search/suggest-keywords/route.ts`
**Dòng:** 32

Regex `^[-*\d.\s]+` match quá rộng — không phân biệt được "5." (list marker) và "5 " (số đứng đầu keyword). Kết quả: AI suggest "5 cach chon ghe" → sau parse trở thành "cach chon ghe". Secondary keywords bị mất ý nghĩa.

**Ví dụ bị lỗi:**
- `"5 cach chon ghe"` → `"cach chon ghe"` ❌ (mất số 5)
- `"10 mau ghe dep"` → `"mau ghe dep"` ❌ (mất số 10)
- `"3 buoc chon noi that"` → `"buoc chon noi that"` ❌

**Ví dụ đúng (list markers thực sự):**
- `"1. keyword"` → `"keyword"` ✅
- `"- keyword"` → `"keyword"` ✅
- `"* keyword"` → `"keyword"` ✅

```typescript
// ❌ TRƯỚC — dòng 32
.map((item) => item.replace(/^[-*\d.\s]+/, '').trim())

// ✅ SAU — chỉ strip actual list markers (bullet hoặc số+dấu chấm/ngoặc)
.map((item) => item.replace(/^(?:[-*]\s+|\d+[.)]\s+)/, '').trim())
```

**Cũng thêm minimum length filter** để loại bỏ keywords quá ngắn:

```typescript
// ✅ SAU — thêm sau .filter(Boolean)
.filter((item) => item.length >= 2)
```

**Diff hoàn chỉnh:**

```typescript
// TRƯỚC
function parseKeywords(raw: string, count: number): string[] {
  return raw
    .split(/\n|,|;/)
    .map((item) => item.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, count);
}

// SAU
function parseKeywords(raw: string, count: number): string[] {
  return raw
    .split(/\n|,|;/)
    .map((item) => item.replace(/^(?:[-*]\s+|\d+[.)]\s+)/, '').trim())
    .filter((item) => item.length >= 2)
    .filter((item, index, arr) => arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, count);
}
```

---

## FIX 3 — `relatedKeywords` không dedup (P2)

**File:** `web/app/api/viet-tu-google-search/search/route.ts`
**Dòng:** 190–193

Khi nhiều search result có titles chia sẻ cùng fragment (ví dụ: "Giường sắt | Mua giường sắt" và "Bán giường sắt | Giá tốt"), `flatMap` tạo ra "Giường sắt" hai lần. Không có dedup → `relatedKeywords` trả về giá trị trùng, UI suggest-keywords bị lặp.

```typescript
// ❌ TRƯỚC — dòng 190–193
relatedKeywords: sources
  .flatMap((source) => source.title.split(/[|:-]/).map((part) => part.trim()))
  .filter((part) => part.length > 4)
  .slice(0, 8),
```

```typescript
// ✅ SAU — thêm dedup
relatedKeywords: (() => {
  const seen = new Set<string>();
  return sources
    .flatMap((source) => source.title.split(/[|:-]/).map((part) => part.trim()))
    .filter((part) => {
      if (part.length <= 4) return false;
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
})(),
```

---

## FIX 4 — `applySeoAdvanced` tạo nested `<a>` khi keyword đã trong `<a>` (P2)

**File:** `web/app/api/viet-tu-google-search/stream/route.ts`
**Dòng:** 87–88, 98–99, 104–105

Pattern `(>[^<]*?)(KEYWORD)([^<]*?<)` match bất kỳ text node nào giữa `>` và `<`. Vấn đề: text content của `<a href="...">keyword</a>` cũng nằm giữa `>` và `<`, nên pattern match cả keyword bên trong existing link. Kết quả: `<a href="/product"><a href="https://mainLink/">keyword</a></a>` — invalid HTML, nested anchors.

**Cũng bị ảnh hưởng:** `keywordLinks` và `autoBold` dùng cùng pattern.

```typescript
// ❌ TRƯỚC — dùng regex trên toàn bộ HTML string
const pattern = new RegExp(`(>[^<]*?)(${keyword.replace(...)})([^<]*?<)`, 'i');
nextHtml = nextHtml.replace(pattern, `$1<a href="${mainLink.trim()}">$2</a>$3`);
```

```typescript
// ✅ SAU — dùng split-on-tags để chỉ thay thế trong text nodes
function escapeRegExp(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceFirstInTextNode(
  html: string,
  keyword: string,
  buildReplacement: (match: string) => string,
): string {
  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'i');
  let replaced = false;
  return html.split(/(<[^>]+>)/g).map((part) => {
    if (replaced || part.startsWith('<') || !pattern.test(part)) return part;
    replaced = true;
    return part.replace(pattern, (m) => buildReplacement(m));
  }).join('');
}

// Thay thế 3 chỗ dùng pattern cũ:

// mainLink:
if (keyword && mainLink.trim()) {
  nextHtml = replaceFirstInTextNode(nextHtml, keyword, (m) => `<a href="${mainLink.trim()}">${m}</a>`);
}

// keywordLinks:
for (const [linkKeyword, url] of links) {
  nextHtml = replaceFirstInTextNode(nextHtml, linkKeyword, (m) => `<a href="${url}">${m}</a>`);
}

// autoBold:
if (keyword && (autoBold === 'keyword' || autoBold === 'both')) {
  nextHtml = replaceFirstInTextNode(nextHtml, keyword, (m) => `<strong>${m}</strong>`);
}
```

---

## FIX 5 — `footerContent` inject không sanitize (P2)

**File:** `web/app/api/viet-tu-google-search/stream/route.ts`
**Dòng:** 108–110

`footerContent` từ user config được inject thẳng vào HTML mà không kiểm tra. Nếu user (hoặc bất kỳ code nào đặt `config.seoAdvanced.footerContent`) chứa `<script>`, `onclick=`, hoặc `javascript:` — chúng sẽ được lưu vào database và render trong article HTML.

```typescript
// ❌ TRƯỚC — dòng 108–110
if (footerContent.trim()) {
  nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${footerContent.trim()}</section></article>`);
}
```

```typescript
// ✅ SAU — sanitize trước khi inject
function sanitizeFooterContent(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-blocked=')
    .replace(/javascript\s*:/gi, '#');
}

if (footerContent.trim()) {
  const safe = sanitizeFooterContent(footerContent.trim());
  nextHtml = nextHtml.replace(
    /<\/article>\s*$/i,
    `<section class="brand-footer">${safe}</section></article>`,
  );
}
```

**Lưu ý:** Nếu project đã cài DOMPurify hoặc `sanitize-html`, dùng thư viện đó thay vì regex thủ công. Regex trên chỉ xử lý các vector phổ biến nhất.

---

## FIX 6 — `extractTitle` không decode HTML entities (Minor)

**File:** `web/app/api/viet-tu-google-search/stream/route.ts`
**Dòng:** 33–36

Nếu AI trả về H1 chứa HTML entity (ví dụ: `<h1>Nội thất &amp; Đồ gỗ</h1>`), sau khi strip tags, title vẫn là `"Nội thất &amp; Đồ gỗ"`. Title này được lưu vào DB (`selectedTitle`) và dùng để build meta description. Title bị encoded ảnh hưởng SEO.

```typescript
// ❌ TRƯỚC — dòng 33–36
function extractTitle(html: string, fallback: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return (match?.[1]?.replace(/<[^>]+>/g, '').trim() || fallback).slice(0, 500);
}
```

```typescript
// ✅ SAU — thêm entity decoding
function extractTitle(html: string, fallback: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const raw = match?.[1]?.replace(/<[^>]+>/g, '').trim() || fallback;
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .slice(0, 500);
}
```

---

## FIX 7 — `fallbackKeywords` hardcode năm 2026 (Minor)

**File:** `web/app/api/viet-tu-google-search/suggest-keywords/route.ts`
**Dòng:** 25

```typescript
// ❌ TRƯỚC
`${base} 2026`,

// ✅ SAU
`${base} ${new Date().getFullYear()}`,
```

---

## Thứ tự fix đề xuất

```
1. FIX 1 (prompt-builder SEO_PROMPT_RULES)   — 2 dòng code, impact lớn nhất
2. FIX 2 (parseKeywords regex)               — 2 dòng code, ảnh hưởng keyword quality
3. FIX 4 (applySeoAdvanced nested <a>)       — thêm helper function ~15 dòng
4. FIX 5 (footerContent sanitize)            — thêm sanitize function ~8 dòng
5. FIX 3 (relatedKeywords dedup)             — ~10 dòng
6. FIX 6 (extractTitle entities)             — ~6 dòng
7. FIX 7 (fallbackKeywords year)             — 1 dòng
```

## Chạy tests để verify

```bash
cd web && npm test -- --test-name-pattern="viet-tu-google-search"
```

Hoặc chạy toàn bộ test suite:

```bash
cd web && npm test
```

Tests cần pass sau khi fix:
- `[BUG #1]` → `[FIX #1]` tests trong `describe('[BUG #1] prompt-builder.ts...')`
- `[BUG #2]` → `[FIX #2]` tests trong `describe('parseKeywords...')`
- `[BUG #3]` → `[FIX #3]` tests trong `describe('[BUG #3] relatedKeywords...')`
- `[BUG #4]` → `[FIX #4]` tests trong `describe('applySeoAdvanced...')`
- `[BUG #5]` → `[FIX #5]` tests trong `describe('applySeoAdvanced...')`
- `[BUG #6]` → `[FIX #6]` tests trong `describe('extractTitle...')`
- `[BUG #7]` → `[FIX #7]` tests trong `describe('fallbackKeywords...')`
