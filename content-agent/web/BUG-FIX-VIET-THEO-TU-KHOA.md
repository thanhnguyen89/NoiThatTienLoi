# Bug Fix — /viet-theo-tu-khoa

Phát hiện bằng unit test · Verified từ source code trực tiếp · 2026-06-03

---

## Tổng quan — tất cả đã fix ✅

| # | File | Vấn đề | Trạng thái |
|---|------|--------|-----------|
| #1 | `stream/route.ts:46` | `boldHeadings` double-wrap `<strong>` | ✅ Fixed |
| #2 | `outline/route.ts:39` | Thiếu `requireAuth()` | ✅ Fixed |
| #3 | `start/route.ts:127` | Silent duplicate khi draft không tìm thấy | ✅ Fixed |
| #4 | `generate/page.tsx:1208` | Density threshold `>=1.0` vs readiness `>=0.6` | ✅ Fixed |
| #5 | `page.tsx:751,754` | Submit button không disabled khi generate outline | ✅ Fixed |
| #6 | `generate/page.tsx:1402,1407,1448,1453` | Mojibake banner text | ✅ Fixed |

---

## Chi tiết từng bug

### BUG #1 — `boldHeadings` double-wrap `<strong>`

**File:** `app/api/viet-theo-tu-khoa/stream/route.ts` · **Dòng:** 46–53

Regex bọc h2/h3 bằng `<strong>` mà không kiểm tra content đã có `<strong>` chưa.

```ts
// ❌ Trước fix
'$1<strong>$2</strong>$3'

// ✅ Sau fix (code hiện tại)
(_, open, content, close) => {
  if (/<strong>/i.test(content)) return `${open}${content}${close}`;
  return `${open}<strong>${content}</strong>${close}`;
}
```

---

### BUG #2 — `outline` route thiếu `requireAuth()`

**File:** `app/api/viet-theo-tu-khoa/outline/route.ts` · **Dòng:** 39

`start` và `stream` đều có auth, `outline` thì không → ai cũng gọi được, tiêu quota AI.

```ts
// ✅ Sau fix (code hiện tại)
export async function POST(req: NextRequest) {
  try {
    await requireAuth(); // dòng 39
    ...
```

---

### BUG #3 — Silent duplicate article khi draft không tìm thấy

**File:** `app/api/viet-theo-tu-khoa/start/route.ts` · **Dòng:** 127

Khi `draftArticleId` gửi lên nhưng `findFirst` trả null (userId mismatch, đã xóa...), code rơi xuống `create()` tạo article mới mà không báo lỗi.

```ts
// ✅ Sau fix — if (!articleId) guard tại dòng 127
if (!articleId) {
  const article = await prisma.article.create({ ... });
  articleId = article.id;
}
```

---

### BUG #4 — Density threshold không khớp giữa `fixKeywordDensity` và `publishReadiness`

**File:** `app/viet-theo-tu-khoa/generate/page.tsx` · **Dòng:** 1208

`publishReadiness` pass khi density `>=0.6`, nhưng `fixKeywordDensity` chỉ bỏ qua khi `>=1.0` → density 0.7–0.99 hiện badge ✅ nhưng vẫn gọi AI fix.

```ts
// ❌ Trước fix
if (currentDensity >= 1 && currentDensity <= 1.5)

// ✅ Sau fix (code hiện tại, dòng 1208)
if (currentDensity >= 0.6 && currentDensity <= 1.5)
```

---

### BUG #5 — Submit button không disabled khi đang generate outline

**File:** `app/viet-theo-tu-khoa/page.tsx` · **Dòng:** 751, 754

Khi `outlineMode=ai_outline` và outline rỗng, click "Bắt đầu viết bài" → `handleGenerateOutline()` chạy (`isGeneratingOutline=true`) nhưng button chỉ check `isSubmitting` → user có thể click nhiều lần.

```tsx
// ❌ Trước fix
disabled={isSubmitting || keyword.trim().length < 3}
{isSubmitting ? 'Đang chuẩn bị...' : 'Bắt đầu viết bài'}

// ✅ Sau fix (code hiện tại)
disabled={isSubmitting || isGeneratingOutline || keyword.trim().length < 3}
{isSubmitting ? 'Đang chuẩn bị...' : isGeneratingOutline ? 'Đang tạo dàn ý...' : 'Bắt đầu viết bài'}
```

---

### BUG #6 — Mojibake banner text

**File:** `app/viet-theo-tu-khoa/generate/page.tsx` · **Dòng:** 1402, 1407, 1448, 1453

File bị save sai encoding khiến chuỗi tiếng Việt trong `fixTitleLengthWithAi()` và `fixSlugLengthWithAi()` bị hiển thị loạn.

```ts
// ❌ Trước fix
'ÄÃ£ chá»‰nh Ä'á»™ dÃ i tiÃªu Ä'á» SEO.'
'ÄÃ£ rÃºt gá»n slug chuáº©n SEO.'

// ✅ Sau fix (code hiện tại)
'Đã chỉnh độ dài tiêu đề SEO.'
'Đã rút gọn slug chuẩn SEO.'
```
