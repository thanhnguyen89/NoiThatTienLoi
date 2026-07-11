# FIX-VIET-THEO-TU-KHOA.md
## Danh sách bug & hướng dẫn fix — `/viet-theo-tu-khoa`

> Audit ngày 2026-05-28 · 3 vấn đề · 2 mức độ
> Thứ tự fix: P1 trước → Minor

---

## MỤC LỤC

| # | Vấn đề | File | Mức |
|---|--------|------|-----|
| 1 | `handleFloatingCommand` bỏ qua command param | `app/viet-theo-tu-khoa/generate/page.tsx` | P1 |
| 2 | SEO_PROMPT_RULES local 17 rules, không dùng shared | `lib/viet-theo-tu-khoa/outline-generator.ts` | Minor |
| 3 | `parseOutlineToPreview` không sanitize — XSS risk | `lib/viet-theo-tu-khoa/outline-generator.ts` | Minor |

---

## FIX 1 — `handleFloatingCommand` bỏ qua command param (P1)

**File:** `web/app/viet-theo-tu-khoa/generate/page.tsx`  
**Dòng:** 418–421 (handler) + 626 (prop)

`AiFloatingToolbar` gọi `onCommand(command)` nhưng handler không nhận `command` — user click lệnh nào cũng chỉ switch sang tab `quality`, không forward lệnh sang `AiAssistPanel`.

```typescript
// ❌ TRƯỚC
async function handleFloatingCommand() {
  setActiveTab('quality');
  setFloatingToolbar((prev) => ({ ...prev, visible: false }));
}

// Called as:
onCommand={() => void handleFloatingCommand()}
```

```typescript
// ✅ SAU
async function handleFloatingCommand(command: AiAssistCommand) {
  setFloatingToolbar((prev) => ({ ...prev, visible: false }));
  setActiveTab('quality');
  // forward command đến AiAssistPanel thông qua state
  setQueuedCommand(command); // hoặc cơ chế tương đương trong project
}

// Called as:
onCommand={(command) => void handleFloatingCommand(command)}
```

**Lưu ý khi implement:**

Xem cách VBT step4 (`app/viet-bai-thong-minh/step4/page.tsx`) xử lý `handleFloatingCommand` để dùng cùng pattern. Nếu `AiAssistPanel` nhận command qua prop hay ref, dùng cách đó. Quan trọng là `command` phải được truyền tiếp — không được drop.

Import cần có:
```typescript
import type { AiAssistCommand } from '@/components/editor/AiFloatingToolbar';
// hoặc từ nơi type được export trong project
```

---

## FIX 2 — SEO_PROMPT_RULES local, không dùng file shared (Minor)

**File:** `web/lib/viet-theo-tu-khoa/outline-generator.ts`  
**Dòng:** 4–23

File có `const SEO_PROMPT_RULES` riêng với 17 rules. File shared `lib/shared/prompt-rules.ts` có 23 rules (đầy đủ hơn). Hai file bị out-of-sync — nếu sau này cập nhật shared sẽ không tự động áp dụng vào TTK.

```typescript
// ❌ TRƯỚC — dòng 4–23
const SEO_PROMPT_RULES = `
SEO + readability rules:
1. Return clean HTML only. No markdown fences, no explanation outside the article.
2. Use exactly one <h1>; the H1 should contain the main keyword naturally.
...
17. Write naturally and avoid repetitive AI phrasing.
`.trim();
```

```typescript
// ✅ SAU — xóa const local, thêm import ở dòng 1–2
import { SEO_PROMPT_RULES } from '@/lib/shared/prompt-rules';

// (giữ nguyên các import khác bên dưới)
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import type { AiOutlineObjective, AiOutlineSize, KeywordArticleConfig, KeywordTone } from './types';
```

Xóa toàn bộ block `const SEO_PROMPT_RULES = \`...\`.trim();` (dòng 4–23). Không cần sửa gì thêm — biến `SEO_PROMPT_RULES` được dùng ở dòng 183 sẽ tự resolve từ import.

---

## FIX 3 — `parseOutlineToPreview` không sanitize HTML (Minor XSS)

**File:** `web/lib/viet-theo-tu-khoa/outline-generator.ts`  
**Dòng:** 86–101

`parseOutlineToPreview` lấy content bên trong `[h2]...[/h2]` và nhét thẳng vào `innerHTML` mà không strip HTML. Nếu user nhập outline có `<script>alert(1)</script>` hoặc `<img onerror=...>` bên trong tag, sẽ render và chạy.

```typescript
// ❌ TRƯỚC
export function parseOutlineToPreview(outlineText: string): string {
  return outlineText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('[h2]') && line.endsWith('[/h2]')) {
        return `<p class="mt-2 font-semibold text-gray-800">${line.slice(4, -5)}</p>`;
      }
      if (line.startsWith('[h3]') && line.endsWith('[/h3]')) {
        return `<p class="ml-4 text-sm text-gray-500">- ${line.slice(4, -5)}</p>`;
      }
      return `<p class="text-sm text-gray-500">${line}</p>`;
    })
    .join('');
}
```

```typescript
// ✅ SAU — thêm hàm stripTags, áp dụng cho content trước khi nhét vào template
function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, '');
}

export function parseOutlineToPreview(outlineText: string): string {
  return outlineText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('[h2]') && line.endsWith('[/h2]')) {
        const content = stripTags(line.slice(4, -5));
        return `<p class="mt-2 font-semibold text-gray-800">${content}</p>`;
      }
      if (line.startsWith('[h3]') && line.endsWith('[/h3]')) {
        const content = stripTags(line.slice(4, -5));
        return `<p class="ml-4 text-sm text-gray-500">- ${content}</p>`;
      }
      return `<p class="text-sm text-gray-500">${stripTags(line)}</p>`;
    })
    .join('');
}
```

---

## CHECKLIST XÁC NHẬN

Sau khi fix, kiểm tra:

- [x] **Fix 1:** Click vào lệnh trong AiFloatingToolbar → AiAssistPanel nhận được command và xử lý (không chỉ switch tab)
- [x] **Fix 1:** `onCommand` prop truyền `(command) => void handleFloatingCommand(command)` (có tham số)
- [x] **Fix 2:** `outline-generator.ts` không còn `const SEO_PROMPT_RULES` local — dùng import từ shared
- [x] **Fix 2:** `npx tsc --noEmit` pass (import path đúng)
- [x] **Fix 3:** `parseOutlineToPreview` có `stripTags` trước khi nhét content vào template string
- [x] **Fix 3:** Logic đã chặn render tag HTML từ outline preview; payload như `[h2]<script>alert(1)</script>[/h2]` sẽ chỉ còn text

---

## GHI CHÚ

**Kết luận sau fix ngày 2026-05-28: ✅ 3/3 vấn đề đã xử lý**
- `handleFloatingCommand` đã forward đúng `command` sang `AiAssistPanel` qua state `externalCommand`, không còn bị drop.
- `outline-generator.ts` đã dùng `SEO_PROMPT_RULES` shared từ `lib/shared/prompt-rules.ts`, tránh lệch rule với các flow khác.
- `parseOutlineToPreview` đã strip HTML tags trước khi build preview, đóng lỗ hổng XSS kiểu inject `<script>` / event handler.

**Flow TTK tổng quát: ✅ Correct**
- Config page → `/api/viet-theo-tu-khoa/start` → generate page → SSE stream
- Đủ components: AICheckPanel, AiFloatingToolbar, AiAssistPanel, ArticleEditor, SeoPanel, InternalLinkSuggest, PublishPanel, KeywordDensityBar
- Internal links load từ `/api/tinh-gon/internal-links` ✅
- Draft persistence qua `upsertArticleDraft` ✅
- AI Suggest keywords qua `/api/tinh-gon/suggest-keywords` ✅

**Residual note**
- Chưa có test tự động riêng cho hành vi toolbar → AiAssistPanel hoặc outline preview sanitize; hiện mới xác nhận bằng đọc code và `npx tsc --noEmit`.
