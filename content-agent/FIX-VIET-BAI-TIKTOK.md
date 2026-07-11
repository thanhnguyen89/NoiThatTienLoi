# FIX-VIET-BAI-TIKTOK.md
## Danh sách bug & hướng dẫn fix — `/viet-bai-tiktok`

> Audit ngày 2026-06-08 · 6 vấn đề · 3 mức độ
> Files: `web/lib/viet-bai-tiktok/prompt-builder.ts`, `web/lib/viet-bai-tiktok/parser.ts`, `web/app/api/viet-bai-tiktok/generate/route.ts`
>
> Lưu ý: File `fix-bug-viet-bai-tiktok.md` trong lib/ được viết 2026-06-06 và đề cập 6 bug.
> File này bổ sung thêm 2 bug mới phát hiện qua unit test audit.
> Thứ tự fix: P2 → Minor

---

## MỤC LỤC

| # | Vấn đề | File | Dòng ước tính | Mức |
|---|--------|------|---------------|-----|
| 1 | `buildBrandBlock` bỏ qua `brandPronouns`/`brandAudience`/`phone`/`address` khi check | `prompt-builder.ts` | 18–27 | P2 |
| 2 | `HASHTAG_CONTEXT` hardcode `#noithatminhquan` — không dùng `brand.shopName` | `prompt-builder.ts` | 45–73 | P2 |
| 3 | Caption word count 100–200 không validate sau parse — over/under count qua route | `generate/route.ts` | 68–82 | P2 |
| 4 | `normalizeTag` dùng `[^\p{L}\p{N}_]` — strip hyphen im lặng (`#noi-that` → `#noithat`) | `parser.ts` | 12–16 | Minor |
| 5 | Forbidden word list trong prompt thiếu từ + pattern truncated | `prompt-builder.ts` | 95–100 | Minor |
| 6 | `countWords` duplicate trong route.ts — không import từ `core.ts` | `generate/route.ts` | 46–48 | Minor |

---

## FIX 1 — `buildBrandBlock` bỏ qua brandPronouns/brandAudience/phone/address (P2)

**File:** `web/lib/viet-bai-tiktok/prompt-builder.ts`
**Dòng:** 18–27

**Vấn đề:** Condition `if (!brand.shopName && !brand.brandDesc && !brand.mainProducts && !brand.ctaStandard)` chỉ kiểm tra 4 fields. Nếu user điền `brandPronouns="shop"` và `brandAudience="anh chị"` mà không điền tên shop, brand block bị trả về `''`. Kết quả: prompt AI dùng xưng hô `mình/bạn` mặc định thay vì config của user.

**Reproduce:**
```typescript
const config = {
  brand: {
    shopName: '',           // empty
    brandPronouns: 'shop',  // set
    brandAudience: 'anh chị', // set
    brandDesc: '',
    mainProducts: '',
    ctaStandard: '',
  },
  // ...
};
const prompt = buildTiktokBrandPostPrompt(config);
// BUG: prompt contains '"mình" -> "bạn"' instead of '"shop" -> "anh chị"'
```

```typescript
// ❌ TRƯỚC — dòng 18–20
function buildBrandBlock(config: TiktokBrandPostConfig): string {
  const { brand } = config;
  if (!brand.shopName && !brand.brandDesc && !brand.mainProducts && !brand.ctaStandard) {
    return '';
  }
  // ...
}
```

```typescript
// ✅ SAU — thêm brandPronouns, brandAudience, phone, address vào check
function buildBrandBlock(config: TiktokBrandPostConfig): string {
  const { brand } = config;
  const hasAnyBrandInfo =
    brand.shopName ||
    brand.brandDesc ||
    brand.mainProducts ||
    brand.ctaStandard ||
    brand.brandPronouns ||
    brand.brandAudience ||
    brand.phone ||
    brand.address;
  if (!hasAnyBrandInfo) return '';
  // ... rest unchanged
}
```

**Tác động:** Mỗi khi user setup xưng hô riêng mà không điền tên shop, AI dùng giọng văn sai → content không đúng brand.

---

## FIX 2 — `HASHTAG_CONTEXT` hardcode `#noithatminhquan` (P2)

**File:** `web/lib/viet-bai-tiktok/prompt-builder.ts`
**Dòng:** 45–73

**Vấn đề:** `HASHTAG_CONTEXT` là `Record<VideoType, string>` với 5 entries, mỗi entry đều chứa `#noithatminhquan`. Khi dùng cho brand khác (VD: "Nội Thất Tiến Lợi"), hashtag gợi ý vẫn có tag của Minh Quân — AI sẽ sinh hashtag sai brand.

**Reproduce:**
```typescript
// Brand khác
const prompt = buildTiktokBrandPostPrompt({
  ...config,
  brand: { shopName: 'Nội Thất Tiến Lợi', ... },
});
// BUG: prompt vẫn có "## Hashtag gợi ý ... #noithatminhquan"
```

```typescript
// ❌ TRƯỚC — hardcode
const HASHTAG_CONTEXT: Record<VideoType, string> = {
  product_demo: '#noithatminhquan #giuongsat #noithatphongngu ...',
  load_test: '#noithatminhquan #chiuluc #giuongsatben ...',
  // ...
};
```

```typescript
// ✅ SAU — inject dynamic brand hashtag
function buildHashtagContext(videoType: VideoType, shopName?: string): string {
  const brandTag = shopName
    ? '#' + shopName.toLowerCase().replace(/\s+/g, '').replace(/[^\p{L}\p{N}_]/gu, '')
    : '#noithatminhquan';

  const BASE_HASHTAGS: Record<VideoType, string> = {
    product_demo: `${brandTag} #giuongsat #noithatphongngu #noithatgiare #giaxuong`,
    load_test:    `${brandTag} #chiuluc #giuongsatben #giuong1m6 #noithattoancoc`,
    price_reveal: `${brandTag} #giaxuong #noithatgiare #muanoihat #giabanchip`,
    new_arrival:  `${brandTag} #noithatmoi #giuongsatdep #noithathcm #maunoithat`,
    promotion:    `${brandTag} #flashsale #sale #gia #noithatkhuyenmai #muahangonline`,
  };
  return BASE_HASHTAGS[videoType] ?? BASE_HASHTAGS.product_demo;
}

// Trong buildTiktokBrandPostPrompt:
const hashtagContext = buildHashtagContext(config.videoType, config.brand?.shopName);
```

**Lưu ý:** Nếu `shopName = 'Nội Thất Tiến Lợi'`, hàm tạo `#noithattienloi`. Cần kiểm tra Unicode normalization phù hợp tên tiếng Việt.

---

## FIX 3 — Caption word count không validate sau parse (P2)

**File:** `web/app/api/viet-bai-tiktok/generate/route.ts`
**Dòng:** 68–82

**Vấn đề:** Prompt yêu cầu caption 100–200 từ. Route tính `wordCount` rồi emit lên SSE, nhưng không reject hay warn nếu count ngoài range. UI nhận caption quá ngắn (< 100) hoặc quá dài (> 200) mà không biết.

**Reproduce:**
```typescript
// AI trả về caption 40 từ (lười sinh hoặc bị truncate)
const result = parseTiktokOutput(rawAiResponse);
// route.ts: emit wordCount=40, nhưng không có error event
// UI: hiển thị caption 40 từ, user không biết ngoài chuẩn
```

```typescript
// ❌ TRƯỚC — chỉ emit wordCount, không validate
const wordCount = countWords(result.caption);
sseEvent(controller, { type: 'done', wordCount, charCount });
```

```typescript
// ✅ SAU — thêm lengthWarning vào done event
const wordCount = countWords(result.caption);
const captionWordCountOk = wordCount >= 100 && wordCount <= 200;

sseEvent(controller, {
  type: 'done',
  wordCount,
  charCount,
  captionLengthWarning: captionWordCountOk
    ? null
    : wordCount < 100
      ? 'too_short'
      : 'too_long',
});
```

**UI handling cần thêm:** Khi `captionLengthWarning !== null`, hiển thị badge warning bên cạnh word count (ví dụ: "47 từ ⚠ cần 100–200 từ").

**Alternative (stricter):** Nếu `wordCount < 80`, tự động trigger retry 1 lần với `[TIẾP TỤC]` prefix.

---

## FIX 4 — `normalizeTag` strip hyphen im lặng (Minor)

**File:** `web/lib/viet-bai-tiktok/parser.ts`
**Dòng:** 12–16

**Đây là Bug #1 trong `fix-bug-viet-bai-tiktok.md` (2026-06-06) — vẫn chưa fix.**

**Vấn đề:** `extractHashtags` dùng regex `/#[\p{L}\p{N}_-]+/gu` — capture hyphen. Nhưng `normalizeTag` dùng `replace(/[^\p{L}\p{N}_]/gu, '')` — strip hyphen. Kết quả: `#noi-that` bị extract đúng nhưng normalize thành `#noithat` không có warning.

```typescript
// ❌ TRƯỚC — inconsistency
function extractHashtags(text: string): string[] {
  return [...text.matchAll(/#[\p{L}\p{N}_-]+/gu)].map((m) => m[0]);
  // captures: ['#noi-that']
}

function normalizeTag(tag: string): string {
  const clean = tag
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}_]/gu, '')  // strips '-' → 'noithat'
    .trim();
  return clean ? `#${clean}` : '';
}
```

**Hai hướng fix (chọn 1):**

**Option A — Cho phép hyphen trong normalizeTag:**
```typescript
// ✅ Option A
function normalizeTag(tag: string): string {
  const clean = tag
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}_-]/gu, '')  // giữ '-'
    .trim();
  return clean ? `#${clean}` : '';
}
```

**Option B — Không capture hyphen trong extractHashtags (nhất quán):**
```typescript
// ✅ Option B — regex không capture '-'
function extractHashtags(text: string): string[] {
  return [...text.matchAll(/#[\p{L}\p{N}_]+/gu)].map((m) => m[0]);
}
// normalizeTag giữ nguyên
```

**Đề xuất:** Option A nếu muốn giữ hyphenated hashtags như `#noi-that`; Option B nếu muốn hashtags luôn là single words. Cần thống nhất với standard TikTok hashtag format (thực tế TikTok không hỗ trợ hyphen → Option B phù hợp hơn).

---

## FIX 5 — Forbidden word list trong prompt thiếu từ + pattern truncated (Minor)

**File:** `web/lib/viet-bai-tiktok/prompt-builder.ts`
**Dòng:** 95–100 (phần `## Từ cấm dùng` trong template)

**Vấn đề 1:** Pattern `"không chỉ mà còn"` bị truncate — thiếu `"..."` ở giữa. Nếu AI viết `"không chỉ đẹp mà còn bền"`, chuỗi `"không chỉ mà còn"` không khớp verbatim → AI vẫn dùng pattern bị cấm.

**Vấn đề 2:** Danh sách thiếu một số từ trong `COMMON_FORBIDDEN_WORDS` từ `core.ts`: `toàn diện`, `ngày nay`, `hiện nay`, `đáng kể`, `đặc biệt quan trọng`.

```typescript
// ❌ TRƯỚC — hardcode truncated list
const forbiddenSection = `
## Từ cấm dùng
quan trọng, hiệu quả, tuy nhiên, bên cạnh đó, tối ưu hóa, vô cùng, cực kỳ,
tuyệt vời, siêu phẩm, số 1, đẳng cấp, hoàn hảo, không chỉ mà còn
`;
```

```typescript
// ✅ SAU — import từ core + fix pattern
import { COMMON_FORBIDDEN_WORDS } from '@/lib/ecommerce-tools/core';

const forbiddenSection = `
## Từ cấm dùng
${COMMON_FORBIDDEN_WORDS.join(', ')}
`;

// Trong CLAUDE.md, từ cấm AI pattern là "không chỉ ... mà còn"
// COMMON_FORBIDDEN_WORDS phải chứa đúng chuỗi này
// Kiểm tra core.ts và update nếu cần:
// 'không chỉ ... mà còn'  ← phải có dấu ... giữa
```

**Cách dùng trong prompt (cho AI hiểu):**
```
## Từ cấm dùng
Tuyệt đối không dùng: quan trọng, hiệu quả, tuy nhiên, bên cạnh đó, tối ưu hóa,
vô cùng, cực kỳ, tuyệt vời, siêu phẩm, số 1, đẳng cấp, hoàn hảo, toàn diện,
đáng kể, ngày nay, hiện nay, không chỉ [X] mà còn (pattern dù X là gì)
```

---

## FIX 6 — `countWords` duplicate trong route.ts (Minor)

**File:** `web/app/api/viet-bai-tiktok/generate/route.ts`
**Dòng:** 46–48

**Vấn đề:** Route.ts tự define `countWords` thay vì import từ `core.ts`. Nếu `core.ts` có edge-case fix sau này, route.ts diverge im lặng.

```typescript
// ❌ TRƯỚC — duplicate
// web/app/api/viet-bai-tiktok/generate/route.ts
function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}
```

```typescript
// ✅ SAU — import từ core
import { countWords } from '@/lib/ecommerce-tools/core';

// Xóa local countWords definition
```

**Lưu ý nhỏ:** `core.ts` version `text.trim().split(/\s+/).filter(Boolean).length` không có empty-string guard — trả `1` cho `'   '`. Route version có guard. Khi merge, giữ guard:
```typescript
// core.ts (nên update cùng lúc)
export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}
```

---

## Bugs từ fix-bug-viet-bai-tiktok.md (2026-06-06) — trạng thái hiện tại

| Bug cũ | Status | Ghi chú |
|--------|--------|---------|
| #1 normalizeTag strips hyphens | ❌ Chưa fix | = FIX #4 ở trên |
| #2 title max inconsistency (50 vs 80) | ❓ Cần verify | Parser trả `title.slice(0, 50)`, UI field có thể dùng 80 |
| #3 extractSection order-sensitive | ❓ Cần verify | Regex `(?:^|\n)\s*LABEL\s*:` vẫn order-dependent nếu stop label xuất hiện trong content |
| #4 buildBrandBlock skips pronouns | ❌ Chưa fix | = FIX #1 ở trên |
| #5 LS_KEY_CONFIG uses sessionStorage | ❓ Cần verify UI | Client-side UI bug, không liên quan route/lib |
| #6 internal helpers not exported | ❌ Chưa fix | `extractSection`, `normalizeTag` etc. vẫn non-exported |

---

## Thứ tự fix đề xuất

```
1. FIX 1 (buildBrandBlock condition)     — 6 dòng, ngăn brand block bị skip với partial config
   → Ảnh hưởng trực tiếp: user set xưng hô mà không điền tên shop → AI sai brand
2. FIX 3 (caption word count warning)   — thêm warning vào SSE event
   → Caption 40 từ qua route im lặng → bài TikTok quá ngắn không đủ hook+body+CTA
3. FIX 2 (HASHTAG_CONTEXT dynamic brand) — 15 dòng refactor
   → Dùng cho nhiều brand khác nhau → sai hashtag → reach kém
4. FIX 6 (remove duplicate countWords)  — xóa 3 dòng, thêm 1 import
   → Maintenance debt thấp, fix nhanh
5. FIX 4 (normalizeTag hyphen)          — 1 char thay đổi trong regex
   → Chọn Option B (remove hyphen từ extractHashtags) nếu theo standard TikTok
6. FIX 5 (forbidden list completeness)  — import + update template string
   → Quality of output, không blockit
```

---

## Chạy tests để verify

```bash
# Chạy test mới (bổ sung cho parser.test.ts + options.test.ts)
cd web && npx tsx --test lib/viet-bai-tiktok/viet-bai-tiktok.test.ts

# Chạy toàn bộ TikTok tests
cd web && npx tsx --test \
  lib/viet-bai-tiktok/parser.test.ts \
  lib/viet-bai-tiktok/options.test.ts \
  lib/viet-bai-tiktok/viet-bai-tiktok.test.ts
```

**Trạng thái trước khi fix source:**
- `[BUG #1]` tests → PASS (brand block empty khi only pronouns)
- `[BUG #2]` tests → PASS (hardcoded #noithatminhquan dù brand khác)
- `[BUG #3]` tests → PASS (wordCount=47 vẫn emit done, không có warning)
- `[BUG #4]` tests → PASS (hyphen stripped)
- `[BUG #5]` tests → PASS (truncated pattern visible)
- `[BUG #6]` tests → PASS (local countWords behaves differently on edge case)
- `[FIX #...]` tests → PASS ngay (local fixed copies)
