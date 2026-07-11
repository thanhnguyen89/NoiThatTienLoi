# IMPLEMENTATION-GUIDE-STANDARD.md
## Bộ quy tắc viết tài liệu hướng dẫn code

> Tất cả file `*-IMPLEMENTATION.md` đều phải theo đúng chuẩn này.  
> Đây là nguồn sự thật duy nhất — không được sáng tạo cấu trúc riêng.

---

## 1. Đặt tên file

```
[TEN-TINH-NANG]-IMPLEMENTATION.md
```

Ví dụ:
- `VIET-TIN-TUC-IMPLEMENTATION.md`
- `FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md`
- `VIET-LAI-URL-IMPLEMENTATION.md`

**Quy tắc tên:**
- UPPERCASE toàn bộ
- Dùng dấu gạch ngang `-` thay khoảng trắng
- Luôn kết thúc bằng `-IMPLEMENTATION.md`
- Tên phải khớp route URL hoặc tên tính năng (không viết tắt mơ hồ)

---

## 2. Cấu trúc tài liệu — thứ tự bắt buộc

```
# [TEN-FILE].md
## Hướng dẫn code tính năng "[Tên tính năng]"

> Phân tích từ: [URL aiktp.com hoặc nguồn tham khảo]
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · [API]
> [Ghi chú thêm nếu cần — tab liên kết, phụ thuộc đặc biệt]

---

## ⚠️ Lỗi đã phát hiện / Điểm khác biệt cần chú ý   ← BẮT BUỘC, Section 0
## 1. Tổng quan kiến trúc                           ← BẮT BUỘC
## 2. Types                                          ← BẮT BUỘC nếu có file types.ts
## 3. Options / Constants                            ← BẮT BUỘC nếu có file options.ts
## 4. [Tên module đặc thù]                          ← Tùy tính năng (parser, crawler, prompt-builder...)
## 5. API Routes                                     ← BẮT BUỘC
## 6. Page Components                                ← BẮT BUỘC
## 7. Bugs & Gotchas                                 ← BẮT BUỘC (dù chỉ có 1 bug)
## 8. Checklist triển khai                           ← BẮT BUỘC
```

---

## 3. Section 0 — ⚠️ Lỗi / Điểm khác biệt

Luôn là section đầu tiên, ngay sau header. Có 2 dạng:

### Dạng A — Lỗi đã phát hiện (dùng khi đã có code thực tế để đối chiếu)
```markdown
## ⚠️ Lỗi đã phát hiện khi đối chiếu code thực tế

| # | Vị trí | Lỗi | Fix |
|---|--------|-----|-----|
| 1 | `stream/route.ts` | `sanitizeHtmlArticle(rawHtml)` — thiếu arg thứ 2 | `sanitizeHtmlArticle(rawHtml, config.keyword)` ✅ Fixed trong Section 5 |
```

### Dạng B — Điểm khác biệt & chú ý (dùng khi phân tích từ aiktp.com)
```markdown
## ⚠️ Điểm khác biệt & chú ý khi implement

| # | Điểm | Ghi chú |
|---|------|---------|
| 1 | **aiktp.com dùng WebSocket — ta dùng SSE** | ReadableStream + controller.enqueue() |
| 2 | **Không có DB record** | Pure stateless tool |
```

**Quy tắc:**
- Nếu có cả 2 loại → chia thành 2 bảng riêng trong cùng Section 0
- Không được bỏ qua Section 0 dù chỉ có 1 điểm ghi chú
- Câu Fix phải chỉ rõ section nào đã apply fix (Fixed trong Section 5)

---

## 4. Section 1 — Tổng quan kiến trúc

Bắt buộc có 4 phần con:

### 4.1 So sánh / Điểm khác biệt so với tính năng gần nhất
Bảng markdown 3 cột: `| Tiêu chí | Tính năng kia | Tính năng này |`

### 4.2 Flow hoạt động
Sơ đồ text (không dùng Mermaid) dạng arrow:
```
User nhập keyword
     ↓ click "Bắt đầu"
     POST /api/xxx/start
     → Validate
     → Tạo DB record
     ↓ SSE stream
     → AI generate
     → analyzeHumanness + DB update
     ↓ Editor + Publish
```

### 4.3 Cấu trúc file cần tạo
Code block dạng cây thư mục với comment inline:
```
web/
├── app/
│   ├── [route]/
│   │   ├── page.tsx            ← Config form (bước 1)
│   │   └── generate/
│   │       └── page.tsx        ← Generate + Editor
│   └── api/
│       └── [route]/
│           ├── start/
│           │   └── route.ts    ← Tạo Article record + pre-process
│           └── stream/
│               └── route.ts    ← SSE stream AI viết bài
└── lib/
    └── [route]/
        ├── types.ts
        └── options.ts
```

### 4.4 File tái sử dụng (KHÔNG tạo mới)
Danh sách markdown với → giải thích function/class cần dùng:
```markdown
- `lib/tinh-gon/humanness.ts` → `analyzeHumanness()`
- `lib/tinh-gon/text.ts` → `sanitizeHtmlArticle()`, `buildMetaDescription()`
- `lib/tinh-gon/model.ts` → `buildTinhGonModel(modelId)`
```

---

## 5. Section 2 — Types

Toàn bộ nội dung file `types.ts`, kèm comment inline cho các field không tự giải thích được:

```typescript
// web/lib/[feature]/types.ts

export type StyleType = 'funny' | 'friendly' | 'professional';

export interface FeatureConfig {
  keyword: string;
  style: StyleType;
  language: string;
  count: number;       // 1–50, mặc định 5
  model: string;       // từ ModelPicker
}
```

**Quy tắc:**
- Luôn ghi đường dẫn file ở dòng đầu tiên trong comment
- Union type → liệt kê hết tất cả giá trị, thêm comment nếu > 5 giá trị
- Không import type từ file khác nếu không cần thiết — re-declare inline cho dễ đọc
- Các SSE event type phải tách riêng và có comment rõ ràng

---

## 6. Section 3 — Options / Constants

Toàn bộ nội dung file `options.ts`:

```typescript
// web/lib/[feature]/options.ts

export const BATCH_SIZE = 10;
export const FREE_USER_MAX_WORDS = 500;

export const STYLE_OPTIONS: { value: StyleType; label: string }[] = [
  { value: 'funny', label: 'Hài hước' },
  ...
];
```

**Quy tắc:**
- Mọi magic number → đặt thành `const` có tên (không để inline `if (count > 10)`)
- Nếu reuse constant từ file khác → ghi rõ: `// reuse từ lib/facebook-comment/options.ts`
- Các map/record có nhiều entry → liệt kê hết, không viết tắt bằng `// ...`

---

## 7. Section trung gian — Module đặc thù

Dùng cho các module không phải types/options/route/page nhưng đủ phức tạp để tách section riêng. Ví dụ:
- `html-parser.ts` → **Section 4: HTML Parser**
- `crawler.ts` → **Section 4: URL Crawler**
- `prompt-builder.ts` → **Section 4: Prompt Builder**
- `parser.ts` → **Section 4: Output Parser**

Mỗi section trung gian cần:
1. Đường dẫn file đầy đủ
2. Function signatures đầy đủ với JSDoc comment
3. Ví dụ input/output nếu logic phức tạp
4. ⚠️ Flag rõ các edge case hoặc bug đã biết

---

## 8. Section API Routes

Mỗi route là 1 subsection:

```markdown
### `POST /api/[feature]/stream` — SSE stream viết bài
```

Mỗi subsection phải có:

**a) Request body** — interface TypeScript inline

**b) Response / SSE events** — liệt kê từng event type

**c) Code đầy đủ** — paste toàn bộ route handler, không rút gọn bằng `// ...`

**d) Chú thích quan trọng** — dạng `// ⚠️ Phải dùng X thay vì Y vì lý do Z`

### Pattern SSE bắt buộc (copy y chang):
```typescript
const stream = new ReadableStream({
  async start(controller) {
    const send = (data: object) => {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    try {
      // ... logic ...
      send({ type: 'done' });
    } catch (err) {
      send({ type: 'error', message: String(err) });
    } finally {
      controller.close();
    }
  },
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

### Auth pattern:
```typescript
// Nếu cần auth:
const { userId, error: authError } = await requireAuth(request);
if (authError) return authError;

// Nếu không cần auth (free tool):
// Không gọi requireAuth — chỉ validate input
```

---

## 9. Section Page Components

Chia theo page (config page, generate page):

```markdown
### `app/[feature]/page.tsx` — Config Form
### `app/[feature]/generate/page.tsx` — Generate + Editor
```

Mỗi page phải có:

**a) State variables** — dạng bảng hoặc interface:
```markdown
| State | Type | Mặc định | Ghi chú |
|-------|------|----------|---------|
| `keyword` | `string` | `''` | Validate min 3 ký tự |
| `loading` | `boolean` | `false` | Disable button khi true |
```

**b) sessionStorage keys** — bảng đầy đủ:
```markdown
| Key | Nội dung | Xóa khi nào |
|-----|----------|-------------|
| `vl_config` | `ArticleRewriteConfig` | Khi bắt đầu run mới |
| `vl_result` | HTML bài viết kết quả | Khi user rời page |
```

**c) Key UI components** — mô tả layout + interaction quan trọng

**d) SSE client handler** — paste đầy đủ đoạn `EventSource` hoặc `fetch + ReadableStream`:
```typescript
const res = await fetch('/api/[feature]/stream', { method: 'POST', body: JSON.stringify(payload) });
const reader = res.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    try {
      const event = JSON.parse(line.slice(6));
      // handle event
    } catch { /* skip */ }
  }
}
```

---

## 10. Section Bugs & Gotchas

Bảng tổng hợp tất cả bug đã biết + fix, kể cả bug đã xử lý trong các section trên:

| # | Bug | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | `sanitizeHtmlArticle` crash | Thiếu arg 2 | Truyền `config.keyword` |
| 2 | AI trả về markdown trong plain text | Model không follow instruction | `stripMarkdown()` trước khi enqueue |

**Quy tắc:**
- Không được bỏ qua section này ngay cả khi chưa phát hiện bug — ghi "Chưa phát hiện bug. Cần test với:" + danh sách edge case cần test
- Bug đã mention ở Section 0 → vẫn phải có trong Section 7 với fix đầy đủ
- Nếu fix là "TODO" → ghi rõ `🔴 Chưa fix — cần handle trước khi deploy`

---

## 11. Section Checklist triển khai

Dạng checkbox markdown:

```markdown
## 8. Checklist triển khai

### Files cần tạo mới
- [ ] `web/lib/[feature]/types.ts`
- [ ] `web/lib/[feature]/options.ts`
- [ ] `web/app/[feature]/page.tsx`
- [ ] `web/app/[feature]/generate/page.tsx`
- [ ] `web/app/api/[feature]/start/route.ts`
- [ ] `web/app/api/[feature]/stream/route.ts`

### Schema / Migration (nếu có)
- [ ] Thêm model `XxxRecord` vào `prisma/schema.prisma`
- [ ] Chạy `npx prisma migrate dev --name add-xxx`

### Tích hợp cần kiểm tra
- [ ] Sidebar.tsx — thêm link menu
- [ ] `lib/tinh-gon/humanness.ts` — import đúng function
- [ ] Test SSE với `curl -N -X POST ...`

### QA trước khi merge
- [ ] Test empty input → phải hiện error message
- [ ] Test input dài (> limit) → phải bị truncate hoặc báo lỗi
- [ ] Test network error giữa chừng → SSE phải send `{type:'error'}`
- [ ] Test DB save → article phải xuất hiện ở /dashboard/articles
```

---

## 12. Quy tắc code trong tài liệu

### ✅ Làm
- Paste code **đầy đủ** — không rút gọn bằng `// ...` ở phần logic quan trọng
- Ghi **đường dẫn file** ở dòng comment đầu tiên của mỗi block
- Dùng `// ⚠️` để flag điểm dễ sai
- Dùng `// ✅` để confirm fix đã apply
- Nếu code > 80 dòng → tách thành nhiều block với heading trung gian

### ❌ Không làm
- Không viết `// implementation details` thay cho code thật
- Không dùng `...` để bỏ qua logic giữa chừng (ngoại trừ JSX render không quan trọng)
- Không copy-paste bug từ aiktp.com vào guide mà không flag rõ
- Không để code block không có ngôn ngữ (luôn ghi ` ```typescript ` hoặc ` ```tsx `)

---

## 13. Quy ước đặt tên sessionStorage keys

| Feature | Prefix | Ví dụ key |
|---------|--------|-----------|
| viet-tinh-gon | `tg_` | `tg_config`, `tg_outline` |
| viet-tin-tuc | `nt_` | `nt_config`, `nt_runId` |
| viet-theo-nguon | `tng_` | `tng_config`, `tng_result` |
| viet-lai-bai-viet | `vl_` | `vl_config`, `vl_sections` |
| viet-lai-url | `vlu_` | `vlu_config`, `vlu_result` |
| facebook tools | *(không prefix)* | stateless — không dùng sessionStorage |
| viet-bai-thong-minh | `pipeline_` | `pipeline_runId`, `pipeline_step1` |
| viet-theo-tu-khoa | `ttk_` | `ttk_config`, `ttk_runId` |

**Quy tắc đặt prefix mới:** 2–3 ký tự viết thường + dấu gạch dưới, chưa được dùng bởi feature khác. Ghi vào bảng này khi tạo feature mới.

---

## 14. Quy ước AI model

Luôn dùng `buildTinhGonModel(modelId)` từ `lib/tinh-gon/model.ts`. Không khởi tạo GoogleGenerativeAI trực tiếp trong route.

```typescript
// ✅ Đúng
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
const model = buildTinhGonModel(config.model);

// ❌ Sai
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

---

## 15. Danh sách tài liệu hiện có

| File | Tính năng | Route |
|------|-----------|-------|
| `VIET-TINH-GON-IMPLEMENTATION.md` | Viết tinh gọn | `/viet-tinh-gon` |
| `VIET-TIN-TUC-IMPLEMENTATION.md` | Viết tin tức | `/viet-tin-tuc` |
| `VIET-THEO-NGUON-IMPLEMENTATION.md` | Viết theo nguồn | `/viet-theo-nguon` |
| `VIET-THEO-DAN-BAI-IMPLEMENTATION.md` | Viết theo dàn bài | `/viet-theo-dan-bai` |
| `VIET-TOPLIST-IMPLEMENTATION.md` | Viết top list | `/viet-toplist` |
| `VIET-DANH-GIA-SAN-PHAM-IMPLEMENTATION.md` | Đánh giá sản phẩm | `/viet-danh-gia-san-pham` |
| `AI-EDITOR-IMPLEMENTATION.md` | AI Editor | (component) |
| `VIET-LAI-IMPLEMENTATION.md` | Viết lại đoạn văn + bài viết | `/viet-lai-doan-van`, `/viet-lai-bai-viet` |
| `VIET-LAI-URL-IMPLEMENTATION.md` | Viết lại từ URL | `/viet-lai-url` |
| `FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md` | Tạo Facebook Comment | `/facebook-comment` |
| `FACEBOOK-POST-GENERATOR-IMPLEMENTATION.md` | Tạo Facebook Post | `/facebook-post` |
| `GOOGLE-SEARCH-DATA-IMPLEMENTATION.md` | Google Search Data | (lib) |

**Chưa có tài liệu:**
- `VIET-BAI-THONG-MINH-IMPLEMENTATION.md` → `/viet-bai-thong-minh` (4 steps)
- `VIET-LAI-TIN-TUC-IMPLEMENTATION.md` → `/viet-lai-tin-tuc`
- `VIET-HANG-LOAT-IMPLEMENTATION.md` → `/viet-hang-loat`
- `VIET-THEO-TU-KHOA-IMPLEMENTATION.md` → `/viet-theo-tu-khoa`
- `VIET-TU-FACEBOOK-IMPLEMENTATION.md` → `/viet-tu-facebook`
