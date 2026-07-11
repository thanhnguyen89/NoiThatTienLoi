# Fix Bug — /viet-tu-facebook-comment

> Dựa theo unit test coverage tại `parser.test.ts`, `options.test.ts`, `prompt-builder.test.ts`.  
> Ngày: 2026-06-06

---

## Chạy test

```bash
cd web
node --require tsx/esm --test \
  lib/facebook-comment/parser.test.ts \
  lib/viet-tu-facebook-comment/options.test.ts \
  lib/viet-tu-facebook-comment/prompt-builder.test.ts
```

---

## Danh sách bug và edge case

### 1. `parseCommentList` fallback không dedup — duplicates lọt qua

**File:** `lib/facebook-comment/parser.ts`  
**Test:** Implicit (không cover được fallback path trực tiếp)  
**Mức độ:** 🟡 MEDIUM

Khi tất cả lines sau `cleanCommentLine` + filter đều rỗng, code fallback sang paragraph split:

```ts
const fallback = rawOutput
  .split(/\n{2,}/)
  .map(cleanCommentLine)
  .filter(Boolean);

return expectedCount ? fallback.slice(0, expectedCount) : fallback;
```

Fallback path **không chạy dedup** (`seen` Set chỉ dùng trong line-parsing path). Nếu AI trả về 2 đoạn giống nhau cách nhau `\n\n`, cả hai đều lọt vào output.

**Fix:**
```ts
const fallback = rawOutput
  .split(/\n{2,}/)
  .map(cleanCommentLine)
  .filter(Boolean);

// Apply same dedup as line-parsing path
const seen = new Set<string>();
const deduped = fallback.filter((line) => {
  const key = line.toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

return expectedCount ? deduped.slice(0, expectedCount) : deduped;
```

---

### 2. `buildCommentBrandPrompt` — `brandForbidden` xuất hiện 2 lần trong prompt

**File:** `lib/viet-tu-facebook-comment/prompt-builder.ts`  
**Test:** `buildCommentBrandPrompt includes brandForbidden... at least twice`  
**Mức độ:** 🟢 LOW (redundant, không gây lỗi)

`brandForbidden` được in trong cả `buildBrandBlock` (brand section) lẫn requirements section:

```ts
// trong buildBrandBlock:
if (brand.brandForbidden) lines.push(`- Tu/cum tu can tranh: ${brand.brandForbidden}`);

// trong requirements section:
${input.brand.brandForbidden ? `- Tuyet doi tranh: ${input.brand.brandForbidden}` : ''}
```

AI model nhận chỉ thị trùng lặp. Không gây bug nhưng tốn token.

**Fix:** Xóa 1 trong 2 vị trí, giữ lại phần requirements section vì nó có từ "Tuyet doi tranh" mạnh hơn.

---

### 3. `buildBrandBlock` luôn render brand section dù brand trống — gây dòng rỗng

**File:** `lib/viet-tu-facebook-comment/prompt-builder.ts`  
**Test:** Implicit  
**Mức độ:** 🟢 LOW

`buildBrandBlock` luôn return brand block dù tất cả fields là empty string:

```ts
const lines = [
  '## Thong tin thuong hieu',
  `- Ten shop: ${brand.shopName}`,       // "- Ten shop: "
  `- Cach xung ho: ${brand.brandPronouns}`,  // "- Cach xung ho: "
  `- San pham chinh: ${brand.mainProducts}`,
  `- Khach hang muc tieu: ${brand.brandAudience}`,
];
```

Khi user chưa điền brand info, prompt chứa 4 dòng trống kiểu `- Ten shop: ` → AI nhận brand block vô nghĩa.

**Fix:** Thêm điều kiện giống `viet-bai-tiktok/prompt-builder.ts`:
```ts
export function buildBrandBlock(brand: BrandBlock): string {
  if (!brand.shopName && !brand.mainProducts && !brand.brandAudience && !brand.brandPronouns) {
    return '';
  }
  // ... existing code
}
```

---

### 4. `COMMENT_BRAND_STYLES` dùng ASCII thay vì emoji — hiển thị khác `COMMENT_STYLES`

**File:** `lib/viet-tu-facebook-comment/options.ts`  
**Test:** Shape test (không detect visual inconsistency)  
**Mức độ:** 🟢 LOW

`COMMENT_BRAND_STYLES` (trang mới) dùng ASCII text cho emoji field:
```ts
{ value: 'funny', emoji: ':)' }
{ value: 'friendly', emoji: '<3' }
{ value: 'curious', emoji: '?' }
```

Trong khi `COMMENT_STYLES` (trang cũ `facebook-comment`) dùng emoji thật:
```ts
{ value: 'funny', emoji: '😂' }
{ value: 'friendly', emoji: '❤️' }
```

Page render hiển thị `emoji` trong badge tag `{style.emoji}`. ASCII text cũng hiển thị được nhưng không đồng nhất với thiết kế cũ.

**Fix:** Cập nhật `COMMENT_BRAND_STYLES` sang emoji characters thực:
```ts
{ value: 'funny', emoji: '😄' }
{ value: 'friendly', emoji: '❤️' }
{ value: 'curious', emoji: '❓', hot: true }
{ value: 'experience', emoji: '⭐', hot: true }
{ value: 'tag_friend', emoji: '@' }  // giữ @ vì không có emoji tương ứng
```

---

### 5. `VTFC_SESSION_KEY` dùng `sessionStorage` — config mất khi đóng tab

**File:** `app/viet-tu-facebook-comment/page.tsx`  
**Test:** ❌ Không có test (UI/browser API)  
**Mức độ:** 🟡 MEDIUM

Giống lỗi đã document ở `/viet-bai-tiktok`. `page.tsx` sử dụng `sessionStorage.getItem(VTFC_SESSION_KEY)` — config bị xóa khi đóng tab/browser.

```ts
const saved = sessionStorage.getItem(VTFC_SESSION_KEY);
```

User thường có bài post dài và cấu hình brand phức tạp → mất công nhập lại.

**Fix:** Đổi sang `localStorage`:
```ts
const saved = localStorage.getItem(VTFC_SESSION_KEY);
localStorage.setItem(VTFC_SESSION_KEY, JSON.stringify(next));
```

---

### 6. `handleGenerate` không validate `inputWords > 500` ở client logic

**File:** `app/viet-tu-facebook-comment/page.tsx`  
**Test:** ❌ Không có test (UI interaction)  
**Mức độ:** 🟡 MEDIUM

Button "Tao comment" bị disable khi `inputWords > 500`, nhưng `handleGenerate()` chỉ check:

```ts
if (!config.postContent.trim()) {
  setError('Vui long nhap noi dung bai post Facebook.');
  return;
}
```

Không check `inputWords > 500`. Nếu button disable bị bypass (direct API call hoặc race condition), server nhận post quá dài. Server-side cũng không validate `FREE_USER_MAX_WORDS`.

**Fix (client):** Thêm check vào `handleGenerate`:
```ts
if (inputWords > FREE_USER_MAX_WORDS) {
  setError(`Noi dung qua dai. Toi da ${FREE_USER_MAX_WORDS} tu.`);
  return;
}
```

**Fix (server):** Validate trong `app/api/viet-tu-facebook-comment/generate/route.ts`:
```ts
const words = postContent.trim().split(/\s+/).length;
if (words > FREE_USER_MAX_WORDS) {
  return Response.json({ error: `Post too long (${words} words, max ${FREE_USER_MAX_WORDS})` }, { status: 400 });
}
```

---

### 7. `parseCommentList` filter list không có tiếng Việt có dấu — miss một số preamble AI

**File:** `lib/facebook-comment/parser.ts`  
**Test:** Filter tests cover ASCII cases  
**Mức độ:** 🟢 LOW

Filter regex hiện tại:
```ts
/^(comments?|output|result|danh sach|ket qua|danh sach comment|here are|duoi day la)\b/i
```

Chỉ match text không dấu (danh sach, ket qua, duoi day la). Nếu AI trả về "Dưới đây là" hoặc "Danh sách comment:" (có dấu), các dòng preamble sẽ lọt vào output.

**Fix:** Thêm các variants có dấu:
```ts
/^(comments?|output|result|danh sach|dưới đây|đây là|ket qua|here are|duoi day la|danh sách)\b/iu
```

---

## Tóm tắt mức độ ưu tiên

| # | Issue | Mức độ | File |
|---|-------|--------|------|
| 1 | `parseCommentList` fallback không dedup | 🟡 MEDIUM | `facebook-comment/parser.ts` |
| 5 | `sessionStorage` mất config khi đóng tab | 🟡 MEDIUM | `page.tsx` |
| 6 | `handleGenerate` không check `inputWords > 500` | 🟡 MEDIUM | `page.tsx` + route |
| 2 | `brandForbidden` xuất hiện 2 lần trong prompt | 🟢 LOW | `prompt-builder.ts` |
| 3 | `buildBrandBlock` render dù brand trống | 🟢 LOW | `prompt-builder.ts` |
| 4 | `COMMENT_BRAND_STYLES` dùng ASCII thay vì emoji | 🟢 LOW | `options.ts` |
| 7 | Filter list thiếu tiếng Việt có dấu | 🟢 LOW | `facebook-comment/parser.ts` |
