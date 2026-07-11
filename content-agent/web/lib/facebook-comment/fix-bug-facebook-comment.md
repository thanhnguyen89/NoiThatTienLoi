# Fix Bug — /facebook-comment

> Dựa theo unit test coverage tại `options.test.ts` và `parser.test.ts`.  
> Ngày: 2026-06-06

---

## Chạy test

```bash
cd web
node --require tsx/esm --test \
  lib/facebook-comment/options.test.ts \
  lib/facebook-comment/parser.test.ts
```

---

## Danh sách bug và edge case

### 1. `FACEBOOK_COMMENT_EMOJIS` có duplicate — emoji xuất hiện ở nhiều group

**File:** `lib/facebook-comment/options.ts`  
**Test:** `FACEBOOK_COMMENT_EMOJIS contains duplicates across groups (known issue)`  
**Mức độ:** 🟡 MEDIUM

`FACEBOOK_COMMENT_EMOJIS` được tạo bằng `flatMap` từ 10 groups × 20 emojis = 200 items. Nhưng một số emoji xuất hiện ở nhiều group:

| Emoji | Xuất hiện ở |
|-------|------------|
| 💎 | 🔥 Hot + 💵 Giá |
| 💰 | 🔥 Hot + 💵 Giá |
| 📦 | 📦 Sản phẩm + 🚚 Giao hàng |
| 💬 | 💬 CTA + _(các group khác)_ |

Kết quả: flat array có duplicate. Nếu code dùng `FACEBOOK_COMMENT_EMOJIS` để kiểm tra sự tồn tại (`.includes()`) hoặc render unique list, duplicates gây hiển thị sai.

**Fix:** Dùng `Set` khi cần unique list:
```ts
export const FACEBOOK_COMMENT_EMOJIS_UNIQUE = [...new Set(
  FACEBOOK_COMMENT_EMOJI_GROUPS.flatMap((group) => group.emojis)
)];
```

Hoặc xem xét lại việc assign emoji vào đúng 1 group để không trùng.

---

### 2. `buildPrompt` trong route.ts — style instructions hardcoded bằng tiếng Việt không dấu

**File:** `app/api/facebook-comment/generate/route.ts`  
**Test:** ❌ Không có test (hàm private)  
**Mức độ:** 🟡 MEDIUM

`STYLE_INSTRUCTIONS` trong route.ts viết không dấu (latin ASCII):
```ts
funny: 'Vui ve, hai huoc nhe. Co the dung emoji vua phai.',
friendly: 'Than thien, am ap, ung ho.',
```

Nhưng `buildPrompt` là prompt tiếng Anh (`You are an AI...`, `Language: Vietnamese`). Style instructions bằng tiếng Việt không dấu có thể bị AI hiểu sai, đặc biệt với model nhỏ (Gemini Flash).

**Fix (option A):** Dịch tất cả STYLE_INSTRUCTIONS sang tiếng Anh:
```ts
funny: 'Lighthearted and humorous. Can use emojis sparingly.',
friendly: 'Warm and supportive, like a genuine fan of the post.',
```

**Fix (option B):** Viết đúng tiếng Việt có dấu:
```ts
funny: 'Vui vẻ, hài hước nhẹ. Được dùng emoji vừa phải.',
friendly: 'Thân thiện, ấm áp, ủng hộ.',
```

---

### 3. `buildPrompt` không inject `FREE_USER_MAX_WORDS` — prompt không biết giới hạn

**File:** `app/api/facebook-comment/generate/route.ts`  
**Test:** ❌ Không có test (hàm private)  
**Mức độ:** 🟢 LOW

Word limit 500 được check trước khi gọi `buildPrompt`, nhưng prompt không thông báo cho AI về độ dài post. AI nhận post ngắn hay dài đều xử lý như nhau — không thay đổi behavior.

Không phải bug cứng, nhưng nếu muốn AI điều chỉnh comment length theo độ dài post, nên thêm vào prompt:
```ts
`- Post length: approximately ${wordCount} words. Adjust comment depth accordingly.`
```

---

### 4. Route hardcode `modelId: 'gemini-flash'` vào DB

**File:** `app/api/facebook-comment/generate/route.ts`  
**Test:** ❌ Không có test  
**Mức độ:** 🟢 LOW

```ts
const model = buildTinhGonModel('gemini-flash');
// ...
await prisma.facebookCommentBrand.create({
  data: {
    modelId: 'gemini-flash',  // ← hardcoded
```

Page `/facebook-comment` không có model picker (khác `/viet-tu-facebook-comment` có ModelPicker). Nếu sau này muốn cho user chọn model, cần thêm field vào schema và API.

---

### 5. `COMMENT_STYLES` chỉ có 6 styles — ít hơn `COMMENT_BRAND_STYLES` (9 styles)

**File:** `lib/facebook-comment/options.ts` vs `lib/viet-tu-facebook-comment/options.ts`  
**Test:** Implicit qua count tests  
**Mức độ:** 🟢 LOW (design gap, không phải bug)

Page `/facebook-comment` (6 styles) thiếu `curious`, `experience`, `tag_friend` so với `/viet-tu-facebook-comment` (9 styles). Đây là trang cũ nhưng nếu muốn parity, nên sync thêm 3 styles.

`generateSchema` trong route.ts cũng chỉ cho phép 6 style values — nếu client gửi `curious`, schema reject với lỗi 400.

---

### 6. `page.tsx` — `countWords` dùng `filter(Boolean)` nhưng `viet-tu-facebook-comment/page.tsx` không dùng

**File:** `app/facebook-comment/page.tsx` vs `app/viet-tu-facebook-comment/page.tsx`  
**Test:** ❌ Không có test (hàm local)  
**Mức độ:** 🟢 LOW

```ts
// facebook-comment/page.tsx — ĐÚNG
text.trim().split(/\s+/).filter(Boolean).length

// viet-tu-facebook-comment/page.tsx — thiếu filter
text.trim() ? text.trim().split(/\s+/).length : 0
```

Trường hợp edge: khi `text` = `"hello  world"` (nhiều space), không tạo ra item rỗng trong split nếu đã trim. Nhưng nếu `text` = `"  "` (chỉ space): `trim()` → `""`, rồi `"".split(/\s+/)` → `[""]` (length 1, không phải 0). Thiếu `filter(Boolean)` gây đếm thừa 1 từ khi text rỗng.

**Fix trong `viet-tu-facebook-comment/page.tsx`:**
```ts
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
```

---

## Tóm tắt mức độ ưu tiên

| # | Issue | Mức độ | File |
|---|-------|--------|------|
| 1 | `FACEBOOK_COMMENT_EMOJIS` có duplicate cross-group | 🟡 MEDIUM | `options.ts` |
| 2 | `STYLE_INSTRUCTIONS` viết tiếng Việt không dấu trong prompt tiếng Anh | 🟡 MEDIUM | `generate/route.ts` |
| 3 | Prompt không inject word limit context | 🟢 LOW | `generate/route.ts` |
| 4 | `modelId` hardcode trong DB record | 🟢 LOW | `generate/route.ts` |
| 5 | 6 styles (cũ) ít hơn 9 styles (mới) — không parity | 🟢 LOW | `options.ts` |
| 6 | `wordCount` không nhất quán giữa 2 pages | 🟢 LOW | `page.tsx` |
