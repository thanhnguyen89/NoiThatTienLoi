# GENERATE-PAGE-STANDARD.md
## Bộ quy tắc chuẩn hóa Generate/Editor Page cho tất cả tính năng viết bài

> Phần 2 của bộ rule — đọc CONFIG-PAGE-STANDARD.md trước.  
> Áp dụng cho mọi `/[feature]/generate/page.tsx` thuộc Nhóm A.

---

## Vấn đề hiện tại

Generate pages đang bị **copy-paste từ nhau** với minor diff:

| File | InternalLinkSuggest | HumannessPanel | computeSeoChecks | SemanticScore |
|------|---------------------|----------------|-----------------|---------------|
| `viet-tinh-gon/generate` | ✅ | ✅ | riêng (14 checks) | ❌ |
| `viet-tin-tuc/generate` | ❌ | ✅ | riêng (13 checks) | ❌ |
| `viet-theo-nguon/generate` | ❌ | ✅ | riêng (14 checks) | ❌ |
| `viet-bai-thong-minh/step4` | ❌ | ✅ | riêng (14 checks) | ✅ |
| `viet-theo-dan-bai/generate` | ❌ | ? | riêng | ❌ |
| `viet-toplist/generate` | ❌ | ? | riêng | ❌ |

**`computeSeoChecks()` function bị duplicate ở mỗi page với các biến thể nhỏ** → bug khi sửa 1 chỗ không sửa được chỗ khác.

---

## Layout chuẩn — Generate Page

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER BAR: Tiêu đề bài | Word count | Keyword | Action btns  │
├───────────────────────────────┬─────────────────────────────────┤
│                               │  PANEL (right sidebar)          │
│  ARTICLE EDITOR               │  ├─ Tab: SEO                    │
│  (contenteditable)            │  │   ├─ SEO Score bar           │
│  ─────────────────            │  │   ├─ Keyword Density bar     │
│  EditorToolbar (bold/italic/) │  │   └─ 14 SEO checks           │
│  AiFloatingToolbar (on select)│  ├─ Tab: Chất lượng             │
│                               │  │   ├─ Humanness Score         │
│  [Streaming: dots animation]  │  │   ├─ Semantic Score (nếu có) │
│  [Done: editable]             │  │   └─ AI Check panel          │
│                               │  ├─ Tab: Internal Links         │
│                               │  │   └─ InternalLinkSuggest     │
│                               │  └─ Tab: Publish                │
│                               │      ├─ Title / Meta / Slug     │
│                               │      ├─ SERP Preview            │
│                               │      ├─ Website selector        │
│                               │      ├─ [Lưu nháp] button       │
│                               │      └─ [Đăng bài] button       │
└───────────────────────────────┴─────────────────────────────────┘
```

---

## Panel Tabs — 4 tabs cố định (thứ tự không đổi)

```typescript
// lib/shared/generate-tabs.ts
export const GENERATE_TABS = ['seo', 'quality', 'links', 'publish'] as const;
export type GenerateTab = typeof GENERATE_TABS[number];

export const TAB_LABELS: Record<GenerateTab, { label: string; icon: string }> = {
  seo:     { label: 'SEO',          icon: '📊' },
  quality: { label: 'Chất lượng',   icon: '✅' },
  links:   { label: 'Internal Links', icon: '🔗' },
  publish: { label: 'Đăng bài',     icon: '🚀' },
};
```

---

## Panel Tab 1 — SEO (đồng nhất 100%)

### computeSeoChecks — PHẢI extract ra shared file

```typescript
// lib/shared/seo-checks.ts

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
  internalDomain?: string;   // default: 'noithatminhquan.vn'
  minWordCount?: number;     // default: 800, override per page (news = 400)
}

export function computeSeoChecks(input: SeoCheckInput): { checks: SeoCheck[]; score: number } {
  const {
    title, metaDescription, html, wordCount, keyword,
    secondaryKeywords = [],
    slug,
    internalDomain = 'noithatminhquan.vn',
    minWordCount = 800,
  } = input;

  // ... logic chung ...
  // 14 checks chuẩn (xem bên dưới)
}
```

**14 checks chuẩn (không thêm bớt giữa các page — chỉ override `minWordCount`):**

| # | Group | Check | Fixable |
|---|-------|-------|---------|
| 1 | basic | Từ khóa trong SEO title | ✅ |
| 2 | basic | Từ khóa trong Meta Description | ✅ |
| 3 | basic | Từ khóa trong URL slug | ✅ |
| 4 | basic | Từ khóa trong 10% đầu nội dung | — |
| 5 | basic | Từ khóa xuất hiện trong nội dung | — |
| 6 | basic | Độ dài nội dung ≥ `minWordCount` từ | — |
| 7 | advanced | Mật độ từ khóa 1.0–1.5% | — |
| 8 | advanced | URL slug ≤ 75 ký tự | ✅ |
| 9 | advanced | Có ít nhất 1 internal link | ✅ |
| 10 | advanced | Có ít nhất 1 external link | ✅ |
| 11 | advanced | Từ khóa trong alt text ảnh | ✅ |
| 12 | advanced | Có từ khóa phụ trong nội dung | — |
| 13 | title | Từ khóa ở 1/3 đầu tiêu đề | ✅ |
| 14 | title | Tiêu đề chứa số (năm, thông số) | ✅ |

**SEO Score = tổng có trọng số, tham chiếu `SEO_WEIGHTS` trong `lib/seo-weights.ts`**

```typescript
// Trong mỗi generate page — không còn tự define computeSeoChecks nữa
import { computeSeoChecks } from '@/lib/shared/seo-checks';

const { checks, score } = computeSeoChecks({
  title, metaDescription, html, wordCount, keyword,
  secondaryKeywords,
  slug,
  minWordCount: 400,    // viet-tin-tuc override về 400
});
```

### KeywordDensityBar — đã đúng, dùng lại

```tsx
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
<KeywordDensityBar keyword={keyword} html={outputHtml} />
```

---

## Panel Tab 2 — Chất lượng (đồng nhất 100%)

### HumannessPanel — đã đúng, dùng lại

```tsx
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
<HumannessPanel result={humannessResult} />
```

Rule cho Humanness:
- Nếu stream chưa xong → hiện skeleton
- `score ≥ 76` → badge xanh "PUBLISH"
- `score 60–75` → badge vàng "REVIEW"
- `score < 60` → badge đỏ "REWRITE" + nút "Viết lại"

### SemanticScore — chỉ cho page có Semantic pipeline

Hiện chỉ có `viet-bai-thong-minh/step4`. Các page khác **không cần thêm** trừ khi chạy qua Researcher + Architect pipeline.

```tsx
{semanticScore !== undefined && (
  <SemanticScoreBar score={semanticScore} decision={semanticCheck?.semantic_decision} />
)}
```

### AICheckPanel — BẮT BUỘC trên tất cả page

```tsx
import AICheckPanel from '@/app/components/AICheckPanel';
<AICheckPanel articleId={articleId} keyword={keyword} />
```

**⚠️ Vấn đề hiện tại:** `viet-theo-nguon/generate` và `viet-tin-tuc/generate` đã có AICheckPanel nhưng `viet-theo-dan-bai`, `viet-toplist`, `viet-danh-gia-san-pham` chưa rõ.

---

## Panel Tab 3 — Internal Links (BẮT BUỘC, hiện chỉ có viet-tinh-gon)

```tsx
// Hiện chỉ viet-tinh-gon import InternalLinkSuggest
// Phải thêm vào TẤT CẢ generate page Nhóm A

import { InternalLinkSuggest } from '@/components/tinh-gon/InternalLinkSuggest';

<InternalLinkSuggest
  keyword={keyword}
  html={outputHtml}
  onInsertLink={(linkHtml) => {
    // Append link vào cuối bài hoặc replace selected text
    setOutputHtml((prev) => prev + linkHtml);
  }}
/>
```

**InternalLinkSuggest hoạt động:**
1. Gọi `/api/tinh-gon/internal-links` với keyword + html hiện tại
2. API tìm bài đã publish trong DB có topic liên quan
3. Trả về danh sách { title, url, relevance } 
4. User click → insert link `<a href="url">anchor text</a>` vào bài

Đây là **lợi thế của local so với aiktp** — aiktp không có internal link từ DB nội bộ.

---

## Panel Tab 4 — Publish (đồng nhất 100%)

### Các fields chuẩn

```tsx
// Title (editable, sync với H1 trong bài)
<input value={title} onChange={(e) => setTitle(e.target.value)} ... />

// Meta Description (editable, tối đa 160 ký tự)
<textarea value={metaDesc} maxLength={160} ... />
<p className="text-xs text-right">{metaDesc.length}/160</p>

// Slug (editable, auto-generate từ title)
<input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} ... />

// SERP Preview
<SerpPreview title={title} description={metaDesc} slug={slug} />
```

### Website Selector (BẮT BUỘC, hiện chưa có ở nhiều page)

```tsx
// Chọn website để publish — load từ /api/websites
<WebsiteSelector value={targetWebsiteId} onChange={setTargetWebsiteId} />
```

```typescript
// API: GET /api/websites — trả về list website user đã cấu hình
// Prisma model: Website { id, name, wpUrl, wpUser, wpAppPassword, ... }
// Hiện có ở /cau-hinh-website
```

### Action Buttons — thứ tự cố định

```tsx
<div className="space-y-2 pt-4 border-t border-gray-100">
  
  {/* 1. Copy HTML */}
  <button onClick={handleCopyHtml} className="w-full ...">
    📋 Copy HTML
  </button>

  {/* 2. Export (dropdown) */}
  <ExportMenu html={outputHtml} title={title} />

  {/* 3. Lưu nháp */}
  <button onClick={handleSaveDraft} className="w-full ... border">
    💾 Lưu nháp
  </button>

  {/* 4. Đăng bài (primary) — disabled nếu chưa chọn website */}
  <button
    onClick={handlePublish}
    disabled={!targetWebsiteId || publishing}
    className="w-full bg-blue-600 text-white ..."
  >
    🚀 Đăng lên WordPress
  </button>

  {/* 5. Google/Bing Index — hiện sau khi đã publish */}
  {publishedPostId && (
    <button onClick={handleRequestIndex} className="w-full ... text-green-700">
      🔍 Yêu cầu Google Index
    </button>
  )}

</div>
```

### Google/Bing Index — CẦN THÊM (aiktp có, local chưa có)

```typescript
// POST /api/index/google
// Body: { url: string }
// → Gọi Google Search Console Indexing API
// → Trả về { success, message }

// POST /api/index/bing
// Body: { url: string }
// → Gọi Bing IndexNow API
// → Trả về { success, message }
```

Hiển thị sau khi publish thành công:
```tsx
{publishResult?.url && (
  <div className="space-y-1.5">
    <button onClick={() => requestIndex('google', publishResult.url)} ...>
      🔍 Yêu cầu Google Index
    </button>
    <button onClick={() => requestIndex('bing', publishResult.url)} ...>
      🟠 Yêu cầu Bing Index
    </button>
  </div>
)}
```

---

## AI Floating Toolbar — BẮT BUỘC (đã có, cần verify đủ page)

```tsx
// Hiển thị khi user click vào paragraph/heading trong editor
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';

{selectedParagraph && (
  <AiFloatingToolbar
    commands={AI_EDIT_COMMANDS}
    onCommand={(cmd) => handleAiEdit(cmd, selectedParagraph)}
    position={toolbarPosition}
  />
)}
```

**AI_EDIT_COMMANDS chuẩn — dùng chung cho tất cả page:**
```typescript
// lib/shared/generate-tabs.ts
export const AI_EDIT_COMMANDS = [
  { value: 'shorten',      label: 'Rút gọn',         icon: '✂️' },
  { value: 'expand',       label: 'Mở rộng',          icon: '📝' },
  { value: 'humanize',     label: 'Tự nhiên hơn',     icon: '🧑' },
  { value: 'more_spec',    label: 'Thêm chi tiết',    icon: '🔍' },
  { value: 'stronger_cta', label: 'CTA mạnh hơn',     icon: '💬' },
  { value: 'rewrite',      label: 'Viết lại đoạn',    icon: '🔄' },
] as const;
```

**⚠️ Vấn đề:** Các page đang hardcode array này — phải import từ shared.

---

## SSE Stream — Pattern chuẩn (giống nhau tất cả page)

### Step events — Hiển thị progress

Tất cả stream phải có loading steps UI:

```tsx
// Khi đang streaming: hiện progress steps
{streaming && (
  <div className="space-y-2 p-6">
    {LOADING_STEPS.map((step, i) => (
      <div key={step.key} className={`flex items-center gap-3 p-3 rounded-lg ${
        completedSteps.includes(step.key) ? 'bg-green-50 text-green-700' :
        activeStep === step.key          ? 'bg-blue-50 text-blue-700 animate-pulse' :
        'bg-gray-50 text-gray-400'
      }`}>
        <span>{completedSteps.includes(step.key) ? '✅' : activeStep === step.key ? step.icon : '⏳'}</span>
        <span className="text-sm">{step.label}</span>
      </div>
    ))}
  </div>
)}
```

### SSE client — Pattern chuẩn (không thay đổi)

```typescript
// useGenerateStream.ts — extract thành custom hook

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
    setStreaming(true);
    setOutputHtml('');
    setCompletedSteps([]);
    setError('');

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
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'step')      setActiveStep(event.step);
            if (event.type === 'step_done') setCompletedSteps((p) => [...p, event.step]);
            if (event.type === 'chunk')     setOutputHtml((p) => p + (event.text ?? ''));
            if (event.type === 'done')      { setStreamResult(event.data); setStreaming(false); }
            if (event.type === 'error')     { setError(event.message); setStreaming(false); }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(String(err));
      setStreaming(false);
    }
  }

  function abort() { abortRef.current?.abort(); }

  return { streaming, activeStep, completedSteps, outputHtml, streamResult, error, startStream, abort };
}
```

---

## Shared files cần tạo / extract

```
web/
├── lib/
│   └── shared/
│       ├── seo-checks.ts          ← computeSeoChecks() dùng chung
│       └── generate-tabs.ts       ← GENERATE_TABS, AI_EDIT_COMMANDS
├── hooks/
│   └── useGenerateStream.ts       ← SSE client hook dùng chung
└── components/
    └── generate/
        ├── GeneratePanelTabs.tsx  ← Tab bar + tab content shell
        ├── SeoPanel.tsx           ← Tab SEO: score bar + checks
        ├── QualityPanel.tsx       ← Tab Chất lượng: Humanness + AI Check
        ├── LinksPanel.tsx         ← Tab Internal Links
        └── PublishPanel.tsx       ← Tab Publish: title/meta/slug/buttons
```

---

## Điểm local độc quyền — KHÔNG có ở aiktp

Giữ nguyên, không bỏ vì đây là lợi thế cạnh tranh:

| Tính năng | Có ở tất cả generate page? | Ghi chú |
|-----------|---------------------------|---------|
| Humanness Score (0–100) | ✅ Có | Cần verify viet-toplist, viet-theo-dan-bai |
| AI Floating Toolbar (edit paragraph) | ✅ Có | Cần verify đủ page |
| 14-check SEO Panel | ✅ Có | `computeSeoChecks` đang bị dupe |
| Keyword Density Bar | ✅ Có | Cần verify đủ page |
| AI Check Panel (detectability) | ⚠️ Thiếu một số | Cần thêm |
| Internal Link Suggest | ❌ Chỉ tinh-gon | Cần thêm vào tất cả |

---

## Điểm aiktp có hơn — CẦN BỔ SUNG vào generate page

### 🔴 Cao — làm ngay

| Tính năng | Hiện trạng | Việc cần làm | Effort |
|-----------|-----------|--------------|--------|
| Internal Link Suggest | Chỉ viet-tinh-gon | Copy import sang 8 page còn lại | S |
| `computeSeoChecks` dupe | 6 bản copy | Extract ra `lib/shared/seo-checks.ts` | M |
| AI_EDIT_COMMANDS dupe | 6 bản copy | Extract ra `lib/shared/generate-tabs.ts` | S |
| Website Selector trong Publish tab | Chưa rõ đủ page | Verify + thêm nếu thiếu | S |

### 🟡 Trung bình

| Tính năng | Hiện trạng | Việc cần làm | Effort |
|-----------|-----------|--------------|--------|
| Google/Bing Index button | ❌ Không có | Tạo API route + button sau publish | M |
| Image search & insert | ❌ Không có | Yandex image search → insert vào editor | L |
| SERP Preview | Có ở một số page | Verify + thêm vào Publish tab tất cả page | S |

### 🟢 Thấp

| Tính năng | Hiện trạng | Việc cần làm | Effort |
|-----------|-----------|--------------|--------|
| Scheduled publish | ❌ Không có | Thêm datetime picker + cron job | L |
| Multi-platform publish | ❌ Chỉ WordPress | Shopify / Blogger integration | XL |
| Export Word/PDF | Có `ExportMenu` | Verify đủ page | S |

---

## Checklist khi tạo generate page mới

- [ ] Import `computeSeoChecks` từ `lib/shared/seo-checks.ts` (không tự define)
- [ ] Import `AI_EDIT_COMMANDS` từ `lib/shared/generate-tabs.ts`
- [ ] Dùng `useGenerateStream()` hook (không tự viết SSE loop)
- [ ] Panel có đủ 4 tabs: SEO / Chất lượng / Internal Links / Đăng bài
- [ ] HumannessPanel — import từ `components/tinh-gon/HumannessPanel`
- [ ] InternalLinkSuggest — import từ `components/tinh-gon/InternalLinkSuggest`
- [ ] AICheckPanel — import từ `app/components/AICheckPanel`
- [ ] AiFloatingToolbar — hiển thị khi click paragraph
- [ ] Publish tab có Website Selector
- [ ] Google Index button hiện sau publish thành công
- [ ] Loading steps UI trong khi streaming
- [ ] `minWordCount` override phù hợp (tin tức = 400, bài chuẩn = 800)

---

## So sánh tổng quan cuối cùng

```
                    CONFIG PAGE          GENERATE PAGE
                    ────────────         ─────────────
Đồng nhất?         Block A/B/C          Tab 1/2/3/4
Khác nhau?         Block D (nghiệp vụ)  Loading steps riêng từng page
                                        minWordCount per page
                                        Semantic score chỉ pipeline page

Local tốt hơn:     Brand Profile        Humanness Score
                   Semantic SEO         AI Floating Toolbar
                   Topical Map          Internal Link Suggest
                   Competitor crawl     AI Check Panel

Cần thêm:          Image Option (8 page) Internal Link (8 page)
                   SEO Block (8 page)   computeSeoChecks extract
                   Language chuẩn hóa  Google/Bing Index button
```
