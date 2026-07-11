# Fix Bug — /facebook-post

> Dựa theo unit test coverage tại `brand-context.test.ts` và `constants.test.ts`.  
> Ngày: 2026-06-07

---

## Chạy test

```bash
cd web
node --require tsx/esm --test \
  lib/facebook-post/brand-context.test.ts \
  lib/facebook-post/constants.test.ts
```

---

## Danh sách bug và edge case

### 1. Không có lib/ directory — `buildBrandContext`, `FORBIDDEN_WORDS`, `TEMPLATE_GUIDES`, `TONES`, `TEMPLATES` đều không exported

**File:** `app/facebook-post/page.tsx` + `app/api/facebook-post/generate/route.ts`  
**Test:** Test files phải inline logic thay vì import → sync gap khi source thay đổi  
**Mức độ:** 🔴 HIGH (testability / maintainability)

Toàn bộ logic của `/facebook-post` là inline trong page component và route handler. Không có `lib/facebook-post/` directory. Hệ quả:

- Tests phải **duplicate code** thay vì import → khi source thay đổi, test không fail ngay mà âm thầm lỗi thời
- Không thể type-check test code vs source
- Không thể tree-shake hay reuse logic từ các tool khác

**Fix:** Tạo `lib/facebook-post/` và extract:
```
lib/facebook-post/
  constants.ts     ← TONES, TEMPLATES, FORBIDDEN_WORDS, TEMPLATE_GUIDES
  brand-context.ts ← export function buildBrandContext(p: FBPostRequest): string
  types.ts         ← export interface FBPostRequest
```

Sau đó import trong route.ts và page.tsx thay vì inline.

---

### 2. Route.ts không validate input với Zod — bất kỳ payload nào cũng được chấp nhận

**File:** `app/api/facebook-post/generate/route.ts`  
**Test:** ❌ Không có test (server behavior)  
**Mức độ:** 🔴 HIGH

```ts
const params: FBPostRequest = await req.json();
// ← NO validation!
```

So với `/facebook-comment/generate/route.ts` có đầy đủ Zod schema, `/facebook-post/generate/route.ts` không validate. Hậu quả:

- `wordCount: -5` → prompt "~-5 từ (±20 từ)" → AI output vô nghĩa
- `tone: 'unknown_tone'` → `toneGuide[params.tone]` = undefined → fallback `toneGuide.friendly` (may okay, but silent)
- `provider: ''` → `buildModel('')` → falls through to Gemini, no error
- `keyword: ''` (empty string) → AI viết bài không có chủ đề
- `wordCount: 99999` → AI cố viết bài siêu dài → timeout hoặc billing spike

**Fix:** Thêm Zod schema:
```ts
const generateSchema = z.object({
  provider:        z.string().default('gemini-flash'),
  keyword:         z.string().trim().min(3).max(5000),
  wordCount:       z.number().int().min(60).max(320).default(140),
  tone:            z.enum(['friendly', 'professional', 'casual', 'sales', 'rewrite', 'shorten']).default('friendly'),
  template:        z.enum(['', 'product_intro', 'combo_wholesale', 'bulk_b2b', 'friendly_stock', 'branding']).nullable().default(null),
  shopName:        z.string().max(100).default(''),
  // ... remaining fields
  includeEmojis:   z.boolean().default(true),
  includeHashtags: z.boolean().default(true),
  freeShip:        z.boolean().default(false),
  urgency:         z.boolean().default(false),
});
```

---

### 3. `wordCount` không validate ở client — âm số được chấp nhận

**File:** `app/facebook-post/page.tsx`  
**Test:** `wordCount default is 140, within valid range [60, 320]` (documents expected range)  
**Mức độ:** 🟡 MEDIUM

```ts
onChange={(event) => setWordCount(Number(event.target.value) || 140)}
```

- `Number('')` = 0 → `0 || 140` → reset về 140 ✓
- `Number('-5')` = -5 → `-5 || 140` → **-5 là truthy!** → `wordCount = -5` ✗
- `Number('999')` = 999 → `wordCount = 999` (vượt max=320 từ `input[max]`, nhưng không bị catch nếu user bypass) ✗

Input có `min={60}` và `max={320}` nhưng HTML attributes không enforce nghiêm nếu dùng keyboard hoặc programmatic change.

**Fix:**
```ts
onChange={(event) => {
  const val = Number(event.target.value);
  setWordCount(!val || val < 60 ? 140 : Math.min(val, 320));
}}
```

---

### 4. `page.tsx` hardcode nhiều brand fields thành empty string — không bao giờ dùng được

**File:** `app/facebook-post/page.tsx`  
**Test:** Implicit qua `buildBrandContext` tests  
**Mức độ:** 🟡 MEDIUM

Page gửi hardcoded empty string cho nhiều brand fields không có UI input:
```ts
body: JSON.stringify({
  industry: '',         // ← không có input
  brandPronouns: '',    // ← không có input
  brandAudience: '',    // ← không có input
  brandToneNotes: '',   // ← không có input
  phone: '',            // ← không có input
  address: '',          // ← không có input
  brandDesc: '',        // ← không có input
  mainProducts: '',     // ← không có input
})
```

`buildBrandContext` skip các fields rỗng nên prompt vẫn có fallback message "hãy suy luận từ từ khóa". Nhưng user không thể truyền context đầy đủ dù route.ts đã hỗ trợ.

Page `/viet-bai-facebook` (page mới hơn) đã có `BrandSection` component — `/facebook-post` là tool cũ chưa được nâng cấp.

**Fix:** Thêm `BrandSection` component vào `/facebook-post` giống `/viet-bai-facebook`.

---

### 5. Prompt rule numbering bị off khi `urgency` và `freeShip` cùng bật

**File:** `app/api/facebook-post/generate/route.ts`  
**Test:** ❌ Không có test (private function)  
**Mức độ:** 🟡 MEDIUM

Rule numbering trong prompt dùng ternary thủ công:
```ts
${urgencyRule ? `8. ${urgencyRule}` : ''}
${freeShipRule ? `${urgencyRule ? '9' : '8'}. ${freeShipRule}` : ''}
```

Nếu chỉ `freeShip=true` và `urgency=false` → freeShip được đánh số `8.` ✓  
Nếu cả 2 đều true → `8. urgency`, `9. freeShip` ✓  
Nếu chỉ `urgency=true` → `8. urgency`, không có freeShip ✓

Logic đúng nhưng fragile — nếu thêm rule 8 fixed, phải cập nhật tất cả. Nên dùng dynamic array thay vì hardcode số:

```ts
const rules = [
  '...rule 1...',
  '...rule 2...',
  // ...7 fixed rules
];
if (urgencyRule) rules.push(urgencyRule);
if (freeShipRule) rules.push(freeShipRule);

const rulesText = rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n');
```

---

### 6. `TEMPLATE_GUIDES` không có entry cho template `''` (auto) — route dùng fallback không tường minh

**File:** `app/api/facebook-post/generate/route.ts`  
**Test:** `TEMPLATE_GUIDES has no entry for auto template`  
**Mức độ:** 🟢 LOW

Khi `template = ''` hoặc `template = null`, route dùng:
```ts
params.template
  ? `\nPHONG CÁCH BÀI VIẾT...\n${TEMPLATE_GUIDES[params.template] || ''}`
  : `\nPHONG CÁCH: Tự chọn cấu trúc...`  // ← fallback auto instruction
```

Nếu client gửi `template: ''` (empty string), JavaScript coercion `if ('')` → falsy → rơi vào nhánh auto. OK về behavior nhưng `page.tsx` cũng gửi `template: template || null` nên empty string sẽ thành `null` trước khi vào route.

Đây là behavior đúng nhưng hơi implicit — cần comment code để dev sau không nhầm.

---

### 7. Không có `requireAuth()` trong route — endpoint public, không cần đăng nhập

**File:** `app/api/facebook-post/generate/route.ts`  
**Test:** ❌ Không có test  
**Mức độ:** 🟡 MEDIUM

So sánh với `/facebook-comment/generate/route.ts`:
```ts
// facebook-comment — có auth
user = await requireAuth();

// facebook-post — KHÔNG có auth
export async function POST(req: NextRequest) {
  const params = await req.json();  // bắt đầu ngay
```

Tool `/facebook-post` là "Quick Social Tool stateless" nên có thể intentional (không lưu DB). Nhưng nếu không có auth, bất kỳ ai cũng có thể gọi API tốn quota AI.

**Fix:** Thêm `requireAuth()` nếu muốn chỉ user đã đăng nhập dùng được, hoặc ít nhất thêm rate limit.

---

## Tóm tắt mức độ ưu tiên

| # | Issue | Mức độ | File |
|---|-------|--------|------|
| 1 | Không có lib/ — logic không exported, không testable trực tiếp | 🔴 HIGH | `page.tsx` + `route.ts` |
| 2 | Không có Zod validation — input bất kỳ được chấp nhận | 🔴 HIGH | `route.ts` |
| 7 | Không có `requireAuth()` — endpoint public | 🟡 MEDIUM | `route.ts` |
| 3 | `wordCount` âm số không bị catch ở client | 🟡 MEDIUM | `page.tsx` |
| 4 | Brand fields hardcoded empty — không dùng được brand context đầy đủ | 🟡 MEDIUM | `page.tsx` |
| 5 | Rule numbering fragile khi thêm rules mới | 🟡 MEDIUM | `route.ts` |
| 6 | Auto template fallback implicit, cần comment | 🟢 LOW | `route.ts` |
