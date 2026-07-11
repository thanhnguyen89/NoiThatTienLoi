# PAGE-STANDARD.md
## Bộ quy tắc chuẩn hóa toàn bộ trang viết bài — Config + Generate

> Áp dụng sau khi phân tích aiktp.com vs local.  
> Mục tiêu: bắt kịp điểm mạnh aiktp + giữ điểm độc quyền local.  
> Dev đọc 1 lần, code được toàn bộ hệ thống.

---

## 0. Phân nhóm trang & Routing Pattern

> **Nguyên tắc bất biến:**
> - **8 khối config** = áp dụng cho config page của **MỌI Nhóm A**, không phân biệt feature đơn giản hay phức tạp.
> - **Số bước / số route** = quyết định riêng theo độ phức tạp của từng tính năng.
> - Hai quyết định này **độc lập nhau**.

---

### 3 Nhóm chức năng

| Nhóm | Đặc điểm | Rule áp dụng |
|------|----------|--------------|
| **A — Viết Bài Chính** | Tạo article dài, lưu DB Article, có Editor + Publish WordPress | Toàn bộ rule trong tài liệu này (8 khối config + generate chuẩn) |
| **B — Công Cụ Nhanh** | Stateless, không lưu DB, output tức thì | Chỉ cần UI tối giản + API, không cần 8 khối |
| **C — Công Cụ Social** | Lưu DB nhưng không phải Article — không có Editor/Publish | 8 khối config rút gọn (không có Outline, không có SEO Advanced) |

---

### 4 Routing Pattern (chỉ áp dụng Nhóm A)

```
P1 — 2 Route chuẩn       Config page → Generate page
                          Áp dụng cho phần lớn tính năng

P2 — 4 Bước Wizard       Step 1 → Step 2 (review) → Step 3 (config) → Step 4 (generate)
                          Dùng khi cần user review kết quả trung gian trước khi generate

P3 — Queue Bulk           Config page → Queue management (nhiều bài chạy tuần tự)
                          Dùng cho hàng loạt

P4 — 1 Route              Config + Generate gộp trong 1 trang (không redirect)
                          Dùng cho page đơn giản, output nhỏ, không cần Editor đầy đủ
```

> **Lưu ý:** 8 khối config render trong `page.tsx` của P1/P4, trong `step1/page.tsx` + `step3/page.tsx` của P2, trong `page.tsx` queue config của P3.

---

### Nhóm A — Viết Bài Chính

| Page | Route Config | Route Generate | Pattern | Spec |
|------|-------------|----------------|---------|------|
| Viết Tinh Gọn | `/viet-tinh-gon` | `/viet-tinh-gon/generate` | P1 | ✅ có |
| Viết Tin Tức | `/viet-tin-tuc` | `/viet-tin-tuc/generate` | P1 | ✅ có |
| Viết Theo Nguồn | `/viet-theo-nguon` | `/viet-theo-nguon/generate` | P1 | ✅ có |
| Viết Theo Dàn Bài | `/viet-theo-dan-bai` | `/viet-theo-dan-bai/generate` | P1 | ✅ có |
| Viết Toplist | `/viet-toplist` | `/viet-toplist/generate` | P1 | ✅ có |
| Viết Đánh Giá Sản Phẩm | `/viet-danh-gia-san-pham` | `/viet-danh-gia-san-pham/generate` | P1 | ✅ có |
| Viết Lại Bài Viết | `/viet-lai-bai-viet` | `/viet-lai-bai-viet/generate` | P1 | ✅ có |
| Viết Lại URL | `/viet-lai-url` | `/viet-lai-url/generate` | P1 | ✅ có |
| Viết Lại Tin Tức | `/viet-lai-tin-tuc` | `/viet-lai-tin-tuc/generate` | P1 | ⏳ pending |
| Viết Từ Google Search | `/viet-tu-google-search` | `/viet-tu-google-search/generate` | P1 | ✅ có |
| Viết Bài Thông Minh | `/viet-bai-thong-minh` → `step2` → `step3` → `step4` | (step 4 = generate) | **P2** | ✅ có |
| Viết Hàng Loạt | `/viet-hang-loat` | (queue + individual generate) | **P3** | ⏳ pending |

---

### Nhóm B — Công Cụ Nhanh (Stateless)

Không cần 8 khối. UI tối giản: input → output cùng trang.

| Page | Route | Spec |
|------|-------|------|
| Viết Lại Đoạn Văn | `/viet-lai-doan-van` | ✅ có |
| Tạo Facebook Post nhanh | `/facebook-post` | ✅ có |
| Tạo Facebook Comment nhanh | `/facebook-comment` | ✅ có |

---

### Nhóm C — Công Cụ Social Brand (có DB, không phải Article)

Có lưu DB và trang quản lý, nhưng **không có Article Editor + Publish WordPress**.  
Config rút gọn: Khối 1 (topic/content) + Khối 5 (Style) + Khối 6 (Model) + Khối 7 (Brand).

| Page | Route Tool | Route Quản lý | Spec |
|------|-----------|--------------|------|
| Viết Bài Facebook (brand) | `/viet-bai-facebook` | `/quan-ly-bai-facebook` | ✅ có |
| Viết Comment Facebook (brand) | `/viet-tu-facebook-comment` | `/quan-ly-facebook-comment` | ✅ có |

---

### Bảng ngoại lệ 8 khối — Nhóm A

8 khối luôn có mặt. Một số khối **biến tướng hoặc ẩn** ở một số page cụ thể:

| Page | Khối 2 Image | Khối 4 Outline | Ghi chú |
|------|-------------|----------------|---------|
| `viet-tin-tuc` | ❌ Ẩn | ❌ Ẩn → standalone Length | Tin tức không cần ảnh AI; không cần outline |
| `viet-theo-dan-bai` | ✅ | ❌ Ẩn → outline là Khối 1 input | Outline là input chính |
| `viet-bai-thong-minh` | ✅ (step 3) | ✅ (step 2, editable AI) | 8 khối chia làm 2 step: step1=Khối 1,3,5,6,7 / step3=Khối 2,4,8 |
| `viet-hang-loat` | ✅ | ✅ | Queue nhưng vẫn đủ 8 khối trong config |
| Tất cả page khác | ✅ | ✅ | Đủ 8 khối, thứ tự cố định |

---

## 1. Shared Files — Tạo trước, mọi thứ khác phụ thuộc vào đây

### `web/lib/shared/options.ts`

```typescript
// Tất cả constants dùng chung — KHÔNG define lại ở từng page/lib

// ── Ngôn ngữ ────────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
  { value: 'English',    label: '🇬🇧 English' },
  { value: 'Japanese',   label: '🇯🇵 日本語' },
  { value: 'Korean',     label: '🇰🇷 한국어' },
  { value: 'Thai',       label: '🇹🇭 ภาษาไทย' },
  { value: 'Indonesian', label: '🇮🇩 Bahasa Indonesia' },
  { value: 'Chinese',    label: '🇨🇳 中文' },
  { value: 'German',     label: '🇩🇪 Deutsch' },
  { value: 'French',     label: '🇫🇷 Français' },
  { value: 'Spanish',    label: '🇪🇸 Español' },
  { value: 'Portuguese', label: '🇵🇹 Português' },
  { value: 'Arabic',     label: '🇸🇦 العربية' },
  { value: 'Hindi',      label: '🇮🇳 हिन्दी' },
  { value: 'Russian',    label: '🇷🇺 Русский' },
  { value: 'Italian',    label: '🇮🇹 Italiano' },
] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['value'];

// ── Độ dài bài ─────────────────────────────────────────────────────
export const TARGET_LENGTHS = [
  { value: 600,  label: '~600 từ',   badge: 'Ngắn',      note: 'Mô tả sản phẩm, tin tức ngắn' },
  { value: 1200, label: '~1,200 từ', badge: 'Chuẩn SEO', note: '' },
  { value: 2000, label: '~2,000 từ', badge: 'Phổ biến',  note: '' },
  { value: 3000, label: '~3,000 từ', badge: '',           note: 'Bài chuyên sâu' },
  { value: 5000, label: '~5,000 từ', badge: 'Dài',        note: 'Pillar content' },
] as const;

// ── Giọng văn (dùng cho page chưa có tone riêng) ──────────────────
export const WRITING_TONES = [
  { value: 'seo_basic',    label: 'SEO Cơ bản',  note: 'Tập trung keyword, phù hợp dạng câu hỏi' },
  { value: 'seo_focus',    label: 'SEO Focus',    note: 'Tối ưu ranking, dày thông số' },
  { value: 'seo_extended', label: 'SEO Mở rộng', note: 'Giải thích + ví dụ + so sánh' },
  { value: 'how_to',       label: 'Hướng dẫn',   note: 'Dạng Step 1 → 2 → 3' },
  { value: 'listicle',     label: 'Danh sách',   note: 'Top N, liệt kê, không dài dòng' },
  { value: 'review',       label: 'Đánh giá',    note: 'Ưu nhược điểm, có kết luận' },
  { value: 'comparison',   label: 'So sánh',     note: 'A vs B, có bảng' },
  { value: 'story',        label: 'Kể chuyện',   note: 'Narrative, tường thuật, cảm xúc' },
  { value: 'technical',    label: 'Kỹ thuật',    note: 'Thông số, số liệu, chính xác cao' },
  { value: 'friendly',     label: 'Thân thiện',  note: 'Gần gũi, tránh dấu vết AI' },
  { value: 'formal',       label: 'Trang trọng', note: 'Báo chí, thông cáo, doanh nghiệp' },
] as const;
// Lưu ý: page có tone riêng (news-writer) → dùng tone riêng, không dùng cái này

// ── Ảnh ────────────────────────────────────────────────────────────
export const IMAGE_OPTIONS = [
  { value: 'none',         label: 'Không ảnh',    icon: '🚫', note: 'Bài chỉ có text' },
  { value: 'yandex',       label: 'Yandex',        icon: '🔍', note: 'Tìm ảnh thực từ Yandex Search' },
  { value: 'ai_generated', label: 'AI Tạo ảnh',   icon: '🎨', note: 'Flux/DALL-E tạo theo nội dung' },
  { value: 'shutterstock', label: 'Shutterstock',  icon: '📷', note: 'Ảnh stock có bản quyền' },
] as const;
export type ImageOption = typeof IMAGE_OPTIONS[number]['value'];

// ── Auto-bold ───────────────────────────────────────────────────────
export const AUTO_BOLD_OPTIONS = [
  { value: 'none',     label: 'Không in đậm' },
  { value: 'keyword',  label: 'Từ khóa chính' },
  { value: 'headings', label: 'Heading (H2, H3)' },
  { value: 'both',     label: 'Cả hai' },
] as const;
export type AutoBoldOption = typeof AUTO_BOLD_OPTIONS[number]['value'];
```

### `web/lib/shared/seo-checks.ts`

```typescript
// computeSeoChecks — dùng chung, KHÔNG copy-paste vào từng generate page

export interface SeoCheck {
  label: string;
  pass: boolean;
  fixable?: boolean;
  detail?: string;
  group: 'basic' | 'advanced' | 'title';
}

export interface SeoCheckInput {
  title: string;
  metaDescription: string;
  html: string;
  wordCount: number;
  keyword: string;
  secondaryKeywords?: string[];
  slug: string;
  internalDomain?: string;  // default: 'noithatminhquan.vn'
  minWordCount?: number;    // default: 800 | override: tin tức = 400
}

export function computeSeoChecks(input: SeoCheckInput): { checks: SeoCheck[]; score: number }
// 14 checks chuẩn — xem bảng ở Section 4
```

### `web/lib/shared/generate-tabs.ts`

```typescript
export const GENERATE_TABS = ['seo', 'quality', 'links', 'publish'] as const;
export type GenerateTab = typeof GENERATE_TABS[number];

export const TAB_LABELS: Record<GenerateTab, { label: string; icon: string }> = {
  seo:     { label: 'SEO',             icon: '📊' },
  quality: { label: 'Chất lượng',      icon: '✅' },
  links:   { label: 'Internal Links',  icon: '🔗' },
  publish: { label: 'Đăng bài',        icon: '🚀' },
};

export const AI_EDIT_COMMANDS = [
  { value: 'shorten',      label: 'Rút gọn',      icon: '✂️' },
  { value: 'expand',       label: 'Mở rộng',       icon: '📝' },
  { value: 'humanize',     label: 'Tự nhiên hơn',  icon: '🧑' },
  { value: 'more_spec',    label: 'Thêm chi tiết', icon: '🔍' },
  { value: 'stronger_cta', label: 'CTA mạnh hơn',  icon: '💬' },
  { value: 'rewrite',      label: 'Viết lại đoạn', icon: '🔄' },
] as const;
```

### `web/hooks/useGenerateStream.ts`

```typescript
export function useGenerateStream(endpoint: string) {
  const [streaming, setStreaming]           = useState(false);
  const [activeStep, setActiveStep]         = useState('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [outputHtml, setOutputHtml]         = useState('');
  const [streamResult, setStreamResult]     = useState<unknown>(null);
  const [error, setError]                   = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function startStream(payload: object) {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStreaming(true); setOutputHtml(''); setCompletedSteps([]); setError('');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'step')      setActiveStep(ev.step);
            if (ev.type === 'step_done') setCompletedSteps((p) => [...p, ev.step]);
            if (ev.type === 'chunk')     setOutputHtml((p) => p + (ev.text ?? ''));
            if (ev.type === 'done')      { setStreamResult(ev.data); setStreaming(false); }
            if (ev.type === 'error')     { setError(ev.message); setStreaming(false); }
          } catch { /* skip malformed line */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(String(err));
      setStreaming(false);
    }
  }

  return { streaming, activeStep, completedSteps, outputHtml, streamResult, error,
           startStream, abort: () => abortRef.current?.abort() };
}
```

### Shared Components cần tạo

```
web/components/
├── BrandSection.tsx          ← Extract từ viet-tin-tuc/page.tsx (~250 dòng)
├── SeoAdvancedBlock.tsx      ← Extract từ viet-theo-nguon/page.tsx
└── generate/
    ├── GeneratePanelTabs.tsx ← Tab bar shell (4 tabs cố định)
    ├── SeoPanel.tsx          ← SEO score + density bar + 14 checks
    ├── QualityPanel.tsx      ← Humanness + Semantic (optional) + AICheck
    ├── LinksPanel.tsx        ← InternalLinkSuggest
    └── PublishPanel.tsx      ← Title/Meta/Slug + SERP Preview + buttons
```

---

## 2. CONFIG PAGE — 8 Khối Chuẩn

> **Rule:** 8 khối cố định, thứ tự cố định, áp dụng đồng nhất cho **mọi page Nhóm A**.  
> Ngoại lệ được ghi rõ ở bảng cuối section — không được tự ý ẩn/đảo khối.

---

### Thứ tự render bắt buộc

```
┌──────────────────────────────────────────────────────────┐
│  Khối 1 — Keyword  (+ từ khóa phụ + AI Suggest)         │  BẮT BUỘC mọi page
├──────────────────────────────────────────────────────────┤
│  Khối 2 — Image Option  (4 loại)                        │  BẮT BUỘC — ngoại lệ: viet-tin-tuc
├──────────────────────────────────────────────────────────┤
│  Khối 3 — Language  (SUPPORTED_LANGUAGES)               │  BẮT BUỘC mọi page
├──────────────────────────────────────────────────────────┤
│  Khối 4 — Outline + Target Length                       │  BẮT BUỘC — ngoại lệ: viet-tin-tuc
├──────────────────────────────────────────────────────────┤
│  Khối 5 — Tone / Giọng văn                             │  BẮT BUỘC mọi page
├──────────────────────────────────────────────────────────┤
│  Khối 6 — AI Model  (ModelPicker)                       │  BẮT BUỘC mọi page
├──────────────────────────────────────────────────────────┤
│  Khối 7 — Brand Config  (BrandSection)                  │  BẮT BUỘC mọi page
├──────────────────────────────────────────────────────────┤
│  Khối 8 — SEO Advanced  (collapsible)                   │  BẮT BUỘC mọi page
├──────────────────────────────────────────────────────────┤
│  Submit Button                                           │
└──────────────────────────────────────────────────────────┘
```

---

### Khối 1 — Keyword

**Luôn có:** keyword textarea (min 3 ký tự) + nút "AI Suggest" gợi ý từ khóa phụ.

```tsx
{/* Từ khóa chính */}
<textarea
  value={keyword}
  onChange={(e) => setKeyword(e.target.value)}
  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
  placeholder="Nhập từ khóa chính..."
  rows={2}
  className="w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
/>

{/* Từ khóa phụ — comma-separated */}
<input
  value={secondaryKeywordsRaw}
  onChange={(e) => setSecondaryKeywordsRaw(e.target.value)}
  placeholder="Từ khóa phụ, cách nhau bởi dấu phẩy (tùy chọn)"
  className="w-full px-3 py-2 border rounded-lg text-sm"
/>

{/* AI Suggest button */}
<button
  type="button"
  onClick={handleSuggestKeywords}
  disabled={!keyword.trim() || suggestingKw}
  className="text-xs px-3 py-1.5 border border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-40"
>
  {suggestingKw ? 'Đang gợi ý...' : '✨ AI Gợi ý từ khóa phụ'}
</button>
```

**AI Suggest handler** — POST `/api/[feature]/suggest-keywords` → trả về `string[]` → hiện chips để user click thêm vào.

**Page-specific additions vào Khối 1** (thêm vào sau keyword, trước secondary kw):

| Page | Thêm gì |
|------|---------|
| `viet-theo-nguon` | URL inputs (2–5 link crawl) + Manual content paste |
| `viet-theo-dan-bai` | Outline textarea `[h2]...[h3]` format |
| `viet-toplist` | Số mục toplist (N items) + Layout (so sánh / liệt kê) |
| `viet-bai-thong-minh` | Content type (7 loại) · Topical Map · Competitor URLs |
| `viet-lai-bai-viet` | Method (keep_headings / rewrite_all / deep_rewrite) |
| `viet-lai-url` | URL crawl input |
| `viet-lai-tin-tuc` | URL nguồn tin |
| `viet-tin-tuc` | Structure (9 loại tin tức) |

---

### Khối 2 — Image Option

Import `IMAGE_OPTIONS` từ `lib/shared/options.ts`. Render 4 card ngang:

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
  {IMAGE_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      type="button"
      onClick={() => setImageOption(opt.value)}
      className={`p-3 rounded-xl border-2 text-center transition-colors ${
        imageOption === opt.value
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <span className="text-2xl block mb-1">{opt.icon}</span>
      <p className={`text-xs font-semibold ${imageOption === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>
        {opt.label}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{opt.note}</p>
    </button>
  ))}
</div>
```

**Default:** `'none'` (Không ảnh).

**Ngoại lệ duy nhất: `viet-tin-tuc`** → ẩn Khối 2 (tin tức không sinh ảnh AI).

---

### Khối 3 — Language

Import `SUPPORTED_LANGUAGES` từ `lib/shared/options.ts`. Render dropdown:

```tsx
<select
  value={language}
  onChange={(e) => setLanguage(e.target.value)}
  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
>
  {SUPPORTED_LANGUAGES.map((l) => (
    <option key={l.value} value={l.value}>{l.label}</option>
  ))}
</select>
```

**Default:** `'Vietnamese'`.

⚠️ Không filter hay hardcode — LUÔN dùng toàn bộ 15 ngôn ngữ từ shared.  
⚠️ `viet-tin-tuc` đang filter theo `NEWS_LANGUAGE_MAP` → **phải sửa** để dùng full list.

---

### Khối 4 — Outline + Target Length

3 radio modes. Target Length nằm bên trong mode "Không dàn ý":

```tsx
{/* Radio chọn mode */}
<div className="flex gap-2">
  {[
    { value: 'no_outline',   label: 'Không dàn ý' },
    { value: 'user_outline', label: 'Dàn ý của bạn' },
    { value: 'ai_outline',   label: 'AI Tạo dàn ý' },
  ].map((mode) => (
    <button
      key={mode.value}
      type="button"
      onClick={() => setOutlineMode(mode.value)}
      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
        outlineMode === mode.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'
      }`}
    >
      {mode.label}
    </button>
  ))}
</div>

{/* Target Length — chỉ hiện khi no_outline */}
{outlineMode === 'no_outline' && (
  <div className="mt-3 flex gap-2 flex-wrap">
    {TARGET_LENGTHS.map((l) => (
      <button
        key={l.value}
        type="button"
        onClick={() => setTargetLength(l.value)}
        className={`relative px-4 py-2 rounded-lg border-2 text-sm transition-colors ${
          targetLength === l.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
        }`}
      >
        {l.label}
        {l.badge && (
          <span className="absolute -top-2 -right-1 text-[9px] bg-blue-500 text-white rounded-full px-1.5 py-0.5">
            {l.badge}
          </span>
        )}
      </button>
    ))}
  </div>
)}

{/* User outline — textarea */}
{outlineMode === 'user_outline' && (
  <textarea
    value={userOutlineText}
    onChange={(e) => setUserOutlineText(e.target.value)}
    placeholder="[h2]Tiêu đề H2[/h2]&#10;[h3]Tiêu đề H3[/h3]&#10;[h2]Tiêu đề H2 khác[/h2]"
    rows={6}
    className="w-full mt-3 px-3 py-2 border rounded-lg text-sm font-mono resize-y"
  />
)}

{/* AI outline — objective + size + generate button */}
{outlineMode === 'ai_outline' && (
  <div className="mt-3 space-y-3">
    {/* Objective chips */}
    <div className="flex gap-2 flex-wrap">
      {AI_OUTLINE_OBJECTIVES.map((obj) => (
        <button key={obj.value} type="button" onClick={() => setAiOutlineObjective(obj.value)}
          title={obj.note}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            aiOutlineObjective === obj.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'
          }`}>
          {obj.label}
        </button>
      ))}
    </div>
    {/* Size chips */}
    <div className="flex gap-2 flex-wrap">
      {AI_OUTLINE_SIZES.map((s) => (
        <button key={s.value} type="button" onClick={() => setAiOutlineSize(s.value)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            aiOutlineSize === s.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200'
          }`}>
          {s.label} <span className="text-gray-400">{s.wordRange}</span>
        </button>
      ))}
    </div>
    {/* Generate button */}
    <button type="button" onClick={handleGenerateOutline} disabled={isGeneratingOutline || !keyword.trim() || !model}
      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40">
      {isGeneratingOutline ? 'Đang tạo dàn ý...' : '✨ Tạo Dàn Ý'}
    </button>
    {/* Editable outline (sau khi generate) */}
    {editedOutline && (
      <textarea value={editedOutline} onChange={(e) => setEditedOutline(e.target.value)}
        rows={8}
        className="w-full px-3 py-2 border rounded-lg text-sm font-mono resize-y border-purple-300 bg-purple-50"
      />
    )}
  </div>
)}
```

**Import:**
```tsx
import { TARGET_LENGTHS } from '@/lib/shared/options';
import { AI_OUTLINE_OBJECTIVES, AI_OUTLINE_SIZES } from '@/lib/[feature]/options';
// AI_OUTLINE_OBJECTIVES và AI_OUTLINE_SIZES là page-specific (không dùng chung)
```

**Ngoại lệ: `viet-tin-tuc`** → ẩn toàn bộ Khối 4, thay bằng standalone Target Length block (không có outline).

**Page không có outline riêng nhưng VẪN cần Target Length** → hiện dạng standalone radio buttons (không bọc trong Khối 4).

---

### Khối 5 — Tone / Giọng văn

Render grid, có `title` tooltip hiện note khi hover:

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
  {TONES.map((t) => (
    <button
      key={t.value}
      type="button"
      title={t.note}
      onClick={() => setTone(t.value)}
      className={`py-2.5 px-3 rounded-lg border-2 text-xs font-medium transition-colors relative ${
        tone === t.value
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-200 text-gray-600 hover:border-blue-300'
      }`}
    >
      {t.label}
      {t.hot && (
        <span className="absolute -top-1.5 -right-1 text-[9px] bg-orange-400 text-white rounded-full px-1">
          Hot
        </span>
      )}
    </button>
  ))}
</div>
<p className="text-xs text-gray-400 mt-1.5">Hover vào từng tùy chọn để xem khi nào nên dùng.</p>
```

**Nguồn `TONES`:**

| Page | Dùng tone nào |
|------|--------------|
| Mặc định (chưa có riêng) | `WRITING_TONES` từ `lib/shared/options.ts` (11 tones) |
| `viet-tin-tuc` | `NEWS_TONES` từ `lib/viet-tin-tuc/options.ts` |
| `viet-theo-nguon` | `ARTICLE_TONES` từ `lib/viet-theo-nguon/options.ts` |
| `viet-theo-tu-khoa` | `KEYWORD_TONES` từ `lib/viet-theo-tu-khoa/options.ts` (16 tones) |
| `viet-danh-gia-san-pham` | Tone riêng của page |
| `viet-toplist` | Tone riêng của page |

⚠️ Page nào chưa có tone riêng → dùng `WRITING_TONES` từ shared làm mặc định.

---

### Khối 6 — AI Model

Dùng `<ModelPicker />` — không tự tạo selector riêng:

```tsx
<ModelPicker
  value={model}
  onChange={setModel}
  size="md"
  label=""
/>
// Load động từ /api/ai-models?activeOnly=true
// User thêm model mới qua /cau-hinh/ai-models — không cần sửa code
// Auto-select default model khi page load lần đầu
```

**Đồng nhất 100% trên mọi page** — không có ngoại lệ.

---

### Khối 7 — Brand Config

Dùng `<BrandSection />` — không copy-paste state:

```tsx
<BrandSection
  value={brand}
  onChange={setBrand}
  lsKey="[prefix]_brand_info"       // prefix riêng từng page (xem bảng dưới)
  defaultBrandName="Nội Thất Minh Quân"
/>
```

**`lsKey` theo từng page:**

| Page | lsKey |
|------|-------|
| viet-tinh-gon | `tg_brand_info` |
| viet-tin-tuc | `vtt_brand_info` |
| viet-theo-nguon | `vtn_brand_info` |
| viet-theo-dan-bai | `vdb_brand_info` |
| viet-toplist | `vtl_brand_info` |
| viet-danh-gia-san-pham | `vdg_brand_info` |
| viet-theo-tu-khoa | `ttk_brand_info` |
| viet-lai-bai-viet | `vl_brand_info` |
| viet-lai-url | `vlu_brand_info` |
| viet-lai-tin-tuc | `vltt_brand_info` |

**Interface `BrandSectionState`:**
```typescript
interface BrandSectionState {
  shopName: string;
  industry: string;
  brandPronouns: string;     // "Minh Quân" / "chúng tôi"
  brandAudience: string;     // "anh chị" / "bạn"
  brandToneNotes: string;    // ghi chú tone riêng
  phone: string;
  address: string;
  brandForbidden: string;    // từ cấm / điều không muốn AI viết
  ctaStandard: string;       // CTA mặc định
  mainProducts: string;      // sản phẩm chính
  selectedProfileId: string; // ID profile đã chọn từ DB
}
```

⚠️ `viet-theo-nguon` đang dùng 10 state lẻ thay vì `<BrandSection />` — **phải refactor**.

**Đồng nhất 100% trên mọi page** — không có ngoại lệ.

---

### Khối 8 — SEO Advanced

Dùng `<SeoAdvancedBlock />` — không tự viết lại:

```tsx
<SeoAdvancedBlock
  mainLink={seoMainLink}
  onMainLinkChange={setSeoMainLink}
  keywordLinks={seoKeywordLinks}
  onKeywordLinksChange={setSeoKeywordLinks}
  autoBold={autoBold}
  onAutoBoldChange={setAutoBold}
  footerContent={footerContent}
  onFooterContentChange={setFooterContent}
/>
```

**Nội dung bên trong (mặc định collapsed, badge "Đã cấu hình" khi có giá trị):**

| Sub-block | Input | Ghi chú |
|-----------|-------|---------|
| Gắn link từ khóa chính | `input[type=url]` | Inject vào lần đầu keyword xuất hiện |
| Thêm link theo từ khóa | `textarea` | Format: `từ khóa \| URL` mỗi dòng |
| Tự động in đậm | 4 radio chips | `AUTO_BOLD_OPTIONS` từ shared |
| Thêm nội dung cuối bài | `textarea` | HTML hoặc plain text |

**Đồng nhất 100% trên mọi page** — không có ngoại lệ.

---

### Bảng ngoại lệ — Page nào skip khối nào

| Page | Khối 2 Image | Khối 4 Outline | Ghi chú |
|------|-------------|----------------|---------|
| `viet-tin-tuc` | ❌ Ẩn | ❌ Ẩn → Thay bằng Length standalone | Tin tức không cần ảnh AI, không cần outline |
| `viet-theo-dan-bai` | ✅ | ❌ Ẩn → Thay bằng outline textarea trong Khối 1 | Dàn bài là input chính |
| `viet-bai-thong-minh` | ✅ (step 3) | ✅ (step 2, editable) | 4-step flow riêng, áp dụng linh hoạt |
| `viet-hang-loat` | ✅ | ✅ | Queue-based nhưng vẫn có config |
| Tất cả page khác | ✅ | ✅ | Áp dụng đầy đủ |

---

### Điểm mạnh hơn aiktp

| Khối | aiktp | Mình |
|------|-------|------|
| Khối 6 Model | 15+ model hardcode | Dynamic, load từ DB — user tự thêm qua UI |
| Khối 7 Brand | Website selector (đăng ngay) | Brand Profile: 10 fields + DB + profile picker dropdown |
| Khối 8 SEO | Advanced SEO options | Giống + thêm **Topical Map badge** + **Humanness badge** ở header |
| Khối 4 Outline | AI tạo, user edit | AI tạo, user edit + **preview song song** (parse [h2][h3] → HTML) |
| Global | Không có | **AI Suggest từ khóa phụ** ngay trong Khối 1 |

---

## 3. GENERATE PAGE — Nhóm A

### Layout (cố định, không thay đổi giữa các page)

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER: [← Quay lại] Tiêu đề bài | wordCount từ | [Copy] [Lưu] │
├─────────────────────────────────┬────────────────────────────────────┤
│  ARTICLE EDITOR (trái, ~65%)    │  PANEL TABS (phải, ~35%)           │
│                                 │  [📊 SEO][✅ Chất lượng]           │
│  <EditorToolbar />              │  [🔗 Internal Links][🚀 Đăng bài]  │
│  <ArticleEditor                 │  ─────────────────────────────────  │
│    html={outputHtml}            │  Tab SEO:                          │
│    streaming={streaming}        │    SEO Score bar                   │
│    onParagraphSelect={...} />   │    KeywordDensityBar               │
│                                 │    14 SeoChecks                    │
│  [Streaming: LoadingSteps UI]   │  Tab Chất lượng:                   │
│  [Done: contenteditable]        │    HumannessPanel                  │
│                                 │    SemanticScoreBar (nếu có)       │
│  <AiFloatingToolbar />          │    AICheckPanel                    │
│  (hiện khi click paragraph)     │  Tab Internal Links:               │
│                                 │    InternalLinkSuggest             │
│                                 │  Tab Đăng bài:                     │
│                                 │    Title / Meta / Slug             │
│                                 │    SerpPreview                     │
│                                 │    WebsiteSelector                 │
│                                 │    [Lưu nháp] [Đăng bài]          │
│                                 │    [Google Index] [Bing Index]     │
└─────────────────────────────────┴────────────────────────────────────┘
```

---

### SSE Stream — Loading Steps UI

```tsx
// Mỗi page tự define LOADING_STEPS riêng (nội dung khác nhau)
// Nhưng render UI theo đúng pattern này — không thay đổi class

{streaming && (
  <div className="space-y-2 p-6">
    {LOADING_STEPS.map((step) => (
      <div key={step.key} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        completedSteps.includes(step.key) ? 'bg-green-50 text-green-700' :
        activeStep === step.key           ? 'bg-blue-50 text-blue-700 animate-pulse' :
        'bg-gray-50 text-gray-400'
      }`}>
        <span className="text-lg">
          {completedSteps.includes(step.key) ? '✅' : activeStep === step.key ? step.icon : '⏳'}
        </span>
        <span className="text-sm font-medium">{step.label}</span>
      </div>
    ))}
  </div>
)}
```

Dùng `useGenerateStream()` hook — không tự viết SSE loop trong page.

---

### AI Floating Toolbar

```tsx
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';
import { AI_EDIT_COMMANDS } from '@/lib/shared/generate-tabs';

{selectedParagraph && (
  <AiFloatingToolbar
    commands={AI_EDIT_COMMANDS}  // import từ shared, không hardcode
    onCommand={(cmd) => handleAiEdit(cmd, selectedParagraph)}
    position={toolbarPosition}
  />
)}
```

---

### Panel Tab 1 — SEO

```tsx
import { computeSeoChecks } from '@/lib/shared/seo-checks';  // không tự define
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';

const { checks, score } = computeSeoChecks({
  title, metaDescription, html: outputHtml, wordCount,
  keyword, secondaryKeywords, slug,
  minWordCount: 400,   // ← chỉ override nếu page cần (tin tức = 400, mặc định = 800)
});
```

**14 checks chuẩn (áp dụng mọi page, chỉ `minWordCount` thay đổi):**

| # | Group | Check | Fixable |
|---|-------|-------|---------|
| 1 | basic | Từ khóa trong SEO title | ✅ |
| 2 | basic | Từ khóa trong Meta Description | ✅ |
| 3 | basic | Từ khóa trong URL slug | ✅ |
| 4 | basic | Từ khóa trong 10% đầu nội dung | — |
| 5 | basic | Từ khóa xuất hiện trong nội dung | — |
| 6 | basic | Độ dài ≥ `minWordCount` từ | — |
| 7 | advanced | Mật độ từ khóa 1.0–1.5% | — |
| 8 | advanced | URL slug ≤ 75 ký tự | ✅ |
| 9 | advanced | Có ≥ 1 internal link | ✅ |
| 10 | advanced | Có ≥ 1 external link | ✅ |
| 11 | advanced | Từ khóa trong alt text ảnh | ✅ |
| 12 | advanced | Có từ khóa phụ trong nội dung | — |
| 13 | title | Từ khóa ở 1/3 đầu tiêu đề | ✅ |
| 14 | title | Tiêu đề chứa số (năm/thông số) | ✅ |

---

### Panel Tab 2 — Chất lượng

```tsx
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
import AICheckPanel from '@/app/components/AICheckPanel';

// Humanness (BẮT BUỘC mọi page)
<HumannessPanel result={humannessResult} />
// score ≥ 76 → PUBLISH (xanh) | 60–75 → REVIEW (vàng) | < 60 → REWRITE (đỏ)

// Semantic Score (CHỈ page chạy Researcher+Architect pipeline)
{semanticScore !== undefined && (
  <SemanticScoreBar score={semanticScore} decision={semanticCheck?.semantic_decision} />
)}

// AI Check (BẮT BUỘC mọi page)
<AICheckPanel articleId={articleId} keyword={keyword} />
```

---

### Panel Tab 3 — Internal Links (BẮT BUỘC, hiện chỉ có viet-tinh-gon)

```tsx
import { InternalLinkSuggest } from '@/components/tinh-gon/InternalLinkSuggest';

<InternalLinkSuggest
  keyword={keyword}
  html={outputHtml}
  onInsertLink={(linkHtml) => setOutputHtml((prev) => prev + linkHtml)}
/>
// Gọi /api/tinh-gon/internal-links → tìm bài đã publish trong DB → suggest link
// ⚠️ Phải thêm vào 8 page còn lại — đây là lợi thế local so với aiktp
```

---

### Panel Tab 4 — Publish

```tsx
// Title (sync từ <h1> trong bài)
<input value={title} onChange={(e) => setTitle(e.target.value)} />

// Meta Description (≤ 160 ký tự, counter hiện màu đỏ khi > 155)
<textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} maxLength={160} rows={3} />
<p className={`text-xs text-right ${metaDesc.length > 155 ? 'text-red-500' : 'text-gray-400'}`}>
  {metaDesc.length}/160
</p>

// Slug (auto từ title, cho phép edit)
<input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />

// SERP Preview
<SerpPreview title={title} description={metaDesc} slug={slug} />

// Website Selector (load từ /api/websites)
<WebsiteSelector value={targetWebsiteId} onChange={setTargetWebsiteId} />

// Action buttons (thứ tự cố định)
<button onClick={handleCopyHtml}>📋 Copy HTML</button>
<ExportMenu html={outputHtml} title={title} />
<button onClick={handleSaveDraft}>💾 Lưu nháp</button>
<button onClick={handlePublish} disabled={!targetWebsiteId}>🚀 Đăng lên WordPress</button>

// Hiện SAU KHI publish thành công
{publishResult?.url && (
  <>
    <button onClick={() => requestIndex('google', publishResult.url)}>🔍 Google Index</button>
    <button onClick={() => requestIndex('bing', publishResult.url)}>🟠 Bing Index</button>
  </>
)}
```

**Google/Bing Index API (cần tạo mới):**
```typescript
// POST /api/index/google  → body: { url }  → Google Search Console Indexing API
// POST /api/index/bing    → body: { url }  → Bing IndexNow API
```

---

## 4. Điểm local độc quyền — KHÔNG có ở aiktp, phải giữ

| Tính năng | Nhận xét |
|-----------|---------|
| **Brand Profile System** (10 fields, DB, profile picker) | Aiktp không có — lợi thế lớn cho agency |
| **Humanness Score** (0–100, PUBLISH/REVIEW/REWRITE) | Aiktp không có — đây là USP chính |
| **Semantic SEO** (RPP, AM, Information Gain, 21 checks) | Aiktp không có |
| **Topical Map** (Hub/Spoke/Standalone) | Aiktp không có |
| **Competitor URL crawl** ở Step 1 | Aiktp không có |
| **AI Floating Toolbar** (edit từng đoạn) | Aiktp có AI Editor nhưng ít granular hơn |
| **Internal Link từ DB nội bộ** | Aiktp suggest link chung, local dùng bài thực tế của user |

---

## 5. Roadmap — Tất cả việc cần làm, theo độ ưu tiên

### 🔴 Ưu tiên 1 — Nền tảng (làm trước, mọi thứ phụ thuộc)

| Task | Effort |
|------|--------|
| Tạo `lib/shared/options.ts` (LANGUAGES, LENGTHS, TONES, IMAGE_OPTIONS, BOLD_OPTIONS) | S |
| Tạo `lib/shared/seo-checks.ts` (extract `computeSeoChecks` từ 6 generate page) | M |
| Tạo `lib/shared/generate-tabs.ts` (GENERATE_TABS, TAB_LABELS, AI_EDIT_COMMANDS) | S |
| Tạo `hooks/useGenerateStream.ts` (extract SSE loop từ các generate page) | M |
| Extract `components/BrandSection.tsx` (gom 250 dòng × 10 page) | M |
| Extract `components/SeoAdvancedBlock.tsx` (gom từ viet-theo-nguon) | S |

### 🔴 Ưu tiên 2 — Thêm vào các page đang thiếu

| Task | Page bị thiếu | Effort |
|------|--------------|--------|
| Thêm `IMAGE_OPTIONS` block vào config | 8/10 page | M |
| Chuẩn hóa Language sang SUPPORTED_LANGUAGES | viet-tin-tuc + một số | S |
| Thêm length option 5000 từ | Tất cả | S |
| Thêm `SeoAdvancedBlock` vào config | 8/10 page | M |
| Thêm `InternalLinkSuggest` vào generate | 8/10 page | S |
| Thêm `AICheckPanel` vào generate | Một số page | S |

### 🔴 Ưu tiên 2b — Google SEO Quality (song song với Ưu tiên 2)

| Task | File | Effort |
|------|------|--------|
| Nâng `computeSeoChecks` từ 14 → 21 checks (Section 7.2) | `lib/shared/seo-checks.ts` | M |
| Cập nhật writing prompt — `SEO_PROMPT_RULES` 23 rules (Section 7.1 + 7.11) | Mọi stream route | M |
| Tạo `lib/shared/schema-builder.ts` (Article + FAQ + Breadcrumb + LocalBusiness) | `lib/shared/schema-builder.ts` | M |
| Tạo `lib/shared/og-builder.ts` (Open Graph + Twitter Card) | `lib/shared/og-builder.ts` | S |
| Tạo `lib/shared/post-publish.ts` (Sitemap ping + Bing IndexNow — **không dùng Google Indexing API**) | `lib/shared/post-publish.ts` | S |
| Tạo `POST /api/index/submit` (gọi post-publish actions) | `app/api/index/submit/route.ts` | S |
| Inject schema + OG vào WordPress publish flow | `publisher.ts` hoặc từng publish route | M |
| Thêm E-E-A-T fields vào Publish tab (author, canonical) | Generate pages | S |
| **Thêm Snippet rules vào prompt theo tone** (Section 7.8: how_to, comparison, listicle) | `lib/shared/snippet-rules.ts` | S |
| **Thêm LocalBusiness schema** — thêm fields latitude/longitude/openingHours vào BrandProfile Prisma | `schema.prisma` + `schema-builder.ts` | S |
| **Cannibalization check** — API + UI warning trong Khối 1 (Section 7.10) | `api/articles/check-cannibalization/route.ts` + config pages | M |
| **Readability check** — `checkReadability()` function + hiển thị trong Tab Chất lượng (Section 7.11) | `lib/shared/readability.ts` + generate pages | M |

### 🟡 Ưu tiên 3 — Tính năng mới

| Task | Effort |
|------|--------|
| Auto-generate Table of Contents cho bài ≥ 2000 từ | M |
| OG Preview card trong Publish tab | S |
| Schema Preview (JSON-LD viewer) trong Publish tab | S |
| Outline editable inline sau khi AI tạo | L |
| Secondary keywords editable trước khi viết | M |
| SERP Preview trong Publish tab (verify đủ page) | S |

### 🟢 Backlog

| Task | Effort |
|------|--------|
| Google Search Console API (submit URL, không phải Indexing API) | L |
| Yandex image search → insert vào editor | L |
| Scheduled publish (datetime picker + cron) | L |
| Multi-platform publish (Shopify, Blogger...) | XL |

---

## 6. Checklist — Trước khi merge bất kỳ page nào

### Config Page — 8 Khối
- [ ] **Khối 1** — Keyword textarea + secondary keywords input + AI Suggest button
- [ ] **Khối 1** — Page-specific additions đặt ngay sau keyword (xem bảng Page-specific)
- [ ] **Khối 2** — Image Option: import `IMAGE_OPTIONS` từ `lib/shared/options`, render 4 card. Ẩn nếu page trong danh sách ngoại lệ.
- [ ] **Khối 3** — Language: import `SUPPORTED_LANGUAGES` từ `lib/shared/options`, KHÔNG hardcode, KHÔNG filter tùy tiện
- [ ] **Khối 4** — Outline 3 mode (no/user/ai) + Target Length bên trong mode "Không dàn ý". Ẩn nếu page trong danh sách ngoại lệ.
- [ ] **Khối 5** — Tone: dùng tone riêng của page nếu có, fallback `WRITING_TONES` từ shared. Có `title` tooltip.
- [ ] **Khối 6** — Model: dùng `<ModelPicker />`, không tự tạo selector riêng
- [ ] **Khối 7** — Brand: dùng `<BrandSection lsKey="[prefix]_brand_info" />`, không copy-paste state
- [ ] **Khối 8** — SEO Advanced: dùng `<SeoAdvancedBlock />`, mặc định collapsed, badge "Đã cấu hình"
- [ ] Thứ tự render đúng: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → Submit
- [ ] sessionStorage prefix riêng theo bảng trong `IMPLEMENTATION-GUIDE-STANDARD.md`

### Generate Page
- [ ] Dùng `useGenerateStream(endpoint)` hook (không tự viết SSE loop)
- [ ] Import `computeSeoChecks` từ `lib/shared/seo-checks` (không tự define) — **21 checks** (xem Section 7)
- [ ] Import `AI_EDIT_COMMANDS` từ `lib/shared/generate-tabs` (không hardcode)
- [ ] Panel có đủ 4 tabs theo đúng thứ tự: SEO / Chất lượng / Internal Links / Đăng bài
- [ ] `HumannessPanel` — import và render trong Tab Chất lượng
- [ ] `InternalLinkSuggest` — import và render trong Tab Internal Links
- [ ] `AICheckPanel` — import và render trong Tab Chất lượng
- [ ] `AiFloatingToolbar` — hiển thị khi click paragraph (dùng `AI_EDIT_COMMANDS` từ shared)
- [ ] Publish tab có `WebsiteSelector`
- [ ] Publish tab có **Schema Preview** (Article + FAQ schema tự sinh)
- [ ] Publish tab có **Open Graph preview** (og:title, og:description, og:image)
- [ ] Publish tab có Google Index + Bing Index button — **tự động gọi sau publish** (không cần user bấm)
- [ ] Loading Steps UI hiện khi `streaming === true`
- [ ] `minWordCount` override đúng (tin tức = 400, mặc định = 800)
- [ ] `SemanticScoreBar` chỉ render nếu page có Semantic pipeline (viet-bai-thong-minh)

### Google SEO Quality (xem Section 7 để biết đầy đủ)
- [ ] AI prompt inject `SEO_PROMPT_RULES` đủ 23 rules (Section 7.1 + 7.11)
- [ ] AI prompt có `SNIPPET_RULES_BY_TONE` theo tone how_to/comparison/listicle (Section 7.8)
- [ ] `computeSeoChecks` chạy đủ 21 checks (không dùng bản 14 checks cũ)
- [ ] Schema markup (Article + FAQ + Breadcrumb + **LocalBusiness**) generate và inject khi publish
- [ ] Canonical URL được set đúng sau publish (Yoast hoặc RankMath meta)
- [ ] Sitemap ping tự động sau publish thành công (Section 7.5)
- [ ] Bing IndexNow gọi tự động sau publish (Section 7.5)
- [ ] **KHÔNG** dùng Google Indexing API cho bài blog thông thường (Section 7.5)
- [ ] Khối 1 config page — cannibalization warning khi keyword trùng bài cũ (Section 7.10)
- [ ] Tab Chất lượng — hiện Readability metrics (avg words/paragraph, long paragraphs, visual break) (Section 7.11)
- [ ] BrandProfile Prisma có đủ: latitude, longitude, openingHours, priceRange (Section 7.9)

---

## 7. Google SEO Quality Standards

> Đây là phần aiktp.com KHÔNG CÓ.  
> Áp dụng để bài viết được Google đánh giá tốt và index nhanh.

---

### 7.1 AI Prompt Quality Rules — Bắt buộc trong mọi writing prompt

Copy nguyên block này vào cuối mọi `buildWritingPrompt()`. Không rút gọn, không bỏ rule:

```typescript
export const SEO_PROMPT_RULES = `
══ CẤU TRÚC BẮT BUỘC ══════════════════════════════════════
1. Đúng 1 thẻ <h1> chứa keyword — KHÔNG 2 H1, KHÔNG bỏ H1
2. Keyword xuất hiện trong 2 câu ĐẦU TIÊN (trước từ thứ 100)
3. Không mở bài bằng câu hỏi / "Trong bài này" / "Bạn có biết"
4. Thứ tự heading: H1 → H2 → H3. KHÔNG nhảy H1 → H3
5. Mỗi H2 tối thiểu 150 từ nội dung
6. Đoạn văn tối đa 4 câu (~60 từ). Xuống dòng sau mỗi ý

══ FEATURED SNIPPET FORMAT ═════════════════════════════════
7. Câu hỏi dạng "X là gì" → đoạn định nghĩa 40–60 từ ngay sau H1:
   <p class="definition-block"><strong>[Keyword]</strong> là [định nghĩa ngắn gọn, súc tích, đủ nghĩa].</p>
8. Bài hướng dẫn → dùng <ol><li> có số thứ tự rõ ràng cho mọi bước
9. Bài so sánh / toplist → có ít nhất 1 bảng <table> với <th> header
10. Câu trả lời cho mỗi H2 phải có trong câu đầu tiên của đoạn đó

══ FAQ + MỤC LỤC ════════════════════════════════════════════
11. Bài nào CŨNG phải có FAQ cuối bài (4–6 Q&A), dùng đúng format:
    <div class="faq-section">
      <h2>Câu hỏi thường gặp về [keyword]</h2>
      <div class="faq-item">
        <h3>[Câu hỏi người dùng hay search?]</h3>
        <p>[Trả lời ngắn 2–4 câu, có keyword phụ]</p>
      </div>
    </div>
12. Bài ≥ 2000 từ → có mục lục ngay sau H1, dùng ID anchor:
    <div class="toc">
      <p><strong>Mục lục</strong></p>
      <ul>
        <li><a href="#section-1">Tiêu đề H2 đầu tiên</a></li>
        <li><a href="#section-2">Tiêu đề H2 thứ hai</a></li>
      </ul>
    </div>
    Mỗi H2 tương ứng phải có id: <h2 id="section-1">

══ LINK & NGUỒN ════════════════════════════════════════════
13. Có ít nhất 1 outbound link tới nguồn authority:
    - Wikipedia, VnExpress, Tuoitre, Zingnews, Gov.vn
    - Format: <a href="[url]" target="_blank" rel="noopener noreferrer">[anchor text]</a>
14. Không claim tuyệt đối ("tốt nhất", "rẻ nhất", "số 1") — dùng "thuộc hàng", "được nhiều người chọn"
15. Số liệu phải ghi nguồn: "theo [tên nguồn] (năm)" hoặc link trực tiếp

══ FRESHNESS & E-E-A-T ════════════════════════════════════
16. Dòng đầu tiên sau H1 (trước TOC nếu có):
    <p class="article-meta">Cập nhật: [Tháng] [Năm hiện tại] · Tác giả: [brandName]</p>
17. Mỗi H2 có thể có 1 câu mang tính kinh nghiệm thực tế:
    "Từ kinh nghiệm [số năm] năm trong ngành, [nhận xét thực tế]..."

══ ĐOẠN KẾT ════════════════════════════════════════════════
18. Đoạn cuối bài PHẢI có: tóm tắt 2–3 câu + CTA rõ ràng
    Không kết thúc đột ngột sau một mục nội dung

══ READABILITY ════════════════════════════════════════════
19. Đoạn văn tối đa 4 câu (~60 từ). Quá 4 câu → tách thành đoạn mới
20. Sau mỗi 3–4 đoạn văn liên tiếp: phải có H3, <ul>, hoặc <table> (phá tường chữ)
21. Không có đoạn nào > 100 từ liên tiếp không có ngắt

══ MOBILE-FIRST ════════════════════════════════════════════
22. Câu không quá 25 từ — dài hơn phải tách
23. Thông số kỹ thuật (kích thước, vật liệu, trọng lượng) → dùng <ul> hoặc <table>, không viết chạy dài trong <p>

══ YÊU CẦU HTML ════════════════════════════════════════════
- Output: <h1> <h2> <h3> <p> <ul> <ol> <li> <strong> <a> <table> <tr> <th> <td>
- KHÔNG có: <html> <body> <head> <!DOCTYPE> markdown (** * #)
- Alt text ảnh: alt="[keyword] - [mô tả cụ thể]"
`;

// Dùng trong prompt builder:
// return `${mainPromptContent}\n\n${SEO_PROMPT_RULES}`;
```

---

### 7.2 Extended SEO Checks — 21 Checks (thay thế bộ 14 cũ)

Cập nhật `lib/shared/seo-checks.ts` để chạy đủ 21 checks:

| # | Group | Check | Fixable | Ghi chú |
|---|-------|-------|---------|---------|
| 1 | basic | Keyword trong SEO title | ✅ | |
| 2 | basic | Keyword trong meta description | ✅ | |
| 3 | basic | Keyword trong URL slug | ✅ | |
| 4 | basic | Keyword trong 100 từ đầu | — | Quan trọng hơn "10% đầu" |
| 5 | basic | Keyword xuất hiện trong nội dung | — | |
| 6 | basic | Số từ ≥ `minWordCount` | — | default 800, tin tức 400 |
| 7 | structure | Đúng 1 thẻ H1 | ✅ | AI hay sinh 2 H1 |
| 8 | structure | H1 chứa keyword | ✅ | |
| 9 | structure | Có ≥ 2 thẻ H2 | — | |
| 10 | structure | Không nhảy cấp heading (H1→H3) | ✅ | |
| 11 | advanced | Mật độ keyword 1.0–1.5% | — | |
| 12 | advanced | URL slug ≤ 75 ký tự | ✅ | |
| 13 | advanced | Có ≥ 1 internal link | ✅ | |
| 14 | advanced | Có ≥ 1 external link | ✅ | |
| 15 | advanced | Alt text ảnh chứa keyword | ✅ | |
| 16 | advanced | Có từ khóa phụ trong nội dung | — | |
| 17 | title | Title length 50–60 ký tự | ✅ | Google truncate > 60 |
| 18 | title | Keyword ở 1/3 đầu title | ✅ | |
| 19 | meta | Meta description 150–160 ký tự | ✅ | < 150 lãng phí, > 160 bị cắt |
| 20 | depth | Có mục FAQ cuối bài | ✅ | Cần cho FAQ schema |
| 21 | depth | Bài ≥ 2000 từ → có Table of Contents | ✅ | UX + crawl signal |

**Scoring:**
```
Checks 1–6  (basic):    mỗi check = 6 điểm  → tối đa 36đ
Checks 7–10 (structure): mỗi check = 5 điểm → tối đa 20đ
Checks 11–16 (advanced): mỗi check = 5 điểm → tối đa 30đ (bỏ 1 check thừa)
Checks 17–19 (title/meta): mỗi check = 4 điểm → tối đa 12đ
Checks 20–21 (depth):   mỗi check = 1 điểm → tối đa 2đ
Tổng: 100 điểm
```

**Threshold:**
- ≥ 85 → 🟢 Tốt (đủ điều kiện publish)
- 70–84 → 🟡 Cần cải thiện
- < 70 → 🔴 Chưa đạt — không nên publish

---

### 7.3 Schema Markup — Tự động generate khi publish

Aiktp KHÔNG có tính năng này. Đây là lợi thế trực tiếp giúp Google hiểu bài nhanh hơn và xuất hiện rich snippet.

**Schema cần generate và inject vào `<head>` khi publish lên WordPress:**

```typescript
// web/lib/shared/schema-builder.ts

interface ArticleSchemaInput {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  authorName: string;       // từ BrandProfile.shopName hoặc fallback 'Nội Thất Minh Quân'
  publishedAt: string;      // ISO 8601
  updatedAt?: string;
  keywords: string[];
}

export function buildArticleSchema(input: ArticleSchemaInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    image: input.imageUrl ? [input.imageUrl] : [],
    author: { '@type': 'Organization', name: input.authorName },
    publisher: {
      '@type': 'Organization',
      name: input.authorName,
      logo: { '@type': 'ImageObject', url: 'https://[domain]/logo.png' },
    },
    datePublished: input.publishedAt,
    dateModified: input.updatedAt || input.publishedAt,
    keywords: input.keywords.join(', '),
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
  };
}

// ── FAQ Schema — auto-extract từ .faq-section trong HTML ─────────────────────

export function buildFaqSchema(html: string): object | null {
  // Parse các .faq-item từ HTML
  // Mỗi <h3> = question, <p> kế theo = answer
  const faqItems = extractFaqItems(html); // trả về Array<{question, answer}>
  if (faqItems.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

// ── Breadcrumb Schema ─────────────────────────────────────────────────────────

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── Inject vào WordPress post khi publish ────────────────────────────────────
// Thêm vào custom field 'schema_json' hoặc dùng WP plugin Yoast/RankMath API
// để set schema qua REST API
export function buildSchemaScript(schemas: object[]): string {
  return schemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');
}
```

**Inject point:** Gọi trong `publisher.ts` (hoặc `/api/[feature]/publish`) ngay trước khi POST lên WordPress REST API. Truyền schema vào field `content` hoặc custom field.

---

### 7.4 Open Graph + Twitter Card

Sinh tự động từ title + meta + image, inject khi publish:

```typescript
// web/lib/shared/og-builder.ts

export function buildOpenGraphMeta(params: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  siteName: string;
  publishedAt: string;
}): string {
  return [
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${params.title}" />`,
    `<meta property="og:description" content="${params.description}" />`,
    `<meta property="og:url" content="${params.url}" />`,
    `<meta property="og:site_name" content="${params.siteName}" />`,
    params.imageUrl ? `<meta property="og:image" content="${params.imageUrl}" />` : '',
    `<meta property="article:published_time" content="${params.publishedAt}" />`,
    // Twitter Card
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${params.title}" />`,
    `<meta name="twitter:description" content="${params.description}" />`,
    params.imageUrl ? `<meta name="twitter:image" content="${params.imageUrl}" />` : '',
  ].filter(Boolean).join('\n');
}
```

**Dùng trong Publish tab — Preview panel:**
```tsx
// Tab Đăng bài → hiện preview card giống Facebook/Twitter share
<OgPreviewCard title={title} description={metaDesc} imageUrl={featuredImageUrl} url={previewUrl} />
```

---

### 7.5 Google Index Speed — Tự động sau publish

**Thứ tự action sau khi WordPress publish thành công:**

```typescript
// web/lib/shared/post-publish.ts

export async function runPostPublishActions(params: {
  url: string;              // URL bài vừa publish
  sitemapUrl: string;       // https://[domain]/sitemap.xml
  googleSiteToken: string;  // từ env GOOGLE_INDEXING_TOKEN
  bingApiKey: string;       // từ env BING_INDEX_NOW_KEY
}): Promise<{ google: boolean; bing: boolean; sitemap: boolean }> {

  const results = { google: false, bing: false, sitemap: false };

  // 1. Ping Google Sitemap (miễn phí, không cần xác thực)
  try {
    await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(params.sitemapUrl)}`);
    results.sitemap = true;
  } catch { /* log warning */ }

  // 2. Google — KHÔNG dùng Indexing API cho bài blog thông thường
  // ❌ Google Indexing API (indexing.googleapis.com) CHỈ hợp lệ cho:
  //    - Job Posting (Schema JobPosting)
  //    - Livestream (Schema VideoObject + BroadcastEvent)
  //    Dùng sai loại URL → bị ignore hoặc vi phạm TOS, không giúp index nhanh hơn.
  //
  // ✅ Cách đúng để Google crawl nhanh hơn:
  //    1. Sitemap ping (đã làm ở trên) — thông báo sitemap đã cập nhật
  //    2. Google Search Console → URL Inspection → Request Indexing (manual, miễn phí)
  //    3. Internal link từ trang đã index → Google theo link đến bài mới
  //    4. Không có API tự động nào hợp lệ cho regular blog articles
  results.google = false; // không có automatic Google submit cho blog article

  // 3. Bing IndexNow (miễn phí, index trong vài giờ)
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: new URL(params.url).hostname,
        key: params.bingApiKey,
        keyLocation: `https://${new URL(params.url).hostname}/${params.bingApiKey}.txt`,
        urlList: [params.url],
      }),
    });
    results.bing = res.ok;
  } catch { /* log warning */ }

  return results;
}
```

**API Route:**
```typescript
// POST /api/index/submit → body: { url }
// Gọi runPostPublishActions() → trả về { google, bing, sitemap }
// Tự động gọi ngay sau publish — KHÔNG yêu cầu user bấm thêm
```

**Publish tab UI — hiện kết quả index:**
```tsx
{publishResult && (
  <div className="mt-3 space-y-2">
    <p className="text-xs font-semibold text-gray-500">Trạng thái index:</p>
    <div className="flex gap-2 flex-wrap">
      <span className={`text-xs px-2 py-1 rounded-full ${indexResult.sitemap ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
        🗺️ Sitemap {indexResult.sitemap ? 'đã ping' : 'lỗi'}
      </span>
      <span className={`text-xs px-2 py-1 rounded-full ${indexResult.bing ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
        🟠 Bing {indexResult.bing ? 'đã gửi' : 'lỗi'}
      </span>
      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
        🔍 Google → <a href="https://search.google.com/search-console" target="_blank" className="underline">Dùng Search Console</a>
      </span>
    </div>
  </div>
)}
```

---

### 7.6 E-E-A-T Signals — Tăng độ tin cậy với Google

Google đánh giá **E-E-A-T** (Experience · Expertise · Authoritativeness · Trustworthiness). Các signal cần có:

**Trong nội dung bài viết (AI prompt phải enforce):**
- Có ít nhất 1 câu trích dẫn hoặc link ra nguồn đáng tin (báo lớn, nghiên cứu, trang chính phủ)
- Không claim tuyệt đối ("tốt nhất", "số 1") trừ khi có số liệu cụ thể
- Số liệu phải có nguồn (ví dụ: "theo Statista 2024" hoặc link)

**Trong meta/schema của bài (sinh tự động khi publish):**
```typescript
// Thêm vào Article schema:
author: {
  '@type': 'Organization',
  name: brandProfile.shopName,
  url: websiteUrl,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: brandProfile.phone,
    contactType: 'customer service',
  },
},
```

**Trong Publish tab — user điền trước khi publish:**
```tsx
// E-E-A-T section trong Tab Đăng bài:
<div className="space-y-2">
  <label className="text-xs font-semibold text-gray-500">Tác giả / Nguồn</label>
  <input value={authorName} onChange={(e) => setAuthorName(e.target.value)}
    placeholder="Nội Thất Minh Quân" className="..." />
  {/* Mặc định lấy từ BrandProfile.shopName */}
</div>
```

**Canonical URL — bắt buộc set khi publish:**
```typescript
// Trong publisher.ts — POST lên WordPress REST API:
await fetch(`${wpApiUrl}/posts/${postId}`, {
  method: 'PUT',
  body: JSON.stringify({
    // ...other fields...
    meta: {
      _yoast_wpseo_canonical: articleUrl,  // nếu dùng Yoast
      rank_math_canonical_url: articleUrl, // nếu dùng RankMath
    },
  }),
});
```

---

### 7.7 So sánh sau khi implement — Mình vs aiktp

| Tiêu chí | aiktp.com | Sau khi implement |
|---|---|---|
| SEO checks | Không hiển thị số liệu | **21 checks + score /100** |
| Schema markup | ❌ Không có | **✅ Article + FAQ + Breadcrumb + LocalBusiness tự sinh** |
| Open Graph | Tùy WordPress theme | **✅ Preview + tự inject** |
| FAQ schema | ❌ | **✅ Auto-extract từ FAQ section** |
| Table of Contents | ❌ | **✅ AI tự sinh cho bài ≥ 2000 từ** |
| Index speed | Manual copy URL | **✅ Tự động: Sitemap ping + Bing IndexNow** |
| E-E-A-T signals | ❌ | **✅ Author schema + Canonical + Source links** |
| Heading check | ❌ | **✅ Check H1 đơn, check hierarchy** |
| Humanness Score | ❌ | **✅ 0–100, PUBLISH/REVIEW/REWRITE** |
| Internal links từ DB | ❌ | **✅ Suggest từ bài thực tế của user** |
| Featured Snippet | ❌ | **✅ Rule definition-block / ol / table enforced** |
| LocalBusiness Schema | ❌ | **✅ FurnitureStore + NAP + openingHours** |
| Keyword Cannibalization | ❌ | **✅ Pre-submit check ngay trong config page** |
| Content Freshness | ❌ | **✅ article-meta + freshness date + readability rules** |

---

### 7.8 Featured Snippet Optimization

Google Featured Snippet (Position 0) = traffic free không trả tiền. Aiktp không optimize rule này.

**3 loại Featured Snippet cần nhắm:**

| Loại | Khi nào | Format HTML bắt buộc |
|------|---------|---------------------|
| Definition Snippet | Keyword dạng "X là gì", "X nghĩa là" | `<p class="definition-block">` ngay sau H1 |
| List Snippet | "Cách làm X", "Bước để X", "Top N" | `<ol><li>` có số thứ tự |
| Table Snippet | "So sánh X vs Y", "Bảng giá X" | `<table>` với `<th>` header |

**Rule cho AI prompt (đã có trong SEO_PROMPT_RULES rules 7–9, reinforcement thêm):**

```typescript
// Thêm vào buildWritingPrompt() khi tone là 'how_to', 'comparison', 'listicle':

const SNIPPET_RULES_BY_TONE: Record<string, string> = {
  how_to: `
    FEATURED SNIPPET — How-To:
    - Câu đầu sau H1 phải có: "[Keyword] gồm [N] bước sau:"
    - Dùng <ol> cho mọi bước, mỗi <li> bắt đầu bằng động từ (Chọn, Đặt, Kiểm tra...)
    - Tổng <ol> phải có 3–8 bước (không ít, không nhiều)
  `,
  comparison: `
    FEATURED SNIPPET — Table:
    - Ngay sau H1 hoặc H2 đầu tiên: bảng so sánh với ≥ 3 cột (<th>)
    - Hàng đầu tiên phải là tiêu chí ("Tiêu chí | Sản phẩm A | Sản phẩm B")
    - Có hàng "Kết luận" hoặc "Nên chọn" ở cuối bảng
  `,
  listicle: `
    FEATURED SNIPPET — List:
    - Câu sau H1: "[Keyword] bao gồm [N] lựa chọn phổ biến:"
    - Mỗi item: <li><strong>[Tên]</strong> — [1 câu mô tả ngắn]</li>
    - Không quá 8 item (Google snippet cắt sau 8)
  `,
};
```

**Check thêm vào SEO Panel (check #22 nếu muốn extend thêm):**
```
definition-block present (nếu keyword dạng "là gì")     → warn nếu thiếu
<ol> present (nếu tone là how_to)                        → warn nếu thiếu
<table> present (nếu tone là comparison/listicle)        → warn nếu thiếu
```

---

### 7.9 LocalBusiness Schema — Đặc biệt quan trọng cho nội thất

Bài viết của shop local (nội thất, nhà hàng, dịch vụ…) cần LocalBusiness Schema. Giúp Google hiển thị thông tin shop trong Local Pack (Map) khi user search "nội thất tphcm", "mua giường sắt gần đây".

**Thêm vào `schema-builder.ts`:**

```typescript
// web/lib/shared/schema-builder.ts (bổ sung thêm)

interface LocalBusinessSchemaInput {
  name: string;             // brandProfile.shopName
  url: string;              // website chính
  telephone: string;        // brandProfile.phone
  address: string;          // brandProfile.address
  latitude?: number;        // tọa độ (tùy chọn, giúp local search)
  longitude?: number;
  openingHours?: string[];  // ["Mo-Sa 08:00-20:00", "Su 09:00-17:00"]
  priceRange?: string;      // "$" / "$$" / "$$$"
}

export function buildLocalBusinessSchema(input: LocalBusinessSchemaInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',          // ← type cụ thể, không dùng 'LocalBusiness' chung
    name: input.name,
    url: input.url,
    telephone: input.telephone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.address,
      addressLocality: 'TP. Hồ Chí Minh',
      addressCountry: 'VN',
    },
    ...(input.latitude && input.longitude ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: input.latitude,
        longitude: input.longitude,
      },
    } : {}),
    ...(input.openingHours ? { openingHours: input.openingHours } : {}),
    ...(input.priceRange ? { priceRange: input.priceRange } : {}),
    sameAs: [
      // thêm Facebook, Zalo OA page nếu có
    ],
  };
}
```

**Khi nào inject LocalBusiness Schema:**
- Mọi bài blog của site local business → luôn thêm vào cùng với Article schema
- Inject vào `<head>` của WordPress post qua custom field hoặc Yoast/RankMath schema injection
- **Không inject vào page chỉ viết cho domain nước ngoài**

**Config cần thêm vào BrandProfile (Prisma):**
```prisma
// schema.prisma — thêm vào model BrandProfile
latitude    Float?
longitude   Float?
openingHours String?   // "Mo-Sa 08:00-20:00"
priceRange   String?   // "$$"
```

---

### 7.10 Keyword Cannibalization Check

**Vấn đề:** Hai bài cùng nhắm 1 keyword → Google không biết rank bài nào → cả hai tụt hạng.

**Giải pháp:** Check ngay ở config page trước khi submit, hiển thị warning rõ ràng.

**API check:**
```typescript
// GET /api/articles/check-cannibalization?keyword=[keyword]
// → trả về { exists: boolean; articles: Array<{ id, title, slug, publishedAt }> }

// Gọi khi:
// 1. User blur khỏi keyword input (debounce 800ms)
// 2. User click Submit (check lần cuối trước khi call /start)
```

**UI — hiện trong Khối 1, bên dưới keyword input:**
```tsx
{cannibalizationWarning && cannibalizationWarning.exists && (
  <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
    <p className="text-xs font-semibold text-amber-700">
      ⚠️ Đã có {cannibalizationWarning.articles.length} bài viết với từ khóa tương tự:
    </p>
    <ul className="mt-1 space-y-1">
      {cannibalizationWarning.articles.map((a) => (
        <li key={a.id} className="text-xs text-amber-600">
          • <a href={`/editor/${a.id}`} target="_blank" className="underline">{a.title}</a>
          <span className="text-amber-400 ml-1">({new Date(a.publishedAt).toLocaleDateString('vi')})</span>
        </li>
      ))}
    </ul>
    <p className="text-xs text-amber-500 mt-1">
      Cân nhắc cập nhật bài cũ thay vì viết bài mới để tránh cannibalization.
    </p>
  </div>
)}
```

**Logic check similarity (phía server):**
```typescript
// Không cần exact match — check overlap keyword bằng slug hoặc title
function isCannibalizing(newKeyword: string, existingTitle: string): boolean {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const kw = norm(newKeyword);
  const title = norm(existingTitle);
  // overlap nếu ≥ 60% từ trong keyword xuất hiện trong title
  const kwWords = kw.split(/\s+/);
  const matchCount = kwWords.filter((w) => title.includes(w)).length;
  return matchCount / kwWords.length >= 0.6;
}
```

**Thêm vào Checklist (Section 6):**
```
- [ ] Khối 1 — Cannibalization warning hiện khi keyword trùng bài cũ
```

---

### 7.11 Content Freshness + Readability Rules

#### Content Freshness

Google đánh giá cao bài mới hoặc bài được cập nhật gần đây. Các signal cần có:

**Trong AI prompt (enforce qua SEO_PROMPT_RULES rule 16 — đã có):**
```
<p class="article-meta">Cập nhật: [Tháng] [Năm hiện tại] · Tác giả: [brandName]</p>
```

**Trong WordPress publish flow:**
```typescript
// Khi publish, luôn set modified date:
body: JSON.stringify({
  date_gmt: new Date().toISOString(),         // published date
  modified_gmt: new Date().toISOString(),     // modified date (Google đọc cái này)
  // ...
})
```

**Khi user "Cập nhật bài cũ" (viet-lai-bai-viet / viet-lai-url):**
- Luôn cập nhật `modified_gmt` khi publish lại
- Thêm dòng meta mới với ngày hiện tại vào đầu bài
- SEO_PROMPT_RULES rule 16 tự xử lý phần content

#### Readability Rules — Tránh "Tường Chữ"

Google's Page Experience và người đọc đều ghét bài không ngắt dòng. Rule này enforce ngay trong prompt:

**Thêm vào SEO_PROMPT_RULES (đây là rule 19–21 — bổ sung):**

```typescript
// Append vào cuối SEO_PROMPT_RULES:

══ READABILITY ════════════════════════════════════════════════
19. Đoạn văn tối đa 4 câu. Nếu quá → tách thành đoạn mới
20. Sau mỗi 3–4 đoạn văn liên tiếp: phải có H3, bullet list, hoặc bảng (phá tường chữ)
21. Không có đoạn nào dài hơn 100 từ liên tiếp không có ngắt

══ MOBILE-FIRST ═══════════════════════════════════════════════
22. Tránh câu quá dài (> 25 từ / câu) — khó đọc trên mobile
23. Danh sách thông số kỹ thuật → dùng <ul> hoặc <table>, không viết chạy dài trong <p>
```

**SEO_PROMPT_RULES sau update: 23 rules (tăng từ 18).**

#### Chỉ số Readability cần check:

```typescript
// Thêm vào computeSeoChecks (hoặc QualityPanel riêng):

function checkReadability(html: string): {
  avgWordsPerParagraph: number;  // target: ≤ 60
  avgWordsPerSentence: number;   // target: ≤ 20
  longParagraphCount: number;    // số đoạn > 80 từ
  hasVisualBreak: boolean;       // có table/ul/ol trong bài
} 

// Ngưỡng:
// avgWordsPerParagraph ≤ 60    → ✅ | > 60 → ⚠️
// avgWordsPerSentence ≤ 20     → ✅ | > 25 → ⚠️
// longParagraphCount = 0       → ✅ | ≥ 3 → ⚠️
// hasVisualBreak = true        → ✅
```

**Hiển thị trong Tab Chất lượng** (cùng với Humanness Score):
```tsx
{readabilityResult && (
  <div className="mt-3 space-y-1 text-xs">
    <p className="font-semibold text-gray-500">📖 Readability</p>
    <p className={readabilityResult.avgWordsPerParagraph <= 60 ? 'text-green-600' : 'text-amber-600'}>
      Trung bình {readabilityResult.avgWordsPerParagraph} từ/đoạn
      {readabilityResult.avgWordsPerParagraph > 60 ? ' ⚠️ Quá dài' : ' ✅'}
    </p>
    <p className={readabilityResult.longParagraphCount === 0 ? 'text-green-600' : 'text-amber-600'}>
      {readabilityResult.longParagraphCount === 0
        ? '✅ Không có đoạn quá dài'
        : `⚠️ ${readabilityResult.longParagraphCount} đoạn > 80 từ`}
    </p>
    <p className={readabilityResult.hasVisualBreak ? 'text-green-600' : 'text-amber-600'}>
      {readabilityResult.hasVisualBreak ? '✅ Có bảng/danh sách' : '⚠️ Thiếu visual break'}
    </p>
  </div>
)}
```
