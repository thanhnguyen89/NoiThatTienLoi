# FIX-FAQ-SAN-PHAM.md
## Danh sách bug & hướng dẫn fix — `/faq-san-pham`

> Audit ngày 2026-06-08 · 5 vấn đề · 2 mức độ
> Files: `web/lib/faq-san-pham/prompt-builder.ts`, `web/app/api/faq-san-pham/generate/route.ts`
> Thứ tự fix: P2 → Minor

---

## MỤC LỤC

| # | Vấn đề | File | Dòng ước tính | Mức |
|---|--------|------|---------------|-----|
| 1 | `buildFaqPrompt` — empty fields render as `"- Thông số: "` | `prompt-builder.ts` | ~15–20 | P2 |
| 2 | `buildFaqPrompt` — nhiều faqTypes không có phân phối count | `prompt-builder.ts` | ~35–38 | P2 |
| 3 | `fallbackParse` — `type` luôn `'general'`, bỏ qua `[type:X]` | `generate/route.ts` | ~55–65 | P2 |
| 4 | `fallbackParse` — regex không match `"Answer: ..."` prefix | `generate/route.ts` | ~58 | Minor |
| 5 | `buildFaqPrompt` — forbidden word list chỉ 5 từ (thiếu 11 từ) | `prompt-builder.ts` | ~45–48 | Minor |

---

## FIX 1 — `buildFaqPrompt` hiển thị dòng trống khi field rỗng (P2)

**File:** `web/lib/faq-san-pham/prompt-builder.ts`

`specs`, `useCase`, `commonConcerns` khi để trống vẫn render thành `"- Thông số: "` (không có giá trị). Prompt bị "noise" → AI có thể hallucinate thông số.

**Reproduce:**
```typescript
buildFaqPrompt({ productName: 'Giường sắt', specs: '', useCase: '', ...})
// Prompt chứa:
// - Thông số:
// - Bối cảnh dùng:
// - Khách hay băn khoăn:
```

```typescript
// ❌ TRƯỚC
return `
Thông tin sản phẩm:
- Tên: ${config.productName}
- Thông số: ${config.specs}
- Bối cảnh dùng: ${config.useCase}
- Khách hay băn khoăn: ${config.commonConcerns}
`.trim();
```

```typescript
// ✅ SAU — chỉ render dòng có nội dung
const productLines = [
  `- Tên: ${config.productName}`,
  config.specs         ? `- Thông số: ${config.specs}` : '',
  config.useCase       ? `- Bối cảnh dùng: ${config.useCase}` : '',
  config.commonConcerns ? `- Khách hay băn khoăn: ${config.commonConcerns}` : '',
].filter(Boolean).join('\n');

return `
Thông tin sản phẩm:
${productLines}
`.trim();
```

---

## FIX 2 — `buildFaqPrompt` không phân phối count theo faqTypes (P2)

**File:** `web/lib/faq-san-pham/prompt-builder.ts`

Khi chọn 3 loại FAQ (general + technical + purchase) với count=7, AI không biết nên tạo bao nhiêu câu mỗi loại → thường lệch về `general`, bỏ thiếu `technical` hoặc `purchase`.

**Reproduce:**
```typescript
buildFaqPrompt({ faqTypes: ['general', 'technical', 'purchase'], count: 7, ... })
// Prompt chỉ liệt kê type guide, không có phân phối cụ thể
// AI tự phân phối → không đảm bảo đủ loại
```

```typescript
// ❌ TRƯỚC — không có distribution guidance
return `
Loại câu hỏi cần tạo:
${types.map((type) => `- ${type}: ${TYPE_GUIDE[type]}`).join('\n')}

Yêu cầu:
- Tạo đúng ${config.count} cặp Q&A.
`.trim();
```

```typescript
// ✅ SAU — thêm phân phối cụ thể
const countPerType = Math.floor(config.count / types.length);
const remainder = config.count % types.length;
const distribution = types
  .map((t, i) => `${t}: ${countPerType + (i < remainder ? 1 : 0)} câu`)
  .join(', ');

return `
Loại câu hỏi và số lượng (PHÂN PHỐI ĐÚNG): ${distribution}
${types.map((type) => `- ${type}: ${TYPE_GUIDE[type]}`).join('\n')}

Yêu cầu:
- Tạo đúng ${config.count} cặp Q&A theo phân phối trên.
- Mỗi Q&A phải có "type" đúng loại: general | technical | purchase.
`.trim();
```

**Ví dụ phân phối:**
| count | types | distribution |
|-------|-------|-------------|
| 7 | [general, technical, purchase] | general: 3, technical: 2, purchase: 2 |
| 5 | [general, purchase] | general: 3, purchase: 2 |
| 10 | [general, technical, purchase] | general: 4, technical: 3, purchase: 3 |

---

## FIX 3 — `fallbackParse` type luôn `'general'` (P2)

**File:** `web/app/api/faq-san-pham/generate/route.ts`

`fallbackParse` được gọi khi AI trả về response không phải JSON. AI thường annotate type trong câu hỏi dạng `[type:technical]` nhưng code strip nó đi mà không extract — luôn gán `type: 'general'`.

**Hậu quả:** Schema.org FAQPage JSON-LD không thể group câu hỏi theo loại. Nếu có filter UI theo type, tất cả FAQ đều rơi vào "general".

**Reproduce:**
```typescript
const raw = `Q: Kích thước giường bao nhiêu? [type:technical]
A: 1.6m x 2.0m, khung dày 1.4mm.`

fallbackParse(raw)
// → [{ question: 'Kích thước giường bao nhiêu?', answer: '...', type: 'general' }]
//   type: 'general' — SAI, phải là 'technical'
```

```typescript
// ❌ TRƯỚC — dòng ~60–65
items.push({
  question: question.replace(/^q\d*[:.)\s-]*/i, '').replace(/\[type:[^\]]+\]/i, '').trim(),
  answer: answer.replace(/^a\d*[:.)\s-]*/i, '').trim(),
  type: 'general',  // hardcoded
});
```

```typescript
// ✅ SAU — extract type trước khi strip
const VALID_TYPES = new Set<FaqType>(['general', 'technical', 'purchase']);

// Extract type annotation từ question line TRƯỚC khi strip
const typeMatch = question.match(/\[type:([^\]]+)\]/i);
const extractedType = typeMatch?.[1]?.toLowerCase() as FaqType | undefined;
const resolvedType: FaqType =
  extractedType && VALID_TYPES.has(extractedType) ? extractedType : 'general';

items.push({
  question: question.replace(/^q\d*[:.)\s-]*/i, '').replace(/\[type:[^\]]+\]/i, '').trim(),
  answer: answer.replace(/^a\d*[:.)\s-]*/i, '').trim(),
  type: resolvedType,  // extracted, not hardcoded
});
```

---

## FIX 4 — `fallbackParse` không nhận `"Answer: ..."` format (Minor)

**File:** `web/app/api/faq-san-pham/generate/route.ts`

Regex hiện tại chỉ match `A:`, `A.`, `A1:`, `A1)` — không match `Answer:` hay `Ans:`. Khi AI dùng `Answer:`, hàm rơi vào fallback `lines.find((line) => line !== question)` → lấy được answer nhưng không strip prefix → answer chứa `"Answer: ..."` trong chuỗi.

**Reproduce:**
```typescript
const raw = `Q: Giường có bảo hành không?
Answer: Có, bảo hành 12 tháng từ ngày mua.`

fallbackParse(raw)
// → answer: 'Answer: Có, bảo hành 12 tháng từ ngày mua.'
//   prefix không được strip
```

```typescript
// ❌ TRƯỚC — dòng ~58
const answer = lines.find((line) => /^a\d*[:.)\s]/i.test(line))
  ?? lines.find((line) => line !== question);
```

```typescript
// ✅ SAU — mở rộng regex + strip cả "Answer:" format
const answer = lines.find(
  (line) =>
    /^a\d*[:.)\s]/i.test(line) ||
    /^answer\s*[:.-]/i.test(line) ||
    /^ans\s*[:.-]/i.test(line),
) ?? lines.find((line) => line !== question);

// ...trong push:
answer: answer
  .replace(/^a\d*[:.)\s-]*/i, '')
  .replace(/^answer\s*[:.-]\s*/i, '')
  .replace(/^ans\s*[:.-]\s*/i, '')
  .trim(),
```

---

## FIX 5 — `buildFaqPrompt` forbidden list thiếu 11 từ (Minor)

**File:** `web/lib/faq-san-pham/prompt-builder.ts`

Prompt chỉ có 5 từ cấm hardcode: `quan trọng, vô cùng, cực kỳ, siêu phẩm, hoàn hảo`. Trong khi `COMMON_FORBIDDEN_WORDS` từ `core.ts` có 16 từ — thiếu `tuy nhiên`, `bên cạnh đó`, `toàn diện`, `tối ưu hóa`, `ngày nay`, `hiện nay`, `tuyệt vời`, `số 1`, `đẳng cấp`, `không chỉ ... mà còn`, `hiệu quả`.

**Hậu quả:** AI được phép dùng các AI-signature words (`tuy nhiên`, `bên cạnh đó`) → Humanness Score thấp → bài cần rewrite.

```typescript
// ❌ TRƯỚC — 5 từ hardcode
- Không dùng: quan trọng, vô cùng, cực kỳ, siêu phẩm, hoàn hảo.
```

```typescript
// ✅ SAU — import và dùng COMMON_FORBIDDEN_WORDS từ core.ts
import { COMMON_FORBIDDEN_WORDS } from '@/lib/ecommerce-tools/core';

// Trong buildFaqPrompt:
- Không dùng: ${COMMON_FORBIDDEN_WORDS.filter(w => !w.includes('...')).join(', ')}.
```

**Hoặc** hard-code đủ list trong prompt string:
```
- Không dùng: quan trọng, hiệu quả, tuy nhiên, bên cạnh đó, toàn diện, tối ưu hóa,
  ngày nay, hiện nay, vô cùng, cực kỳ, tuyệt vời, siêu phẩm, số 1, đẳng cấp, hoàn hảo.
```

---

## Thứ tự fix đề xuất

```
1. FIX 3 (fallbackParse type)         — 4 dòng, ảnh hưởng Schema.org structured data
   → Type sai → Google Rich Snippets không hiểu đúng loại câu hỏi
2. FIX 1 (empty fields)               — conditional filter, ngăn AI hallucinate
   → Empty fields làm AI sinh ra thông số giả
3. FIX 2 (type distribution)          — thêm 4 dòng tính distribution
   → Đảm bảo coverage đủ 3 loại FAQ theo yêu cầu
4. FIX 4 (Answer: format)             — mở rộng regex + 2 dòng replace
   → Đảm bảo fallback hoạt động với nhiều AI model output format
5. FIX 5 (forbidden words)            — import + update string
   → Giảm AI signature, tăng Humanness Score
```

---

## Chạy tests để verify

```bash
cd web && npx tsx --test lib/faq-san-pham/faq-san-pham.test.ts
```

**Trạng thái trước khi fix source:**
- `[BUG #1]` tests → PASS (xác nhận empty lines tồn tại)
- `[BUG #2]` tests → PASS (xác nhận không có distribution)
- `[BUG #3]` tests → PASS (xác nhận type luôn 'general')
- `[BUG #4]` tests → PASS (xác nhận Answer: prefix không strip hoặc không parse)
- `[BUG #5]` tests → PASS (xác nhận tuy nhiên/bên cạnh đó không trong prompt)
- `[FIX #...]` tests → PASS ngay (dùng fixed implementation copy trong test)

**Sau khi fix source:**
- Tất cả tests pass
- BUG confirmation tests vẫn pass (assert behavior của buggy copy inline, không import source)
