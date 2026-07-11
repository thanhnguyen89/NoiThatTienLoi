# ECOMMERCE-DANH-GIA-SAN-PHAM-IMPLEMENTATION.md
## Hướng dẫn code — Đánh Giá Sản Phẩm Nhanh (ECOMMERCE Tools)

> Chuẩn: `DEV-PAGE-ROUTING-NOTE.md` — **Nhóm B** (Stateless, không lưu DB)  
> Route: `/danh-gia-san-pham-nhanh`  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Gemini API  
> Đọc cùng: `ECOMMERCE-TAO-TIEU-DE-SAN-PHAM-IMPLEMENTATION.md`

---

## 0. Vị trí trong ECOMMERCE Tools Family

| # | Tool | Route | Output | Spec |
|---|------|-------|--------|------|
| 1 | Tạo Tiêu Đề SP | `/tao-tieu-de-san-pham` | 5 Meta Title + 1 Meta Desc | ✅ |
| 2 | Tạo Tên Sản Phẩm | `/tao-ten-san-pham` | 10 tên SP + lý do | ✅ |
| 3 | Giới Thiệu Sản Phẩm | `/gioi-thieu-san-pham` | Mô tả 150–300 từ | ✅ |
| 4 | **Đánh Giá Sản Phẩm** | `/danh-gia-san-pham-nhanh` | Review 300–500 từ | **File này** |
| 5 | FAQ Sản Phẩm | `/faq-san-pham` | 5–10 Q&A pairs | ✅ |

---

## 1. Mục đích

Tạo bài **đánh giá sản phẩm (product review)** theo góc nhìn người dùng thật — không phải quảng cáo. Output 300–500 từ gồm: nhận xét ưu điểm + nhược điểm thật sự + kết luận có nên mua không.

**Dùng khi:**
- Viết bài review cho blog / landing page
- Tạo nội dung section "Đánh giá khách hàng" trên website
- Làm content cho video review

**Route name lý do có suffix `-nhanh`:**  
Phân biệt với `/viet-danh-gia-san-pham` (Nhóm A — bài viết đầy đủ với editor, lưu DB, publish WP).  
Tool này là Nhóm B — nhanh, stateless, không cần editor.

---

## 2. So sánh aiktp vs Local

| # | Điểm | aiktp | Local |
|---|------|-------|-------|
| 1 | Transport | WebSocket | **SSE** (streaming) |
| 2 | Output | Review text | **Review text + structured ưu/nhược điểm** |
| 3 | Review persona | Không | **3 persona: Người mua thật / Blogger / Chuyên gia** |
| 4 | Rating | Không | **Sao 1–5 + lý do cho từng mục** |
| 5 | Pros/Cons | Không | **Có section Ưu điểm / Nhược điểm tách biệt** |
| 6 | Verdict | Không | **Có câu kết luận rõ ràng: "Nên mua nếu..."** |
| 7 | GET từ URL | Không | **Có** |
| 8 | Lưu DB | Không | **Không** (stateless) |

---

## 3. Kiến trúc

### Cấu trúc file

```
web/
├── app/
│   ├── danh-gia-san-pham-nhanh/
│   │   └── page.tsx
│   └── api/
│       └── danh-gia-san-pham-nhanh/
│           ├── stream/
│           │   └── route.ts
│           └── fetch-url/
│               └── route.ts
└── lib/
    └── danh-gia-san-pham-nhanh/
        ├── types.ts
        ├── options.ts
        └── prompt-builder.ts
```

---

## 4. Types — `web/lib/danh-gia-san-pham-nhanh/types.ts`

```typescript
export type ReviewPersona =
  | 'real_user'   // Người mua thật — góc nhìn thực tế, cảm xúc
  | 'blogger'     // Blogger review — có cấu trúc, đánh số, dễ đọc
  | 'expert';     // Chuyên gia nội thất — kỹ thuật, so sánh đối thủ

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface ProductReviewConfig {
  productName:    string;
  specs:          string;   // Thông số kỹ thuật
  pros:           string;   // Ưu điểm người dùng cung cấp (optional)
  cons:           string;   // Nhược điểm người dùng cung cấp (optional)
  useCase:        string;   // Trường hợp dùng: "phòng 12m2", "gia đình 4 người"
  persona:        ReviewPersona;
  overallRating:  ReviewRating;   // 1–5 sao — AI sẽ review tương ứng mức này
  language:       string;
  modelId:        string;
  brandName:      string;
  forbidden:      string;
}

// Review output có cấu trúc
export interface ReviewOutput {
  intro:       string;   // Mở bài (1–2 câu)
  prosSection: string;   // Section ưu điểm
  consSection: string;   // Section nhược điểm
  verdict:     string;   // Kết luận: nên mua nếu...
  fullText:    string;   // Toàn bộ text (streaming append)
}

// SSE events
export type ReviewSSEEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done';  wordCount: number }
  | { type: 'error'; message: string };
```

---

## 5. Options — `web/lib/danh-gia-san-pham-nhanh/options.ts`

```typescript
import type { ReviewPersona, ReviewRating } from './types';

export const REVIEW_PERSONAS: Array<{
  value: ReviewPersona;
  label: string;
  emoji: string;
  note:  string;
}> = [
  {
    value: 'real_user',
    label: 'Người mua thật',
    emoji: '👤',
    note:  'Góc nhìn thực tế, cảm xúc, ngôn ngữ bình thường',
  },
  {
    value: 'blogger',
    label: 'Blogger review',
    emoji: '✍️',
    note:  'Có cấu trúc rõ, đánh số, phù hợp đăng blog',
  },
  {
    value: 'expert',
    label: 'Chuyên gia nội thất',
    emoji: '🔧',
    note:  'Phân tích kỹ thuật, so sánh thị trường',
  },
];

export const RATING_OPTIONS: ReviewRating[] = [1, 2, 3, 4, 5];

export const RATING_LABELS: Record<ReviewRating, string> = {
  1: 'Kém — nhiều vấn đề nghiêm trọng',
  2: 'Dưới trung bình — không khuyến khích',
  3: 'Trung bình — ổn với giá tiền',
  4: 'Tốt — đáng mua',
  5: 'Xuất sắc — tốt hơn kỳ vọng',
};

// Word count target
export const REVIEW_TARGET_WORDS = 400;
export const REVIEW_MIN_WORDS    = 300;
export const REVIEW_MAX_WORDS    = 500;
```

---

## 6. Prompt Builder — `web/lib/danh-gia-san-pham-nhanh/prompt-builder.ts`

```typescript
import type { ProductReviewConfig } from './types';
import { REVIEW_TARGET_WORDS, RATING_LABELS } from './options';

const PERSONA_GUIDE: Record<string, string> = {
  real_user:
    'Viết như người mua thật — dùng "tôi", "mình", ngôn ngữ bình thường, có trải nghiệm cụ thể. ' +
    'Ví dụ: "Mình dùng được 3 tháng, cái điểm tôi thích nhất là..."',
  blogger:
    'Viết như blogger review chuyên nghiệp — có heading rõ (Ưu điểm / Nhược điểm / Kết luận), ' +
    'đánh số, ngôn ngữ trung lập nhưng dễ đọc. Phù hợp publish blog.',
  expert:
    'Viết như chuyên gia nội thất — phân tích chất liệu, kết cấu, so sánh tiêu chuẩn ngành. ' +
    'Dùng thuật ngữ kỹ thuật phù hợp. Không quá cảm tính.',
};

const FORBIDDEN_WORDS = [
  'quan trọng', 'tuy nhiên', 'bên cạnh đó', 'toàn diện',
  'Trong cuộc sống hiện đại', 'Ngày nay', 'vô cùng', 'cực kỳ',
  'tuyệt vời', 'siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo',
  'không chỉ ... mà còn',
];

export function buildProductReviewPrompt(config: ProductReviewConfig): string {
  const personaGuide = PERSONA_GUIDE[config.persona] ?? PERSONA_GUIDE.real_user;
  const ratingLabel  = RATING_LABELS[config.overallRating];

  const prosBlock = config.pros
    ? `\nƯu điểm đã biết: ${config.pros}`
    : '';
  const consBlock = config.cons
    ? `\nNhược điểm đã biết: ${config.cons}`
    : '';
  const useCaseBlock = config.useCase
    ? `\nTrường hợp sử dụng: ${config.useCase}`
    : '';

  const brandBlock = config.brandName
    ? `\nThương hiệu: ${config.brandName}`
    : '';

  const allForbidden = [
    ...FORBIDDEN_WORDS,
    ...(config.forbidden ? config.forbidden.split(',').map((s) => s.trim()) : []),
  ].join(', ');

  return `
Viết bài đánh giá sản phẩm nội thất với mức đánh giá ${config.overallRating}/5 sao.

## Thông tin sản phẩm
- Tên: ${config.productName}
- Thông số: ${config.specs}${prosBlock}${consBlock}${useCaseBlock}${brandBlock}

## Đánh giá tổng: ${config.overallRating}/5 ⭐ — ${ratingLabel}

## Phong cách viết
${personaGuide}

## Ngôn ngữ: ${config.language}

## Cấu trúc bài review (~${REVIEW_TARGET_WORDS} từ):
1. Mở đầu: 1–2 câu giới thiệu ngắn (không phải "Sản phẩm này là...")
2. Ưu điểm: 3–5 điểm cụ thể, có ví dụ thực tế
3. Nhược điểm: 1–3 điểm thật sự (phải trung thực, không đánh bóng)
4. Kết luận: "Nên mua nếu..." / "Không nên mua nếu..." — rõ ràng, không mờ nhạt

## Quy tắc bắt buộc:
- KHÔNG dùng: ${allForbidden}
- Số liệu phải khớp thông số đã cho, không bịa thêm
- Nhược điểm phải thật — không được nói "chỉ có nhược điểm nhỏ là..."
- Nếu rating ≤ 3: nhược điểm phải nặng hơn ưu điểm
- Nếu rating ≥ 4: ưu điểm nổi bật hơn rõ rệt

Viết ngay, không giải thích thêm.
`.trim();
}
```

---

## 7. API Routes

### 7.1 Stream — `/api/danh-gia-san-pham-nhanh/stream/route.ts`

Cấu trúc **y hệt** `gioi-thieu-san-pham/stream/route.ts` — chỉ thay schema và prompt builder.

```typescript
const schema = z.object({
  productName:   z.string().min(1).max(200),
  specs:         z.string().max(1000).default(''),
  pros:          z.string().max(500).default(''),
  cons:          z.string().max(500).default(''),
  useCase:       z.string().max(200).default(''),
  persona:       z.enum(['real_user', 'blogger', 'expert']).default('real_user'),
  overallRating: z.number().int().min(1).max(5).default(4),
  language:      z.string().default('Vietnamese'),
  modelId:       z.string().default('gemini-flash'),
  brandName:     z.string().default(''),
  forbidden:     z.string().default(''),
});
// Phần stream logic tái dùng y hệt gioi-thieu-san-pham
```

### 7.2 Fetch URL — tái dùng pattern, trả về `{ productName, specs, pros, cons }`

AI extraction prompt:
```
Từ nội dung trang sản phẩm, trích xuất:
1. Tên sản phẩm
2. Thông số kỹ thuật chính
3. Ưu điểm đã đề cập
4. Nhược điểm đã đề cập (nếu có)
Trả về JSON: {"productName": "...", "specs": "...", "pros": "...", "cons": "..."}
```

---

## 8. Page — `web/app/danh-gia-san-pham-nhanh/page.tsx`

Layout: **2 cột** — trái (input), phải (output streaming text).

### Input (cột trái — `w-80`)

| Field | Component | Notes |
|-------|-----------|-------|
| URL fetch | input + GET button | — |
| Tên sản phẩm | `input` required | — |
| Thông số | `textarea` rows=3 | — |
| Ưu điểm (optional) | `textarea` rows=2 | Bỏ trống để AI tự tạo |
| Nhược điểm (optional) | `textarea` rows=2 | Bỏ trống để AI tự tạo |
| Trường hợp dùng | `input` | "phòng trọ 10m2", "có trẻ nhỏ" |
| Phong cách review | 3 radio cards | real_user / blogger / expert |
| Đánh giá tổng | **Star rating** 1–5 | Click sao — mặc định 4 sao |
| Ngôn ngữ | `select` | — |

### Star Rating Component

```tsx
function StarRating({
  value, onChange
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-transform hover:scale-110 ${
            star <= value ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-600">{RATING_LABELS[value as ReviewRating]}</span>
    </div>
  );
}
```

### Output (cột phải)

- Header: `[word count] từ` badge + `[Copy]` button
- Streaming text với `whitespace-pre-wrap`
- **Sau khi done:** hiện **"Verdict Box"** tách ra dưới — parse phần "Kết luận:" từ full text

**Verdict Box:**
```
┌──────────────────────────────────────────┐
│  Kết luận reviewer                       │
│  ⭐⭐⭐⭐ 4/5 — Đáng mua với giá tiền    │
│  "Nên mua nếu bạn cần giường bền, gấp   │
│   gọn, phù hợp phòng nhỏ dưới 10m2..."  │
└──────────────────────────────────────────┘
```

---

## 9. Thứ tự cài đặt

| Bước | File | Test |
|------|------|------|
| 1 | `lib/danh-gia-san-pham-nhanh/types.ts` | — |
| 2 | `lib/danh-gia-san-pham-nhanh/options.ts` | — |
| 3 | `lib/danh-gia-san-pham-nhanh/prompt-builder.ts` | Log prompt với rating 2 và rating 5 |
| 4 | `api/danh-gia-san-pham-nhanh/fetch-url/route.ts` | Postman |
| 5 | `api/danh-gia-san-pham-nhanh/stream/route.ts` | Postman |
| 6 | `app/danh-gia-san-pham-nhanh/page.tsx` | Test 3 persona × 2 rating cực đoan (2★, 5★) |

---

## 10. QA Checklist

### Input
- [ ] Star rating: click đúng sao, label cập nhật
- [ ] Pros/Cons: optional, bỏ trống được
- [ ] Persona: 3 cards, chọn đúng
- [ ] Button disabled khi không có productName

### Generate
- [ ] Text stream chunk-by-chunk
- [ ] Word count badge cập nhật khi done
- [ ] Rating 2★ → nhược điểm nặng hơn ưu điểm
- [ ] Rating 5★ → ưu điểm nổi bật rõ, nhược điểm nhỏ

### Verdict Box
- [ ] Hiện sau khi streaming xong
- [ ] Hiển thị đúng số sao
- [ ] Có câu "Nên mua nếu..." hoặc "Không nên mua nếu..."

### Nội dung
- [ ] Không dùng từ cấm
- [ ] Pros/Cons AI tự tạo khi để trống — không cùng ý nhau
- [ ] Blogger persona: có heading rõ ràng (≥ 3 heading)

---

## 11. Bugs thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Rating thấp nhưng review vẫn tích cực | AI "muốn làm hài lòng" | Prompt: "Nếu rating ≤ 3, bắt buộc có ≥ 2 nhược điểm nghiêm trọng. KHÔNG được giảm nhẹ." |
| Không có kết luận rõ | AI kết bằng câu chung chung | Prompt: "Câu kết PHẢI bắt đầu bằng 'Nên mua nếu...' hoặc 'Không nên mua nếu...'" |
| Verdict box không parse được | AI không dùng header "Kết luận" | Fallback: lấy đoạn cuối cùng của full text |
| Persona expert nhưng viết như blogger | AI không phân biệt rõ | Thêm ví dụ 1–2 câu đầu cho mỗi persona vào prompt |
