# VIET-HANG-LOAT-GOOGLE-SEARCH-IMPLEMENTATION.md
## Hướng dẫn "Viết Hàng Loạt — Google Search"

> Base page: `/viet-tu-google-search` (đã code — đây là bản mở rộng bulk/queue)  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · PostgreSQL  
> Pattern: **P3 — Queue Bulk**  
> **Trạng thái: ĐÃ IMPLEMENT ĐẦY ĐỦ** — Tất cả pages, API routes, và lib đã có code

---

## 0. Nhóm & Pattern

| Nhóm | Page | Config | Queue | Article | Pattern | Spec |
|------|------|--------|-------|---------|---------|------|
| A | Viết Hàng Loạt — Google Search | `/viet-hang-loat-google-search` | `/viet-hang-loat-google-search/queue` | `/viet-hang-loat-google-search/[id]` | **P3** | file này |

---

## ⚠️ Điểm khác biệt so với 3 Bulk variant còn lại

| # | Điểm | Smart AI | Từ Khóa | Tinh Gọn | **Google Search** |
|---|------|----------|---------|----------|-------------------|
| 1 | Base logic | viet-bai-thong-minh | viet-theo-tu-khoa | viet-tinh-gon | **viet-tu-google-search** |
| 2 | Bước/bài | 5 | 2 | 3 | **5 (+ crawl N URLs)** |
| 3 | Tốc độ/bài | ~60s | ~30s | ~40s | **~60–120s** (phụ thuộc N nguồn + network) |
| 4 | AI context | Semantic analysis | Keyword-based | Outline-based | **Real crawled content** |
| 5 | External API | Không | Không | Không | **SerpAPI + HTTP crawl** |
| 6 | Rate limit risk | Thấp | Thấp | Thấp | **CAO** — SerpAPI + crawler cần throttle |
| 7 | jobType BulkJob | `'smart'` | `'tu-khoa'` | `'tinh-gon'` | **`'google-search'`** |
| 8 | Delay giữa bài | 1.5s | 1.5s | 1.5s | **3s** (tránh rate limit) |

> **Đặc điểm quan trọng:**  
> Mỗi bài đi qua pipeline: Search Google → Crawl URLs → AI Synthesize → Write → Score  
> Pipeline này real-time fact-based — nội dung mới nhất từ web, ít hallucinate hơn.  
> Đổi lại: chậm nhất trong 4 bulk variants và phụ thuộc SerpAPI credits.

---

## 1. Kiến trúc tổng quan

### 1.1 Flow hoạt động

```
User điền config:
  - Keywords textarea (1 dòng = 1 bài, tối đa 30 do rate limit)
  - Duplicate mode + Search config (N nguồn, CrawlMode, freshness)
  - 8 khối config chuẩn
  ↓
Submit → POST /api/vhlgs/enqueue
  - Tạo BulkJob (jobType='google-search') + N Article records
  - Trả về { jobId }
  → Navigate sang /viet-hang-loat-google-search/queue
  ↓
Queue page:
  POST /api/vhlgs/process/[jobId]  ← user bấm "Bắt đầu"
  SSE stream — xử lý từng keyword tuần tự:
    ① Search Google (SerpAPI) → lấy top N URLs  (~5s)
    ② Crawl nội dung từng URL (Promise.allSettled)  (~10–30s)
    ③ AI synthesize context từ crawled content  (~10s)
    ④ AI viết bài dựa trên context + brand  (~20–40s)
    ⑤ Humanness score + SEO checks + save DB  (~5s)
    Delay 3s → keyword tiếp theo
  Kết thúc: job_done event
  ↓
User click bài đã xong → /viet-hang-loat-google-search/[id]
  Reuse generate page editor của viet-tu-google-search
```

### 1.2 Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-hang-loat-google-search/
│   │   ├── page.tsx                              ← Config page
│   │   ├── queue/
│   │   │   └── page.tsx                          ← Queue management
│   │   └── [id]/
│   │       └── page.tsx                          ← Article view
│   └── api/
│       └── vhlgs/
│           ├── enqueue/
│           │   └── route.ts
│           ├── process/
│           │   └── [jobId]/
│           │       └── route.ts
│           └── jobs/
│               └── [jobId]/
│                   └── route.ts
└── lib/
    └── viet-hang-loat-google-search/
        ├── types.ts
        └── processor.ts
```

### 1.3 File tái sử dụng — KHÔNG tạo mới

| File | Từ đâu | Dùng gì |
|------|--------|---------|
| `lib/viet-tu-google-search/searcher.ts` | viet-tu-google-search | `searchAndCrawl()` ← **cần extract** |
| `lib/viet-tu-google-search/prompt-builder.ts` | viet-tu-google-search | `buildSearchWritePrompt()` ← **cần extract** |
| `lib/viet-tu-google-search/types.ts` | viet-tu-google-search | `SearchSource`, `SearchResult`, `CrawlMode` |
| `lib/viet-tu-google-search/options.ts` | viet-tu-google-search | `SEARCH_RESULT_COUNTS`, `CRAWL_MODES` |
| `lib/tinh-gon/model.ts` | tinh-gon | `buildTinhGonModel()` |
| `lib/tinh-gon/text.ts` | tinh-gon | `sanitizeHtmlArticle()`, `buildMetaDescription()` |
| `lib/tinh-gon/humanness.ts` | tinh-gon | `scoreHumanness()` |
| `lib/shared/options.ts` | shared | `SUPPORTED_LANGUAGES`, `IMAGE_OPTIONS`, `WRITING_TONES` |
| `lib/shared/seo-checks.ts` | shared | `computeSeoChecks()` |
| `app/components/ModelPicker.tsx` | shared | ModelPicker |
| `app/components/BrandSection.tsx` | shared | BrandSection |
| `app/components/SeoAdvancedBlock.tsx` | shared | SeoAdvancedBlock |

> ⚠️ **REFACTOR TRƯỚC KHI CODE:**  
> Extract từ `api/viet-tu-google-search/`:  
> 1. **`lib/viet-tu-google-search/searcher.ts`** — hàm `searchAndCrawl(keyword, config)`:  
>    gọi SerpAPI → crawl URLs (Promise.allSettled, timeout 10s) → trả `SearchResult`  
> 2. **`lib/viet-tu-google-search/prompt-builder.ts`** — hàm `buildSearchWritePrompt(config, searchResult)`:  
>    inject synthesis context + brand + SEO rules vào prompt  
> 3. Update `api/viet-tu-google-search/search/route.ts` và `stream/route.ts` import từ lib mới.

---

## 2. Types

```typescript
// web/lib/viet-hang-loat-google-search/types.ts

import type { CrawlMode, SearchResult } from '@/lib/viet-tu-google-search/types';
import type { ImageOption } from '@/lib/shared/options';

export type BulkGsOutlineMode = 'no_outline' | 'ai_outline';
// Không có user_outline — không thể cung cấp 30 outline khác nhau

export type DuplicateMode = 'allow' | 'reject';

export interface BulkGsConfig {
  // Khối 1 — Keywords + Search config
  keywords: string[];
  duplicateMode: DuplicateMode;

  // Search-specific (từ Khối 1 additions)
  searchResultCount: 3 | 5 | 10;     // Số URLs crawl mỗi bài
  crawlMode: CrawlMode;              // 'auto' | 'search_only' | 'no_crawl'
  addFreshnessDate: boolean;         // Inject "Cập nhật MM/YYYY"

  // Khối 2 — Image
  imageOption: ImageOption;
  imageCount: number;                // 1–10

  // Khối 3 — Language
  language: string;

  // Khối 4 — Outline + Length
  outlineMode: BulkGsOutlineMode;
  targetLength: number;              // từ TARGET_LENGTHS
  // Chỉ dùng khi outlineMode === 'ai_outline':
  aiOutlineObjective?: string;
  aiOutlineSize?: string;

  // Khối 5 — Tone
  tone: string;                      // từ WRITING_TONES

  // Khối 6 — Model
  modelId: string;

  // Khối 7 — Brand
  brandName?: string;
  brandPhone?: string;
  brandAddress?: string;
  brandCta?: string;
  brandSelectedProfileId?: string;

  // Khối 8 — SEO Advanced
  seoInternalLinks?: string;
  seoAppendContent?: string;
  seoAutoBold?: string;
  seoCustomSlug?: string;
  seoNoIndex?: boolean;
}

// SSE Events từ /api/vhlgs/process/[jobId]
export type VhlgsSSEEvent =
  | { type: 'item_start';  index: number; keyword: string }
  | { type: 'item_step';   index: number; step: BulkGsStep; detail?: string; progress: number }
  | { type: 'item_done';   index: number; articleId: string; title: string; wordCount: number; humanness: number; sourcesCount: number }
  | { type: 'item_error';  index: number; message: string }
  | { type: 'job_done';    successCount: number; errorCount: number }
  | { type: 'error';       message: string };

export type BulkGsStep =
  | 'searching'    // Gọi SerpAPI
  | 'crawling'     // Crawl URLs
  | 'synthesizing' // AI synthesize context
  | 'writing'      // AI viết bài
  | 'scoring';     // Humanness + SEO

// sessionStorage keys
export const LS_CONFIG_KEY = 'vhlgs_config';
export const LS_JOB_ID_KEY = 'vhlgs_jobId';
```

---

## 3. Prisma — Reuse BulkJob

Không tạo model mới. Dùng `BulkJob.jobType = 'google-search'`.

> Xem `VIET-HANG-LOAT-THONG-MINH-IMPLEMENTATION.md` Section 3 để biết schema đầy đủ.

---

## 4. Processor Module

```typescript
// web/lib/viet-hang-loat-google-search/processor.ts

import { searchAndCrawl }        from '@/lib/viet-tu-google-search/searcher';
import { buildSearchWritePrompt } from '@/lib/viet-tu-google-search/prompt-builder';
import { buildTinhGonModel }     from '@/lib/tinh-gon/model';
import { sanitizeHtmlArticle, buildMetaDescription } from '@/lib/tinh-gon/text';
import { scoreHumanness }        from '@/lib/tinh-gon/humanness';
import { computeSeoChecks }      from '@/lib/shared/seo-checks';
import { prisma }                from '@/lib/prisma';
import type { BulkGsConfig, BulkGsStep } from './types';
import type { SearchResult }     from '@/lib/viet-tu-google-search/types';

export interface ProcessResult {
  articleId: string;
  title: string;
  wordCount: number;
  humanness: number;
  sourcesCount: number;
}

export async function processGsKeyword(
  keyword: string,
  config: BulkGsConfig,
  articleId: string,
  onStep: (step: BulkGsStep, detail: string, progress: number) => void,
): Promise<ProcessResult> {

  // ── Bước 1: Search Google ──────────────────────────────────────────────────
  onStep('searching', `Tìm kiếm: "${keyword}"`, 10);

  let searchResult: SearchResult;

  if (config.crawlMode === 'no_crawl') {
    // Fallback: không search, tạo SearchResult rỗng → AI viết thuần túy
    searchResult = {
      keyword,
      sources:         [],
      synthesis:       '',
      relatedKeywords: [],
      searchedAt:      new Date().toISOString(),
    };
  } else {
    searchResult = await searchAndCrawl(keyword, {
      searchResultCount: config.searchResultCount,
      crawlMode:         config.crawlMode,
      language:          config.language,
    });
  }

  onStep('searching', `${searchResult.sources.length} nguồn tìm thấy`, 20);

  // ── Bước 2: Crawl đã nằm trong searchAndCrawl() ────────────────────────────
  // searchAndCrawl trả về sources đã crawl + synthesis
  // Nhưng ta cần report progress riêng cho crawl phase nếu crawlMode='auto'
  if (config.crawlMode === 'auto') {
    const crawledCount = searchResult.sources.filter(s => s.crawled).length;
    onStep('crawling', `Crawl ${crawledCount}/${searchResult.sources.length} URLs thành công`, 35);
  }

  // ── Bước 3: Synthesize (nằm trong searchAndCrawl) ─────────────────────────
  onStep('synthesizing', 'AI đang tổng hợp context...', 45);
  // synthesis đã có trong searchResult.synthesis

  // ── Bước 4: Viết bài ────────────────────────────────────────────────────────
  onStep('writing', 'AI đang viết bài...', 55);

  // Build single-page config tương thích với prompt builder
  const singleConfig = {
    keyword,
    secondaryKeywords: searchResult.relatedKeywords.slice(0, 5),
    imageOption:       config.imageOption,
    language:          config.language,
    outlineMode:       config.outlineMode,
    targetLength:      config.targetLength,
    aiOutlineObjective: config.aiOutlineObjective,
    aiOutlineSize:     config.aiOutlineSize,
    editedOutline:     '',          // bulk: no user outline
    tone:              config.tone,
    modelId:           config.modelId,
    brand: {
      shopName:      config.brandName ?? '',
      phone:         config.brandPhone ?? '',
      address:       config.brandAddress ?? '',
      ctaStandard:   config.brandCta ?? '',
    },
    addFreshnessDate: config.addFreshnessDate,
    seoAdvanced: {
      internalLinks: config.seoInternalLinks ?? '',
      appendContent: config.seoAppendContent ?? '',
      autoBold:      config.seoAutoBold ?? 'none',
    },
  };

  const prompt = buildSearchWritePrompt(singleConfig as any, searchResult);
  const model  = buildTinhGonModel(config.modelId);

  // Bulk: dùng generateContent (không stream) — sequential processing
  const result  = await model.generateContent(prompt);
  const rawHtml = result.response.text();

  // Lấy title từ H1 trong bài
  const h1Match = rawHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title   = h1Match ? h1Match[1].replace(/<[^>]+>/g, '') : keyword;

  // ── Bước 5: Post-process + Score ────────────────────────────────────────────
  onStep('scoring', 'Đang xử lý & chấm điểm...', 85);

  const cleanHtml       = sanitizeHtmlArticle(rawHtml, keyword);
  const { score, decision } = scoreHumanness(cleanHtml);
  const wordCount       = cleanHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const metaDescription = buildMetaDescription(cleanHtml, keyword);
  const seoChecks       = computeSeoChecks(cleanHtml, keyword);
  const seoScore        = seoChecks.filter((c: any) => c.passed).length;

  // Lưu source URLs vào Article để hiển thị trong article view
  const sourcesJson = JSON.stringify(
    searchResult.sources.map(s => ({ url: s.url, title: s.title, crawled: s.crawled }))
  );

  await prisma.article.update({
    where: { id: articleId },
    data: {
      title,
      content:           cleanHtml,
      status:            'done',
      humannessScore:    score,
      humannessDecision: decision,
      metaDescription,
      wordCount,
      seoScore,
      // Lưu sources để hiển thị trong article view (cần field trong schema)
      configJson: JSON.stringify({ ...singleConfig, _sources: sourcesJson }),
    },
  });

  onStep('scoring', 'Xong!', 100);

  return {
    articleId,
    title,
    wordCount,
    humanness:    score,
    sourcesCount: searchResult.sources.length,
  };
}
```

---

## 5. Refactor Bắt Buộc trước khi code

### 5.1 `lib/viet-tu-google-search/searcher.ts`

Extract từ `api/viet-tu-google-search/search/route.ts`:

```typescript
// web/lib/viet-tu-google-search/searcher.ts

import type { SearchResult, CrawlMode } from './types';

export async function searchAndCrawl(
  keyword: string,
  options: {
    searchResultCount: number;
    crawlMode: CrawlMode;
    language: string;
  },
): Promise<SearchResult> {
  // 1. Gọi SerpAPI
  const serpRes = await fetch(
    `https://serpapi.com/search.json?q=${encodeURIComponent(keyword)}&num=${options.searchResultCount}&hl=vi&api_key=${process.env.SERPAPI_KEY}`
  );
  const serpData = await serpRes.json();

  const organicResults = (serpData.organic_results || []).slice(0, options.searchResultCount);
  const relatedKeywords = (serpData.related_searches || []).map((r: any) => r.query).slice(0, 6);

  // 2. Build sources với snippet
  const sources = organicResults.map((r: any) => ({
    url:       r.link,
    title:     r.title,
    snippet:   r.snippet || '',
    content:   null as null,
    crawled:   false,
    wordCount: 0,
  }));

  // 3. Crawl content nếu crawlMode === 'auto'
  if (options.crawlMode === 'auto') {
    const crawlResults = await Promise.allSettled(
      sources.map(source => crawlUrl(source.url))
    );
    crawlResults.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        sources[i].content   = result.value;
        sources[i].crawled   = true;
        sources[i].wordCount = result.value.split(/\s+/).length;
      }
    });
  }

  // 4. AI synthesize context
  const synthesis = await synthesizeContext(keyword, sources, options.language);

  return {
    keyword,
    sources,
    synthesis,
    relatedKeywords,
    searchedAt: new Date().toISOString(),
  };
}

async function crawlUrl(url: string, timeoutMs = 10_000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });
    clearTimeout(timer);

    const html = await res.text();
    // Strip HTML tags, giữ text content
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // Giới hạn 8000 ký tự mỗi source
  } catch {
    return null;
  }
}

async function synthesizeContext(
  keyword: string,
  sources: any[],
  language: string,
): Promise<string> {
  // Import model builder từ tinh-gon
  const { buildTinhGonModel } = await import('@/lib/tinh-gon/model');
  const model = buildTinhGonModel('gemini-flash');

  const sourcesText = sources
    .filter(s => s.content || s.snippet)
    .map((s, i) => `[Nguồn ${i + 1}] ${s.title}\n${s.content || s.snippet}`)
    .join('\n\n---\n\n');

  if (!sourcesText.trim()) return '';

  const prompt = `
Bạn đang tổng hợp thông tin từ ${sources.length} nguồn web về chủ đề: "${keyword}"

${sourcesText}

---
Tổng hợp các điểm quan trọng nhất:
- Thông tin thực tế, số liệu cụ thể
- Điểm nổi bật mà nhiều nguồn đề cập
- Thông tin mới nhất / cập nhật nhất

Viết tóm tắt tổng hợp bằng ${language === 'Vietnamese' ? 'tiếng Việt' : 'English'}, khoảng 300–500 từ.
Chỉ trả về nội dung tổng hợp, không có giải thích hay tiêu đề.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
```

### 5.2 `lib/viet-tu-google-search/prompt-builder.ts`

Extract từ `api/viet-tu-google-search/stream/route.ts` (đã được khai báo trong spec gốc):

```typescript
// web/lib/viet-tu-google-search/prompt-builder.ts
// Hàm này đã được định nghĩa trong VIET-TU-GOOGLE-SEARCH-IMPLEMENTATION.md
// Chỉ cần đảm bảo đã extract ra file riêng, không còn inline trong route.ts

export function buildSearchWritePrompt(config: any, searchResult: SearchResult): string {
  // ... (xem VIET-TU-GOOGLE-SEARCH-IMPLEMENTATION.md)
}
```

---

## 6. API Routes

### `POST /api/vhlgs/enqueue`

```typescript
// web/app/api/vhlgs/enqueue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma }                    from '@/lib/prisma';
import type { BulkGsConfig }         from '@/lib/viet-hang-loat-google-search/types';

function parseKeywords(raw: string[], duplicateMode: string): string[] {
  const cleaned = raw.map(k => k.trim()).filter(Boolean);
  if (duplicateMode === 'reject') {
    const seen = new Set<string>();
    return cleaned.filter(k => {
      const lower = k.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const config: BulkGsConfig = await req.json();

    if (!config.keywords?.length) {
      return NextResponse.json({ success: false, error: 'Chưa nhập từ khóa' }, { status: 400 });
    }

    const keywords = parseKeywords(config.keywords, config.duplicateMode);

    // ⚠️ Max 30 cho Google Search bulk — SerpAPI rate limit
    if (keywords.length > 30) {
      return NextResponse.json(
        { success: false, error: 'Tối đa 30 từ khóa cho tính năng này (SerpAPI rate limit)' },
        { status: 400 }
      );
    }

    const job = await prisma.bulkJob.create({
      data: {
        jobType:    'google-search',
        config:     config as any,
        keywords,
        totalCount: keywords.length,
        status:     'PENDING',
      },
    });

    await prisma.article.createMany({
      data: keywords.map((keyword, index) => ({
        keyword,
        language:   config.language,
        status:     'pending',
        source:     'viet-hang-loat-google-search',
        bulkJobId:  job.id,
        bulkIndex:  index,
        configJson: JSON.stringify({ ...config, keyword }),
      })),
    });

    return NextResponse.json({ success: true, jobId: job.id, count: keywords.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
```

---

### `POST /api/vhlgs/process/[jobId]` — SSE

```typescript
// web/app/api/vhlgs/process/[jobId]/route.ts

import { NextRequest }               from 'next/server';
import { prisma }                    from '@/lib/prisma';
import { processGsKeyword }          from '@/lib/viet-hang-loat-google-search/processor';
import type { BulkGsConfig }         from '@/lib/viet-hang-loat-google-search/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      // Keepalive mỗi 30s — QUAN TRỌNG: crawl có thể mất 30–60s
      const keepalive = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
      }, 30_000);

      try {
        const job = await prisma.bulkJob.findUnique({
          where:   { id: jobId },
          include: { articles: { orderBy: { bulkIndex: 'asc' } } },
        });

        if (!job) { send({ type: 'error', message: 'Không tìm thấy job' }); return; }
        if (job.status === 'COMPLETED') { send({ type: 'error', message: 'Job đã hoàn thành' }); return; }

        const config = job.config as BulkGsConfig;

        await prisma.bulkJob.update({
          where: { id: jobId },
          data:  { status: 'RUNNING', startedAt: new Date() },
        });

        let successCount = job.successCount;
        let errorCount   = job.errorCount;
        const pending    = job.articles.filter(a => a.status === 'pending');

        for (const article of pending) {
          // Check pause/cancel
          const fresh = await prisma.bulkJob.findUnique({
            where:  { id: jobId },
            select: { status: true },
          });
          if (fresh?.status === 'PAUSED' || fresh?.status === 'FAILED') {
            send({ type: 'error', message: 'Job đã bị dừng' });
            break;
          }

          const index = article.bulkIndex ?? 0;
          send({ type: 'item_start', index, keyword: article.keyword });

          try {
            const result = await processGsKeyword(
              article.keyword,
              config,
              article.id,
              (step, detail, progress) =>
                send({ type: 'item_step', index, step, detail, progress }),
            );

            successCount++;
            await prisma.bulkJob.update({
              where: { id: jobId },
              data:  { processedCount: { increment: 1 }, successCount: { increment: 1 } },
            });

            send({
              type:         'item_done',
              index,
              articleId:    result.articleId,
              title:        result.title,
              wordCount:    result.wordCount,
              humanness:    result.humanness,
              sourcesCount: result.sourcesCount,
            });
          } catch (err) {
            errorCount++;
            await prisma.article.update({ where: { id: article.id }, data: { status: 'error' } });
            await prisma.bulkJob.update({
              where: { id: jobId },
              data:  { processedCount: { increment: 1 }, errorCount: { increment: 1 } },
            });
            send({ type: 'item_error', index, message: String(err) });
          }

          // ⚠️ 3s giữa bài — quan trọng để tránh SerpAPI rate limit
          await new Promise(r => setTimeout(r, 3000));
        }

        await prisma.bulkJob.update({
          where: { id: jobId },
          data:  { status: 'COMPLETED', completedAt: new Date() },
        });
        send({ type: 'job_done', successCount, errorCount });

      } catch (err) {
        send({ type: 'error', message: String(err) });
        await prisma.bulkJob.update({ where: { id: jobId }, data: { status: 'FAILED' } }).catch(() => {});
      } finally {
        clearInterval(keepalive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

---

### `GET & PATCH /api/vhlgs/jobs/[jobId]`

Pattern giống hệt `vhltk/jobs/[jobId]` — chỉ đổi prefix.

---

## 7. Config Page — `app/viet-hang-loat-google-search/page.tsx`

### 8 Khối Config

```
Khối 1 — Keywords + Search Config (Bulk-specific)
  ├── Textarea: danh sách từ khóa (1 dòng = 1 bài)
  │     Count badge: "X / 30 từ khóa" — đỏ khi > 30 (giới hạn SerpAPI)
  │     Note: Mỗi dòng = 1 bài + 1 lần tìm Google
  ├── Duplicate mode (allow / reject)
  │
  │   [Search Config — group collapsible]
  ├── Số nguồn: ● 3 nguồn  ○ 5 nguồn  ○ 10 nguồn
  │     Badge: "Mặc định" ở 5 nguồn
  │     Ghi chú đỏ: "10 nguồn → chậm ~90s/bài"
  ├── Crawl mode:
  │     ○ Tự động (search + crawl đầy đủ)  [Khuyến nghị]
  │     ○ Chỉ snippet (nhanh hơn, ít context)
  │     ○ Không crawl (AI thuần túy, nhanh nhất)
  └── Freshness toggle: □ Thêm "Cập nhật: MM/YYYY" vào bài

Khối 2 — Image Option  (IMAGE_OPTIONS 4 card + imageCount 1–10 khi ≠ none)
Khối 3 — Language      (SUPPORTED_LANGUAGES dropdown)
Khối 4 — Outline + Length
  ○ Không dàn ý → Target Length selector
  ● AI tạo dàn ý → Objective + Size selectors
  [user_outline BỊ ẨN — không thể cung cấp 30 outline riêng]
Khối 5 — Tone          (WRITING_TONES — giống viet-tu-google-search)
Khối 6 — AI Model      (<ModelPicker />)
Khối 7 — Brand Config  (<BrandSection lsKey="vhlgs_brand_info" />)
Khối 8 — SEO Advanced  (<SeoAdvancedBlock /> — collapsed)
─────────────────────────────────────────────────────────────
[Thêm vào Hàng Đợi]
```

> **Khối 4**: ẩn radio button `user_outline` — chỉ còn 2 lựa chọn:  
> `no_outline` (default) và `ai_outline`.

### Warning Banner — Rate Limit

```tsx
{/* Hiển thị ngay trên submit button */}
<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
  <span>⚠️</span>
  <div className="text-sm text-amber-700">
    <strong>Lưu ý về tốc độ:</strong> Mỗi bài cần tìm kiếm Google + crawl web (~{estimatedTimePerArticle}s/bài).
    {keywordCount} bài ≈ {Math.ceil((keywordCount * estimatedTimePerArticle) / 60)} phút.
    Khuyến nghị chạy ban đêm để tránh quá tải.
  </div>
</div>
```

Estimated time per article:
```typescript
const estimatedTimePerArticle = useMemo(() => {
  if (crawlMode === 'no_crawl')    return 30;
  if (crawlMode === 'search_only') return 45;
  return searchResultCount === 3 ? 60 : searchResultCount === 5 ? 75 : 100;
}, [crawlMode, searchResultCount]);
```

### State Variables

```typescript
// Khối 1
const [keywordsRaw, setKeywordsRaw]         = useState('');
const [duplicateMode, setDuplicateMode]     = useState<DuplicateMode>('reject');
const [searchResultCount, setSearchResultCount] = useState<3|5|10>(5);
const [crawlMode, setCrawlMode]             = useState<CrawlMode>('auto');
const [addFreshnessDate, setAddFreshnessDate] = useState(false);

// Khối 2
const [imageOption, setImageOption]         = useState<ImageOption>('none');
const [imageCount, setImageCount]           = useState(2);

// Khối 3
const [language, setLanguage]               = useState('Vietnamese');

// Khối 4 (không có user_outline)
const [outlineMode, setOutlineMode]         = useState<BulkGsOutlineMode>('no_outline');
const [targetLength, setTargetLength]       = useState(2000);
const [aiOutlineObjective, setAiOutlineObjective] = useState('basic');
const [aiOutlineSize, setAiOutlineSize]     = useState('5_6_h2');

// Khối 5
const [tone, setTone]                       = useState('seo_basic');

// Khối 6
const [modelId, setModelId]                 = useState('');

// Derived
const keywordLines = keywordsRaw.split('\n').map(k => k.trim()).filter(Boolean);
const keywordCount = duplicateMode === 'reject'
  ? new Set(keywordLines.map(k => k.toLowerCase())).size
  : keywordLines.length;
```

### Submit Handler

```typescript
async function handleSubmit() {
  if (keywordCount === 0) { alert('Nhập ít nhất 1 từ khóa'); return; }
  if (keywordCount > 30)  { alert('Tối đa 30 từ khóa (giới hạn SerpAPI)'); return; }
  if (!modelId)           { alert('Chọn model AI'); return; }

  setIsSubmitting(true);
  const keywords = keywordsRaw.split('\n').map(l => l.trim()).filter(Boolean);

  const config: BulkGsConfig = {
    keywords,
    duplicateMode,
    searchResultCount,
    crawlMode,
    addFreshnessDate,
    imageOption,
    imageCount,
    language,
    outlineMode,
    targetLength,
    aiOutlineObjective: outlineMode === 'ai_outline' ? aiOutlineObjective : undefined,
    aiOutlineSize:      outlineMode === 'ai_outline' ? aiOutlineSize : undefined,
    tone,
    modelId,
    ...brandValues,
    ...seoAdvancedValues,
  };

  try {
    const res = await fetch('/api/vhlgs/enqueue', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(config),
    });
    const json = await res.json();
    if (json.success) {
      sessionStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config));
      sessionStorage.setItem(LS_JOB_ID_KEY, json.jobId);
      router.push('/viet-hang-loat-google-search/queue');
    } else {
      alert('Lỗi: ' + json.error);
    }
  } finally {
    setIsSubmitting(false);
  }
}
```

---

## 8. Queue Page — `app/viet-hang-loat-google-search/queue/page.tsx`

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Viết Hàng Loạt — Google Search                                     │
│ X bài · Crawl mode: Auto · 5 nguồn · Model · [▶ Bắt đầu]         │
├────────────────────────────────────────────────────────────────────┤
│ Progress: ████░░░░░░ 12/30 (40%)  ≈ 18 phút còn lại               │
│ ✅ 10 thành công  ❌ 2 lỗi  ⏳ 18 chờ                             │
├────────────────────────────────────────────────────────────────────┤
│ [⏸ Tạm dừng]  [✕ Hủy]                                            │
├────────────────────────────────────────────────────────────────────┤
│ #1 giường sắt 1m2   [🔍 Tìm kiếm Google... 10%]  ░░░░░░░░         │
│ #2 tủ quần áo       [🌐 Crawl 3/5 URLs... 35%]  ████░░░░          │
│ #3 bàn làm việc     [✅ XONG · 1,847 từ · H:81 · 5 nguồn] [Xem→] │
│ #4 ghế văn phòng    [❌ LỖI: SerpAPI quota exceeded]               │
│ #5 kệ tivi          [⏳ Chờ]                                       │
└────────────────────────────────────────────────────────────────────┘
```

### Step Labels

| `step` | Label UI |
|--------|----------|
| `searching` | `🔍 Tìm kiếm Google... XX%` |
| `crawling` | `🌐 Crawl N/M URLs... XX%` |
| `synthesizing` | `🧠 AI tổng hợp context...` |
| `writing` | `✍️ AI viết bài... XX%` |
| `scoring` | `📊 Chấm điểm...` |

### Estimated Time Remaining

```typescript
const avgTimePerArticle = config.crawlMode === 'auto'
  ? (config.searchResultCount === 3 ? 60 : config.searchResultCount === 5 ? 75 : 100)
  : 45;

const remainingMinutes = Math.ceil(
  ((totalCount - doneCount) * avgTimePerArticle) / 60
);
// Hiển thị: "≈ X phút còn lại"
```

### SSE handler

Pattern giống hệt `vhltg` — chỉ thay type `VhltgSSEEvent` → `VhlgsSSEEvent` và endpoint `/api/vhlgs/`.  
Thêm `sourcesCount` vào item done display: `5 nguồn · 1847 từ · H:81`.

---

## 9. Article View — `app/viet-hang-loat-google-search/[id]/page.tsx`

Reuse generate page editor của `viet-tu-google-search/generate`, với thêm Sources panel:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function ArticleViewPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle]   = useState<any>(null);
  const [sources,  setSources]  = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/articles/${id}`).then(r => r.json()).then(data => {
      setArticle(data);
      // Parse sources từ configJson._sources
      if (data.configJson) {
        try {
          const cfg = JSON.parse(data.configJson);
          if (cfg._sources) setSources(JSON.parse(cfg._sources));
        } catch {}
      }
    });
  }, [id]);

  // Layout 2 cột giống viet-tu-google-search/generate
  // Right panel thêm "Sources" section hiện danh sách URLs đã crawl
}
```

**Sources panel** trong right column:

```tsx
{sources.length > 0 && (
  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
      Nguồn tham khảo ({sources.length})
    </h4>
    <ul className="space-y-1">
      {sources.map((s, i) => (
        <li key={i} className="flex items-center gap-2 text-xs">
          <span className={s.crawled ? 'text-green-500' : 'text-gray-400'}>
            {s.crawled ? '✅' : '⚪'}
          </span>
          <a href={s.url} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate max-w-[200px]"
            title={s.url}>
            {s.title || s.url}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## 10. sessionStorage Keys

| Key | Nội dung | Set khi | Clear khi |
|-----|---------|---------|-----------|
| `vhlgs_config` | `BulkGsConfig` JSON | Submit config | Submit mới |
| `vhlgs_jobId` | job ID | Enqueue OK | Quay lại config |
| `vhlgs_brand_info` | Brand data | BrandSection | BrandSection clear |

---

## 11. So sánh 4 Bulk Variants

| | Smart AI | Từ Khóa | Tinh Gọn | **Google Search** |
|---|----------|---------|----------|-------------------|
| Route | `/viet-hang-loat` | `/viet-hang-loat-tu-khoa` | `/viet-hang-loat-tinh-gon` | **`/viet-hang-loat-google-search`** |
| sessionStorage | `vhl_` | `vhltk_` | `vhltg_` | **`vhlgs_`** |
| API prefix | `/api/vhl/` | `/api/vhltk/` | `/api/vhltg/` | **`/api/vhlgs/`** |
| jobType | `'smart'` | `'tu-khoa'` | `'tinh-gon'` | **`'google-search'`** |
| Max keywords | 50 | 50 | 50 | **30** |
| Delay giữa bài | 1.5s | 1.5s | 1.5s | **3s** |
| External API | Không | Không | Không | **SerpAPI (có credit limit)** |
| Khối 4 | 3 mode | no/ai only | Target Length | **no/ai only** |

---

## 12. Bugs & Gotchas

| # | Bug | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | SerpAPI quota exceeded giữa batch | Miễn phí 100 calls/tháng, trả phí 500 calls/$5 | Hiện thông báo lỗi rõ ràng; khuyến nghị user dùng crawlMode=search_only để tiết kiệm |
| 2 | Crawl timeout → bài viết thiếu context | URL chặn crawler / chậm | `Promise.allSettled` với timeout 10s, fallback sang snippet ✅ |
| 3 | SSE timeout khi crawl 10 URLs × 10s = 100s | Proxy timeout 60–90s | Keepalive mỗi 30s ✅ + khuyến nghị max 5 nguồn trong bulk |
| 4 | `synthesizeContext` gọi AI → thêm latency | Synthesis là extra AI call | Cho phép skip synthesis khi crawlMode=`search_only` (dùng snippets trực tiếp) |
| 5 | User nhập > 30 keywords | Không validate trước | Validate trong enqueue route + config page ✅ (giới hạn 30) |
| 6 | Bài viết hallucinate dù đã crawl | crawl thành công nhưng content không liên quan | Strip boilerplate (nav, footer) trong `crawlUrl()` bằng regex |
| 7 | `_sources` trong configJson quá lớn | Lưu full crawled content | Chỉ lưu `{ url, title, crawled }` — không lưu full content ✅ |
| 8 | `lib/viet-tu-google-search/searcher.ts` chưa extract | Logic còn trong route | Xem Section 5 refactor ✅ |
| 9 | SERPAPI_KEY không set trong .env | Thiếu env var | Validate env var khi khởi động; hiện lỗi rõ ràng: "Thiếu SERPAPI_KEY" |

---

## 13. Environment Variables cần thiết

```bash
# .env.local
SERPAPI_KEY=your_serpapi_key_here
# Đăng ký tại: https://serpapi.com (100 searches/month miễn phí)
```

Validate trong `searcher.ts`:
```typescript
if (!process.env.SERPAPI_KEY) {
  throw new Error('Thiếu SERPAPI_KEY trong .env — đăng ký tại serpapi.com');
}
```

---

## 14. Checklist triển khai

### ✅ Đã implement (verified 2026-05-28)
- [x] `lib/viet-hang-loat-google-search/types.ts` — BulkGsConfig, VhlgsSSEEvent, BulkGsProcessResult
- [x] `lib/viet-hang-loat-google-search/processor.ts` — processGsKeyword()
- [x] `lib/viet-hang-loat-google-search/searcher.ts` — searchAndCrawl()
- [x] `lib/viet-hang-loat-google-search/prompt-builder.ts` — thin wrapper → vtgs prompt-builder
- [x] `lib/viet-tu-google-search/searcher.ts` — đã extract (refactor done)
- [x] `lib/viet-tu-google-search/prompt-builder.ts` — đã extract (refactor done)
- [x] `lib/viet-hang-loat/features.ts` — 'google-search' entry đã đăng ký
- [x] `lib/viet-hang-loat/processors.ts` — dispatch đến processGsKeyword()
- [x] `app/viet-hang-loat-google-search/page.tsx` — delegate BulkArticleConfigPage
- [x] `app/viet-hang-loat-google-search/queue/page.tsx` — delegate BulkQueuePage
- [x] `app/viet-hang-loat-google-search/[id]/page.tsx` — delegate BulkArticleViewPage
- [x] `app/api/vhlgs/enqueue/route.ts`
- [x] `app/api/vhlgs/process/[jobId]/route.ts`
- [x] `app/api/vhlgs/jobs/[jobId]/route.ts`

### Còn cần kiểm tra
- [ ] Sidebar: "Viết Hàng Loạt — Google Search" trong nhóm Viết Hàng Loạt
- [ ] Encoding: `lib/viet-tu-google-search/options.ts` còn thiếu dấu tiếng Việt (xem FIX-ENCODING-MOJIBAKE.md)
- [ ] BulkQueuePage: có hiển thị `sourcesCount` trong item done card không
- [ ] BulkArticleViewPage: Tab Nguồn đọc từ `article.outline.sources`
- [ ] SERPAPI_KEY xác nhận có trong `.env` của server

### QA trước khi merge
- [ ] Enqueue 3 keywords → 3 Article records (status=pending, source='viet-hang-loat-google-search')
- [ ] Test `duplicateMode='reject'`: 5 dòng có 2 trùng (khác case) → DB tạo 4 bài
- [ ] Test `crawlMode='auto'`: article.configJson._sources có crawled=true
- [ ] Test `crawlMode='search_only'`: nhanh hơn, sources.crawled=false
- [ ] Test `crawlMode='no_crawl'`: sources=[]; bài viết AI thuần túy
- [ ] Test SerpAPI lỗi → `item_error` gửi về queue page, bài tiếp tục chạy
- [ ] Test keepalive: batch 10 bài crawlMode=auto → không timeout sau 5 phút
- [ ] Test `addFreshnessDate=true`: bài có "Cập nhật: MM/YYYY"
- [ ] Test > 30 keywords → lỗi rõ ràng, không enqueue
- [ ] Queue page: hiện đúng step labels (🔍 → 🌐 → 🧠 → ✍️ → 📊)
- [ ] Article view: sources panel hiện danh sách URLs đã crawl
- [ ] Test pause giữa batch: crawl bài hiện tại xong, bài tiếp không chạy
- [ ] `source='viet-hang-loat-google-search'` trong Article record
