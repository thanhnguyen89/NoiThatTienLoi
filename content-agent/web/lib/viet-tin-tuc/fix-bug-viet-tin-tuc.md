# Fix Bug — /viet-tin-tuc

> Dựa theo unit test coverage tại `types.test.ts` và `options.test.ts`.  
> Ngày: 2026-06-06

---

## Chạy test

```bash
cd web
node --require tsx/esm --test lib/viet-tin-tuc/types.test.ts lib/viet-tin-tuc/options.test.ts
```

---

## Danh sách bug và edge case

### 1. `normalizeNewsConfig` — KHÔNG trim keyword

**File:** `lib/viet-tin-tuc/types.ts`  
**Test:** `normalizeNewsConfig does NOT trim keyword itself`  
**Mức độ:** 🔴 HIGH

`normalizeNewsConfig` nhận keyword nguyên gốc (kể cả khoảng trắng đầu/cuối). Việc trim được thực hiện trong `page.tsx` `handleNext()`:

```ts
const keyword = config.keyword.trim()  // ✅ page.tsx trim trước khi gửi API
```

Nếu `normalizeNewsConfig` được gọi từ chỗ khác mà không trim trước, keyword sẽ có khoảng trắng → Google News RSS URL sai → fetch trả về 0 kết quả.

**Fix:** Nên thêm trim trực tiếp vào `normalizeNewsConfig`:

```ts
keyword: (input.keyword ?? '').trim(),
```

---

### 2. `normalizeNewsConfig` — secondaryKeywords không phải array không bị catch

**File:** `lib/viet-tin-tuc/types.ts`  
**Test:** `normalizeNewsConfig returns empty array when secondaryKeywords is not an array`  
**Mức độ:** 🟡 MEDIUM

Khi `input.secondaryKeywords` là string hoặc null (dữ liệu từ sessionStorage bị corrupt), code hiện tại:

```ts
secondaryKeywords: Array.isArray(input.secondaryKeywords)
  ? input.secondaryKeywords.map((item) => item.trim()).filter(Boolean)
  : [],
```

Logic đúng, nhưng nếu một item trong mảng là `null` hoặc `undefined`, `.trim()` sẽ throw.

**Reproduce:**
```ts
normalizeNewsConfig({ secondaryKeywords: [null, 'giá rẻ'] as unknown as string[] })
// TypeError: Cannot read properties of null (reading 'trim')
```

**Fix:**
```ts
secondaryKeywords: Array.isArray(input.secondaryKeywords)
  ? input.secondaryKeywords
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  : [],
```

---

### 3. `decodeEntities` — không export, không thể unit test

**File:** `app/api/viet-tin-tuc/start/route.ts`  
**Test:** ❌ Không có test (hàm private)  
**Mức độ:** 🟡 MEDIUM

Hàm `decodeEntities` xử lý XML entities từ Google RSS (`&amp;`, `&quot;`, `&#39;`, CDATA). Không có test nên nếu Google thay đổi format XML, bug sẽ không được phát hiện sớm.

**Reproduce thủ công:**
```
Title từ RSS: "Giường sắt &amp; tủ quần áo &#39;giá rẻ&#39;"
Expected: "Giường sắt & tủ quần áo 'giá rẻ'"
```

**Fix:** Export `decodeEntities` sang `lib/viet-tin-tuc/rss.ts` để có thể test.

---

### 4. `fetchGoogleNews` — timeout 8s có thể quá ngắn trên server cold start

**File:** `app/api/viet-tin-tuc/start/route.ts`  
**Test:** ❌ Không có test (external call)  
**Mức độ:** 🟡 MEDIUM

```ts
signal: AbortSignal.timeout(8000)
```

Khi Vercel/server cold start, 8 giây có thể không đủ → `warning` được set → AI viết bài không có nguồn tin thực.

**Fix:** Tăng lên 10–12s hoặc để configurable qua env var.

---

### 5. `NEWS_LANGUAGE_MAP` — ngôn ngữ không khớp trả về `DEFAULT_NEWS_LANG` thay vì throw

**File:** `lib/viet-tin-tuc/options.ts`  
**Test:** `NEWS_LANGUAGE_MAP returns undefined for unknown language (no crash)`  
**Mức độ:** 🟢 LOW

Behavior đúng nhưng cần đảm bảo pattern `??` fallback luôn được dùng:

```ts
// route.ts — ✅ đúng
const langMap = NEWS_LANGUAGE_MAP[language] ?? DEFAULT_NEWS_LANG;
```

Nếu ai refactor bỏ `?? DEFAULT_NEWS_LANG`, URL fetch sẽ `undefined` → crash.

---

### 6. `NEWS_LENGTHS` — targetLength 400 và 800 không được validate ở server

**File:** `app/api/viet-tin-tuc/start/route.ts`  
**Test:** Implicit qua `options.test.ts`  
**Mức độ:** 🟢 LOW

Schema `startSchema` không validate range cho `targetLength`:

```ts
targetLength: z.number().default(600),  // ❌ không có min/max
```

Nếu client gửi `targetLength: 9999`, server sẽ chấp nhận và AI viết bài quá dài.

**Fix:**
```ts
targetLength: z.number().int().min(400).max(800).default(600),
```

---

## Tóm tắt mức độ ưu tiên

| # | Issue | Mức độ | File |
|---|-------|--------|------|
| 1 | `normalizeNewsConfig` không trim keyword | 🔴 HIGH | `types.ts` |
| 2 | secondaryKeywords item null gây TypeError | 🟡 MEDIUM | `types.ts` |
| 3 | `decodeEntities` không có test coverage | 🟡 MEDIUM | `start/route.ts` |
| 4 | fetch timeout 8s quá ngắn | 🟡 MEDIUM | `start/route.ts` |
| 5 | Language map fallback phụ thuộc `??` | 🟢 LOW | `options.ts` |
| 6 | `targetLength` không validate range ở server | 🟢 LOW | `start/route.ts` |
