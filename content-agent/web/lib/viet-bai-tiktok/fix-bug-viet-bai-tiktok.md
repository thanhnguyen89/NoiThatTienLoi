# Fix Bug — /viet-bai-tiktok

> Dựa theo unit test coverage tại `parser.test.ts` và `options.test.ts`.  
> Ngày: 2026-06-06

---

## Chạy test

```bash
cd web
node --require tsx/esm --test lib/viet-bai-tiktok/parser.test.ts lib/viet-bai-tiktok/options.test.ts
```

---

## Danh sách bug và edge case

### 1. `normalizeTag` strips hyphens silently — hashtag nội dung thay đổi

**File:** `lib/viet-bai-tiktok/parser.ts`  
**Test:** `parseTiktokOutput strips hyphens from hashtags via normalizeTag`  
**Mức độ:** 🟡 MEDIUM

`extractHashtags` dùng regex `/#[\p{L}\p{N}_-]+/gu` — match cả dấu `-`. Nhưng `normalizeTag` xóa tất cả ký tự không phải `[\p{L}\p{N}_]`, tức là `-` bị strip im lặng.

**Reproduce:**
```ts
// input hashtag: #noi-that
// extractHashtags captures: #noi-that
// normalizeTag: strips leading #, removes '-', re-adds # → #noithat
```

Kết quả: AI output `#noi-that` → user nhận `#noithat`. Nếu hashtag brand dùng dấu `-`, sẽ bị thay đổi không báo trước.

**Fix (option A):** Cho phép `-` trong `normalizeTag`:
```ts
const clean = tag
  .replace(/^#+/, '')
  .replace(/[^\p{L}\p{N}_-]/gu, '')  // thêm - vào whitelist
  .trim();
```

**Fix (option B):** Loại `-` khỏi regex `extractHashtags`:
```ts
return uniqueTags(text.match(/#[\p{L}\p{N}_]+/gu) || []);
// consistent: không capture hyphen từ đầu
```

---

### 2. Title max length inconsistency — parser 50 chars, UI cho sửa đến 80 chars

**File:** `app/viet-bai-tiktok/page.tsx` — hàm `updateTitle`  
**Test:** ❌ Không có test (UI interaction)  
**Mức độ:** 🟡 MEDIUM

`parseTiktokOutput` truncate title về 50 chars. Nhưng khi user edit title thủ công trong ô input:

```ts
function updateTitle(next: string) {
  setTitle(next.slice(0, 80));  // ❌ 80 thay vì 50
  setSavedId(null);
}
```

UI counter hiển thị `{title.length}/50` và cảnh báo amber khi `> 45`, nhưng vẫn cho gõ đến 80 ký tự → không nhất quán.

**Fix:**
```ts
function updateTitle(next: string) {
  setTitle(next.slice(0, 50));  // đồng bộ với parser
  setSavedId(null);
}
```

---

### 3. `extractSection` có thể miss nội dung khi AI đặt sai thứ tự label

**File:** `lib/viet-bai-tiktok/parser.ts`  
**Test:** Implicit qua structured output tests  
**Mức độ:** 🟡 MEDIUM

`extractSection` dùng regex non-greedy với stop labels. Nếu AI output các label không theo thứ tự chuẩn (CAPTION trước TITLE), hoặc thêm text thừa giữa label và nội dung, regex có thể không match.

**Reproduce:**
```
CAPTION:
Caption đây.
TITLE: Tiêu đề đây
HASHTAGS:
#test
```

Trong trường hợp này, `title` sẽ được extract sau `CAPTION` section đã "chiếm" phần còn lại. Kết quả caption đúng nhưng title trống → fallback về `fallbackTitle(caption)`.

**Fix:** Đây là limitation của regex-based section parsing. Giải pháp bền hơn là split toàn bộ text theo tất cả label patterns trước, rồi map từng đoạn.

---

### 4. `buildTiktokBrandPostPrompt` — brand block không render khi chỉ có `brandPronouns`/`industry`

**File:** `lib/viet-bai-tiktok/prompt-builder.ts`  
**Test:** Implicit (prompt content test)  
**Mức độ:** 🟢 LOW

`buildBrandBlock` chỉ render brand block khi ít nhất một trong `shopName`, `brandDesc`, `mainProducts`, `ctaStandard` có giá trị:

```ts
if (!brand.shopName && !brand.brandDesc && !brand.mainProducts && !brand.ctaStandard) {
  return '';
}
```

Nếu user chỉ điền `brandPronouns` (mình/shop) và `brandAudience` (bạn/anh chị) mà bỏ trống các trường trên, brand block bị skip — AI vẫn dùng fallback `mình` → `bạn` nhưng không biết tên brand, ngành, products.

**Fix:** Mở rộng điều kiện kiểm tra:
```ts
if (!brand.shopName && !brand.brandDesc && !brand.mainProducts
    && !brand.ctaStandard && !brand.brandPronouns && !brand.brandAudience) {
  return '';
}
```

---

### 5. `LS_KEY_CONFIG` dùng `sessionStorage` trong page nhưng tên biến gợi `localStorage`

**File:** `app/viet-bai-tiktok/page.tsx`  
**Test:** ❌ Không có test (UI/browser API)  
**Mức độ:** 🟢 LOW

Biến `LS_KEY_CONFIG` và `LS_KEY_BRAND` (prefix `LS_` thường ngầm hiểu là localStorage), nhưng `page.tsx` sử dụng `sessionStorage`:

```ts
const raw = sessionStorage.getItem(LS_KEY_CONFIG);
sessionStorage.setItem(LS_KEY_CONFIG, JSON.stringify(config));
```

`sessionStorage` bị xóa khi đóng tab → user mất config khi reload hoặc mở tab mới.

**Fix:** Đổi sang `localStorage` để persist config giữa các session, hoặc đổi prefix biến thành `SS_KEY_CONFIG` cho rõ ràng:
```ts
const raw = localStorage.getItem(LS_KEY_CONFIG);
localStorage.setItem(LS_KEY_CONFIG, JSON.stringify(config));
```

---

### 6. `parseTiktokOutput` — không export các helper functions, không thể test riêng

**File:** `lib/viet-bai-tiktok/parser.ts`  
**Test:** ❌ Không có test cho internal helpers  
**Mức độ:** 🟢 LOW

Các hàm `stripMarkdown`, `stripEmoji`, `normalizeTag`, `uniqueTags`, `extractHashtags`, `cleanCaption`, `fallbackTitle` là private (không export). Test chỉ có thể cover qua `parseTiktokOutput` — không kiểm tra được từng behavior riêng lẻ.

**Fix:** Export các pure helper functions sang `lib/viet-bai-tiktok/parser-utils.ts` để có thể unit test độc lập:
```ts
// parser-utils.ts
export function normalizeTag(tag: string): string { ... }
export function stripEmoji(text: string): string { ... }
// etc.
```

---

## Tóm tắt mức độ ưu tiên

| # | Issue | Mức độ | File |
|---|-------|--------|------|
| 1 | `normalizeTag` strip hyphen im lặng | 🟡 MEDIUM | `parser.ts` |
| 2 | `updateTitle` cho edit đến 80 chars thay vì 50 | 🟡 MEDIUM | `page.tsx` |
| 3 | `extractSection` miss nội dung khi AI output sai thứ tự | 🟡 MEDIUM | `parser.ts` |
| 4 | `buildBrandBlock` không render khi chỉ có pronouns/audience | 🟢 LOW | `prompt-builder.ts` |
| 5 | `LS_KEY_CONFIG` dùng sessionStorage, mất config khi đóng tab | 🟢 LOW | `page.tsx` |
| 6 | Internal helpers không export, không test riêng được | 🟢 LOW | `parser.ts` |
