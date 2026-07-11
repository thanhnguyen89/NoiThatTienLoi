# FIX-VIET-TINH-GON.md
## Danh sách bug & hướng dẫn fix — `/viet-tinh-gon`

> Audit ngày 2026-05-28 · 3 vấn đề · 2 mức độ
> Thứ tự fix: P1 trước → Minor

---

## MỤC LỤC

| # | Vấn đề | File | Mức |
|---|--------|------|-----|
| 1 | UTF-8 Mojibake — toàn bộ Vietnamese text bị garbled | `app/viet-tinh-gon/generate/page.tsx` | P1 |
| 2 | `rankInternalLinks` import unused | `app/viet-tinh-gon/generate/page.tsx` | Minor |
| 3 | Dead condition trong `writeSessionAICheckState` | `app/viet-tinh-gon/generate/page.tsx` | Minor |

---

## FIX 1 — UTF-8 Mojibake toàn bộ generate page (P1)

> ⚠️ Bug này ảnh hưởng **6 generate pages** (không chỉ tinh-gon). Xem hướng dẫn fix đầy đủ tại **`FIX-ENCODING-MOJIBAKE.md`** — có script Node.js fix tất cả 1 lần.

**File:** `web/app/viet-tinh-gon/generate/page.tsx`
**Phạm vi:** Toàn bộ file 2621 dòng

**Triệu chứng:** Tất cả chuỗi tiếng Việt hiển thị garbled trong UI. Ví dụ:

```
// ❌ Garbled — hiển thị sai trong browser
{ value: 'shorten', label: 'RÃºt gá»n' }         // → nên là: 'Rút gọn'
{ value: 'expand',  label: 'Má»Ÿ rá»™ng' }        // → nên là: 'Mở rộng'
{ value: 'humanize', label: 'Tá»± nhiÃªn hÆ¡n' }  // → nên là: 'Tự nhiên hơn'
{ value: 'more_spec', label: 'ThÃªm chi tiáº¿t' }  // → nên là: 'Thêm chi tiết'
```

**Nguyên nhân:** File UTF-8 ban đầu đúng, nhưng đã bị mở/save với encoding Latin-1 (hoặc CP1252) khiến UTF-8 bytes bị double-encode. Kết quả là các ký tự như `ú` (UTF-8: `C3 BA`) bị hiểu là 2 Latin-1 chars `Ã` + `º` rồi lại encode thành UTF-8.

**Cách fix — Dùng Node.js script để decode lại:**

Tạo file `scripts/fix-encoding.mjs` và chạy:

```javascript
// scripts/fix-encoding.mjs
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'web/app/viet-tinh-gon/generate/page.tsx';

// Đọc file như Latin-1 (mỗi byte là 1 char)
const raw = readFileSync(filePath);

// Interpret bytes như Latin-1 string rồi encode lại đúng UTF-8
const latin1String = raw.toString('latin1');
const utf8Buffer = Buffer.from(latin1String, 'latin1');

// Kiểm tra kết quả trước khi ghi
const decoded = utf8Buffer.toString('utf8');
console.log('Sample:', decoded.slice(2000, 2100)); // xem kết quả

writeFileSync(filePath, utf8Buffer);
console.log('Done. File re-encoded correctly.');
```

```bash
node scripts/fix-encoding.mjs
```

**Kiểm tra sau khi chạy:** Mở file trong VS Code — tất cả tiếng Việt phải hiển thị đúng (không còn `Ã`, `á»`, `Æ°`...).

**Sau đó chạy TypeScript check:**
```bash
npx tsc --noEmit
```

**Lưu ý:** Nếu script decode ra sai (kiểm tra sample trước), thử theo hướng khác:

```javascript
// Thử alternative: đọc raw bytes, fix bằng TextDecoder
const raw = readFileSync(filePath);
const wrongString = new TextDecoder('latin1').decode(raw);
const fixedBuffer = Buffer.from(wrongString, 'binary');
const result = fixedBuffer.toString('utf8');
writeFileSync(filePath, result, 'utf8');
```

---

## FIX 2 — `rankInternalLinks` import không dùng (Minor)

**File:** `web/app/viet-tinh-gon/generate/page.tsx`
**Dòng:** ~18

```typescript
// ❌ TRƯỚC — import không dùng, ESLint warning
import { rankInternalLinks } from '@/lib/tinh-gon/internal-links';
```

```typescript
// ✅ SAU — xóa dòng này
// (không cần import vì internal links đã load qua /api/tinh-gon/internal-links)
```

Xóa dòng import `rankInternalLinks`. Không cần thay thế gì — logic load internal links đã dùng API endpoint ở `loadInternalLinks()`.

---

## FIX 3 — Dead condition trong `writeSessionAICheckState` (Minor)

**File:** `web/app/viet-tinh-gon/generate/page.tsx`
**Hàm:** `loadFromDatabase()` — dòng ~462

```typescript
// ❌ TRƯỚC — condition luôn truthy, nhánh undefined không bao giờ chạy
writeSessionAICheckState(runIdParam || article.runId ? `aicheck:tinh-gon:${article.runId}` : undefined, snapshot?.aiCheck);
```

Vì `article.runId` từ DB luôn có giá trị, `runIdParam || article.runId` luôn truthy → nhánh `undefined` là dead code. Nếu `snapshot?.aiCheck` undefined, vẫn nên pass `undefined` để avoid ghi rác vào storage.

```typescript
// ✅ SAU — rõ ràng hơn, loại bỏ dead code
const aiCheckKey = `aicheck:tinh-gon:${article.runId}`;
writeSessionAICheckState(aiCheckKey, snapshot?.aiCheck);
```

---

## CHECKLIST XÁC NHẬN

Sau khi fix, kiểm tra:

- [ ] **Fix 1:** Mở `generate/page.tsx` trong VS Code — tất cả text tiếng Việt hiển thị đúng (không còn `Ã`, `á»`, `Æ°`...)
- [ ] **Fix 1:** UI chạy trên browser — labels nút AI Edit hiện `Rút gọn`, `Mở rộng`, `Tự nhiên hơn` đúng
- [ ] **Fix 1:** `npx tsc --noEmit` pass sau khi fix encoding
- [ ] **Fix 2:** Không còn `import { rankInternalLinks }` trong file
- [ ] **Fix 2:** `npx eslint web/app/viet-tinh-gon/generate/page.tsx` không còn warning unused import
- [ ] **Fix 3:** `writeSessionAICheckState` dùng biến `aiCheckKey` trực tiếp, không còn ternary

---

## GHI CHÚ

**Flow `/viet-tinh-gon` tổng quát: ✅ Correct**

3 bước hoàn chỉnh:
- **Step 1** (`/viet-tinh-gon`): config form → `POST /api/tinh-gon/start` → lưu sessionStorage → redirect outline
- **Step 2** (`/viet-tinh-gon/outline`): review/edit outline → auto-save draft (`PATCH /api/articles/:id`) → redirect generate
- **Step 3** (`/viet-tinh-gon/generate`): load DB → SSE stream (`POST /api/tinh-gon/stream`) → editor

**Các tính năng generate page (đều hoạt động):**
- Rich text editor (contentEditable) với toolbar đầy đủ: bold/italic/underline, heading H2/H3, color picker, font size, align, list, insert link/image/table, undo/redo, find & replace, export Word, view source
- SEO panel: 21-check score, SERP preview, slug editor, meta description, secondary keywords, fix buttons
- AI tab: AICheckPanel (wired đúng với `storageKey`) + AI Edit commands (6 lệnh)
- Internal links: load từ `/api/tinh-gon/internal-links`, render qua `InternalLinkSuggest`
- Auto-save draft: debounce 1.5s, compare signature trước khi save
- Publish: `POST /api/pipeline/publish`
- Keyboard shortcut Ctrl+S → save version

**SEO fix buttons index mapping: ✅ Khớp với computeSeoChecks 21 checks**
- `index 0` → fixTitle, `index 1` → fixMeta, `index 2` → fixSlug
- `index 6` → callFixDensity (AI), `index 8` → internal link, `index 9` → external link
- `index 10` → fixAltText, `index 12` → fixTitleToStart, `index 13` → fixTitleNumber

**Issue duy nhất blocking: Mojibake (Bug #1)** — toàn bộ UI text tiếng Việt trong generate page hiển thị sai ký tự.
