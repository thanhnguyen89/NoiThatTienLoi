# VIET-BAI-THONG-MINH-IMPLEMENTATION.md
## Spec triển khai trang Viết Bài Thông Minh — 4-step wizard

> Tài liệu này dành cho dev.  
> Đọc `PAGE-STANDARD.md` trước để nắm kiến trúc tổng (shared files, 8-block config, SEO standards).  
> Đọc `IMPLEMENTATION-GUIDE-STANDARD.md` để nắm convention đặt tên, sessionStorage, error handling.

---

## 0. Phân tích aiktp vs Local — Điểm khác biệt cốt lõi

### aiktp "Viết thông minh" — 11 bước tuần tự

| Bước | aiktp | Local |
|------|-------|-------|
| B1 | Keyword + Language | ✅ Gom vào Step 1 |
| B2 | Từ khóa phụ (AI suggest) | ✅ Gom vào Step 1 |
| B3 | Dàn ý (AI/manual/skip, 2 model AI) | ✅ Gom vào Step 3 (sau khi có semantic) |
| B4 | Tiêu đề (AI sinh 4–6 → user chọn) | ✅ Gom vào Step 3 |
| B5 | Nguồn dữ liệu (4 loại) | ✅ Gom vào Step 1, thêm Google Search |
| B6 | Semantic keywords (step riêng) | ✅ **Tự động** sau Step 1 (không manual) |
| B7 | Chọn model + viết bài (~30s) | ✅ Gom vào Step 3 + generate Step 4 |
| B8 | Chọn ảnh + video YouTube | ✅ IMAGE_OPTIONS trong Step 3, không có YouTube |
| B9 | Edit + SEO Score + AI Editor | ✅ Generate page (4 panel tabs chuẩn) |
| B10 | Publish (6 platform) | ✅ Publish tab → WordPress REST API |
| B11 | Google/Bing Index | ✅ Tự động sau publish (Sitemap ping + Bing IndexNow) |

### 7 điểm local HƠN aiktp

| Tính năng | aiktp | Local |
|-----------|-------|-------|
| Số bước UX | 11 bước rời → dễ bỏ giữa chừng | **4 steps gom nhóm** → hoàn chỉnh hơn |
| Semantic analysis | User nhập tay Semantic Keywords | **AI tự phân tích** → Macro Context, Intent, RPP, AM |
| Topical Map | ❌ | **✅ Hub / Spoke / Standalone** |
| Competitor analysis | ❌ | **✅ Crawl tối đa 3 URL đối thủ** |
| Content type | ❌ (viết 1 kiểu duy nhất) | **✅ 7 loại** (Blog SEO, How-To, Listicle, Comparison, Review, Pillar, Local SEO) |
| Brand Profile | ❌ Website selector 1 field | **✅ 10 fields + DB + profile picker** |
| Humanness Score | ❌ | **✅ 0–100, PUBLISH/REVIEW/REWRITE** |
| Dynamic model | Static list 5 model cũ | **✅ Load từ DB, admin thêm mới qua UI** |
| Schema markup | ❌ | **✅ Article + FAQ + Breadcrumb + LocalBusiness** |
| Readability check | ❌ | **✅ avg words/paragraph, visual break** |
| Cannibalization check | ❌ | **✅ Warning ngay trong Step 1** |

### 2 điểm aiktp có, local chưa có (cần thêm)

| Tính năng | aiktp | Ghi chú |
|-----------|-------|---------|
| Data source: Google Search | Tổng hợp từ Google trước khi viết | **Cần thêm** — gọi search API lấy top 5 kết quả, summarize làm context |
| Embed YouTube video vào bài | Tìm video liên quan, chèn vào editor | **Backlog** — phức tạp, ít giá trị SEO hơn ảnh |

---

## 1. Kiến trúc — 4-Step Wizard

```
Step 1: /viet-bai-thong-minh          ← Keyword + Sources + Content Type
         ↓ (POST /api/vbt/analyze)
Step 2: /viet-bai-thong-minh/step2    ← Semantic Analysis Review (AI đã phân tích)
         ↓ (user xác nhận)
Step 3: /viet-bai-thong-minh/step3    ← Config: Titles + Outline + 8 Khối chuẩn
         ↓ (POST /api/vbt/start → tạo Article record)
Step 4: /viet-bai-thong-minh/step4    ← Generate + Editor + Publish
         ↓ SSE: /api/vbt/stream?runId=xxx
```

### API Routes

```
POST /api/vbt/analyze     → Semantic analysis (step 1 → step 2)
POST /api/vbt/titles      → Sinh 4–5 title options (step 3 button)
POST /api/vbt/outline     → Sinh dàn ý AI (step 3 button)
POST /api/vbt/start       → Tạo Article record, trả runId (step 3 → step 4)
GET  /api/vbt/stream      → SSE stream viết bài (step 4)
POST /api/vbt/crawl-url   → Crawl 1 URL (competitor hoặc data source)
POST /api/vbt/google-data → Fetch top 5 Google results (data source "Google+AI")
```

### sessionStorage prefix: `vbt_`

| Key | Lưu gì | Xóa khi |
|-----|---------|---------|
| `vbt_step1` | Toàn bộ state Step 1 (JSON) | Khi bắt đầu step 1 mới |
| `vbt_semantic` | Kết quả analyze từ /api/vbt/analyze | Khi bắt đầu step 1 mới |
| `vbt_step3` | Toàn bộ state Step 3 (JSON) | Khi bắt đầu step 1 mới |
| `vbt_runId` | runId sau khi /api/vbt/start | Khi publish xong |
| `vbt_brand_info` | BrandSection state | Persist (không xóa) |

### Flow chuyển bước

```
Step 1 → Step 2:  router.push('/viet-bai-thong-minh/step2') — truyền qua sessionStorage
Step 2 → Step 3:  router.push('/viet-bai-thong-minh/step3') — user confirm
Step 3 → Step 4:  router.push('/viet-bai-thong-minh/step4') — sau khi /api/vbt/start OK
Step N → Step 1:  router.push('/viet-bai-thong-minh')      — nút "Bắt đầu lại"
```

**Guard:** Mỗi step kiểm tra sessionStorage ở đầu — nếu không có data của step trước → redirect về step 1.

```typescript
// Đầu Step 2:
useEffect(() => {
  const step1 = sessionStorage.getItem('vbt_step1');
  if (!step1) router.replace('/viet-bai-thong-minh');
}, []);
```

---

## 2. Types & Constants

```typescript
// web/lib/viet-bai-thong-minh/types.ts

export type ContentType =
  | 'blog_seo'       // Blog SEO chuẩn, có FAQ, mật độ keyword đều
  | 'how_to'         // Hướng dẫn step-by-step, <ol><li>
  | 'listicle'       // Top N, danh sách, <ul>
  | 'comparison'     // So sánh A vs B, có bảng <table>
  | 'review'         // Đánh giá sản phẩm/dịch vụ, có Pros/Cons
  | 'pillar'         // Pillar page, 3000-5000 từ, TOC bắt buộc
  | 'local_seo';     // Local business, có địa chỉ, giờ mở cửa, map

export type TopicalMapRole = 'hub' | 'spoke' | 'standalone';

export type DataSourceMode =
  | 'ai_only'         // AI dùng dữ liệu của mình (nhanh nhất)
  | 'url_crawl'       // Crawl 1-3 URL do user cung cấp
  | 'manual_text'     // User paste text thủ công
  | 'google_search';  // Fetch top 5 Google kết quả → summarize (giống aiktp "Google+AI")

export type OutlineMode = 'no_outline' | 'user_outline' | 'ai_outline';

// ── State Step 1 ──────────────────────────────────────────────────────────────
export interface VbtStep1State {
  keyword: string;
  secondaryKeywordsRaw: string;        // comma-separated
  contentType: ContentType;
  topicalMapRole: TopicalMapRole;
  competitorUrls: string[];            // max 3 URL đối thủ
  dataSourceMode: DataSourceMode;
  dataSourceUrls: string[];            // cho url_crawl mode (max 3)
  dataSourceText: string;              // cho manual_text mode
  language: string;                    // từ SUPPORTED_LANGUAGES
}

// ── Kết quả Semantic Analysis (Step 2) ───────────────────────────────────────
export interface SemanticAnalysis {
  macroContext: string;                // bức tranh toàn cảnh chủ đề
  searchIntent: 'informational' | 'navigational' | 'commercial' | 'transactional';
  intentExplanation: string;           // giải thích 1-2 câu
  rppMap: Array<{                      // Reader Pain Points
    pain: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  attributeMap: Array<{                // Attribute Map — các khía cạnh cần cover
    attribute: string;
    importance: 'must' | 'should' | 'nice_to_have';
  }>;
  semanticKeywords: string[];          // LSI/semantic keywords AI đề xuất
  suggestedContentType: ContentType;   // AI gợi ý content type phù hợp
  estimatedWordCount: number;          // AI ước tính độ dài phù hợp
  competitorInsights?: string;         // Nếu có competitor URLs: tóm tắt điểm mạnh/yếu
}

// ── State Step 3 ──────────────────────────────────────────────────────────────
export interface VbtStep3State {
  // Title
  titleOptions: string[];              // 4-5 AI generated titles
  selectedTitleIndex: number;          // user chọn
  customTitle: string;                 // nếu user tự nhập

  // Outline
  outlineMode: OutlineMode;
  userOutlineText: string;
  aiOutlineText: string;               // đã edit
  aiOutlineObjective: string;
  aiOutlineSize: string;

  // 8-block config
  imageOption: string;
  targetLength: number;
  tone: string;
  model: string;
  brand: BrandSectionState;
  seoMainLink: string;
  seoKeywordLinks: string;
  autoBold: string;
  footerContent: string;
}
```

---

## 3. Constants

```typescript
// web/lib/viet-bai-thong-minh/options.ts

export const CONTENT_TYPES: Array<{
  value: ContentType;
  label: string;
  icon: string;
  note: string;
  defaultLength: number;
}> = [
  { value: 'blog_seo',   label: 'Blog SEO',      icon: '📝', note: 'Bài chuẩn SEO, FAQ, keyword đều',   defaultLength: 1500 },
  { value: 'how_to',     label: 'Hướng dẫn',     icon: '🔧', note: 'Step-by-step, <ol>, rõ ràng',       defaultLength: 1200 },
  { value: 'listicle',   label: 'Danh sách',      icon: '📋', note: 'Top N, <ul>, ngắn gọn mỗi mục',    defaultLength: 1500 },
  { value: 'comparison', label: 'So sánh',        icon: '⚖️', note: 'A vs B, bảng so sánh bắt buộc',   defaultLength: 2000 },
  { value: 'review',     label: 'Đánh giá',       icon: '⭐', note: 'Pros/Cons, kết luận rõ ràng',       defaultLength: 1800 },
  { value: 'pillar',     label: 'Pillar Content', icon: '🏛️', note: '3000-5000 từ, TOC bắt buộc',       defaultLength: 3000 },
  { value: 'local_seo',  label: 'Local SEO',      icon: '📍', note: 'Địa phương, địa chỉ, giờ mở cửa',  defaultLength: 1200 },
];

export const TOPICAL_MAP_ROLES: Array<{
  value: TopicalMapRole;
  label: string;
  note: string;
}> = [
  { value: 'hub',        label: 'Hub (Pillar)',  note: 'Bài chính — link ra nhiều Spoke' },
  { value: 'spoke',      label: 'Spoke',         note: 'Bài con — link về Hub' },
  { value: 'standalone', label: 'Độc lập',       note: 'Không thuộc cụm nào' },
];

export const DATA_SOURCE_MODES: Array<{
  value: DataSourceMode;
  label: string;
  icon: string;
  note: string;
}> = [
  { value: 'ai_only',       label: 'AI tự viết',     icon: '🤖', note: 'Nhanh nhất, phù hợp chủ đề phổ biến' },
  { value: 'google_search', label: 'Google + AI',    icon: '🔍', note: 'AI tổng hợp từ top 5 Google trước khi viết' },
  { value: 'url_crawl',     label: 'URL + AI',       icon: '🔗', note: 'Cung cấp 1-3 link, AI đọc và tham khảo' },
  { value: 'manual_text',   label: 'Nhập liệu + AI', icon: '📄', note: 'Paste dữ liệu text, AI viết từ đó' },
];

export const VBT_TONES = [
  { value: 'seo_basic',    label: 'SEO Cơ bản',     note: 'Tập trung keyword, phù hợp câu hỏi' },
  { value: 'seo_extended', label: 'SEO Mở rộng',    note: 'Giải thích + ví dụ + so sánh' },
  { value: 'seo_longform', label: 'SEO Chuyên sâu', note: 'Longform, chi tiết, pillar content' },
  { value: 'how_to',       label: 'Hướng dẫn',      note: 'Step 1 → 2 → 3, rõ ràng' },
  { value: 'listicle',     label: 'Danh sách',       note: 'Top N, bullet ngắn gọn' },
  { value: 'comparison',   label: 'So sánh',         note: 'A vs B, có bảng' },
  { value: 'review',       label: 'Đánh giá',        note: 'Pros/Cons, kết luận thực tế' },
  { value: 'story',        label: 'Kể chuyện',       note: 'Narrative, cảm xúc, tường thuật' },
  { value: 'technical',    label: 'Kỹ thuật',        note: 'Thông số, số liệu, chính xác cao' },
  { value: 'friendly',     label: 'Thân thiện',      note: 'Gần gũi, tránh dấu vết AI' },
  { value: 'local_seo',    label: 'Local SEO',       note: 'Nhấn mạnh địa điểm, thương hiệu địa phương' },
] as const;

export const VBT_AI_OUTLINE_OBJECTIVES = [
  { value: 'comprehensive', label: 'Toàn diện',    note: 'Cover mọi khía cạnh' },
  { value: 'beginner',      label: 'Người mới',    note: 'Giải thích từ cơ bản' },
  { value: 'expert',        label: 'Chuyên sâu',   note: 'Thuật ngữ kỹ thuật, số liệu' },
  { value: 'local_focus',   label: 'Local',         note: 'Nhấn vào địa phương, thương hiệu nội địa' },
  { value: 'buying_guide',  label: 'Mua hàng',      note: 'Hướng dẫn chọn mua, so sánh sản phẩm' },
  { value: 'problem_solve', label: 'Giải pháp',     note: 'Tập trung giải quyết vấn đề' },
] as const;

export const VBT_AI_OUTLINE_SIZES = [
  { value: 'xs', label: 'Mini',    wordRange: '600-800 từ',   h2Count: 3 },
  { value: 'sm', label: 'Ngắn',    wordRange: '800-1200 từ',  h2Count: 4 },
  { value: 'md', label: 'Chuẩn',   wordRange: '1200-2000 từ', h2Count: 5 },
  { value: 'lg', label: 'Dài',     wordRange: '2000-3000 từ', h2Count: 6 },
  { value: 'xl', label: 'Pillar',  wordRange: '3000-5000 từ', h2Count: 8 },
] as const;

// Loading steps Step 4
export const VBT_LOADING_STEPS = [
  { key: 'init',      label: 'Chuẩn bị dữ liệu',           icon: '⚙️' },
  { key: 'research',  label: 'Phân tích keyword & context', icon: '🔬' },
  { key: 'outline',   label: 'Xây dựng cấu trúc bài',      icon: '🏗️' },
  { key: 'writing',   label: 'Viết nội dung',               icon: '✍️' },
  { key: 'seo',       label: 'Tối ưu SEO',                  icon: '📊' },
  { key: 'humanize',  label: 'Humanize & kiểm tra chất lượng', icon: '🧑' },
  { key: 'done',      label: 'Hoàn tất',                    icon: '🎉' },
] as const;
```

---

## 4. Step 1 — Keyword & Sources

**Route:** `/viet-bai-thong-minh`  
**File:** `web/app/viet-bai-thong-minh/page.tsx`

### State

```typescript
const [keyword, setKeyword]                       = useState('');
const [secondaryKeywordsRaw, setSecondaryKeywordsRaw] = useState('');
const [contentType, setContentType]               = useState<ContentType>('blog_seo');
const [topicalMapRole, setTopicalMapRole]          = useState<TopicalMapRole>('standalone');
const [competitorUrls, setCompetitorUrls]          = useState<string[]>(['', '', '']);
const [dataSourceMode, setDataSourceMode]          = useState<DataSourceMode>('ai_only');
const [dataSourceUrls, setDataSourceUrls]          = useState<string[]>(['', '', '']);
const [dataSourceText, setDataSourceText]          = useState('');
const [language, setLanguage]                      = useState('Vietnamese');
const [suggestingKw, setSuggestingKw]              = useState(false);
const [cannibalizationWarning, setCannibalizationWarning] = useState<{
  exists: boolean;
  articles: Array<{ id: string; title: string; slug: string; publishedAt: string }>;
} | null>(null);
const [analyzing, setAnalyzing]                    = useState(false); // khi submit
```

### Layout UI

```
┌─────────────────────────────────────────────────────────┐
│  Viết Bài Thông Minh                                    │
│  ① Nhập thông tin ─── ② Phân tích ─── ③ Cấu hình ─── ④ Viết bài │
├─────────────────────────────────────────────────────────┤
│  [Khối 1] Từ khóa chính *                               │
│  textarea + AI Suggest button                           │
│  [⚠️ Cannibalization warning nếu có]                    │
│  Từ khóa phụ (comma-separated input)                   │
├─────────────────────────────────────────────────────────┤
│  [Loại nội dung] 7 card chọn Content Type               │
├─────────────────────────────────────────────────────────┤
│  [Vai trò Topical Map] 3 radio chip                     │
├─────────────────────────────────────────────────────────┤
│  [Phân tích đối thủ] 3 URL input (tùy chọn)            │
├─────────────────────────────────────────────────────────┤
│  [Nguồn dữ liệu] 4 card: AI / Google / URL / Manual    │
│  → Nếu url_crawl: hiện 3 URL input                     │
│  → Nếu manual_text: hiện textarea paste                │
├─────────────────────────────────────────────────────────┤
│  [Khối 3] Ngôn ngữ (SUPPORTED_LANGUAGES dropdown)      │
├─────────────────────────────────────────────────────────┤
│  [Phân tích & Tiếp theo →]  button                      │
└─────────────────────────────────────────────────────────┘
```

### Cannibalization check (debounce)

```typescript
// Gọi khi keyword thay đổi, debounce 800ms
useEffect(() => {
  if (!keyword.trim() || keyword.trim().length < 5) return;
  const timer = setTimeout(async () => {
    const res = await fetch(`/api/articles/check-cannibalization?keyword=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    setCannibalizationWarning(data);
  }, 800);
  return () => clearTimeout(timer);
}, [keyword]);
```

### Submit handler

```typescript
async function handleAnalyze() {
  if (!keyword.trim()) return;
  setAnalyzing(true);

  // Lưu step 1 state
  const step1State: VbtStep1State = {
    keyword, secondaryKeywordsRaw, contentType, topicalMapRole,
    competitorUrls: competitorUrls.filter(Boolean),
    dataSourceMode,
    dataSourceUrls: dataSourceUrls.filter(Boolean),
    dataSourceText,
    language,
  };
  sessionStorage.setItem('vbt_step1', JSON.stringify(step1State));
  sessionStorage.removeItem('vbt_semantic'); // xóa kết quả cũ

  // Gọi analyze
  const res = await fetch('/api/vbt/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(step1State),
  });

  if (!res.ok) { setAnalyzing(false); /* show error */ return; }
  const semantic: SemanticAnalysis = await res.json();
  sessionStorage.setItem('vbt_semantic', JSON.stringify(semantic));

  router.push('/viet-bai-thong-minh/step2');
}
```

### Content Type UI

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
  {CONTENT_TYPES.map((ct) => (
    <button
      key={ct.value}
      type="button"
      title={ct.note}
      onClick={() => setContentType(ct.value)}
      className={`p-3 rounded-xl border-2 text-center transition-colors ${
        contentType === ct.value
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <span className="text-2xl block mb-1">{ct.icon}</span>
      <p className={`text-xs font-semibold ${contentType === ct.value ? 'text-blue-700' : 'text-gray-700'}`}>
        {ct.label}
      </p>
    </button>
  ))}
</div>
// defaultLength của contentType được chọn → truyền sang Step 3 làm default targetLength
```

### Competitor URLs UI

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    Phân tích đối thủ <span className="text-gray-400 font-normal">(tùy chọn, tối đa 3 URL)</span>
  </label>
  {[0, 1, 2].map((i) => (
    <input
      key={i}
      value={competitorUrls[i]}
      onChange={(e) => {
        const next = [...competitorUrls];
        next[i] = e.target.value;
        setCompetitorUrls(next);
      }}
      placeholder={`https://đối-thủ-${i + 1}.com/bai-viet...`}
      className="w-full px-3 py-2 border rounded-lg text-sm"
    />
  ))}
  <p className="text-xs text-gray-400">
    AI sẽ phân tích điểm mạnh/yếu của đối thủ và viết bài vượt trội hơn
  </p>
</div>
```

---

## 5. Step 2 — Semantic Analysis Review

**Route:** `/viet-bai-thong-minh/step2`  
**File:** `web/app/viet-bai-thong-minh/step2/page.tsx`

> Step này aiktp KHÔNG CÓ — đây là lợi thế lớn nhất của local.

### Guard + Load

```typescript
useEffect(() => {
  const step1Raw = sessionStorage.getItem('vbt_step1');
  const semanticRaw = sessionStorage.getItem('vbt_semantic');
  if (!step1Raw || !semanticRaw) {
    router.replace('/viet-bai-thong-minh');
    return;
  }
  setStep1(JSON.parse(step1Raw));
  setSemantic(JSON.parse(semanticRaw));
}, []);
```

### Layout UI

```
┌─────────────────────────────────────────────────────────┐
│  ① Nhập thông tin ─── ② Phân tích ─── ③ Cấu hình ─── ④ Viết bài │
├─────────────────────────────────────────────────────────┤
│  Keyword: [giường sắt đơn giá rẻ]     Badge: [Informational] │
│                                                         │
│  🔬 Macro Context                                        │
│  "[AI tóm tắt bức tranh toàn cảnh chủ đề - 2-3 câu]"   │
│                                                         │
│  🎯 Search Intent: Informational                        │
│  "[AI giải thích người dùng đang tìm gì - 1 câu]"       │
│                                                         │
│  😓 Reader Pain Points (RPP)                            │
│  ● [Pain 1]  ──── High ████████░░                       │
│  ● [Pain 2]  ──── Medium █████░░░░░                     │
│  ● [Pain 3]  ──── Low ███░░░░░░░                        │
│                                                         │
│  🗺️ Attribute Map — Cần cover trong bài                 │
│  ✅ Must: [attr 1] [attr 2]                              │
│  ⚡ Should: [attr 3] [attr 4]                            │
│  💡 Nice: [attr 5]                                      │
│                                                         │
│  🔑 Semantic Keywords đề xuất                           │
│  [chip] [chip] [chip] [chip] [chip]                     │
│  (click chip → thêm vào từ khóa phụ)                   │
│                                                         │
│  📊 Đề xuất: Content Type [Blog SEO] · Độ dài [1500 từ] │
│  [→ Dùng đề xuất của AI] [Giữ lựa chọn của mình]        │
│                                                         │
│  [← Quay lại] [Tiếp tục → Cấu hình bài viết]           │
└─────────────────────────────────────────────────────────┘
```

### State

```typescript
const [step1, setStep1]         = useState<VbtStep1State | null>(null);
const [semantic, setSemantic]   = useState<SemanticAnalysis | null>(null);

// User có thể accept AI suggestion hoặc giữ lựa chọn ban đầu
const [useAiSuggestion, setUseAiSuggestion] = useState(false);

// Chips semantic keywords — user click để thêm vào secondary kw
const [addedSemanticKw, setAddedSemanticKw] = useState<string[]>([]);
```

### Confirm handler

```typescript
function handleConfirm() {
  // Nếu user chọn "dùng đề xuất AI" → override contentType + targetLength từ step1
  if (useAiSuggestion && semantic && step1) {
    const updated: VbtStep1State = {
      ...step1,
      contentType: semantic.suggestedContentType,
      secondaryKeywordsRaw: [
        step1.secondaryKeywordsRaw,
        ...addedSemanticKw,
      ].filter(Boolean).join(', '),
    };
    sessionStorage.setItem('vbt_step1', JSON.stringify(updated));
  } else if (addedSemanticKw.length > 0 && step1) {
    // Chỉ thêm semantic kw đã chọn, giữ contentType
    const updated: VbtStep1State = {
      ...step1,
      secondaryKeywordsRaw: [
        step1.secondaryKeywordsRaw,
        ...addedSemanticKw,
      ].filter(Boolean).join(', '),
    };
    sessionStorage.setItem('vbt_step1', JSON.stringify(updated));
  }
  router.push('/viet-bai-thong-minh/step3');
}
```

### CompetitorInsights block (chỉ hiện nếu có)

```tsx
{semantic?.competitorInsights && (
  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
    <p className="text-sm font-semibold text-amber-800 mb-1">🏆 Phân tích đối thủ</p>
    <p className="text-sm text-amber-700">{semantic.competitorInsights}</p>
  </div>
)}
```

---

## 6. Step 3 — Config: Titles + Outline + 8 Khối

**Route:** `/viet-bai-thong-minh/step3`  
**File:** `web/app/viet-bai-thong-minh/step3/page.tsx`

### Guard + Load

```typescript
useEffect(() => {
  const step1Raw = sessionStorage.getItem('vbt_step1');
  const semanticRaw = sessionStorage.getItem('vbt_semantic');
  if (!step1Raw) { router.replace('/viet-bai-thong-minh'); return; }
  const step1: VbtStep1State = JSON.parse(step1Raw);
  const semantic: SemanticAnalysis | null = semanticRaw ? JSON.parse(semanticRaw) : null;
  setKeyword(step1.keyword);
  setLanguage(step1.language);
  // Set default targetLength từ contentType
  const ct = CONTENT_TYPES.find((c) => c.value === step1.contentType);
  setTargetLength(semantic?.estimatedWordCount ?? ct?.defaultLength ?? 1500);
  // Set default tone từ contentType
  setTone(step1.contentType === 'how_to' ? 'how_to'
        : step1.contentType === 'comparison' ? 'comparison'
        : step1.contentType === 'review' ? 'review'
        : 'seo_basic');
}, []);
```

### State

```typescript
// Từ Step 1 (readonly)
const [keyword, setKeyword] = useState('');
const [language, setLanguage] = useState('Vietnamese');

// Title selection
const [titleOptions, setTitleOptions]       = useState<string[]>([]);
const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
const [customTitle, setCustomTitle]         = useState('');
const [generatingTitles, setGeneratingTitles] = useState(false);

// 8-block config (tuân thủ PAGE-STANDARD.md)
const [imageOption, setImageOption]         = useState('none');
const [outlineMode, setOutlineMode]         = useState<OutlineMode>('no_outline');
const [targetLength, setTargetLength]       = useState(1500);
const [userOutlineText, setUserOutlineText] = useState('');
const [aiOutlineObjective, setAiOutlineObjective] = useState('comprehensive');
const [aiOutlineSize, setAiOutlineSize]     = useState('md');
const [editedOutline, setEditedOutline]     = useState('');
const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
const [tone, setTone]                       = useState('seo_basic');
const [model, setModel]                     = useState('');
const [brand, setBrand]                     = useState<BrandSectionState>(defaultBrand);
const [seoMainLink, setSeoMainLink]         = useState('');
const [seoKeywordLinks, setSeoKeywordLinks] = useState('');
const [autoBold, setAutoBold]               = useState('none');
const [footerContent, setFooterContent]     = useState('');

const [submitting, setSubmitting]           = useState(false);
```

### Layout UI

```
┌─────────────────────────────────────────────────────────┐
│  ① Nhập thông tin ─── ② Phân tích ─── ③ Cấu hình ─── ④ Viết bài │
├─────────────────────────────────────────────────────────┤
│  📌 Keyword: [giường sắt đơn giá rẻ]   Content: Blog SEO │
│─────────────────────────────────────────────────────────│
│  TIÊU ĐỀ BÀI VIẾT                                       │
│  [✨ Tạo tiêu đề AI (4-5 gợi ý)]                        │
│  → Khi có options: radio list chọn 1 trong 4-5 title    │
│  → Hoặc: input tự nhập tiêu đề                          │
│─────────────────────────────────────────────────────────│
│  [Khối 2] Image Option (4 card)                         │
│─────────────────────────────────────────────────────────│
│  [Khối 3] Ngôn ngữ (đã chọn từ Step 1, readonly)        │
│─────────────────────────────────────────────────────────│
│  [Khối 4] Outline + Target Length                       │
│─────────────────────────────────────────────────────────│
│  [Khối 5] Tone                                          │
│─────────────────────────────────────────────────────────│
│  [Khối 6] AI Model (ModelPicker)                        │
│─────────────────────────────────────────────────────────│
│  [Khối 7] Brand Config (BrandSection)                   │
│─────────────────────────────────────────────────────────│
│  [Khối 8] SEO Advanced (SeoAdvancedBlock, collapsed)    │
│─────────────────────────────────────────────────────────│
│  [← Quay lại] [🚀 Viết bài →]                          │
└─────────────────────────────────────────────────────────┘
```

### Title generation

```typescript
async function handleGenerateTitles() {
  setGeneratingTitles(true);
  setTitleOptions([]);
  const step1: VbtStep1State = JSON.parse(sessionStorage.getItem('vbt_step1')!);
  const res = await fetch('/api/vbt/titles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: step1.keyword,
      secondaryKeywords: step1.secondaryKeywordsRaw,
      contentType: step1.contentType,
      language: step1.language,
    }),
  });
  const { titles } = await res.json(); // string[]
  setTitleOptions(titles);
  setSelectedTitleIdx(0);
  setGeneratingTitles(false);
}
```

**Title selection UI:**

```tsx
{/* Button tạo title */}
<button type="button" onClick={handleGenerateTitles} disabled={generatingTitles}
  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40">
  {generatingTitles ? '⏳ Đang tạo tiêu đề...' : '✨ Tạo tiêu đề AI'}
</button>

{/* Danh sách chọn */}
{titleOptions.length > 0 && (
  <div className="space-y-2 mt-3">
    {titleOptions.map((title, i) => (
      <label key={i}
        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
          selectedTitleIdx === i && !customTitle
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-blue-300'
        }`}
      >
        <input type="radio" name="titleChoice" checked={selectedTitleIdx === i && !customTitle}
          onChange={() => { setSelectedTitleIdx(i); setCustomTitle(''); }}
          className="mt-0.5" />
        <span className="text-sm text-gray-800">{title}</span>
        <span className="ml-auto text-xs text-gray-400 shrink-0">{title.length} ký tự</span>
      </label>
    ))}
    {/* Tự nhập */}
    <div className={`p-3 rounded-lg border-2 transition-colors ${
      customTitle ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      <label className="flex items-center gap-2 mb-2 cursor-pointer">
        <input type="radio" name="titleChoice" checked={!!customTitle}
          onChange={() => setCustomTitle(' ')} />
        <span className="text-sm font-medium text-gray-700">Tự nhập tiêu đề</span>
      </label>
      {customTitle !== '' && (
        <input value={customTitle === ' ' ? '' : customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Nhập tiêu đề của bạn..."
          className="w-full px-3 py-2 border rounded text-sm" />
      )}
    </div>
  </div>
)}
```

### Submit → Step 4

```typescript
async function handleStartWrite() {
  setSubmitting(true);
  const step1: VbtStep1State = JSON.parse(sessionStorage.getItem('vbt_step1')!);
  const semantic: SemanticAnalysis | null =
    sessionStorage.getItem('vbt_semantic')
      ? JSON.parse(sessionStorage.getItem('vbt_semantic')!)
      : null;

  const finalTitle = customTitle.trim() || titleOptions[selectedTitleIdx] || step1.keyword;
  const finalOutline = outlineMode === 'user_outline' ? userOutlineText
                     : outlineMode === 'ai_outline'   ? editedOutline
                     : '';

  const step3State: VbtStep3State = {
    titleOptions, selectedTitleIndex: selectedTitleIdx, customTitle,
    outlineMode, userOutlineText, aiOutlineText: editedOutline,
    aiOutlineObjective, aiOutlineSize,
    imageOption, targetLength, tone, model,
    brand, seoMainLink, seoKeywordLinks, autoBold, footerContent,
  };
  sessionStorage.setItem('vbt_step3', JSON.stringify(step3State));

  const res = await fetch('/api/vbt/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: step1.keyword,
      title: finalTitle,
      outline: finalOutline,
      contentType: step1.contentType,
      topicalMapRole: step1.topicalMapRole,
      secondaryKeywords: step1.secondaryKeywordsRaw.split(',').map((s) => s.trim()).filter(Boolean),
      competitorUrls: step1.competitorUrls,
      dataSourceMode: step1.dataSourceMode,
      dataSourceUrls: step1.dataSourceUrls,
      dataSourceText: step1.dataSourceText,
      language: step1.language,
      semantic,
      imageOption, targetLength, tone, model,
      brand, seoMainLink, seoKeywordLinks, autoBold, footerContent,
    }),
  });

  if (!res.ok) { setSubmitting(false); return; }
  const { runId } = await res.json();
  sessionStorage.setItem('vbt_runId', runId);
  router.push('/viet-bai-thong-minh/step4');
}
```

---

## 7. Step 4 — Generate + Editor

> ✅ **Trạng thái 2026-05-29:** Đã đạt chuẩn **6 tabs unified** — dùng làm mẫu cho các page generate khác.

**Route:** `/viet-bai-thong-minh/step4`  
**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`  
**Tabs:** `UNIFIED_GENERATE_TABS` từ `@/lib/shared/generate-tabs` — `seo | ai | quality | links | publish | images`  
**Storage utils:** `readVbtStorage`, `parseStoredJson`, `clearVbtWorkflowStorage`, `writeVbtStorage` từ `@/lib/viet-bai-thong-minh/storage`

---

### Layout tổng thể

```
┌──────────────────────────────────────────────┬──────────────────────┐
│ header (bg-white border-b)                   │                      │
│   h1: Viết Bài Thông Minh  · keyword sub     │   aside w-[420px]    │
│   [Lưu DB] [ExportMenu?] [Dừng?] [Bắt đầu lại]  shrink-0 border-l  │
├──────────────────────────────────────────────┤                      │
│ banner bar (border-b, chỉ hiện khi cần)      │  GeneratePanelTabs   │
│   loading chips | streamError | banner toast │  (UNIFIED_GENERATE_  │
├──────────────────────────────────────────────┤   TABS — 6 tabs)     │
│                                              │  [SEO][AI][CHẤT LƯỢNG│
│  p-5 flex-1 min-h-0 overflow-hidden          │  [LINKS][ĐĂNG BÀI]   │
│  ┌──────────────────────────────────────┐    │  [HÌNH ẢNH]          │
│  │ rounded-xl border bg-white shadow    │    │                      │
│  │   div#editorShellRef (h-full)        │    │  overflow-y-auto      │
│  │     RichArticleEditor                │    │  tab content          │
│  └──────────────────────────────────────┘    │                      │
└──────────────────────────────────────────────┴──────────────────────┘
AiFloatingToolbar (position: fixed, visible on text select ≥10 ký tự)
div#contentRef (hidden, dangerouslySetInnerHTML — dùng cho buildSentenceTargets)
```

- `loading = streaming && !streamDone` — **không phải chỉ `streaming`**
- `displayedHtml = streamDone ? editableHtml : outputHtml`

---

### Imports chính

```typescript
import AICheckPanel from '@/app/components/AICheckPanel';
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';
import { ExportMenu } from '@/components/editor/ExportMenu';
import { RichArticleEditor } from '@/components/editor/RichArticleEditor';   // ← RichArticleEditor, KHÔNG phải ArticleEditor
import { GeneratePanelTabs } from '@/components/generate/GeneratePanelTabs';
import { LinksPanel as GenerateLinksPanel } from '@/components/generate/LinksPanel';
import { PublishPanel as GeneratePublishPanel } from '@/components/generate/PublishPanel';
import { QualityPanel as GenerateQualityPanel } from '@/components/generate/QualityPanel';
import { InternalLinkSuggest } from '@/components/tinh-gon/InternalLinkSuggest';
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
import { useGenerateStream } from '@/hooks/useGenerateStream';
import { buildSentenceTargets } from '@/lib/dom-sentences';
import { UNIFIED_GENERATE_TABS, type GenerateTab } from '@/lib/shared/generate-tabs';  // ← UNIFIED_GENERATE_TABS
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { CONTENT_TYPES, VBT_LOADING_STEPS, buildVbtArticleContentType, getContentTypeDefaultLength } from '@/lib/viet-bai-thong-minh/options';
import {
  clearVbtWorkflowStorage,
  parseStoredJson,
  readVbtStorage,
  writeVbtStorage,               // ← thêm writeVbtStorage để sync lại storage khi hydrate từ DB
} from '@/lib/viet-bai-thong-minh/storage';
```

---

### Guard + Init — Hydration (3 nguồn dữ liệu, ưu tiên cao → thấp)

```
URL ?articleId= → fetch DB → hydrateFromArticle()
URL ?runId=     → fetch DB by runId → hydrateFromArticle()
sessionStorage  → readVbtStorage + parseStoredJson → hydrateFromStorage()
Fallback        → router.replace('/viet-bai-thong-minh')
```

```typescript
// useEffect 1: hydrate (async, hỗ trợ URL params + sessionStorage)
useEffect(() => {
  document.title = 'Viết Bài Thông Minh - Bước 4';
  let alive = true;

  // hydrateFromStorage: dùng khi chỉ có sessionStorage (flow step1→step4 bình thường)
  function hydrateFromStorage(storedRunId, storedStep1, storedStep3, storedSemantic) {
    setStep1(storedStep1); setStep3(storedStep3); setSemantic(storedSemantic);
    setTitle(storedStep3.customTitle.trim() || storedStep3.titleOptions[storedStep3.selectedTitleIndex] || storedStep1.keyword);
    setRunId(storedRunId);
  }

  // hydrateFromArticle: dùng khi mở lại bài cũ từ Dashboard (?articleId=xxx)
  // → build step1/step3/semantic từ DB article + stored outline JSON
  // → writeVbtStorage để sync lại sessionStorage
  // → setStreamDone(true) nếu bài đã có htmlContent (không stream lại)
  function hydrateFromArticle(article, fallbackRunId): boolean { ... }

  async function hydrate() {
    const urlArticleId = queryArticleId.trim();
    const urlRunId = queryRunId.trim();
    const storedRunId = readVbtStorage('runId');
    const storedStep1 = parseStoredJson<VbtStep1State>('step1');
    const storedStep3 = parseStoredJson<VbtStep3State>('step3');
    const storedSemantic = parseStoredJson<SemanticAnalysis>('semantic');

    // Ưu tiên 1: URL articleId → fetch DB
    if (urlArticleId) {
      const article = await fetchArticleById(urlArticleId);
      if (article && hydrateFromArticle(article, urlRunId)) return;
      // fallback: try runId
      if (urlRunId) {
        const runArticle = await fetchArticleByRunId(urlRunId);
        if (runArticle && hydrateFromArticle(runArticle, urlRunId)) return;
      }
      router.replace('/dashboard/articles');
      return;
    }

    // Ưu tiên 2: URL runId hoặc stored runId → fetch DB
    const lookupRunId = urlRunId || storedRunId || '';
    if (lookupRunId) {
      const article = await fetchArticleByRunId(lookupRunId);
      if (article && hydrateFromArticle(article, lookupRunId)) return;
      if (urlRunId) { router.replace('/dashboard/articles'); return; }
    }

    // Ưu tiên 3: sessionStorage flow bình thường
    if (storedRunId && storedStep1 && storedStep3) {
      hydrateFromStorage(storedRunId, storedStep1, storedStep3, storedSemantic);
      return;
    }

    // Fallback: redirect về step 1
    router.replace('/viet-bai-thong-minh');
  }

  void hydrate();
  return () => { alive = false; };
}, [queryArticleId, queryRunId, router]);

// useEffect 2: start stream sau khi runId có (startedRef ngăn double-call)
// Không start nếu streamDone=true (bài đã có HTML từ DB)
useEffect(() => {
  if (!runId || startedRef.current) return;
  startedRef.current = true;
  void startStream({ runId });
}, [runId]);

// useEffect 3: khi stream xong → set toàn bộ meta từ finalResult
useEffect(() => {
  if (!finalResult) return;
  setEditableHtml(finalResult.html);
  setStreamDone(true);
  setTitle(finalResult.title);
  setMetaDescription(finalResult.metaDescription);
  setSlug(finalResult.slug);
  setArticleId(finalResult.articleId);
}, [finalResult]);

// useEffect 4: load internal links khi có articleId + semanticKeywords
useEffect(() => {
  const semanticKeywords = semantic?.semanticKeywords ?? [];
  if (!articleId || semanticKeywords.length === 0) { setInternalLinks([]); return; }
  // POST /api/vbt/internal-links → { links: TinhGonInternalLinkSuggestion[] }
  void loadInternalLinks();
}, [articleId, semantic?.semanticKeywords]);
```

**`hydrateFromArticle` — build state từ DB article:**

```typescript
function hydrateFromArticle(article: DbArticlePayload, fallbackRunId: string): boolean {
  const stored = readStoredOutline(article);               // parse article.outline JSON
  if (!isVbtArticle(article, stored)) return false;       // guard: phải là VBT article

  const nextStep1    = buildStep1FromArticle(article, stored?.step1);
  const nextTitle    = article.selectedTitle || stored?.title || nextStep1.keyword;
  const nextStep3    = buildStep3FromArticle(article, stored?.step3, nextTitle, nextStep1.contentType);
  const nextSemantic = buildSemanticFromArticle(article, stored?.semantic, nextStep1);
  const savedHtml    = article.htmlContent?.trim() || '';

  setStep1(nextStep1); setStep3(nextStep3); setSemantic(nextSemantic);
  setArticleId(article.id);
  setTitle(nextTitle); setMetaDescription(article.metaDescription || '');
  setSlug(article.slug || slugify(nextTitle));
  setEditableHtml(savedHtml);
  setStreamDone(Boolean(savedHtml));         // ← nếu có HTML → skip stream
  startedRef.current = Boolean(savedHtml);  // ← ngăn startStream trigger

  // Sync lại sessionStorage để các tool khác (AiTab, LinksTab) đọc được
  writeVbtStorage('step1', JSON.stringify(nextStep1));
  writeVbtStorage('step3', JSON.stringify(nextStep3));
  writeVbtStorage('semantic', JSON.stringify(nextSemantic));
  if (article.runId || fallbackRunId) writeVbtStorage('runId', article.runId || fallbackRunId);

  return true;
}
```

---

### SSE Stream

```typescript
const {
  streaming,        // true khi đang nhận chunks từ SSE
  activeStep,       // key của step hiện tại (string)
  completedSteps,   // string[] — các step đã xong
  outputHtml,       // HTML raw đang stream (live)
  streamResult,     // object từ SSE "done" event
  error: streamError,
  startStream,
  abort,
} = useGenerateStream('/api/vbt/stream');

const finalResult = isVbtStreamResult(streamResult) ? streamResult : null;
// isVbtStreamResult kiểm tra: 'articleId' in value && 'html' in value

const loading      = streaming && !streamDone;   // ← QUAN TRỌNG: không dùng streaming trực tiếp
const displayedHtml = streamDone ? editableHtml : outputHtml;
```

---

### Derived / Computed Values

```typescript
// Secondary keywords từ step1
const secondaryKeywords = useMemo(
  () => step1?.secondaryKeywordsRaw.split(',').map((s) => s.trim()).filter(Boolean) ?? [],
  [step1?.secondaryKeywordsRaw],
);

// Panel meta — thứ tự ưu tiên: state > fallbackMeta
const panelTitle = title || step3?.customTitle.trim() || step3?.titleOptions[step3?.selectedTitleIndex || 0] || step1?.keyword || '';
const panelMeta  = metaDescription || fallbackMeta(step1?.keyword || '');
const panelSlug  = slug || slugify(panelTitle);

// minWordCount phụ thuộc contentType
const minWordCount = step1?.contentType === 'pillar'
  ? 2500
  : Math.min(800, Math.max(500, Math.round((step3?.targetLength || 1200) * 0.5)));

// aiCheckStorageKey — dùng articleId nếu có, fallback 'temp'
const aiCheckStorageKey = useMemo(
  () => (articleId ? `aicheck:vbt:${articleId}` : 'aicheck:vbt:temp'),
  [articleId],
);

// currentSeo — dùng cho GeneratePublishPanel (tính riêng, không dùng SeoTab's internal seo)
const currentSeo = useMemo(() => {
  const wordCount = stripHtml(displayedHtml).split(/\s+/).filter(Boolean).length;
  return computeSeoChecks({
    title: panelTitle, metaDescription: panelMeta,
    html: displayedHtml, wordCount,
    keyword: step1?.keyword || '', secondaryKeywords,
    slug: panelSlug, minWordCount,
  });
}, [displayedHtml, minWordCount, panelMeta, panelSlug, panelTitle, secondaryKeywords, step1?.keyword]);
```

---

### Editor (RichArticleEditor)

```tsx
{/* div#contentRef — hidden, dùng để buildSentenceTargets cho AICheckPanel */}
<div ref={contentRef} className="hidden" aria-hidden dangerouslySetInnerHTML={{ __html: displayedHtml }} />

{/* Editor shell — bắt events selection cho AiFloatingToolbar */}
<div
  ref={editorShellRef}
  className="h-full"
  onMouseUp={handleEditorSelect}
  onKeyUp={handleEditorSelect}
>
  <RichArticleEditor
    html={displayedHtml}
    streaming={loading}           // ← dùng loading (streaming && !streamDone), KHÔNG phải streaming
    wordCount={wordCount}
    keyword={step1.keyword}
    articleTitle={panelTitle}
    fullWidth
    onChange={handleEditorChange}
    onSave={() => void handleSaveDraftWithBanner()}
    onNewArticle={handleRestart}
  />
</div>
```

**`RichArticleEditor` props:**
- `streaming={loading}` — disable edit khi đang generate (không phải `streaming` raw)
- `fullWidth` — editor chiếm full width (không có sidebar margin)
- `onSave` — Ctrl+S → lưu draft DB
- `onNewArticle` — nút "Bài mới" trong toolbar → restart

**Luồng edit:** User sửa → `onChange` → `handleEditorChange(html)` → `setEditableHtml(html)` + `setStreamDone(true)`

**Insert từ tab Links/SEO:** `insertHtml(html)` → nếu là `<a>` thì bọc `<p>`, append vào `editableHtml`, set `streamDone(true)`  
**Insert internal link:** `insertInternalLink(html)` → prepend `"Xem thêm: "` + append  
**Insert external link:** `insertExternalLink(url, text)` → bọc thành `<a target="_blank" rel="noopener">` + append

---

### AiFloatingToolbar

```tsx
<AiFloatingToolbar
  visible={toolbarVisible && !loading}
  x={toolbarX}
  y={toolbarY}
  disabled={loading}
  onCommand={(command) => void handleToolbarCommand(command)}
/>
```

**handleEditorSelect()** — trigger bởi `onMouseUp` / `onKeyUp` trên `editorShellRef`:
1. Lấy `window.getSelection()`
2. Kiểm tra selection không collapsed, rangeCount > 0
3. Kiểm tra `isNodeInside(editorShellRef.current, range.commonAncestorContainer)`
4. `text.length < 10` → ẩn toolbar
5. Tính vị trí `rect.left + width/2`, `rect.top - 12` → set `toolbarX`, `toolbarY`
6. Lưu `selectionRangeRef.current = range.cloneRange()`

**handleToolbarCommand(command):**
1. Gọi `POST /api/editor/ai-assist` với `{ command, text: selectedText, keyword, model: step3?.model || 'gemini-flash' }`
2. Stream SSE response → collect `finalText`
3. `range.deleteContents()` → `range.insertNode(fragment)` → `handleEditorChange(editorNode.innerHTML)`
4. Banner: `'AI đã cập nhật đoạn văn đang chọn.'`

---

### Banner Bar

```tsx
{/* Chỉ render khi: loading || streamError || banner */}
{(loading || streamError || banner) && (
  <div className="border-b border-gray-200 bg-white px-5 py-3">
    {/* loading: spinner + label step + chips */}
    {loading && ( ... )}
    {/* streamError: red alert */}
    {streamError && <p className="rounded-lg border border-red-200 bg-red-50 ...">{streamError}</p>}
    {/* banner: success (green) hoặc error (red) */}
    {banner && <p className={`rounded-lg border px-3 py-2 text-sm ${
      banner.tone === 'success' ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-red-200 bg-red-50 text-red-700'
    }`}>{banner.text}</p>}
  </div>
)}
```

---

### Right Panel — 6 Tabs (UNIFIED_GENERATE_TABS)

```tsx
<aside className="flex w-[420px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white">
  <GeneratePanelTabs value={activeTab} onChange={setActiveTab} tabs={UNIFIED_GENERATE_TABS} />
  <div className="min-h-0 flex-1 overflow-y-auto">
    {activeTab === 'seo'     && <SeoTab ... />}
    {activeTab === 'ai'      && <AiTab ... />}
    {activeTab === 'quality' && <QualityTab ... />}
    {activeTab === 'links'   && <LinksTab ... />}
    {activeTab === 'publish' && articleId ? <GeneratePublishPanel ... /> : placeholder}
    {activeTab === 'images'  && <ImagesTab imageOption={step3.imageOption} />}
  </div>
</aside>
```

| Tab value | Label | Component | Ghi chú |
|-----------|-------|-----------|---------|
| `'seo'` | SEO | `SeoTab` (local) | Full unified spec |
| `'ai'` | KIỂM TRA AI | `AiTab` (local) | SEO nhanh → AI Edit → AICheckPanel |
| `'quality'` | CHẤT LƯỢNG | `QualityTab` (local) | Không có AICheckPanel (đã move sang AiTab) |
| `'links'` | LINKS | `LinksTab` (local) | Semantic chips + internal links + data source |
| `'publish'` | ĐĂNG BÀI | `GeneratePublishPanel` (shared) | Chỉ render khi có articleId |
| `'images'` | HÌNH ẢNH | `ImagesTab` (local) | Placeholder + hiện imageOption đang dùng |

---

#### Tab SEO — `SeoTab` (full unified spec)

Khớp hoàn toàn với `UNIFIED-GENERATE-PAGE.md` Tab 1. Thứ tự blocks từ trên xuống:

```
┌────────────────────────────────────────┐
│ 1. SeoScoreBar                         │
│    score % · green≥80 amber≥60 red<60  │
│    label: Tốt / Cần cải thiện / Yếu   │
├────────────────────────────────────────┤
│ 2. KeywordDensityBar                   │
│    density % · Target 1–1.5%           │
├────────────────────────────────────────┤
│ 3. Trạng thái draft card               │
│    keyword · model · loại bài          │
│    [Meta description textarea 4 rows]  │
├────────────────────────────────────────┤
│ 4. SERP Preview (collapsible)          │
│    /slug · blue title · green url      │
│    meta snippet                        │
├────────────────────────────────────────┤
│ 5. Secondary keywords chips            │
│    [chip × remove] + [input] [+ add]   │
├────────────────────────────────────────┤
│ 6. 3 nhóm checks (collapsible)         │
│    SEO Cơ bản  | Nâng cao | Tiêu đề   │
│    badge: ✓ All Good / N Lỗi (orange)  │
│    → mỗi check: circle icon + label    │
│      + detail + fix button (nếu fail)  │
│    → index 8: expand form Chèn internal│
│    → index 9: expand form Chèn external│
├────────────────────────────────────────┤
│ 7. Humanness Score (chỉ hiện khi ≠ null)│
│    score bar + 4 breakdown cards       │
│    Ngôn ngữ · Cấu trúc · E-E-A-T · Eng│
├────────────────────────────────────────┤
│ 8. [Viết lại từ đầu] button (outline)  │
├────────────────────────────────────────┤
│ 9. Internal links gợi ý                │
│    InternalLinkSuggest / placeholder   │
└────────────────────────────────────────┘
```

**`fixActions` map** — 21 fix buttons, định nghĩa trong `SeoTab`, trigger từ check index:

```typescript
const fixActions: Record<number, { label: string; onClick: () => void }> = {
  0:  { label: 'Fix - Thêm từ khóa vào tiêu đề',     onClick: onFixTitle },
  1:  { label: 'Fix - Chèn từ khóa vào meta',         onClick: onFixMeta },
  2:  { label: 'Fix - Tạo slug chuẩn',                onClick: onFixSlug },
  3:  { label: 'Fix - Chèn từ khóa vào mở bài',      onClick: () => onFixSeoCheck(3) },
  4:  { label: 'Fix - Chèn từ khóa vào nội dung',    onClick: () => onFixSeoCheck(4) },
  5:  { label: 'Fix - Mở rộng nội dung',              onClick: () => onFixSeoCheck(5) },
  6:  { label: 'Fix - Tăng mật độ từ khóa',          onClick: () => onFixSeoCheck(6) },
  7:  { label: 'Fix - Rút gọn slug',                  onClick: onFixSlug },
  8:  { label: 'Fix - Chèn internal link',            onClick: () => setFixingInternal(true) },
  9:  { label: 'Fix - Chèn external link',            onClick: () => setFixingExternal(true) },
  10: { label: 'Fix - Tự động thêm alt text',         onClick: onFixAltText },
  11: { label: 'Fix - Chèn từ khóa phụ',             onClick: () => onFixSeoCheck(11) },
  12: { label: 'Fix - Đưa từ khóa lên đầu tiêu đề', onClick: onFixTitleToStart },
  13: { label: `Fix - Thêm năm ${currentYear}`,       onClick: onFixTitleNumber },
  14: { label: 'Fix - Chuẩn hóa thẻ H1',             onClick: () => onFixSeoCheck(14) },
  15: { label: 'Fix - Thêm H2',                       onClick: () => onFixSeoCheck(15) },
  16: { label: 'Fix - Sửa thứ bậc heading',           onClick: () => onFixSeoCheck(16) },
  17: { label: 'Fix - Chỉnh độ dài tiêu đề',          onClick: () => onFixSeoCheck(17) },
  18: { label: 'Fix - Chỉnh độ dài meta',             onClick: () => onFixSeoCheck(18) },
  19: { label: 'Fix - Thêm FAQ',                      onClick: () => onFixSeoCheck(19) },
  20: { label: 'Fix - Thêm mục lục',                  onClick: () => onFixSeoCheck(20) },
};
```

**`seo` useMemo trong SeoTab** (riêng biệt với `currentSeo` của component chính):
```typescript
const seo = useMemo(() =>
  computeSeoChecks({ title, metaDescription, html, wordCount, keyword, secondaryKeywords, slug, minWordCount }),
  [html, keyword, metaDescription, minWordCount, secondaryKeywords, slug, title]
);
```

**Fix functions** (định nghĩa trong `VietBaiThongMinhStep4`, truyền qua props):

| Function | Logic |
|----------|-------|
| `fixTitle()` | nếu title không chứa keyword → prepend `${kw} - ${title}` |
| `fixMeta()` | lấy 30 từ đầu bài → `${keyword}: ${words}...`.slice(0,160) |
| `fixSlug()` | `setSlug(slugify(panelTitle))` |
| `fixTitleToStart()` | nếu title không bắt đầu bằng keyword → prepend |
| `fixTitleNumber()` | nếu không có chữ số → append `- Top 10` |
| `fixAltText()` | tự động thêm keyword vào alt text ảnh không có keyword |
| `handleFixSeoCheck(index)` | switch(index) → gọi fix function tương ứng |
| `fixKeywordInIntro()` | chèn keyword vào đầu `<p>` đầu tiên |
| `fixKeywordInContent()` | append section mới có keyword |
| `fixMinWordCount()` | thêm paragraphs đến khi đủ `minWordCount` |
| `fixKeywordDensity()` | tăng/giảm density về 1–1.5% |
| `fixSecondaryKeyword()` | chèn keyword phụ còn thiếu |
| `fixH1Count()` | chuẩn hóa H1 (thêm nếu thiếu, hạ cấp nếu thừa) |
| `fixH2Count()` | thêm H2 nếu < 2 |
| `fixHeadingHierarchy()` | sửa thứ bậc heading không hợp lệ |
| `fixTitleLength()` | kéo dài/rút ngắn title về 50–70 ký tự |
| `fixMetaLength()` | kéo dài/rút ngắn meta về 120–160 ký tự |
| `fixFaqSection()` | append section FAQ 3 câu hỏi |
| `fixTocSection()` | thêm `<nav class="toc">` sau H1 |

> Tất cả fix → gọi `applySeoHtmlFix(nextHtml, message)` → `handleEditorChange(nextHtml)` + `setBanner({tone:'success', text:message})`

---

#### Tab AI — `AiTab` (thứ tự: SEO nhanh → AI Edit → AICheckPanel)

```
┌────────────────────────────────────────┐
│ 1. SEO nhanh (render ĐẦU TIÊN)        │
│    card: wordCount + KeywordDensityBar │
│    "Tính trực tiếp từ nội dung editor" │
├────────────────────────────────────────┤
│ 2. AI chỉnh theo vùng chọn            │
│    Khi CHƯA chọn:                      │
│      "Bôi đen đoạn văn..." (10 nút    │
│       disabled opacity-45)             │
│    Khi ĐÃ chọn:                        │
│      preview đoạn đã chọn (blue-50)   │
│      10 nút 2 cột (enabled)            │
│      [Đang xử lý...] khi aiEditing    │
├────────────────────────────────────────┤
│ 3. AICheckPanel                        │
│    html={displayedHtml}                │
│    storageKey={aiCheckStorageKey}      │
│    onApplyFix={applyAICheckFix}        │
│    getSentenceTargets={...}            │
│    (placeholder nếu html rỗng)         │
└────────────────────────────────────────┘
```

**10 AI Edit Commands:**
```typescript
const VBT_AI_EDIT_COMMANDS = [
  { value: 'explain',   label: 'Giải thích' },
  { value: 'title',     label: 'Đặt tiêu đề' },
  { value: 'outline',   label: 'Tạo outline' },
  { value: 'shorten',   label: 'Rút ngắn' },
  { value: 'rewrite',   label: 'Viết lại' },
  { value: 'list',      label: 'Thành danh sách' },
  { value: 'pros_cons', label: 'Ưu & Nhược điểm' },
  { value: 'intro',     label: 'Viết mở bài' },
  { value: 'conclusion',label: 'Viết kết bài' },
  { value: 'faqs',      label: 'Tạo FAQ' },
];
// Tất cả disabled khi !hasSelection || aiEditing
// Khi aiEditing: label hiện 'Đang xử lý...'
```

**handleAiEditCommand(command):**
1. `runAiAssistCommand(command)` → `POST /api/editor/ai-assist` → stream → `finalText`
2. Nếu có `selectionRangeRef` + editor node → DOM replace (`range.deleteContents()` + `insertNode`)
3. Fallback: `sourceHtml.replace(selectedText, assistedHtml)`
4. Banner: `'AI đã cập nhật đoạn văn đang chọn.'`

**applyAICheckFix** (dùng cho AICheckPanel):
```typescript
function applyAICheckFix(original: string, replacement: string) {
  const sourceHtml = editableHtml || displayedHtml;
  const nextHtml = sourceHtml.replace(original, replacement);
  if (nextHtml !== sourceHtml) {
    handleEditorChange(nextHtml);
    setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết.' });
  }
}
```

**getSentenceTargets:**
```typescript
function getSentenceTargets() {
  if (!contentRef.current) return [];
  return buildSentenceTargets(contentRef.current);
  // contentRef = div hidden chứa displayedHtml — KHÔNG phải editor DOM thật
}
```

---

#### Tab Chất lượng — `QualityTab` (không có AICheckPanel)

```
┌────────────────────────────────────────┐
│  GenerateQualityPanel                  │
│  ├─ humannessScore                     │
│  │   = result?.humannessScore          │
│  │   ?? (outputHtml ? 70 : null)       │
│  ├─ decision = result?.decision ?? 'REVIEW'
│  ├─ issues: result?.issues ?? [longParagraph msgs]
│  ├─ forbiddenFound: result?.forbiddenFound ?? []
│  ├─ summaryItems:                      │
│  │   Paragraphs: 'Không có đoạn quá dài' | `${n} đoạn trên 90 từ`
│  │   Visual breaks: 'Có danh sách/bảng' | 'Nên thêm ul/ol/table'
│  │   Số từ: String(result?.wordCount ?? wordCount)
│  └─ children: <SemanticScoreCard />   │
│     (chỉ render khi semanticScore != null)
└────────────────────────────────────────┘
```

> **Lưu ý:** `AICheckPanel` đã chuyển sang Tab AI — QualityTab chỉ còn readability checks.

**SemanticScoreCard** (inline component trong file):
```typescript
// score >= 80 → violet-700 | >= 60 → amber-600 | < 60 → red-600
// Progress bar: bg-violet-600, width = `${score}%`
```

---

#### Tab Internal Links — `LinksTab`

```typescript
// GenerateLinksPanel nhận prop cards: 3 card cố định
cards = [
  { key: 'semantic', title: 'Semantic keywords',
    body: chips từ semantic?.semanticKeywords
          → onClick: insertHtml(`<p><strong>${kw}</strong>: </p>`)
  },
  { key: 'internal', title: 'Internal links',
    body: loadingLinks ? 'Đang tìm bài liên quan...'
        : internalLinks.length > 0 ? <InternalLinkSuggest links onInsert />
        : /<a\s/ trong outputHtml ? 'Bài đã có link. Kiểm tra anchor text...'
        : 'Không tìm thấy bài liên quan...'
  },
  { key: 'source', title: 'Data source',
    body: step1.dataSourceMode + dataSourceUrls + competitorUrls count
  },
]

// Load trigger (useEffect):
// Điều kiện: articleId !== '' && semantic?.semanticKeywords.length > 0
// Endpoint: POST /api/vbt/internal-links
// Body: { keywords: semanticKeywords, currentArticleId: articleId }
// Response: { links?: TinhGonInternalLinkSuggestion[] }
```

---

#### Tab Đăng bài — `GeneratePublishPanel`

```typescript
// Render condition:
// - articleId có → render GeneratePublishPanel đầy đủ
// - articleId rỗng → placeholder text

<GeneratePublishPanel
  articleId={articleId}
  keyword={step1.keyword}
  title={panelTitle}
  metaDescription={panelMeta}
  slug={panelSlug}
  wordCount={wordCount}           // stripHtml(displayedHtml).split(/\s+/).filter(Boolean).length
  seoScore={currentSeo.score}    // từ useMemo currentSeo — KHÔNG phải SeoTab's seo
  onTitleChange={setTitle}
  onMetaDescriptionChange={setMetaDescription}
  onSlugChange={setSlug}
  onCopyHtml={() => void handleCopyHtml()}
  onSaveDraft={handleSaveDraft}
/>
```

**handleSaveDraft** — `PATCH /api/articles/{articleId}` (12 fields):
```typescript
body: JSON.stringify({
  selectedTitle:     panelTitle,                              // ← field name là selectedTitle
  contentType:       buildVbtArticleContentType(step1.contentType), // ← prefix 'viet_bai_thong_minh:'
  language:          step1.language,
  sourceType:        step1.dataSourceMode,
  targetLength:      step3.targetLength,
  aiProvider:        step3.model,
  secondaryKeywords,                                          // ← string[]
  htmlContent:       displayedHtml,                          // ← field name là htmlContent
  metaDescription:   panelMeta,
  slug:              panelSlug,
  seoScore:          currentSeo.score,
  seoChecks:         currentSeo.checks,
  wordCount,
  status:            'WRITTEN',                              // ← 'WRITTEN', không phải 'draft'
  createVersion:     true,                                   // ← tạo version mới
})
```

**handleSaveDraftWithBanner** — wrapper thêm loading state + banner:
```typescript
// setSavingDraft(true) → handleSaveDraft() → setBanner success/error → setSavingDraft(false)
// Nút "Lưu DB" trong header: disabled khi savingDraft || loading || !articleId || !displayedHtml
```

---

### State đầy đủ Step 4

```typescript
// Refs (không gây re-render)
const startedRef        = useRef(false);                        // ngăn double-start stream
const contentRef        = useRef<HTMLDivElement>(null);         // hidden div cho buildSentenceTargets
const editorShellRef    = useRef<HTMLDivElement>(null);         // wrapper bắt selection events
const selectionRangeRef = useRef<Range | null>(null);           // lưu Range khi select text

// URL params (hỗ trợ mở lại bài từ Dashboard)
const queryArticleId = searchParams.get('articleId') || '';
const queryRunId     = searchParams.get('runId') || '';

// State
const [runId, setRunId]                   = useState('');
const [step1, setStep1]                   = useState<VbtStep1State | null>(null);
const [step3, setStep3]                   = useState<VbtStep3State | null>(null);
const [semantic, setSemantic]             = useState<SemanticAnalysis | null>(null);
const [activeTab, setActiveTab]           = useState<GenerateTab>('seo');
const [editableHtml, setEditableHtml]     = useState('');
const [streamDone, setStreamDone]         = useState(false);
const [title, setTitle]                   = useState('');
const [metaDescription, setMetaDescription] = useState('');
const [slug, setSlug]                     = useState('');
const [articleId, setArticleId]           = useState('');
const [selectedText, setSelectedText]     = useState('');
const [toolbarVisible, setToolbarVisible] = useState(false);
const [toolbarX, setToolbarX]             = useState(0);
const [toolbarY, setToolbarY]             = useState(0);
const [aiEditing, setAiEditing]           = useState(false);   // ← AI inline đang xử lý
const [loadingLinks, setLoadingLinks]     = useState(false);
const [internalLinks, setInternalLinks]   = useState<TinhGonInternalLinkSuggestion[]>([]);
const [banner, setBanner]                 = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
const [savingDraft, setSavingDraft]       = useState(false);   // ← nút Lưu DB đang lưu
```

---

## 8. API Routes

### `POST /api/vbt/analyze`

**File:** `web/app/api/vbt/analyze/route.ts`

```typescript
// Input: VbtStep1State
// Output: SemanticAnalysis

export async function POST(req: Request) {
  const body: VbtStep1State = await req.json();

  // 1. Build analyze prompt
  const prompt = buildAnalyzePrompt(body);

  // 2. Nếu có competitorUrls → crawl trước (parallel)
  let competitorData = '';
  if (body.competitorUrls.length > 0) {
    const crawlResults = await Promise.allSettled(
      body.competitorUrls.map((url) => crawlUrl(url))
    );
    competitorData = crawlResults
      .filter((r) => r.status === 'fulfilled')
      .map((r: PromiseFulfilledResult<string>) => r.value)
      .join('\n\n---\n\n');
  }

  // 3. Nếu dataSourceMode === 'google_search' → fetch top 5
  let googleData = '';
  if (body.dataSourceMode === 'google_search') {
    googleData = await fetchGoogleTopResults(body.keyword, body.language);
  }

  // 4. Gọi AI (buildTinhGonModel)
  const model = buildTinhGonModel(DEFAULT_ANALYZE_MODEL);
  const result = await model.generateContent(
    prompt + (competitorData ? `\n\nDỮ LIỆU ĐỐI THỦ:\n${competitorData}` : '')
             + (googleData ? `\n\nDỮ LIỆU GOOGLE:\n${googleData}` : '')
  );

  // 5. Parse JSON từ AI response
  const semantic: SemanticAnalysis = parseSemanticResponse(result.response.text());
  return Response.json(semantic);
}
```

**Analyze prompt key points:**
- Phân tích macro context của keyword
- Xác định search intent (informational/navigational/commercial/transactional)
- Liệt kê 3-5 Reader Pain Points với relevance score
- Liệt kê 4-8 Attribute Map với must/should/nice_to_have
- Đề xuất 8-12 semantic keywords
- Gợi ý content type + estimated word count phù hợp
- Nếu có competitor data → nhận xét điểm mạnh/yếu
- Output: JSON strict format

---

### `POST /api/vbt/titles`

**File:** `web/app/api/vbt/titles/route.ts`

```typescript
// Input: { keyword, secondaryKeywords, contentType, language }
// Output: { titles: string[] }  — 4-5 title options

// Prompt rules cho title:
// - Mỗi title: 50-60 ký tự
// - Keyword ở 1/3 đầu
// - Có số (năm, thông số) nếu phù hợp
// - Không dùng clickbait ("bạn không ngờ", "sốc", "kinh dị")
// - Tone phù hợp contentType (pillar → toàn diện, how_to → Hướng dẫn X bước)
// - Output: JSON array string[]
```

---

### `POST /api/vbt/outline`

**File:** `web/app/api/vbt/outline/route.ts`

```typescript
// Input: { keyword, secondaryKeywords, contentType, objective, size, language, semantic? }
// Output: { outline: string }  — format [h2]...[h3]...[/h3][/h2]

// Dùng semantic.attributeMap để ensure mọi "must" attribute được cover trong outline
// Dùng semantic.rppMap để H2 address các pain points quan trọng
```

---

### `POST /api/vbt/start`

**File:** `web/app/api/vbt/start/route.ts`

```typescript
// Tạo Article record trong DB
// Input: toàn bộ config từ Step 1 + Step 3
// Output: { runId: string, articleId: string }

const article = await prisma.article.create({
  data: {
    keyword: body.keyword,
    title: body.title,
    status: 'generating',
    contentType: body.contentType,
    topicalMapRole: body.topicalMapRole,
    language: body.language,
    targetLength: body.targetLength,
    tone: body.tone,
    modelId: body.model,
    brandProfileId: body.brand.selectedProfileId || null,
    // semantic data
    searchIntent: body.semantic?.searchIntent,
    semanticKeywords: body.semantic?.semanticKeywords ?? [],
  },
});
const runId = `vbt_${article.id}_${Date.now()}`;
return Response.json({ runId, articleId: article.id });
```

---

### `GET /api/vbt/stream`

**File:** `web/app/api/vbt/stream/route.ts`

```typescript
// Query: ?runId=vbt_xxx_yyy
// SSE stream — ReadableStream + controller.enqueue()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');
  // Load state từ runId → DB lookup

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        // Step 1: init
        send({ type: 'step', step: 'init' });
        const config = await loadConfigFromRunId(runId);
        send({ type: 'step_done', step: 'init' });

        // Step 2: research (nếu có data source → crawl/fetch)
        send({ type: 'step', step: 'research' });
        const contextData = await gatherContextData(config);
        send({ type: 'step_done', step: 'research' });

        // Step 3: outline (nếu no_outline → AI tự tạo trong prompt)
        send({ type: 'step', step: 'outline' });
        const writingPrompt = buildVbtWritingPrompt(config, contextData);
        send({ type: 'step_done', step: 'outline' });

        // Step 4: writing (stream chunks)
        send({ type: 'step', step: 'writing' });
        const model = buildTinhGonModel(config.modelId);
        const result = await model.generateContentStream(writingPrompt);
        let fullHtml = '';
        for await (const chunk of result.stream) {
          const text = chunk.text();
          fullHtml += text;
          send({ type: 'chunk', text });
        }
        send({ type: 'step_done', step: 'writing' });

        // Step 5: SEO optimize
        send({ type: 'step', step: 'seo' });
        fullHtml = applySeoOptions(fullHtml, config);
        send({ type: 'step_done', step: 'seo' });

        // Step 6: humanize check (Humanness Score)
        send({ type: 'step', step: 'humanize' });
        const humanness = computeHumannessScore(fullHtml);
        send({ type: 'step_done', step: 'humanize' });

        // Step 7: done
        send({ type: 'step', step: 'done' });
        await prisma.article.update({
          where: { id: config.articleId },
          data: { content: fullHtml, status: 'draft', humannessScore: humanness.score },
        });
        send({ type: 'done', data: {
          articleId: config.articleId,
          wordCount: countWords(fullHtml),
          humannessScore: humanness.score,
          humannessDecision: humanness.decision,
        }});
        send({ type: 'step_done', step: 'done' });

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
      Connection: 'keep-alive',
    },
  });
}
```

### `buildVbtWritingPrompt()` — key structure

```typescript
function buildVbtWritingPrompt(config: VbtConfig, contextData: string): string {
  const { keyword, title, outline, contentType, secondaryKeywords,
          targetLength, tone, language, brand, semantic,
          seoMainLink, seoKeywordLinks, autoBold, footerContent } = config;

  return `
${SEO_PROMPT_RULES}

${SNIPPET_RULES_BY_TONE[tone] ?? ''}

THÔNG TIN BÀI VIẾT:
- Keyword chính: ${keyword}
- Tiêu đề: ${title}
- Loại nội dung: ${contentType}
- Độ dài mục tiêu: ${targetLength} từ
- Ngôn ngữ: ${language}
- Giọng văn: ${tone}
${secondaryKeywords.length > 0 ? `- Keyword phụ: ${secondaryKeywords.join(', ')}` : ''}
${brand.shopName ? `- Thương hiệu: ${brand.shopName}` : ''}
${brand.brandForbidden ? `- Từ cấm: ${brand.brandForbidden}` : ''}
${brand.ctaStandard ? `- CTA chuẩn: ${brand.ctaStandard}` : ''}

${semantic ? `
PHÂN TÍCH SEMANTIC:
- Macro Context: ${semantic.macroContext}
- Search Intent: ${semantic.searchIntent}
- Attribute Map (PHẢI cover): ${semantic.attributeMap.filter(a => a.importance === 'must').map(a => a.attribute).join(', ')}
- Semantic keywords: ${semantic.semanticKeywords.join(', ')}
` : ''}

${outline ? `DÀN Ý BÀI VIẾT:\n${outline}` : `KHÔNG có dàn ý — AI tự xây dựng cấu trúc phù hợp với loại nội dung "${contentType}"`}

${contextData ? `NGỮ CẢNH DỮ LIỆU BỔ SUNG:\n${contextData}` : ''}

${seoMainLink ? `INTERNAL LINK: Gắn link "${seoMainLink}" vào lần xuất hiện đầu tiên của keyword chính.` : ''}
${seoKeywordLinks ? `KEYWORD LINKS:\n${seoKeywordLinks}` : ''}

OUTPUT: HTML thuần (h1, h2, h3, p, ul, ol, li, table, strong, a).
KHÔNG có DOCTYPE, html, head, body, markdown.
  `.trim();
}
```

---

## 9. Prisma Schema — Fields bổ sung

```prisma
// Thêm vào model Article trong schema.prisma:

model Article {
  // ... existing fields ...

  // Viết Bài Thông Minh specific
  contentType     String?    // 'blog_seo' | 'how_to' | 'listicle' | ...
  topicalMapRole  String?    // 'hub' | 'spoke' | 'standalone'
  dataSourceMode  String?    // 'ai_only' | 'google_search' | 'url_crawl' | 'manual_text'
  searchIntent    String?    // 'informational' | 'navigational' | 'commercial' | 'transactional'
  semanticKeywords String[]  // Từ SemanticAnalysis
  competitorUrls  String[]   // URLs đã crawl
  humannessScore  Int?       // 0-100
}
```

---

## 10. Bugs & Edge Cases Cần Xử Lý

| # | Bug | Xử lý |
|---|-----|--------|
| 1 | User F5 ở Step 2/3/4 → mất state | Guard useEffect → redirect step 1. sessionStorage persist qua F5 nên OK nếu key còn đó |
| 2 | `/api/vbt/analyze` timeout khi crawl nhiều URL | Timeout 10s/URL, Promise.allSettled (không crash nếu 1 URL fail) |
| 3 | Title options rỗng (AI trả về mảng trống) | Fallback: dùng keyword làm title, show warning "Không sinh được tiêu đề" |
| 4 | AI sinh 2 H1 trong bài | SEO check #7 bắt → warning trong Tab SEO |
| 5 | Pillar content (5000 từ) → stream timeout | Tăng timeout route lên 180s, dùng `export const maxDuration = 180` |
| 6 | Google Search data source → rate limit | Cache kết quả search 1h theo keyword (Redis hoặc DB) |
| 7 | User back từ Step 4 về Step 3 → bài đã tạo | Kiểm tra `vbt_runId` → nếu có → hỏi "Tiếp tục bài cũ hay bắt đầu lại?" |
| 8 | Competitor URL bị 403/bot block | Try-catch, log warning, tiếp tục không có data đó |
| 9 | Semantic JSON parse fail (AI trả sai format) | Try-catch parse → nếu fail → skip step 2, dùng default SemanticAnalysis |
| 10 | Outline quá dài (user nhập) → vượt context window | Warn nếu userOutlineText > 2000 ký tự |

---

## 11. Checklist — Trước khi merge

### Step 1
- [ ] Keyword textarea + secondary input + AI Suggest button
- [ ] Cannibalization check debounce 800ms (gọi `/api/articles/check-cannibalization`)
- [ ] Content type: 7 card, default `blog_seo`
- [ ] Topical Map role: 3 chip, default `standalone`
- [ ] Competitor URLs: 3 input, tất cả optional
- [ ] Data Source: 4 card — url_crawl hiện 3 URL input, manual_text hiện textarea
- [ ] Language: `SUPPORTED_LANGUAGES` dropdown (không hardcode)
- [ ] Submit gọi `/api/vbt/analyze` → lưu `vbt_step1` + `vbt_semantic` → push step2

### Step 2
- [ ] Guard: không có `vbt_step1` hoặc `vbt_semantic` → redirect step 1
- [ ] Hiển thị đủ: macroContext, searchIntent, rppMap, attributeMap, semanticKeywords
- [ ] Semantic keyword chips → click thêm vào secondary keywords
- [ ] Badge content type đề xuất + estimated word count
- [ ] "Dùng đề xuất AI" toggle → override contentType + targetLength từ step3
- [ ] Competitor insights block (ẩn nếu không có)
- [ ] Nút quay lại Step 1

### Step 3
- [ ] Guard: không có `vbt_step1` → redirect step 1
- [ ] Title generation: nút → gọi `/api/vbt/titles` → render radio list 4-5 options
- [ ] Title selection có ký tự counter (target 50-60)
- [ ] Tự nhập tiêu đề option
- [ ] **Khối 2** Image Option (4 card)
- [ ] **Khối 3** Language (readonly, từ Step 1)
- [ ] **Khối 4** Outline 3 mode + Target Length — default từ contentType
- [ ] **Khối 5** Tone (VBT_TONES, 11 tones)
- [ ] **Khối 6** ModelPicker
- [ ] **Khối 7** BrandSection lsKey=`vbt_brand_info`
- [ ] **Khối 8** SeoAdvancedBlock collapsed
- [ ] Submit lưu `vbt_step3` → gọi `/api/vbt/start` → lưu `vbt_runId` → push step4

### Step 4 — Đã implement (chuẩn 6 tabs unified, 2026-05-29)

**Layout & Structure:**
- [x] Layout: `flex h-full min-h-0 overflow-hidden bg-gray-50` — editor trái, aside phải 420px
- [x] `contentRef` (hidden div) — mirror `displayedHtml` để `buildSentenceTargets` đọc
- [x] `editorShellRef` (wrapper div) — bắt `onMouseUp` + `onKeyUp` cho selection toolbar
- [x] `loading = streaming && !streamDone` (phân biệt với `streaming`)
- [x] `displayedHtml = streamDone ? editableHtml : outputHtml`

**Init & Hydration (3 nguồn):**
- [x] URL `?articleId=` → `fetchArticleById` → `hydrateFromArticle` (mở lại từ Dashboard)
- [x] URL `?runId=` → `fetchArticleByRunId` → `hydrateFromArticle`
- [x] sessionStorage → `readVbtStorage + parseStoredJson` → `hydrateFromStorage` (flow bình thường)
- [x] Fallback → `router.replace('/viet-bai-thong-minh')`
- [x] `startedRef` ngăn double-start stream; `streamDone=true` nếu bài đã có HTML từ DB
- [x] `writeVbtStorage` sync lại sessionStorage sau khi hydrate từ DB

**Header:**
- [x] Tiêu đề `Viết Bài Thông Minh`, keyword subtitle
- [x] Nút `Lưu DB` — disabled khi `savingDraft || loading || !articleId || !displayedHtml`
- [x] `ExportMenu` — chỉ render khi có `articleId`
- [x] Nút `Dừng` — chỉ render khi `streaming === true`
- [x] Nút `Bắt đầu lại` → `clearVbtWorkflowStorage()` + `router.push('/viet-bai-thong-minh')`

**Banner Bar:**
- [x] Hiện khi `loading || streamError || banner`
- [x] Loading: spinner + label step hiện tại + chips steps (green/blue/gray)
- [x] streamError: red alert
- [x] banner: success (green) | error (red)

**Editor:**
- [x] `RichArticleEditor` — `html`, `streaming=loading`, `wordCount`, `keyword`, `articleTitle`, `fullWidth`, `onChange`, `onSave`, `onNewArticle`
- [x] `AiFloatingToolbar` — hiện khi select ≥ 10 ký tự bên trong `editorShellRef`
- [x] Toolbar gọi `POST /api/editor/ai-assist` → stream → DOM replace selection

**Sidebar:**
- [x] Link `Viết Bài Thông Minh` → `/viet-bai-thong-minh` trong `Sidebar.tsx` (matchPrefixes)

**Tab SEO (`SeoTab`) — full unified spec:**
- [x] `SeoScoreBar` — green≥80, amber≥60, red<60
- [x] `KeywordDensityBar` — target 1–1.5%
- [x] Trạng thái draft card: keyword, model, loại bài + Meta description textarea
- [x] SERP Preview (collapsible)
- [x] Secondary keywords chips + input add/remove
- [x] 3 nhóm checks collapsible: SEO Cơ bản / Nâng cao / Tiêu đề thu hút
- [x] 21 `fixActions` buttons (index 0–20)
- [x] index 8: expand form Chèn internal link; index 9: expand form Chèn external link
- [x] Humanness Score + 4 breakdown cards (chỉ hiện khi `humannessScore !== null`)
- [x] Nút "Viết lại từ đầu" (outline orange)
- [x] Internal links gợi ý (`InternalLinkSuggest`)
- [x] `seo` useMemo bên trong SeoTab (khác `currentSeo` của publish panel)
- [x] `minWordCount`: pillar=2500, còn lại=`Math.min(800, Math.max(500, round(targetLength×0.5)))`

**Tab AI (`AiTab`) — thứ tự: SEO nhanh → AI Edit → AICheckPanel:**
- [x] SEO nhanh: wordCount chip + `KeywordDensityBar`
- [x] AI chỉnh vùng chọn: 10 nút, disabled khi !hasSelection
- [x] `AICheckPanel` — `html`, `storageKey`, `onApplyFix`, `getSentenceTargets`
- [x] `handleAiEditCommand` → DOM replace hoặc string replace fallback

**Tab Chất lượng (`QualityTab`) — không có AICheckPanel:**
- [x] `GenerateQualityPanel` — humannessScore fallback = `outputHtml ? 70 : null`
- [x] Decision fallback = `'REVIEW'`
- [x] summaryItems: Paragraphs / Visual breaks / Số từ (tiếng Việt đúng dấu)
- [x] `SemanticScoreCard` (inline component) — violet, chỉ render khi `semanticScore != null`

**Tab Links (`LinksTab`):**
- [x] Semantic keyword chips → `insertHtml`
- [x] `InternalLinkSuggest` — load từ `POST /api/vbt/internal-links`
- [x] Data source block — mode + URLs + competitor count

**Tab Đăng bài (`GeneratePublishPanel`):**
- [x] Chỉ render khi `articleId !== ''`
- [x] `seoScore={currentSeo.score}` — từ `useMemo currentSeo` (riêng, không dùng SeoTab's `seo`)
- [x] `handleSaveDraft` → 12 fields, `status: 'WRITTEN'`, `createVersion: true`
- [x] `handleCopyHtml` → `navigator.clipboard.writeText(displayedHtml)`

**Tab Hình ảnh (`ImagesTab`):**
- [x] Placeholder card + hiện `imageOption` đang cấu hình

**Strings tiếng Việt:**
- [x] Tất cả UI strings có dấu đúng

---

**Còn thiếu / cần thêm sau:**
- [ ] Publish tab: Schema Preview + OG Preview
- [ ] Bing IndexNow auto sau publish

---

## 12. Roadmap — Unified 5-Tab Standard

> Tham chiếu: `UNIFIED-GENERATE-PAGE.md` + `/viet-tin-tuc/generate/page.tsx` (reference implementation ✅ đã đạt 5 tabs)

### Trạng thái hiện tại (2026-05-28)

| Trang | Tabs hiện có | Tabs thiếu | Trạng thái |
|-------|-------------|------------|------------|
| `/viet-tin-tuc/generate` | `seo \| ai \| quality \| sources \| images` | — | ✅ **CHUẨN** (reference) |
| `/viet-bai-thong-minh/step4` | `seo \| quality \| links \| publish` | `ai`, `images` | ⚠️ 4/5 tabs |

### Mục tiêu — step4 đạt chuẩn 5 tabs

Unified tab order: **`seo | ai | quality | links | publish`** + tuỳ chọn `images`

```
Tab 1: SEO          → SeoTab (local) — ✅ đã có, có fix buttons
Tab 2: AI (mới)     → AICheckPanel full-panel (hiện đang nằm trong Quality tab)
Tab 3: CHẤT LƯỢNG   → QualityPanel không còn AICheckPanel, chỉ còn readability + humanness
Tab 4: LINKS        → LinksTab (local) — ✅ đã có
Tab 5: ĐĂNG BÀI     → GeneratePublishPanel — ✅ đã có
Tab 6: HÌNH ẢNH (tuỳ chọn) → placeholder, đang phát triển
```

### Migration tasks cho step4 (theo thứ tự ưu tiên)

**P1 — Editor upgrade:**
- [ ] Thay `ArticleEditor` bằng `RichArticleEditor` → full toolbar (Bold, Italic, Link, Image, Table...)
- [ ] Điều chỉnh `onChange` handler nếu `RichArticleEditor` có API khác

**P2 — Tab AI (tách khỏi Quality tab):**
- [ ] Tạo tab `'ai'` mới trong `GenerateTab` type: `'seo' | 'ai' | 'quality' | 'links' | 'publish'`
- [ ] Di chuyển `AICheckPanel` từ `QualityTab` → tab `'ai'` riêng
- [ ] `QualityTab` chỉ còn: `GenerateQualityPanel` + `SemanticScoreCard`

**P3 — Tab Hình ảnh:**
- [ ] Thêm tab `'images'` → placeholder card "Thư viện hình ảnh — đang phát triển"
- [ ] Pattern giống `/viet-tin-tuc/generate` tab images

**P4 — Publish panel nâng cao:**
- [ ] Schema Preview (Article + FAQ JSON-LD)
- [ ] OG Preview (Facebook card)
- [ ] Bing IndexNow auto sau publish

### Reference code pattern (từ `/viet-tin-tuc/generate`)

```typescript
// Tab state type (5 tabs + images)
const [sideTab, setSideTab] = useState<'seo' | 'ai' | 'quality' | 'links' | 'publish' | 'images'>('seo');

// Tab buttons — text-[10px] để vừa 6 tabs trong aside 420px
{([
  { key: 'seo',     label: 'SEO' },
  { key: 'ai',      label: 'KIỂM TRA AI' },
  { key: 'quality', label: 'CHẤT LƯỢNG' },
  { key: 'links',   label: 'LINKS' },
  { key: 'publish', label: 'ĐĂNG BÀI' },
  { key: 'images',  label: 'HÌNH ẢNH' },
] as const).map((tab) => (
  <button key={tab.key} onClick={() => setSideTab(tab.key)}
    className={`flex-1 py-2.5 text-[10px] font-semibold transition-colors ${
      sideTab === tab.key
        ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
        : 'text-gray-500 hover:text-gray-700'
    }`}>
    {tab.label}
  </button>
))}

// Tab AI panel (IIFE pattern từ viet-tin-tuc/generate)
{sideTab === 'ai' && (
  <div className="p-4">
    {outputHtml && (
      <AICheckPanel
        html={outputHtml}
        storageKey={aiCheckStorageKey}
        onApplyFix={applyAICheckFix}
        getSentenceTargets={getSentenceTargets}
      />
    )}
  </div>
)}

// Tab Hình ảnh — placeholder
{sideTab === 'images' && (
  <div className="p-4">
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
      <p className="text-sm font-medium text-gray-500">Thư viện hình ảnh</p>
      <p className="mt-1 text-xs text-gray-400">Đang phát triển</p>
    </div>
  </div>
)}
```

> **Lưu ý khi migrate:** `GenerateTab` type hiện tại ở `@/lib/shared/generate-tabs` chỉ có 4 giá trị.  
> Cần mở rộng type hoặc dùng string literal riêng cho step4 để tránh ảnh hưởng các page khác đang dùng `GenerateTab`.

### API
- [ ] `/api/vbt/analyze` — timeout 30s, Promise.allSettled cho crawl
- [ ] `/api/vbt/titles` — trả về 4-5 titles
- [ ] `/api/vbt/outline` — tích hợp semantic.attributeMap
- [ ] `/api/vbt/start` — tạo Article record với contentType + topicalMapRole
- [ ] `/api/vbt/stream` — `export const maxDuration = 120` (pillar: 180)
- [ ] `/api/vbt/stream` — inject `SEO_PROMPT_RULES` + `SNIPPET_RULES_BY_TONE`

### Google SEO (xem PAGE-STANDARD.md Section 7)
- [ ] `SEO_PROMPT_RULES` 23 rules inject trong `buildVbtWritingPrompt`
- [ ] `SNIPPET_RULES_BY_TONE` inject theo tone
- [ ] Schema (Article + FAQ + LocalBusiness) generate khi publish
- [ ] Sitemap ping + Bing IndexNow tự động sau publish
