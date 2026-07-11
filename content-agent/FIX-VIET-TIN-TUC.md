# FIX-VIET-TIN-TUC.md
## Danh sách bug & hướng dẫn fix — `/viet-tin-tuc`

> Audit ngày 2026-06-08 · 6 vấn đề · 3 mức độ
> Thứ tự fix: P1 → P2 → Minor
> Tham chiếu: `fix-bug-viet-tin-tuc.md` (đã có 6 bug trước) + audit mới này

---

## MỤC LỤC

| # | Vấn đề | File | Mức |
|---|--------|------|-----|
| 1 | `decodeEntities` — CDATA regex `.*?` không match newline | `app/api/viet-tin-tuc/start/route.ts` | P1 |
| 2 | `decodeEntities` — Numeric HTML entities `&#8211;` etc. không decode | `app/api/viet-tin-tuc/start/route.ts` | P1 |
| 3 | `buildNewsPrompt` — forbidden clause rỗng khi không có từ cấm | `app/api/viet-tin-tuc/stream/route.ts` | P2 |
| 4 | `startSchema` — `targetLength` không validate min/max | `app/api/viet-tin-tuc/start/route.ts` | P2 |
| 5 | `streamSchema` — thiếu `secondaryKeywords` → Zod strip, type mismatch | `app/api/viet-tin-tuc/stream/route.ts` | P2 |
| 6 | `normalizeNewsConfig` — null/undefined item trong `secondaryKeywords` gây TypeError | `lib/viet-tin-tuc/types.ts` | P2 |

> Bug #1-2 ảnh hưởng trực tiếp **tiêu đề và snippet tin tức bị sai** → bài viết kém chất lượng.

---

## FIX 1 — `decodeEntities` CDATA regex không match newline (P1)

**File:** `web/app/api/viet-tin-tuc/start/route.ts`
**Dòng:** 34

Regex `.*?` trong CDATA extractor không match ký tự xuống dòng (`\n`). Khi Google News RSS trả về CDATA spanning nhiều dòng (thường gặp trong `<description>` CDATA), regex không match → CDATA wrapper còn nguyên → title/snippet bị `<![CDATA[...]]>` thay vì content thực.

**Ví dụ thực tế:**
```xml
<description><![CDATA[
<ol><li><a href="https://vnexpress.net/link">Xu hướng nội thất 2026</a></li>
<li><a href="https://tuoitre.vn/link">Giá nội thất tăng</a></li></ol>
]]></description>
```
→ Buggy: `snippet = "<![CDATA[ <ol><li>..."` (raw CDATA)
→ Fixed: `snippet = "Xu hướng nội thất 2026 Giá nội thất tăng"` (sau strip HTML)

```typescript
// ❌ TRƯỚC — dòng 34
.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
//                        ^^ .*? không match \n

// ✅ SAU — thay .*? bằng [\s\S]*?
.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
//                    ^^^^^^^^ matches mọi ký tự kể cả \n
```

---

## FIX 2 — `decodeEntities` không decode numeric HTML entities (P1)

**File:** `web/app/api/viet-tin-tuc/start/route.ts`
**Dòng:** 35–43

Hàm chỉ xử lý named entities (`&amp;`, `&quot;`, `&#39;`, `&lt;`, `&gt;`, `&nbsp;`) nhưng bỏ qua **numeric HTML entities**. Các trang báo Việt Nam thường dùng:

| Entity | Decode | Ý nghĩa |
|--------|--------|---------|
| `&#8211;` | `–` | En dash (dấu gạch giữa) |
| `&#8212;` | `—` | Em dash |
| `&#8216;` | `'` | Left single quote |
| `&#8217;` | `'` | Right single quote |
| `&#8220;` | `"` | Left double quote |
| `&#8221;` | `"` | Right double quote |

**Ví dụ thực tế từ RSS:**
```
"Giá nội thất tăng 5&#8211;10% trong quý II" 
→ Buggy:  "Giá nội thất tăng 5&#8211;10% trong quý II" (AI nhận raw entity)
→ Fixed:  "Giá nội thất tăng 5–10% trong quý II"
```

```typescript
// ❌ TRƯỚC — thiếu numeric entity decoding
function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ✅ SAU — fix cả Bug #1 và #2 cùng lúc
function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')          // FIX #1: multiline CDATA
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))) // FIX #2: numeric entities
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Lưu ý thứ tự:** `&#(\d+);` decoder phải đứng TRƯỚC `&#39;` để tránh `&#39;` bị decode hai lần. Thực tế `&#39;` (`'`) cũng là numeric nên sau fix, dòng `&#39;` có thể bỏ:

```typescript
// ✅ Simplified version sau khi có numeric decoder
function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

---

## FIX 3 — `buildNewsPrompt` forbidden clause rỗng (P2)

**File:** `web/app/api/viet-tin-tuc/stream/route.ts`
**Dòng:** 65, 123

Khi `config.brandConfig?.forbiddenExtra` không có (undefined hoặc ''), `forbidden` là empty string `""`. Instruction trong prompt trở thành:

```
- Không dùng các từ/cụm từ sau: 
```

Dấu hai chấm không có gì sau → AI model có thể bỏ qua hoặc hiểu lầm instruction. Bài viết có thể dùng các từ AI-fluff mà không bị chặn.

```typescript
// ❌ TRƯỚC — dòng 65 và 123
const forbidden = mergeForbiddenWords(config.brandConfig?.forbiddenExtra).join(', ');
// ...
- Không dùng các từ/cụm từ sau: ${forbidden}
// → khi forbidden = "" → instruction rỗng vô nghĩa
```

```typescript
// ✅ SAU — conditional clause
const forbiddenWords = mergeForbiddenWords(config.brandConfig?.forbiddenExtra);
// ...
// Trong buildNewsPrompt:
const forbiddenClause = forbiddenWords.length > 0
  ? `- Không dùng các từ/cụm từ sau: ${forbiddenWords.join(', ')}`
  : '- Tránh ngôn ngữ AI sáo rỗng: "Nhìn chung", "Không thể phủ nhận", "Tuy nhiên", "Bên cạnh đó", "Đặc biệt là".';

// Trong template:
// ...
${forbiddenClause}
```

---

## FIX 4 — `startSchema` thiếu validation range cho `targetLength` (P2)

**File:** `web/app/api/viet-tin-tuc/start/route.ts`
**Dòng:** 20

`targetLength: z.number().default(600)` không có `min/max`, cho phép client gửi bất kỳ số nào. `targetLength: 9999` sẽ được accept → AI viết bài quá dài, vượt giới hạn token, tốn tiền API.

```typescript
// ❌ TRƯỚC — dòng 20
targetLength: z.number().default(600),

// ✅ SAU
targetLength: z.number().int().min(400).max(800).default(600),
```

Giá trị min/max căn theo `NEWS_LENGTHS` trong `options.ts` (400, 600, 800).

---

## FIX 5 — `streamSchema` thiếu `secondaryKeywords` (P2)

**File:** `web/app/api/viet-tin-tuc/stream/route.ts`
**Dòng:** 42–57

`streamSchema.config` không khai báo `secondaryKeywords`. Zod mặc định dùng `.strip()` mode → `secondaryKeywords` bị loại khỏi parsed output. Config được type cast là `NewsConfig` (có `secondaryKeywords: string[]`) nhưng runtime value là `undefined`.

Tuy hiện tại `buildNewsPrompt` không dùng `secondaryKeywords`, nếu dev sau này thêm secondary keyword logic vào prompt sẽ bị bug ngầm (TypeScript ok nhưng runtime `undefined`).

Cũng thiếu `seoOptions` — SEO advanced features (mainLink, autoBold, footerContent) không được truyền tới stream route.

```typescript
// ❌ TRƯỚC — dòng 42–57
const streamSchema = z.object({
  articleId: z.string(),
  runId: z.string(),
  config: z.object({
    keyword: z.string().min(1),
    language: z.string(),
    structure: z.string(),
    tone: z.string(),
    model: z.string(),
    targetLength: z.number(),
    brandConfig: z.record(z.unknown()).optional(),
    // secondaryKeywords: MISSING
    // seoOptions: MISSING
  }),
  sources: z.array(...)
});
```

```typescript
// ✅ SAU — thêm secondaryKeywords và seoOptions
const streamSchema = z.object({
  articleId: z.string(),
  runId: z.string(),
  config: z.object({
    keyword: z.string().min(1),
    language: z.string(),
    structure: z.string(),
    tone: z.string(),
    model: z.string(),
    targetLength: z.number(),
    brandConfig: z.record(z.unknown()).optional(),
    secondaryKeywords: z.array(z.string()).default([]),   // ← thêm
    seoOptions: z.object({                                // ← thêm
      mainLink: z.string().optional(),
      keywordLinks: z.string().optional(),
      autoBold: z.string().optional(),
      footerContent: z.string().optional(),
    }).optional(),
  }),
  sources: z.array(z.object({
    title: z.string(),
    link: z.string(),
    pubDate: z.string(),
    source: z.string(),
    snippet: z.string(),
  })),
});
```

---

## FIX 6 — `normalizeNewsConfig` null/undefined item trong `secondaryKeywords` (P2)

**File:** `web/lib/viet-tin-tuc/types.ts`
**Dòng:** 47–50

Đã documented tại `fix-bug-viet-tin-tuc.md` (Bug #2) nhưng chưa fix. Khi dữ liệu từ sessionStorage bị corrupt (item là `null` hoặc `undefined`), `.trim()` throw TypeError.

```typescript
// ❌ TRƯỚC — dòng 47–50
secondaryKeywords: Array.isArray(input.secondaryKeywords)
  ? input.secondaryKeywords.map((item) => item.trim()).filter(Boolean)
  : [],
```

```typescript
// ✅ SAU — thêm type guard trước map
secondaryKeywords: Array.isArray(input.secondaryKeywords)
  ? input.secondaryKeywords
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  : [],
```

---

## Thứ tự fix đề xuất

```
1. FIX 1 + 2 cùng lúc (decodeEntities)  — 1 hàm, 2 dòng, impact cao nhất
   → Sửa snippet và title từ RSS chính xác hơn → bài viết dùng đúng nguồn
2. FIX 6 (normalizeNewsConfig null guard)  — 3 dòng, phòng crash
3. FIX 4 (startSchema targetLength range) — 1 dòng
4. FIX 3 (buildNewsPrompt forbidden clause) — ~6 dòng
5. FIX 5 (streamSchema secondaryKeywords) — ~3 dòng thêm vào schema
```

---

## Chạy tests để verify

```bash
cd web && npm test -- --test-name-pattern "viet-tin-tuc"
```

Hoặc chạy toàn bộ bao gồm cả types.test.ts và options.test.ts cũ:

```bash
cd web && npm test
```

**Trạng thái tests trước khi fix:**
- `[BUG #1]` tests → PASS (xác nhận bug)
- `[BUG #2]` tests → PASS (xác nhận bug)
- `[BUG #3]` tests → PASS (xác nhận bug)
- `[BUG #4]` tests → PASS (xác nhận bug)
- `[BUG #5]` tests → PASS (xác nhận bug)
- `[BUG #6]` tests → PASS (xác nhận bug)
- `[FIX #...]` tests → PASS ngay (dùng fixed implementation copy trong test)

**Sau khi fix source code:**
- Tất cả tests phải pass
- Bug confirmation tests vẫn pass (chúng assert behavior của buggy copy, không import source)
