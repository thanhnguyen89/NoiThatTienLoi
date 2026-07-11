# Bug Report — /viet-tinh-gon

> Dựa theo unit test coverage tại `text.test.ts` và `schema.test.ts`.  
> Ngày: 2026-06-06

---

## Chạy test

```bash
cd web
node --require tsx/esm --test lib/tinh-gon/text.test.ts lib/tinh-gon/schema.test.ts
```

---

## Danh sách edge case cần kiểm tra

### 1. `slugify` — truncate 80 chars với tiếng Việt

**File:** `lib/tinh-gon/text.ts`  
**Test:** `slugify truncates to 80 chars`

Khi input có dấu tiếng Việt, `stripVietnamese` expand NFD trước khi slice, dẫn đến kết quả có thể bị cắt giữa chừng hoặc vượt 80 ký tự.

**Reproduce:**
```ts
slugify('a'.repeat(100)) // phải <= 80 chars
```

---

### 2. `sanitizeHtmlArticle` — không thêm `<h1>` khi HTML đã có `<h1>`

**File:** `lib/tinh-gon/text.ts`  
**Test:** `sanitizeHtmlArticle adds fallback h1 when html has no h1`

Nếu AI trả về HTML thiếu `<h1>`, bài viết sẽ bị mất tiêu đề H1 — ảnh hưởng SEO và Humanness Score.

**Reproduce:**
```ts
sanitizeHtmlArticle('<p>Chỉ có paragraph, không có h1.</p>', 'Fallback Title')
// Phải chứa: <h1>Fallback Title</h1>
```

---

### 3. `computeKeywordDensity` — keyword có ký tự đặc biệt gây lỗi regex

**File:** `lib/tinh-gon/text.ts`  
**Test:** `escapeRegExp escapes special regex characters`

Nếu keyword chứa ký tự như `.`, `*`, `(`, `)` mà không được escape, `new RegExp(keyword)` sẽ throw hoặc match sai.

**Reproduce:**
```ts
computeKeywordDensity('<p>Giường 1.2m giá rẻ</p>', 'giường 1.2m')
// Phải trả về số > 0, không throw
```

---

### 4. `tinhGonConfigSchema` — keyword chỉ có khoảng trắng vượt qua validation

**File:** `lib/tinh-gon/schema.ts`  
**Test:** `tinhGonConfigSchema rejects empty keyword`

Zod dùng `.trim().min(3)` — keyword `'   '` (3 spaces) sẽ bị reject sau trim. Tuy nhiên cần xác nhận page.tsx cũng trim trước khi gọi API:

```ts
// page.tsx handleNext()
const keyword = config.keyword.trim() // ✅ đã trim
if (!keyword) { setError('Vui lòng nhập từ khóa'); return; }
if (keyword.length < 3) { setError('Từ khóa quá ngắn'); return; }
```

Client-side check khớp với schema — **không có bug**, chỉ cần đảm bảo không bỏ `.trim()`.

---

### 5. `streamRequestSchema` — runId ngắn hơn 4 chars bị reject

**File:** `lib/tinh-gon/schema.ts`  
**Test:** `streamRequestSchema rejects runId shorter than 4 chars`

`createTinhGonRunId` tạo runId dạng `${slug}-${Date.now()}` — nếu keyword chỉ 3 ký tự, slug có thể bị rút gọn xuống 1–2 ký tự khiến runId không pass validation.

**Reproduce:**
```ts
createTinhGonRunId('abc') // slug = 'abc', runId = 'abc-1234567890' ✅
createTinhGonRunId('a b') // slug có thể = 'a-b', runId = 'a-b-...' ✅
createTinhGonRunId('  ')  // slug = '', runId = 'tinh-gon-...' ✅ (fallback đã có)
```

Fallback `'tinh-gon'` đã xử lý case rỗng — **không có bug**.

---

### 6. `buildMetaDescription` — chuỗi dài bị cắt giữa từ tiếng Việt

**File:** `lib/tinh-gon/text.ts`  
**Test:** `buildMetaDescription truncates long description with ellipsis`

`slice(0, 157)` có thể cắt giữa ký tự Unicode multi-byte hoặc giữa từ tiếng Việt có dấu.

**Reproduce:**
```ts
buildMetaDescription('a'.repeat(200), 'keyword')
// Phải kết thúc bằng '...' và length <= 160
```

---

## Tóm tắt mức độ ưu tiên

| # | Issue | Mức độ | File |
|---|-------|--------|------|
| 3 | Keyword đặc biệt gây lỗi regex | 🔴 HIGH | `text.ts` |
| 1 | slugify truncate với tiếng Việt | 🟡 MEDIUM | `text.ts` |
| 2 | Thiếu `<h1>` fallback | 🟡 MEDIUM | `text.ts` |
| 6 | Meta description cắt giữa từ | 🟢 LOW | `text.ts` |
| 4 | Keyword khoảng trắng | ✅ OK | `schema.ts` + `page.tsx` |
| 5 | runId quá ngắn | ✅ OK | `persistence.ts` |
