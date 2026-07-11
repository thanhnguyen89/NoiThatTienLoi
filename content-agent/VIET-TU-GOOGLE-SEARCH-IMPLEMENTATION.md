# VIET-TU-GOOGLE-SEARCH-IMPLEMENTATION.md
## Hướng dẫn code tính năng "Viết Từ Google Search"

> Phân tích từ: https://aiktp.com/vi/write-from-search  
> Chuẩn áp dụng: `PAGE-STANDARD.md` (Nhóm A — Viết Bài Chính)  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API  
> Route: `/viet-tu-google-search` → `/viet-tu-google-search/generate`

---

## ⚠️ Điểm khác biệt & chú ý khi implement

| # | Điểm | aiktp.com | Local (file này) |
|---|------|-----------|-----------------|
| 1 | **Flow** | 3 bước độc lập: Search → Review → Write | **2 route: Config → Generate** (standard Nhóm A) |
| 2 | **Search step** | Trang trung gian riêng, hiện "AI trả lời" + Sources | **Phase trong generate route**: search trước, rồi write (SSE step 1 = search) |
| 3 | **Search engine** | Google (backend search) | **SerpAPI / custom Google Search API** → fallback manual URL crawl |
| 4 | **Số kết quả crawl** | Không rõ | **Top 5 URLs** → crawl → tổng hợp |
| 5 | **Duplicate check** | Không (chỉ bulk có) | **Có** — báo trùng keyword qua `/api/articles/check-cannibalization` |
| 6 | **Image** | Không trong search flow | **Có** — 4 IMAGE_OPTIONS chuẩn |
| 7 | **DB lưu** | Không rõ | **Có** — Article record chuẩn Nhóm A |
| 8 | **SEO checks** | Không | **Có** — `computeSeoChecks()` chuẩn |
| 9 | **Brand inject** | Không | **Có** — `BrandSection` chuẩn |
| 10 | **Outline** | Không (AI tự quyết) | **Có** — 3 mode chuẩn (Không / User / AI) |
| 11 | **Freshness date** | Không | **Có** — inject "Cập nhật: [tháng/năm]" vào bài |
| 12 | **Search source hiển thị** | Hiện "Nguồn" section + thumbnail | **Hiện danh sách URLs trong generate panel** |

---

## 0. Mục đích tính năng

User nhập từ khóa → hệ thống:
1. **Search Google** lấy top 5 URLs thực tế
2. **Crawl** nội dung từ các URLs đó
3. **Tổng hợp** (AI synthesis) thành context chất lượng cao
4. **Viết bài** dựa trên context thực + brand + SEO rules

**Khác gì Viết Tinh Gọn?**
- Viết Tinh Gọn: AI viết từ kiến thức nội tại → không có data mới, dễ hallucinate
- Viết Từ Google Search: AI viết từ nội dung crawl thực → fact-based, freshness tự nhiên, ít hallucinate

**Khác gì Viết Theo Nguồn?**
- Viết Theo Nguồn: user tự cung cấp URLs
- Viết Từ Google Search: hệ thống tự tìm URLs theo keyword → automation cao hơn

---

## 1. Kiến trúc

### Nhóm A — 2 route chuẩn

```
/viet-tu-google-search         ← Config page (8 khối chuẩn + Search Config block)
/viet-tu-google-search/generate ← Generate page (Editor + 4 tabs chuẩn)
```

### Cấu trúc file

```
web/
├── app/
│   ├── viet-tu-google-search/
│   │   ├── page.tsx                    ← Config page
│   │   └── generate/
│   │       └── page.tsx                ← Generate page (Editor + tabs)
│   └── api/
│       └── viet-tu-google-search/
│           ├── search/
│           │   └── route.ts            ← POST: search Google + crawl + synthesize
│           ├── stream/
│           │   └── route.ts            ← POST: SSE write article
│           ├── suggest-keywords/
│           │   └── route.ts            ← POST: AI suggest secondary keywords
│           └── outline/
│               └── route.ts            ← POST: AI generate outline
└── lib/
    └── viet-tu-google-search/
        ├── types.ts                    ← Types
        ├── options.ts                  ← VTGS_TONES, SEARCH_RESULT_COUNTS, CRAWL_MODES
        └── prompt-builder.ts           ← buildSearchWritePrompt()
```

### File tái sử dụng (KHÔNG tạo mới)

| File | Dùng để |
|------|---------|
| `lib/shared/options.ts` | `SUPPORTED_LANGUAGES`, `TARGET_LENGTHS`, `IMAGE_OPTIONS`, `WRITING_TONES` |
| `lib/shared/seo-checks.ts` | `computeSeoChecks()` |
| `lib/shared/generate-tabs.ts` | `GENERATE_TABS`, `AI_EDIT_COMMANDS` |
| `hooks/useGenerateStream.ts` | SSE stream handler |
| `components/BrandSection.tsx` | Brand config block |
| `components/ModelPicker.tsx` | AI model selector |
| `components/generate/` | `GeneratePanelTabs`, `SeoPanel`, `QualityPanel`, `LinksPanel`, `PublishPanel` |
| `lib/tinh-gon/model.ts` | `buildTinhGonModel()` |

### Flow đầy đủ

```
[Config page]
User nhập keyword + chọn config
     ↓
Click "Viết bài"
     → Validate (keyword min 3 chars)
     → Check cannibalization (debounce 800ms khi blur keyword)
     → Lưu config vào sessionStorage key "vtgs_config"
     → router.push('/viet-tu-google-search/generate')

[Generate page]
Load config từ sessionStorage
     ↓
POST /api/viet-tu-google-search/search
     → Gọi SerpAPI với keyword
     → Lấy top N URLs (default: 5)
     → Crawl nội dung từng URL (Promise.allSettled, timeout 10s/URL)
     → AI synthesize thành SearchContext
     → Trả về: { sources: Source[], synthesis: string, relatedKeywords: string[] }
     ↓
POST /api/viet-tu-google-search/stream (SSE)
     → step 1: "Đang chuẩn bị context..."
     → step 2: "Đang xây dựng outline..."
     → step 3: "Đang viết bài..." (stream chunks)
     → step 4: "Đang kiểm tra SEO..."
     → done: { articleId, wordCount, seoScore }
     ↓
[Generate page] hiện Editor + 4 tabs
```

---

## 2. Types — `web/lib/viet-tu-google-search/types.ts`

```typescript
// ─── Config (lưu sessionStorage) ─────────────────────────────────────────────

export interface VtgsConfig {
  // Khối 1 — Keyword
  keyword:           string;
  secondaryKeywords: string[];

  // Khối 2 — Image
  imageOption:       string;    // 'none' | 'yandex' | 'ai_generated' | 'shutterstock'

  // Khối 3 — Language
  language:          string;

  // Khối 4 — Outline
  outlineMode:       'no_outline' | 'user_outline' | 'ai_outline';
  targetLength:      number;    // từ TARGET_LENGTHS
  userOutlineText:   string;
  aiOutlineObjective: string;
  aiOutlineSize:     string;
  editedOutline:     string;

  // Khối 5 — Tone
  tone:              string;

  // Khối 6 — Model
  modelId:           string;

  // Khối 7 — Brand
  brand:             BrandSectionState;

  // Khối 8 — SEO Advanced
  seoAdvanced:       SeoAdvancedState;

  // Search-specific config (Khối bổ sung)
  searchResultCount: number;    // 3 | 5 | 10 — số URLs cần search
  crawlMode:         CrawlMode; // 'auto' | 'search_only' | 'no_crawl'
  addFreshnessDate:  boolean;   // Inject "Cập nhật: MM/YYYY" vào bài
}

export type CrawlMode =
  | 'auto'         // Search + crawl content tự động (mặc định)
  | 'search_only'  // Chỉ dùng snippet từ SERP, không crawl full page
  | 'no_crawl';    // Không crawl, chỉ dùng synthesis từ keyword

// ─── Search result ────────────────────────────────────────────────────────────

export interface SearchSource {
  url:      string;
  title:    string;
  snippet:  string;        // Google snippet
  content:  string | null; // Crawled content (null nếu crawl fail)
  crawled:  boolean;
  wordCount: number;
}

export interface SearchResult {
  keyword:         string;
  sources:         SearchSource[];
  synthesis:       string;          // AI tổng hợp từ sources
  relatedKeywords: string[];        // Gợi ý từ Google "Searches related to"
  searchedAt:      string;          // ISO timestamp
}

// ─── SSE events ───────────────────────────────────────────────────────────────

export type VtgsStreamStep =
  | 'searching'    // Đang tìm kiếm Google
  | 'crawling'     // Đang crawl nội dung URLs
  | 'synthesizing' // AI đang tổng hợp context
  | 'outlining'    // Đang build outline
  | 'writing'      // Đang viết bài (chunks)
  | 'seo_check'    // Đang kiểm tra SEO
  | 'done';

export interface VtgsStreamEvent {
  type:    'step' | 'step_done' | 'chunk' | 'done' | 'error';
  step?:   VtgsStreamStep;
  text?:   string;
  message?: string;
  data?:   {
    articleId: string;
    wordCount: number;
    seoScore:  number;
    sources:   SearchSource[];
  };
}

// ─── Brand + SEO Advanced (tái sử dụng từ PAGE-STANDARD) ──────────────────────

export interface BrandSectionState {
  shopName:         string;
  industry:         string;
  brandPronouns:    string;
  brandAudience:    string;
  brandToneNotes:   string;
  phone:            string;
  address:          string;
  brandForbidden:   string;
  ctaStandard:      string;
  mainProducts:     string;
  selectedProfileId: string;
}

export interface SeoAdvancedState {
  internalLinks:        string;
  appendContent:        string;
  autoBold:             string;
  customSlug:           string;
  noIndex:              boolean;
  focusKeyphrase:       string;
  enableFeaturedSnippet: boolean;
}
```

---

## 3. Options — `web/lib/viet-tu-google-search/options.ts`

```typescript
import type { CrawlMode } from './types';

// sessionStorage key
export const VTGS_SESSION_KEY = 'vtgs_config';

// ─── Tones ────────────────────────────────────────────────────────────────────
// Dùng WRITING_TONES từ lib/shared/options.ts — không định nghĩa riêng
// Lý do: page này phù hợp với tất cả 11 tones chung

// ─── Số URL tìm kiếm ─────────────────────────────────────────────────────────

export const SEARCH_RESULT_COUNTS = [
  { value: 3,  label: '3 nguồn',  note: 'Nhanh hơn, ít context',    badge: '' },
  { value: 5,  label: '5 nguồn',  note: 'Cân bằng tốc độ/chất lượng', badge: 'Mặc định' },
  { value: 10, label: '10 nguồn', note: 'Context đầy đủ nhất',      badge: '' },
] as const;

export const DEFAULT_SEARCH_RESULT_COUNT = 5;

// ─── Crawl Mode ───────────────────────────────────────────────────────────────

export const CRAWL_MODES: Array<{
  value:   CrawlMode;
  label:   string;
  note:    string;
  icon:    string;
}> = [
  {
    value: 'auto',
    label: 'Tự động crawl',
    icon:  '🕷️',
    note:  'Search + crawl toàn bộ nội dung trang. Chậm hơn nhưng chất lượng nhất.',
  },
  {
    value: 'search_only',
    label: 'Chỉ dùng snippet',
    icon:  '⚡',
    note:  'Nhanh — chỉ dùng đoạn tóm tắt Google, không vào từng trang.',
  },
  {
    value: 'no_crawl',
    label: 'Không tìm kiếm',
    icon:  '🧠',
    note:  'AI viết từ kiến thức sẵn có + keyword. Tốc độ nhanh nhất.',
  },
];

// ─── AI Outline Objectives (page-specific) ────────────────────────────────────

export const AI_OUTLINE_OBJECTIVES = [
  { value: 'comprehensive', label: 'Toàn diện',   note: 'Bao quát đầy đủ góc cạnh của chủ đề' },
  { value: 'faq_focused',   label: 'FAQ chính',   note: 'Trả lời câu hỏi phổ biến nhất' },
  { value: 'comparison',    label: 'So sánh',      note: 'Đặt vào bảng so sánh, A vs B' },
  { value: 'how_to',        label: 'Hướng dẫn',   note: 'Step by step thực hành' },
  { value: 'listicle',      label: 'Danh sách',   note: 'Top N, liệt kê có thứ tự' },
  { value: 'local_seo',     label: 'Local SEO',   note: 'Tập trung địa danh, địa phương' },
] as const;

export const AI_OUTLINE_SIZES = [
  { value: 'small',  label: 'Nhỏ',    wordRange: '(600–1000 từ)' },
  { value: 'medium', label: 'Vừa',    wordRange: '(1200–2000 từ)' },
  { value: 'large',  label: 'Lớn',    wordRange: '(2500–3500 từ)' },
  { value: 'xl',     label: 'Rất lớn', wordRange: '(4000–5000 từ)' },
] as const;
```

---

## 4. Prompt Builder — `web/lib/viet-tu-google-search/prompt-builder.ts`

```typescript
import type { VtgsConfig, SearchResult } from './types';

// ─── SEO Prompt Rules (từ PAGE-STANDARD Section 7) ───────────────────────────

const SEO_PROMPT_RULES = `
RULES — ÁP DỤNG TOÀN BỘ BÀI:
1. Keyword density 1.0–1.5%
2. H1 duy nhất, chứa keyword, không lặp tiêu đề bài
3. H2, H3 chứa biến thể keyword + từ khóa ngữ nghĩa
4. Đoạn đầu tiên (<p>) phải chứa keyword
5. FAQ section cuối: <div class="faq-section">
6. Internal link: ưu tiên liên kết đến trang category/tag liên quan
7. External link: ít nhất 1 link đến nguồn uy tín
8. Không dùng markdown — chỉ HTML thuần
9. Không có <html>, <head>, <body> — chỉ fragment bắt đầu từ <h1>
10. Output bắt đầu bằng: <!-- RESET --> trên dòng riêng biệt (để FE reset stream)
11. Table of contents: <nav class="toc"> ngay sau intro paragraph
12. Đoạn văn tối đa 4 câu
13. Sau 3–4 đoạn → chèn H3 hoặc ul/table
14. Câu không quá 25 từ
15. Thông số kỹ thuật → dùng ul hoặc table, không dùng p liên tiếp
`.trim();

// ─── Build brand block ────────────────────────────────────────────────────────

function buildBrandBlock(brand: VtgsConfig['brand']): string {
  if (!brand.shopName) return '';
  const lines = [
    `## Thông tin thương hiệu`,
    `- Tên: ${brand.shopName}`,
    `- Sản phẩm: ${brand.mainProducts}`,
    `- Xưng hô thương hiệu: "${brand.brandPronouns}"`,
    `- Xưng hô khách: "${brand.brandAudience}"`,
  ];
  if (brand.phone)         lines.push(`- Điện thoại: ${brand.phone}`);
  if (brand.address)       lines.push(`- Địa chỉ: ${brand.address}`);
  if (brand.ctaStandard)   lines.push(`- CTA mặc định: ${brand.ctaStandard}`);
  if (brand.brandForbidden) lines.push(`- KHÔNG dùng: ${brand.brandForbidden}`);
  if (brand.brandToneNotes) lines.push(`- Ghi chú tone: ${brand.brandToneNotes}`);
  return lines.join('\n');
}

// ─── Build search context block ───────────────────────────────────────────────

function buildSearchContextBlock(search: SearchResult): string {
  const sourceLines = search.sources
    .filter((s) => s.crawled && s.content)
    .map((s, i) => {
      const contentPreview = (s.content ?? '').slice(0, 1500);
      return `### Nguồn ${i + 1}: ${s.title}\nURL: ${s.url}\n\n${contentPreview}`;
    });

  return `
## Nội dung tham khảo từ Google Search (keyword: "${search.keyword}")

### Tổng hợp AI:
${search.synthesis}

### Các nguồn đã crawl:
${sourceLines.join('\n\n---\n\n')}

### Từ khóa liên quan Google gợi ý:
${search.relatedKeywords.join(', ')}
`.trim();
}

// ─── Build outline block ──────────────────────────────────────────────────────

function buildOutlineBlock(config: VtgsConfig): string {
  if (config.outlineMode === 'user_outline' && config.userOutlineText.trim()) {
    return `\n## Dàn ý cần tuân theo:\n${config.userOutlineText}`;
  }
  if (config.outlineMode === 'ai_outline' && config.editedOutline.trim()) {
    return `\n## Dàn ý AI đã tạo (tuân theo chính xác):\n${config.editedOutline}`;
  }
  return '';
}

// ─── Build freshness block ────────────────────────────────────────────────────

function buildFreshnessBlock(addFreshnessDate: boolean): string {
  if (!addFreshnessDate) return '';
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  return `\nThêm dòng "Cập nhật: tháng ${month}/${year}" vào đầu hoặc cuối bài một cách tự nhiên.`;
}

// ─── Main prompt builder ──────────────────────────────────────────────────────

export function buildSearchWritePrompt(
  config:       VtgsConfig,
  searchResult: SearchResult | null,
  finalOutline: string,
): string {
  const secondary = config.secondaryKeywords.length > 0
    ? `\nTừ khóa phụ: ${config.secondaryKeywords.join(', ')}`
    : '';

  const searchBlock = searchResult
    ? '\n\n' + buildSearchContextBlock(searchResult)
    : '';

  const outlineBlock = finalOutline.trim()
    ? `\n\n## Dàn ý (tuân theo chính xác):\n${finalOutline}`
    : buildOutlineBlock(config);

  return `
Bạn là chuyên gia viết content SEO cho thương hiệu nội thất Việt Nam.

${buildBrandBlock(config.brand)}

## Nhiệm vụ:
Viết bài HTML chuẩn SEO, khoảng ${config.targetLength} từ.
Ngôn ngữ: ${config.language}
Từ khóa chính: ${config.keyword}${secondary}
Giọng văn: ${config.tone}
${buildFreshnessBlock(config.addFreshnessDate)}

${SEO_PROMPT_RULES}
${searchBlock}
${outlineBlock}

## Format output:
- Bắt đầu bằng <!-- RESET --> trên dòng đầu tiên
- Tiếp theo là HTML fragment: <h1>...</h1><p>...</p>...
- Không có markdown, không có \`\`\`html, không có DOCTYPE
`.trim();
}
```

---

## 5. API Routes

### 5.1 Search + Crawl — `/api/viet-tu-google-search/search/route.ts`

Đây là bước quan trọng nhất và phức tạp nhất của feature.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import type { SearchResult, SearchSource, CrawlMode } from '@/lib/viet-tu-google-search/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // Search + crawl có thể mất 30-60s

const searchSchema = z.object({
  keyword:   z.string().min(2),
  count:     z.number().int().min(1).max(10).default(5),
  crawlMode: z.enum(['auto', 'search_only', 'no_crawl']).default('auto'),
  language:  z.string().default('Vietnamese'),
  modelId:   z.string().default('gemini-flash'),
});

// ─── Google Search via SerpAPI ────────────────────────────────────────────────

async function searchGoogle(
  keyword: string,
  count:   number,
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    // Fallback: dùng Google Custom Search JSON API
    const cseKey = process.env.GOOGLE_CSE_KEY;
    const cseId  = process.env.GOOGLE_CSE_ID;
    if (!cseKey || !cseId) {
      throw new Error('Chưa cấu hình SERPAPI_KEY hoặc GOOGLE_CSE_KEY + GOOGLE_CSE_ID');
    }
    const url = `https://www.googleapis.com/customsearch/v1?key=${cseKey}&cx=${cseId}&q=${encodeURIComponent(keyword)}&num=${Math.min(count, 10)}`;
    const res  = await fetch(url);
    const data = await res.json() as { items?: Array<{ link: string; title: string; snippet: string }> };
    return (data.items ?? []).map((item) => ({
      url:     item.link,
      title:   item.title,
      snippet: item.snippet,
    }));
  }

  // SerpAPI
  const url  = `https://serpapi.com/search.json?q=${encodeURIComponent(keyword)}&hl=vi&gl=vn&num=${count}&api_key=${apiKey}`;
  const res  = await fetch(url);
  const data = await res.json() as {
    organic_results?: Array<{ link: string; title: string; snippet: string }>;
    related_searches?: Array<{ query: string }>;
  };

  return (data.organic_results ?? []).slice(0, count).map((r) => ({
    url:     r.link,
    title:   r.title,
    snippet: r.snippet ?? '',
  }));
}

// ─── Crawl URL ────────────────────────────────────────────────────────────────

async function crawlUrl(url: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ContentBot/1.0; +https://noithatminhquan.vn)',
      },
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const html     = await res.text();
    const textOnly = extractTextFromHtml(html);

    return textOnly.length > 100 ? textOnly.slice(0, 8000) : null;
  } catch {
    return null;
  }
}

function extractTextFromHtml(html: string): string {
  // Xóa script, style, nav, footer, header
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text;
}

// ─── AI Synthesis ─────────────────────────────────────────────────────────────

async function synthesizeContent(
  keyword: string,
  sources: SearchSource[],
  language: string,
  modelId:  string,
): Promise<string> {
  const model = buildTinhGonModel(modelId);

  const sourcesText = sources
    .filter((s) => s.content)
    .map((s, i) => `[Nguồn ${i + 1}] ${s.title}\n${(s.content ?? '').slice(0, 2000)}`)
    .join('\n\n---\n\n');

  if (!sourcesText.trim()) {
    return `Từ khóa: ${keyword}. Không có nội dung crawl được — AI sẽ viết từ kiến thức nội tại.`;
  }

  const prompt = `
Bạn là AI tổng hợp nội dung SEO. Dựa trên các nguồn tìm kiếm từ Google về từ khóa "${keyword}",
hãy tổng hợp thành 1 đoạn context ngắn gọn (300–500 từ) bằng ${language}.

Bao gồm:
- Các thông tin/số liệu quan trọng nhất
- Góc độ và quan điểm đa chiều từ các nguồn
- Thông tin nổi bật, độc đáo mà AI không thể biết nếu không search

Chỉ tổng hợp thông tin, KHÔNG viết bài hoàn chỉnh.
KHÔNG bịa số liệu nếu không có trong nguồn.

Các nguồn:
${sourcesText}
`.trim();

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return `Từ khóa: ${keyword}. Tổng hợp AI thất bại — sẽ viết từ kiến thức nội tại.`;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json();
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { keyword, count, crawlMode, language, modelId } = parsed.data;

    // Mode: no_crawl → skip tất cả, trả về empty
    if (crawlMode === 'no_crawl') {
      const result: SearchResult = {
        keyword,
        sources:         [],
        synthesis:       `Viết từ kiến thức AI về "${keyword}" — không có search.`,
        relatedKeywords: [],
        searchedAt:      new Date().toISOString(),
      };
      return NextResponse.json(result);
    }

    // Search Google
    let rawResults: Array<{ url: string; title: string; snippet: string }> = [];
    try {
      rawResults = await searchGoogle(keyword, count);
    } catch (err) {
      return NextResponse.json(
        { error: `Search thất bại: ${err instanceof Error ? err.message : 'Lỗi không xác định'}` },
        { status: 503 },
      );
    }

    // Build sources (chỉ snippet nếu search_only, crawl nếu auto)
    const sources: SearchSource[] = await Promise.all(
      rawResults.map(async (r) => {
        let content: string | null = null;

        if (crawlMode === 'auto') {
          content = await crawlUrl(r.url);
        }

        const wordCount = content ? content.split(/\s+/).length : 0;

        return {
          url:      r.url,
          title:    r.title,
          snippet:  r.snippet,
          content,
          crawled:  content !== null,
          wordCount,
        };
      }),
    );

    // Synthesize
    const synthesis = await synthesizeContent(keyword, sources, language, modelId);

    // Clean content để giảm response size
    const sourcesForResponse = sources.map((s) => ({
      ...s,
      content: s.content ? s.content.slice(0, 500) : null, // chỉ preview trong response
    }));

    const result: SearchResult = {
      keyword,
      sources:         sourcesForResponse,
      synthesis,
      relatedKeywords: [],
      searchedAt:      new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lỗi server' },
      { status: 500 },
    );
  }
}
```

---

### 5.2 Stream — `/api/viet-tu-google-search/stream/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildSearchWritePrompt } from '@/lib/viet-tu-google-search/prompt-builder';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import type { VtgsConfig, SearchResult } from '@/lib/viet-tu-google-search/types';

export const runtime     = 'nodejs';
export const maxDuration = 120;

const streamSchema = z.object({
  config:       z.object({}).passthrough(),  // VtgsConfig
  searchResult: z.object({}).passthrough().nullable(),  // SearchResult | null
  finalOutline: z.string().default(''),
});

function send(
  controller: ReadableStreamDefaultController,
  data: object,
) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ type: 'error', message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const parsed = streamSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ type: 'error', message: 'Dữ liệu không hợp lệ' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const config       = parsed.data.config       as VtgsConfig;
  const searchResult = parsed.data.searchResult as SearchResult | null;
  const finalOutline = parsed.data.finalOutline;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1 — Build outline
        send(controller, { type: 'step', step: 'outlining' });

        let outline = finalOutline;
        if (!outline && config.outlineMode === 'ai_outline') {
          // Có thể bỏ qua hoặc dùng outline trống — AI tự quyết cấu trúc
          outline = '';
        }
        send(controller, { type: 'step_done', step: 'outlining' });

        // Step 2 — Write article
        send(controller, { type: 'step', step: 'writing' });

        const prompt = buildSearchWritePrompt(config, searchResult, outline);
        const model  = buildTinhGonModel(config.modelId);

        let outputHtml = '';
        let firstChunk = true;

        const aiStream = await model.generateContentStream(prompt);
        for await (const chunk of aiStream) {
          const text = chunk.text() ?? '';
          if (!text) continue;

          // Strip markdown code fences nếu có
          const cleanedText = text
            .replace(/^```html\n?/gm, '')
            .replace(/^```\n?/gm, '');

          // First chunk: send RESET signal nếu có <!-- RESET -->
          if (firstChunk) {
            firstChunk = false;
            if (cleanedText.includes('<!-- RESET -->')) {
              send(controller, { type: 'chunk', text: '' }); // reset signal
            }
          }

          const withoutReset = cleanedText.replace('<!-- RESET -->', '').trimStart();
          if (withoutReset) {
            outputHtml += withoutReset;
            send(controller, { type: 'chunk', text: withoutReset });
          }
        }

        send(controller, { type: 'step_done', step: 'writing' });

        // Step 3 — SEO check
        send(controller, { type: 'step', step: 'seo_check' });

        const wordCount = outputHtml.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
        const seoResult = computeSeoChecks({
          title:            `${config.keyword} — Nội Thất Minh Quân`,
          metaDescription:  '',
          html:             outputHtml,
          wordCount,
          keyword:          config.keyword,
          secondaryKeywords: config.secondaryKeywords,
          slug:             config.keyword.toLowerCase().replace(/\s+/g, '-'),
        });

        send(controller, { type: 'step_done', step: 'seo_check' });

        // Save to DB
        const article = await prisma.article.create({
          data: {
            title:          `${config.keyword} — Nội Thất Minh Quân`,
            keyword:        config.keyword,
            content:        outputHtml,
            wordCount,
            language:       config.language,
            tone:           config.tone,
            imageOption:    config.imageOption,
            status:         'draft',
            userId:         session.user.id,
            modelId:        config.modelId,
            seoScore:       seoResult.score,
            sourceType:     'google_search',
            // Lưu URLs đã search vào metadata
            meta: searchResult
              ? { searchSources: searchResult.sources.map((s) => ({ url: s.url, title: s.title })) }
              : {},
          },
        });

        send(controller, {
          type: 'done',
          data: {
            articleId: article.id,
            wordCount,
            seoScore:  seoResult.score,
            sources:   searchResult?.sources ?? [],
          },
        });
      } catch (error) {
        send(controller, {
          type:    'error',
          message: error instanceof Error ? error.message : 'Lỗi không xác định',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  });
}
```

---

### 5.3 Suggest Keywords — `/api/viet-tu-google-search/suggest-keywords/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export async function POST(request: NextRequest) {
  const { keyword, modelId } = await request.json() as { keyword: string; modelId?: string };
  if (!keyword?.trim()) return NextResponse.json({ suggestions: [] });

  const model = buildTinhGonModel(modelId ?? 'gemini-flash');
  const prompt = `
Với từ khóa SEO chính: "${keyword}"
Gợi ý 6–8 từ khóa phụ liên quan (LSI keywords, semantic keywords).
Đây là context nội thất Việt Nam (giường, tủ, bàn ghế, nội thất phòng ngủ).
Trả về JSON array của string, không giải thích thêm: ["kw1", "kw2", ...]
`.trim();

  try {
    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();
    const match  = text.match(/\[[\s\S]*\]/);
    const arr    = match ? (JSON.parse(match[0]) as string[]) : [];
    return NextResponse.json({ suggestions: arr.slice(0, 8) });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
```

---

### 5.4 AI Outline — `/api/viet-tu-google-search/outline/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export async function POST(request: NextRequest) {
  const { keyword, objective, size, language, synthesis, modelId } =
    await request.json() as {
      keyword:    string;
      objective:  string;
      size:       string;
      language:   string;
      synthesis?: string;
      modelId?:   string;
    };

  const model = buildTinhGonModel(modelId ?? 'gemini-flash');

  const wordTarget = { small: '600–900', medium: '1200–2000', large: '2500–3500', xl: '4000–5000' };
  const targetRange = wordTarget[size as keyof typeof wordTarget] ?? '1200–2000';

  const synthesisBlock = synthesis
    ? `\n\nNguồn tham khảo (từ Google Search):\n${synthesis.slice(0, 800)}`
    : '';

  const prompt = `
Tạo dàn ý SEO cho bài viết về từ khóa: "${keyword}"
Ngôn ngữ: ${language}
Phong cách: ${objective}
Độ dài mục tiêu: ~${targetRange} từ
${synthesisBlock}

Format dàn ý:
[h2]Tiêu đề H2[/h2]
[h3]Tiêu đề H3[/h3]
[h2]Tiêu đề H2 khác[/h2]

Chỉ trả dàn ý theo format trên. Không giải thích.
`.trim();

  try {
    const result  = await model.generateContent(prompt);
    const outline = result.response.text().trim();
    return NextResponse.json({ outline });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

---

## 6. Config Page — `web/app/viet-tu-google-search/page.tsx`

Theo chuẩn Nhóm A (8 khối), thêm **Khối bổ sung: Search Config** giữa Khối 1 và Khối 2.

```tsx
'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES, TARGET_LENGTHS, IMAGE_OPTIONS, WRITING_TONES } from '@/lib/shared/options';
import {
  VTGS_SESSION_KEY, SEARCH_RESULT_COUNTS, CRAWL_MODES,
  AI_OUTLINE_OBJECTIVES, AI_OUTLINE_SIZES, DEFAULT_SEARCH_RESULT_COUNT,
} from '@/lib/viet-tu-google-search/options';
import type { VtgsConfig, CrawlMode } from '@/lib/viet-tu-google-search/types';
import BrandSection   from '@/components/BrandSection';
import ModelPicker    from '@/components/ModelPicker';
import SeoAdvancedBlock from '@/components/SeoAdvancedBlock';

const DEFAULT_CONFIG: VtgsConfig = {
  keyword:            '',
  secondaryKeywords:  [],
  imageOption:        'none',
  language:           'Vietnamese',
  outlineMode:        'no_outline',
  targetLength:       2000,
  userOutlineText:    '',
  aiOutlineObjective: 'comprehensive',
  aiOutlineSize:      'medium',
  editedOutline:      '',
  tone:               'seo_focus',
  modelId:            '',
  brand: {
    shopName: 'Nội Thất Minh Quân', industry: 'Nội thất',
    brandPronouns: 'Minh Quân', brandAudience: 'anh chị',
    brandToneNotes: '', phone: '', address: '',
    brandForbidden: '', ctaStandard: '', mainProducts: '',
    selectedProfileId: '',
  },
  seoAdvanced: {
    internalLinks: '', appendContent: '', autoBold: 'none',
    customSlug: '', noIndex: false, focusKeyphrase: '',
    enableFeaturedSnippet: false,
  },
  searchResultCount: DEFAULT_SEARCH_RESULT_COUNT,
  crawlMode:         'auto',
  addFreshnessDate:  true,
};

export default function VietTuGoogleSearchPage() {
  const router = useRouter();
  const [config, setConfig]           = useState<VtgsConfig>(DEFAULT_CONFIG);
  const [secKwRaw, setSecKwRaw]       = useState('');
  const [suggestingKw, setSuggestingKw] = useState(false);
  const [kwSuggestions, setKwSuggestions] = useState<string[]>([]);
  const [genOutline, setGenOutline]   = useState(false);
  const [outlineError, setOutlineError] = useState('');
  const [cannibalWarn, setCannibalWarn] = useState('');

  const update = (partial: Partial<VtgsConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  // ── Cannibalization check ───────────────────────────────────────────────────

  const checkCannibalization = useCallback(async (kw: string) => {
    if (!kw.trim()) return;
    const res = await fetch(`/api/articles/check-cannibalization?keyword=${encodeURIComponent(kw)}`);
    const data = await res.json() as { cannibalizing: boolean; matchedTitle?: string };
    setCannibalWarn(
      data.cannibalizing
        ? `⚠️ Trùng với bài đã có: "${data.matchedTitle}". Cân nhắc trước khi tạo.`
        : '',
    );
  }, []);

  // ── AI suggest keywords ─────────────────────────────────────────────────────

  const handleSuggestKeywords = async () => {
    if (!config.keyword.trim()) return;
    setSuggestingKw(true);
    try {
      const res = await fetch('/api/viet-tu-google-search/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: config.keyword, modelId: config.modelId }),
      });
      const data = await res.json() as { suggestions: string[] };
      setKwSuggestions(data.suggestions);
    } finally {
      setSuggestingKw(false);
    }
  };

  // ── AI generate outline ─────────────────────────────────────────────────────

  const handleGenerateOutline = async () => {
    if (!config.keyword.trim()) return;
    setGenOutline(true);
    setOutlineError('');
    try {
      const res = await fetch('/api/viet-tu-google-search/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword:   config.keyword,
          objective: config.aiOutlineObjective,
          size:      config.aiOutlineSize,
          language:  config.language,
          modelId:   config.modelId,
        }),
      });
      const data = await res.json() as { outline?: string; error?: string };
      if (data.error) { setOutlineError(data.error); return; }
      update({ editedOutline: data.outline ?? '' });
    } catch (err) {
      setOutlineError(String(err));
    } finally {
      setGenOutline(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!config.keyword.trim() || config.keyword.length < 3) return;

    const configToSave: VtgsConfig = {
      ...config,
      secondaryKeywords: secKwRaw.split(',').map((s) => s.trim()).filter(Boolean),
    };

    sessionStorage.setItem(VTGS_SESSION_KEY, JSON.stringify(configToSave));
    router.push('/viet-tu-google-search/generate');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Viết từ Google Search</h1>
      <p className="text-sm text-gray-500 mb-8">
        AI tìm kiếm Google thực → crawl nội dung → viết bài dựa trên data thực tế.
      </p>

      <div className="space-y-8">

        {/* ── Khối 1: Keyword ─────────────────────────────────────────────── */}
        <section>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Từ khóa chính <span className="text-red-500">*</span>
          </label>
          <textarea
            value={config.keyword}
            onChange={(e) => update({ keyword: e.target.value })}
            onBlur={(e) => void checkCannibalization(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Nhập từ khóa chính..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
          />

          {cannibalWarn && (
            <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded px-2 py-1.5">
              {cannibalWarn}
            </p>
          )}

          <div className="mt-3">
            <input
              value={secKwRaw}
              onChange={(e) => setSecKwRaw(e.target.value)}
              placeholder="Từ khóa phụ, cách nhau bởi dấu phẩy (tùy chọn)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleSuggestKeywords()}
              disabled={!config.keyword.trim() || suggestingKw}
              className="text-xs px-3 py-1.5 border border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-40"
            >
              {suggestingKw ? 'Đang gợi ý...' : '✨ AI Gợi ý từ khóa phụ'}
            </button>

            {kwSuggestions.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => setSecKwRaw((prev) => prev ? `${prev}, ${kw}` : kw)}
                className="text-xs px-2.5 py-1 bg-gray-100 rounded-full hover:bg-blue-100 text-gray-700"
              >
                + {kw}
              </button>
            ))}
          </div>
        </section>

        {/* ── Khối bổ sung: Search Config ─────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Cấu hình tìm kiếm</h2>

          {/* Crawl Mode */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Chế độ tìm kiếm</p>
            <div className="grid grid-cols-3 gap-2">
              {CRAWL_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  title={m.note}
                  onClick={() => update({ crawlMode: m.value })}
                  className={`p-3 rounded-xl border-2 text-center transition-colors ${
                    config.crawlMode === m.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-xl block mb-1">{m.icon}</span>
                  <p className={`text-xs font-semibold ${config.crawlMode === m.value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {m.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Số URLs */}
          {config.crawlMode !== 'no_crawl' && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Số nguồn tìm kiếm</p>
              <div className="flex gap-2">
                {SEARCH_RESULT_COUNTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.note}
                    onClick={() => update({ searchResultCount: opt.value })}
                    className={`relative flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      config.searchResultCount === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {opt.label}
                    {opt.badge && (
                      <span className="absolute -top-2 -right-1 text-[9px] bg-blue-500 text-white rounded-full px-1.5 py-0.5">
                        {opt.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Freshness date */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.addFreshnessDate}
              onChange={(e) => update({ addFreshnessDate: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">
              Thêm "Cập nhật: tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}" vào bài
            </span>
          </label>
        </section>

        {/* ── Khối 2: Image ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ảnh bài viết</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {IMAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ imageOption: opt.value })}
                className={`p-3 rounded-xl border-2 text-center transition-colors ${
                  config.imageOption === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <span className="text-2xl block mb-1">{opt.icon}</span>
                <p className={`text-xs font-semibold ${config.imageOption === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>
                  {opt.label}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Khối 3: Language ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Ngôn ngữ</h2>
          <select
            value={config.language}
            onChange={(e) => update({ language: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </section>

        {/* ── Khối 4: Outline + Length ──────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Dàn ý & Độ dài</h2>
          <div className="flex gap-2 mb-3">
            {(['no_outline', 'user_outline', 'ai_outline'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update({ outlineMode: m })}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  config.outlineMode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'
                }`}
              >
                {{ no_outline: 'Không dàn ý', user_outline: 'Dàn ý của bạn', ai_outline: 'AI Tạo dàn ý' }[m]}
              </button>
            ))}
          </div>

          {config.outlineMode === 'no_outline' && (
            <div className="flex gap-2 flex-wrap">
              {TARGET_LENGTHS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => update({ targetLength: l.value })}
                  className={`relative px-4 py-2 rounded-lg border-2 text-sm transition-colors ${
                    config.targetLength === l.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
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

          {config.outlineMode === 'user_outline' && (
            <textarea
              value={config.userOutlineText}
              onChange={(e) => update({ userOutlineText: e.target.value })}
              placeholder={`[h2]Tiêu đề H2[/h2]\n[h3]Tiêu đề H3[/h3]\n[h2]Tiêu đề H2 khác[/h2]`}
              rows={6}
              className="w-full mt-2 px-3 py-2 border rounded-lg text-sm font-mono resize-y"
            />
          )}

          {config.outlineMode === 'ai_outline' && (
            <div className="mt-2 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {AI_OUTLINE_OBJECTIVES.map((obj) => (
                  <button key={obj.value} type="button" title={obj.note}
                    onClick={() => update({ aiOutlineObjective: obj.value })}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      config.aiOutlineObjective === obj.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'
                    }`}>
                    {obj.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {AI_OUTLINE_SIZES.map((s) => (
                  <button key={s.value} type="button"
                    onClick={() => update({ aiOutlineSize: s.value })}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      config.aiOutlineSize === s.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200'
                    }`}>
                    {s.label} <span className="text-gray-400">{s.wordRange}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => void handleGenerateOutline()}
                disabled={genOutline || !config.keyword.trim() || !config.modelId}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40">
                {genOutline ? 'Đang tạo dàn ý...' : '✨ Tạo Dàn Ý'}
              </button>
              {outlineError && <p className="text-xs text-red-600">{outlineError}</p>}
              {config.editedOutline && (
                <textarea
                  value={config.editedOutline}
                  onChange={(e) => update({ editedOutline: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono resize-y border-purple-300 bg-purple-50"
                />
              )}
            </div>
          )}
        </section>

        {/* ── Khối 5: Tone ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Giọng văn</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {WRITING_TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                title={t.note}
                onClick={() => update({ tone: t.value })}
                className={`py-2.5 px-3 rounded-lg border-2 text-xs font-medium transition-colors ${
                  config.tone === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Hover vào từng tùy chọn để xem khi nào nên dùng.</p>
        </section>

        {/* ── Khối 6: Model ────────────────────────────────────────────────── */}
        <section>
          <ModelPicker
            value={config.modelId}
            onChange={(modelId) => update({ modelId })}
            size="md"
            label=""
          />
        </section>

        {/* ── Khối 7: Brand ────────────────────────────────────────────────── */}
        <section>
          <BrandSection
            value={config.brand}
            onChange={(brand) => update({ brand })}
            lsKey="vtgs_brand_info"
            defaultBrandName="Nội Thất Minh Quân"
          />
        </section>

        {/* ── Khối 8: SEO Advanced ─────────────────────────────────────────── */}
        <section>
          <SeoAdvancedBlock
            value={config.seoAdvanced}
            onChange={(seoAdvanced) => update({ seoAdvanced })}
          />
        </section>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!config.keyword.trim() || config.keyword.length < 3 || !config.modelId}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
        >
          🔍 Tìm kiếm & Viết bài
        </button>

      </div>
    </div>
  );
}
```

---

## 7. Generate Page — `web/app/viet-tu-google-search/generate/page.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VTGS_SESSION_KEY } from '@/lib/viet-tu-google-search/options';
import { useGenerateStream }    from '@/hooks/useGenerateStream';
import GeneratePanelTabs  from '@/components/generate/GeneratePanelTabs';
import SeoPanel           from '@/components/generate/SeoPanel';
import QualityPanel       from '@/components/generate/QualityPanel';
import LinksPanel         from '@/components/generate/LinksPanel';
import PublishPanel       from '@/components/generate/PublishPanel';
import type { VtgsConfig, SearchResult, VtgsStreamStep } from '@/lib/viet-tu-google-search/types';

const STEP_LABELS: Record<VtgsStreamStep, string> = {
  searching:    '🔍 Đang tìm kiếm Google...',
  crawling:     '🕷️ Đang crawl nội dung...',
  synthesizing: '🧠 Đang tổng hợp nội dung...',
  outlining:    '📋 Đang xây dựng outline...',
  writing:      '✍️ Đang viết bài...',
  seo_check:    '📊 Đang kiểm tra SEO...',
  done:         '✅ Hoàn thành!',
};

export default function VietTuGoogleSearchGeneratePage() {
  const router = useRouter();
  const [config, setConfig]           = useState<VtgsConfig | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching]     = useState(false);
  const [searchError, setSearchError] = useState('');
  const [currentStep, setCurrentStep] = useState<VtgsStreamStep | ''>('');
  const [activeTab, setActiveTab]     = useState<'seo' | 'quality' | 'links' | 'publish'>('seo');
  const [articleId, setArticleId]     = useState('');
  const [seoScore, setSeoScore]       = useState(0);
  const [wordCount, setWordCount]     = useState(0);
  const [sources, setSources]         = useState<SearchResult['sources']>([]);
  const started = useRef(false);

  const {
    streaming, outputHtml, error: streamError,
    startStream,
  } = useGenerateStream('/api/viet-tu-google-search/stream');

  // Load config từ sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem(VTGS_SESSION_KEY);
    if (!raw) { router.push('/viet-tu-google-search'); return; }

    try {
      const cfg = JSON.parse(raw) as VtgsConfig;
      setConfig(cfg);
    } catch {
      router.push('/viet-tu-google-search');
    }
  }, [router]);

  // Auto-start sau khi config load
  useEffect(() => {
    if (!config || started.current) return;
    started.current = true;
    void runPipeline(config);
  }, [config]);

  async function runPipeline(cfg: VtgsConfig) {
    // Phase 1: Search
    if (cfg.crawlMode !== 'no_crawl') {
      setSearching(true);
      setCurrentStep('searching');
      try {
        const res = await fetch('/api/viet-tu-google-search/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword:   cfg.keyword,
            count:     cfg.searchResultCount,
            crawlMode: cfg.crawlMode,
            language:  cfg.language,
            modelId:   cfg.modelId,
          }),
        });

        if (!res.ok) {
          const err = await res.json() as { error?: string };
          setSearchError(err.error ?? 'Search thất bại');
          setSearching(false);
        } else {
          const result = await res.json() as SearchResult;
          setSearchResult(result);
          setSources(result.sources);
          setSearching(false);

          // Phase 2: Stream write
          setCurrentStep('outlining');
          await startStream({
            config:       cfg,
            searchResult: result,
            finalOutline: cfg.editedOutline || '',
          });
        }
      } catch (err) {
        setSearchError(String(err));
        setSearching(false);
      }
    } else {
      // no_crawl: skip search, go straight to write
      setCurrentStep('outlining');
      await startStream({
        config:       cfg,
        searchResult: null,
        finalOutline: cfg.editedOutline || '',
      });
    }
  }

  // Handle stream done event (qua useGenerateStream hook)
  // Lưu ý: cần extend useGenerateStream để expose streamResult
  // hoặc parse 'done' event từ outputHtml (hack) → prefer extend hook

  if (!config) return null;

  const isLoading = searching || streaming;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* LEFT: Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Steps indicator */}
        {isLoading && (
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm text-blue-700 font-medium">
                {STEP_LABELS[currentStep as VtgsStreamStep] ?? 'Đang xử lý...'}
              </span>
            </div>

            {/* Sources found indicator */}
            {sources.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs px-2 py-1 rounded-full border ${
                      s.crawled ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500'
                    }`}
                    title={s.url}
                  >
                    {s.crawled ? '✓' : '○'} {s.title.slice(0, 30)}...
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search error */}
        {searchError && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <p className="text-sm text-red-700">
              ⚠️ {searchError} — sẽ tiếp tục viết từ kiến thức AI.
            </p>
          </div>
        )}

        {/* Article output */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8">
            {outputHtml ? (
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: outputHtml }}
              />
            ) : isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1,2,3].map((i) => (
                  <div key={i}>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* RIGHT: Tabs Panel */}
      <div className="w-96 flex-shrink-0 flex flex-col border-l border-gray-200 bg-white overflow-hidden">
        <GeneratePanelTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'seo'     && <SeoPanel html={outputHtml} keyword={config.keyword} secondaryKeywords={config.secondaryKeywords} />}
          {activeTab === 'quality' && <QualityPanel html={outputHtml} />}
          {activeTab === 'links'   && <LinksPanel keyword={config.keyword} articleId={articleId} />}
          {activeTab === 'publish' && (
            <PublishPanel
              keyword={config.keyword}
              html={outputHtml}
              articleId={articleId}
              seoScore={seoScore}
              wordCount={wordCount}
            />
          )}
        </div>
      </div>

    </div>
  );
}
```

---

## 8. Prisma Schema — thêm vào `prisma/schema.prisma`

```prisma
model Article {
  // ... các field đã có ...

  // Thêm field mới cho feature này:
  sourceType  String?  // 'google_search' | 'url_crawl' | 'ai_only' | ...
  meta        Json?    // { searchSources: [{url, title}] } hoặc metadata khác
}
```

**Migration:**

```bash
npx prisma migrate dev --name add-article-source-type-meta
```

---

## 9. Environment Variables — `.env`

```bash
# Option 1: SerpAPI (recommend — free tier: 100 searches/month)
SERPAPI_KEY=your_serpapi_key_here

# Option 2: Google Custom Search API (alternative)
GOOGLE_CSE_KEY=your_google_api_key
GOOGLE_CSE_ID=your_custom_search_engine_id
```

**Ưu tiên:** `SERPAPI_KEY` → nếu không có → thử `GOOGLE_CSE_KEY` + `GOOGLE_CSE_ID` → nếu không có → throw error.

**Setup SerpAPI:**
1. Đăng ký https://serpapi.com (free: 100 searches/month)
2. Copy API key → thêm vào `.env`
3. Không cần cấu hình thêm — search Google trực tiếp

**Setup Google Custom Search API (alternative):**
1. Bật Custom Search JSON API tại Google Cloud Console
2. Tạo Custom Search Engine tại https://cse.google.com
3. Set "Search the entire web" = ON trong CSE settings

---

## 10. Sidebar — cập nhật `web/components/Sidebar.tsx`

```typescript
// Section "VIẾT BÀI" — thêm entry mới:
{
  label: 'Viết bài',
  items: [
    { href: '/viet-tinh-gon',            icon: '⚡', label: 'Viết tinh gọn'           },
    { href: '/viet-tu-google-search',    icon: '🔍', label: 'Viết từ Google Search',  badge: 'NEW' }, // ← MỚI
    { href: '/viet-bai-thong-minh',      icon: '🧠', label: 'Viết thông minh'         },
    { href: '/viet-tin-tuc',             icon: '📰', label: 'Viết tin tức'            },
    { href: '/viet-theo-nguon',          icon: '🔗', label: 'Viết theo nguồn'         },
    { href: '/viet-theo-dan-bai',        icon: '📋', label: 'Viết theo dàn bài'       },
    { href: '/viet-toplist',             icon: '🏆', label: 'Viết toplist'            },
    { href: '/viet-danh-gia-san-pham',   icon: '⭐', label: 'Viết đánh giá sản phẩm' },
  ],
},
```

---

## 11. Cập nhật PAGE-STANDARD.md — Thêm vào Section 0

```markdown
| Viết Từ Google Search | `/viet-tu-google-search` | `/viet-tu-google-search/generate` |
```

Thêm vào bảng Nhóm A.

---

## 12. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `.env` | Thêm `SERPAPI_KEY` hoặc `GOOGLE_CSE_KEY`+`GOOGLE_CSE_ID` |
| 2 | `prisma/schema.prisma` | Thêm `sourceType`, `meta` vào Article |
| 3 | `npx prisma migrate dev --name add-article-source-type-meta` | |
| 4 | `lib/viet-tu-google-search/types.ts` | Types |
| 5 | `lib/viet-tu-google-search/options.ts` | Constants |
| 6 | `lib/viet-tu-google-search/prompt-builder.ts` | Prompt builder |
| 7 | `api/viet-tu-google-search/suggest-keywords/route.ts` | Test với Postman |
| 8 | `api/viet-tu-google-search/outline/route.ts` | |
| 9 | `api/viet-tu-google-search/search/route.ts` | **Test kỹ nhất** — search + crawl + synthesize |
| 10 | `api/viet-tu-google-search/stream/route.ts` | SSE generate |
| 11 | `app/viet-tu-google-search/page.tsx` | Config UI |
| 12 | `app/viet-tu-google-search/generate/page.tsx` | Generate UI |
| 13 | `components/Sidebar.tsx` | Thêm nav entry |

---

## 13. Bugs thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|---------|
| SerpAPI trả 401 | API key sai hoặc hết quota | Kiểm tra key + dùng fallback CSE |
| Crawl URL timeout | Site chậm hoặc block bot | Timeout 10s đã set; log URL bị timeout để debug |
| `extractTextFromHtml` trả chuỗi ngắn | Site dùng JS render (SPA) | Dùng Puppeteer/Playwright nếu cần (expensive) — fallback về snippet |
| AI synthesis hallucinate | Sources crawl thất bại | Verify `s.crawled === true` trước khi đưa vào synthesis |
| `<!-- RESET -->` không trigger FE reset | FE không detect đúng | Gửi `{ type: 'chunk', text: '' }` (empty string) = reset signal |
| generate page không start | sessionStorage null | Guard `if (!raw) router.push(...)` đã có |
| Search quota hết | SerpAPI free = 100/month | Thêm quota warning trong UI; cache results với Redis nếu cần |
| Crawl bị block (403/captcha) | Site chống bot | Skip URL đó, tiếp tục các URL khác (Promise.allSettled đã handle) |
| `maxDuration` timeout | Crawl 10 URLs mất 60s+ | Default 5 URLs; warn user nếu chọn 10 URLs |
| Synthesis quá dài → cắt prompt | synthesis > 8000 tokens | `synthesis.slice(0, 3000)` trong prompt builder |

---

## 14. QA Checklist

### Config Page
- [ ] Keyword textarea chấp nhận Enter → submit
- [ ] `onBlur` keyword → check cannibalization (debounce 800ms)
- [ ] AI Suggest keywords → chips hiện đúng, click thêm vào secKwRaw
- [ ] Crawl Mode 3 loại → chọn đúng, note hiện khi hover
- [ ] Số nguồn chỉ hiện khi crawlMode ≠ 'no_crawl'
- [ ] Freshness checkbox toggle đúng
- [ ] Outline mode 3 loại → conditional render đúng
- [ ] AI Tạo Dàn Ý → disabled khi chưa có keyword/model
- [ ] Tone grid hover → tooltip hiện note
- [ ] ModelPicker auto-select default
- [ ] BrandSection load profile từ DB
- [ ] Submit → sessionStorage save → redirect
- [ ] Submit disabled khi keyword.length < 3 hoặc chưa chọn model

### Generate Page
- [ ] Load sessionStorage → config đúng → auto start pipeline
- [ ] `crawlMode = 'no_crawl'` → skip search phase, đi thẳng stream
- [ ] Search phase: hiện step "Đang tìm kiếm Google..."
- [ ] Sources badges hiện đúng (✓ green nếu crawled, ○ gray nếu không)
- [ ] Search fail (403, timeout) → `searchError` hiện, pipeline tiếp tục với AI-only
- [ ] Stream chunks append đúng vào `outputHtml`
- [ ] `<!-- RESET -->` chunk đầu → FE reset accumulation
- [ ] SEO panel cập nhật realtime khi outputHtml thay đổi
- [ ] Publish panel: title/meta/slug tự điền từ keyword
- [ ] Article lưu vào DB với `sourceType = 'google_search'`
- [ ] `meta.searchSources` lưu URLs đã search

### Edge Cases
- [ ] Tất cả 5 URLs crawl fail → pipeline vẫn hoạt động (viết từ AI)
- [ ] SerpAPI trả 0 results → handleSearchError, viết AI-only
- [ ] User F5 trang generate → redirect về config (sessionStorage vẫn có → OK)
- [ ] `keyword` có ký tự đặc biệt → `encodeURIComponent` đã handle
- [ ] Bài tạo ra có `<!-- RESET -->` trong nội dung thật → edge case hiếm, `replace` đã strip
