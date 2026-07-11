# VIET-HANG-LOAT-TU-KHOA-IMPLEMENTATION.md
## Hướng dẫn code "Viết Hàng Loạt — Viết Bài Theo Danh Sách Từ Khóa"

> Phân tích từ: https://aiktp.com/vi/bulk-write-keywords  
> Base page: `/viet-theo-tu-khoa` (đã code — đây là bản mở rộng bulk/queue của trang đó)  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · PostgreSQL  
> Pattern: **P3 — Queue Bulk**

---

## 0. Nhóm & Pattern

| Nhóm | Page | Config | Queue | Article | Pattern | Spec |
|------|------|--------|-------|---------|---------|------|
| A | Viết Hàng Loạt — Từ Khóa | `/viet-hang-loat-tu-khoa` | `/viet-hang-loat-tu-khoa/queue` | `/viet-hang-loat-tu-khoa/[id]` | **P3** | file này |

---

## ⚠️ Điểm khác biệt so với Viết Hàng Loạt — Smart AI

| # | Điểm | Smart AI (`viet-hang-loat`) | Từ Khóa (`viet-hang-loat-tu-khoa`) |
|---|------|-----------------------------|--------------------------------------|
| 1 | Base logic | Reuse `viet-bai-thong-minh` (4 bước/bài: semantic → title → outline → write) | Reuse `viet-theo-tu-khoa` (2 bước/bài: outline optional → write) |
| 2 | Tốc độ | Chậm hơn (semantic analysis tốn token) | Nhanh hơn — bước nhẹ hơn |
| 3 | Config tone | Content Type (7 loại) | `KEYWORD_TONES` (16 tones từ viet-theo-tu-khoa) |
| 4 | Outline mode | AI tự tạo + title riêng cho từng bài | Outline mode chọn 1 lần cho cả batch (no / ai only) |
| 5 | Title | AI generate 1 title tốt nhất | `keyword_as_title` hoặc `ai_title` |
| 6 | SSE steps/bài | 5 bước | 3 bước (outline? → writing → scoring) |
| 7 | Prisma model | `BulkJob` với `jobType: 'smart'` | `BulkJob` với `jobType: 'tu-khoa'` ← **reuse cùng model** |

---

## 1. Kiến trúc tổng quan

### 1.1 Flow hoạt động

```
User điền config:
  - Keywords textarea (1 dòng = 1 bài, tối đa 50)
  - Duplicate mode + Title mode
  - Outline mode (no_outline / ai_outline) + settings
  - 8 khối config chuẩn còn lại
  ↓
Submit → POST /api/vhltk/enqueue
  - Tạo BulkJob (jobType='tu-khoa') + N Article records (status=PENDING)
  - Trả về { jobId }
  - sessionStorage.setItem('vhltk_jobId', jobId)
  → Navigate sang /viet-hang-loat-tu-khoa/queue
  ↓
Queue page:
  POST /api/vhltk/process/[jobId]  ← user bấm "Bắt đầu"
  SSE stream — xử lý từng keyword tuần tự:
    ① [Nếu ai_outline] AI tạo outline (~10s)
    ② AI viết bài dựa trên outline hoặc trực tiếp (~30–60s)
    ③ Apply SEO options + Humanness score
    ④ Save Article DB
    Delay 1.5s → keyword tiếp theo
  Kết thúc: job_done event
  ↓
User click từng bài đã xong → /viet-hang-loat-tu-khoa/[id]
  Đọc từ GET /api/articles/[id]
  Reuse generate page editor của viet-theo-tu-khoa
```

### 1.2 Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-hang-loat-tu-khoa/
│   │   ├── page.tsx                         ← Config page (8 khối + keywords list)
│   │   ├── queue/
│   │   │   └── page.tsx                     ← Queue management UI
│   │   └── [id]/
│   │       └── page.tsx                     ← Article view + editor
│   └── api/
│       └── vhltk/
│           ├── enqueue/
│           │   └── route.ts                 ← POST: tạo BulkJob + N Articles
│           ├── process/
│           │   └── [jobId]/
│           │       └── route.ts             ← POST: SSE stream xử lý từng bài
│           └── jobs/
│               └── [jobId]/
│                   └── route.ts             ← GET: status | PATCH: pause/resume/cancel
└── lib/
    └── viet-hang-loat-tu-khoa/
        ├── types.ts
        └── processor.ts                     ← Logic xử lý 1 bài (outline + write + score)
```

### 1.3 File tái sử dụng — KHÔNG tạo mới

| File | Từ đâu | Dùng gì |
|------|--------|---------|
| `lib/viet-theo-tu-khoa/types.ts` | viet-theo-tu-khoa | `KeywordArticleConfig`, `KeywordTone`, `OutlineMode`, `AiOutlineObjective`, `AiOutlineSize` |
| `lib/viet-theo-tu-khoa/options.ts` | viet-theo-tu-khoa | `KEYWORD_TONES`, `AI_OUTLINE_OBJECTIVES`, `AI_OUTLINE_SIZES` |
| `lib/viet-theo-tu-khoa/outline-generator.ts` | viet-theo-tu-khoa | `generateOutline()` |
| `app/api/viet-theo-tu-khoa/stream/route.ts` | viet-theo-tu-khoa | Extract `buildWritingPrompt()` + `applySeoOptions()` ra lib/shared để reuse |
| `lib/tinh-gon/humanness.ts` | tinh-gon | `analyzeHumanness()` |
| `lib/tinh-gon/text.ts` | tinh-gon | `sanitizeHtmlArticle()`, `buildMetaDescription()` |
| `lib/tinh-gon/model.ts` | tinh-gon | `buildTinhGonModel()` |
| `lib/shared/options.ts` | shared | `SUPPORTED_LANGUAGES`, `IMAGE_OPTIONS` |
| `app/components/ModelPicker.tsx` | shared | ModelPicker |
| `app/components/BrandSection.tsx` | shared | BrandSection |
| `app/components/SeoAdvancedBlock.tsx` | shared | SeoAdvancedBlock |

> ⚠️ **REFACTOR TRƯỚC KHI CODE PAGE NÀY:**  
> Extract `buildWritingPrompt()` và `applySeoOptions()` từ  
> `app/api/viet-theo-tu-khoa/stream/route.ts` ra `lib/viet-theo-tu-khoa/writing.ts`  
> để cả single page lẫn bulk page đều import từ cùng 1 chỗ.

---

## 2. Types

```typescript
// web/lib/viet-hang-loat-tu-khoa/types.ts

import type { KeywordTone, AiOutlineObjective, AiOutlineSize } from '@/lib/viet-theo-tu-khoa/types';
import type { ImageOption } from '@/lib/shared/options';

// Bulk chỉ hỗ trợ 2 mode (không có user_outline — không thể cung cấp 50 outline khác nhau)
export type BulkOutlineMode = 'no_outline' | 'ai_outline';

export type TitleMode =
  | 'keyword_as_title'  // Keyword chính là tiêu đề H1 (mặc định)
  | 'ai_title';         // AI generate tiêu đề sáng tạo dựa trên keyword

export type DuplicateMode =
  | 'allow'   // Cho phép từ khóa trùng — AI viết 2 bài khác nhau
  | 'reject'; // Loại bỏ từ khóa trùng trước khi enqueue

export interface BulkKeywordConfig {
  // Khối 1 — Bulk-specific
  keywords: string[];          // Đã dedup (nếu duplicateMode='reject'), max 50
  duplicateMode: DuplicateMode;
  titleMode: TitleMode;
  outlineMode: BulkOutlineMode;
  // Chỉ dùng khi outlineMode === 'ai_outline'
  aiOutlineObjective?: AiOutlineObjective;
  aiOutlineSize?: AiOutlineSize;
  // Chỉ dùng khi outlineMode === 'no_outline'
  targetLength?: number;       // 1500 | 2000 | 3000

  // Khối 2 — Image
  imageOption: ImageOption;
  imageCount: number;          // 1–10, chỉ dùng khi imageOption !== 'none'

  // Khối 3 — Language
  language: string;

  // Khối 5 — Tone
  tone: KeywordTone;

  // Khối 6 — Model
  model: string;

  // Khối 7 — Brand (serialized từ BrandSection)
  brandName?: string;
  brandPhone?: string;
  brandAddress?: string;
  brandCta?: string;

  // Khối 8 — SEO Advanced
  seoMainLink?: string;
  seoKeywordLinks?: Array<{ keyword: string; url: string }>;
  footerContent?: string;
  boldMainKeyword: boolean;
  boldHeadings: boolean;
}

// SSE Events từ /process/[jobId]
export type VhltSSEEvent =
  | { type: 'item_start';  index: number; keyword: string }
  | { type: 'item_step';   index: number; step: 'outline' | 'writing' | 'scoring'; progress: number }
  | { type: 'item_done';   index: number; articleId: string; title: string; wordCount: number; humanness: number }
  | { type: 'item_error';  index: number; message: string }
  | { type: 'job_done';    successCount: number; errorCount: number }
  | { type: 'error';       message: string };

// sessionStorage keys
export const LS_CONFIG_KEY = 'vhltk_config';
export const LS_JOB_ID_KEY = 'vhltk_jobId';
```

---

## 3. Prisma — Reuse BulkJob

`BulkJob` đã được định nghĩa trong `VIET-HANG-LOAT-THONG-MINH-IMPLEMENTATION.md`.  
**Không tạo model mới.** Phân biệt bằng `jobType`:

```prisma
// Đã có — không thêm gì
model BulkJob {
  id             String        @id @default(cuid())
  userId         String?
  jobType        String        // 'smart' | 'tu-khoa'  ← dùng 'tu-khoa' ở đây
  config         Json          // BulkKeywordConfig JSON
  brandConfig    Json?
  keywords       String[]
  totalCount     Int
  processedCount Int           @default(0)
  successCount   Int           @default(0)
  errorCount     Int           @default(0)
  status         BulkJobStatus @default(PENDING)
  articles       Article[]     @relation("BulkJobArticles")
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  startedAt      DateTime?
  completedAt    DateTime?
}
```

> Migration chỉ cần nếu `BulkJob` chưa tồn tại (đã tạo ở viet-hang-loat).  
> Nếu đã migrate rồi → **bỏ qua bước này**.

---

## 4. Processor Module

```typescript
// web/lib/viet-hang-loat-tu-khoa/processor.ts
// Xử lý 1 keyword → 1 Article hoàn chỉnh

import { generateOutline } from '@/lib/viet-theo-tu-khoa/outline-generator';
import { buildWritingPrompt, applySeoOptions } from '@/lib/viet-theo-tu-khoa/writing';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { sanitizeHtmlArticle, buildMetaDescription } from '@/lib/tinh-gon/text';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { prisma } from '@/lib/prisma';
import type { BulkKeywordConfig } from './types';

export interface ProcessResult {
  articleId: string;
  title: string;
  wordCount: number;
  humanness: number;
}

/**
 * Xử lý 1 keyword trong queue:
 * 1. Tạo outline (nếu ai_outline)
 * 2. Viết bài (generateContent — không stream vì bulk)
 * 3. Apply SEO + humanness + save DB
 */
export async function processKeyword(
  keyword: string,
  config: BulkKeywordConfig,
  articleId: string,
  onStep: (step: 'outline' | 'writing' | 'scoring', progress: number) => void,
): Promise<ProcessResult> {
  const model = buildTinhGonModel(config.model);

  // Bước 1: Outline
  let resolvedOutline: string | undefined;
  if (config.outlineMode === 'ai_outline') {
    onStep('outline', 20);
    resolvedOutline = await generateOutline({
      keyword,
      secondaryKeywords: [],
      isToplist: false,
      objective: config.aiOutlineObjective,
      size: config.aiOutlineSize,
      language: config.language,
      model: config.model,
    });
  }

  // Bước 2: Viết bài
  onStep('writing', 40);

  // Build config cho 1 bài đơn (KeywordArticleConfig compatible)
  const singleConfig = {
    keyword,
    secondaryKeywords: [],
    isToplist: false,
    outlineMode: config.outlineMode as 'no_outline' | 'ai_outline',
    targetLength: config.targetLength ?? 2000,
    resolvedOutline,
    imageOption: config.imageOption,
    language: config.language,
    tone: config.tone,
    model: config.model,
    seoMainLink: config.seoMainLink,
    seoKeywordLinks: config.seoKeywordLinks,
    footerContent: config.footerContent,
    boldMainKeyword: config.boldMainKeyword,
    boldHeadings: config.boldHeadings,
    brandName: config.brandName,
    brandCta: config.brandCta,
  };

  const prompt = buildWritingPrompt(singleConfig as any);

  // Trong bulk context: dùng generateContent (không stream) để sequential không block
  const result = await model.generateContent(prompt);
  let rawHtml = result.response.text();

  // Title
  let title: string;
  if (config.titleMode === 'keyword_as_title') {
    title = keyword;
    // Inject H1 nếu chưa có
    if (!rawHtml.includes('<h1')) {
      rawHtml = `<h1>${keyword}</h1>\n${rawHtml}`;
    }
  } else {
    // Trích H1 từ content AI đã viết
    const h1Match = rawHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
    title = h1Match ? h1Match[1].replace(/<[^>]+>/g, '') : keyword;
  }

  // Bước 3: Post-process + score
  onStep('scoring', 80);
  const cleanHtml = sanitizeHtmlArticle(rawHtml, keyword);
  const finalHtml = applySeoOptions(cleanHtml, singleConfig as any);

  const { score, decision } = await analyzeHumanness(finalHtml);
  const wordCount = finalHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const metaDescription = buildMetaDescription(finalHtml, keyword);
  const seoChecks = computeSeoChecks(finalHtml, keyword);
  const seoScore = seoChecks.filter(c => c.passed).length;

  await prisma.article.update({
    where: { id: articleId },
    data: {
      title,
      content:        finalHtml,
      status:         'done',
      humannessScore: score,
      humannessDecision: decision,
      metaDescription,
      wordCount,
      seoScore,
    },
  });

  onStep('scoring', 100);

  return { articleId, title, wordCount, humanness: score };
}
```

---

## 5. API Routes

### `POST /api/vhltk/enqueue` — Tạo BulkJob + N Article records

**Request body:** `BulkKeywordConfig`

**Response:** `{ success: true; jobId: string; count: number }`

```typescript
// web/app/api/vhltk/enqueue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { BulkKeywordConfig } from '@/lib/viet-hang-loat-tu-khoa/types';

function parseKeywordList(raw: string[], duplicateMode: string): string[] {
  const cleaned = raw.map(k => k.trim()).filter(Boolean);
  if (duplicateMode === 'reject') {
    return [...new Set(cleaned.map(k => k.toLowerCase()))].map(k =>
      cleaned.find(c => c.toLowerCase() === k)!
    );
  }
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: BulkKeywordConfig = body;

    if (!config.keywords?.length) {
      return NextResponse.json({ success: false, error: 'Chưa nhập từ khóa' }, { status: 400 });
    }

    const keywords = parseKeywordList(config.keywords, config.duplicateMode);
    if (keywords.length > 50) {
      return NextResponse.json({ success: false, error: 'Tối đa 50 từ khóa mỗi lần' }, { status: 400 });
    }

    // Tạo BulkJob
    const job = await prisma.bulkJob.create({
      data: {
        jobType:    'tu-khoa',
        config:     config as any,
        keywords,
        totalCount: keywords.length,
        status:     'PENDING',
      },
    });

    // Tạo N Article placeholders
    await prisma.article.createMany({
      data: keywords.map((keyword, index) => ({
        keyword,
        language:   config.language,
        status:     'pending',
        source:     'viet-hang-loat-tu-khoa',
        bulkJobId:  job.id,
        bulkIndex:  index,
        configJson: JSON.stringify({ ...config, keyword }),
      })),
    });

    return NextResponse.json({ success: true, jobId: job.id, count: keywords.length });
  } catch (err) {
    console.error('[vhltk/enqueue] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
```

---

### `POST /api/vhltk/process/[jobId]` — SSE xử lý từng bài

**SSE Events:** `VhltSSEEvent` (xem Section 2)

```typescript
// web/app/api/vhltk/process/[jobId]/route.ts

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processKeyword } from '@/lib/viet-hang-loat-tu-khoa/processor';
import type { BulkKeywordConfig } from '@/lib/viet-hang-loat-tu-khoa/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // 1. Load job
        const job = await prisma.bulkJob.findUnique({
          where: { id: jobId },
          include: { articles: { orderBy: { bulkIndex: 'asc' } } },
        });

        if (!job) { send({ type: 'error', message: 'Không tìm thấy job' }); return; }
        if (job.status === 'COMPLETED') { send({ type: 'error', message: 'Job đã hoàn thành' }); return; }

        const config = job.config as BulkKeywordConfig;

        // Mark running
        await prisma.bulkJob.update({
          where: { id: jobId },
          data: { status: 'RUNNING', startedAt: new Date() },
        });

        let successCount = job.successCount;
        let errorCount = job.errorCount;

        // 2. Lấy danh sách bài chưa xử lý (status=pending)
        const pendingArticles = job.articles.filter(a => a.status === 'pending');

        for (const article of pendingArticles) {
          // Kiểm tra pause/cancel
          const fresh = await prisma.bulkJob.findUnique({ where: { id: jobId }, select: { status: true } });
          if (fresh?.status === 'PAUSED' || fresh?.status === 'FAILED') {
            send({ type: 'error', message: 'Job đã bị dừng' });
            break;
          }

          const index = article.bulkIndex ?? 0;
          send({ type: 'item_start', index, keyword: article.keyword });

          try {
            const result = await processKeyword(
              article.keyword,
              config,
              article.id,
              (step, progress) => {
                send({ type: 'item_step', index, step, progress });
              },
            );

            successCount++;
            await prisma.bulkJob.update({
              where: { id: jobId },
              data: {
                processedCount: { increment: 1 },
                successCount: { increment: 1 },
              },
            });

            send({
              type:      'item_done',
              index,
              articleId: result.articleId,
              title:     result.title,
              wordCount: result.wordCount,
              humanness: result.humanness,
            });
          } catch (err) {
            errorCount++;
            await prisma.article.update({ where: { id: article.id }, data: { status: 'error' } });
            await prisma.bulkJob.update({
              where: { id: jobId },
              data: {
                processedCount: { increment: 1 },
                errorCount: { increment: 1 },
              },
            });
            send({ type: 'item_error', index, message: String(err) });
          }

          // Delay giữa các bài
          await new Promise(r => setTimeout(r, 1500));
        }

        // 3. Mark completed
        await prisma.bulkJob.update({
          where: { id: jobId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        send({ type: 'job_done', successCount, errorCount });
      } catch (err) {
        console.error('[vhltk/process] error:', err);
        send({ type: 'error', message: String(err) });
        await prisma.bulkJob.update({
          where: { id: jobId },
          data: { status: 'FAILED' },
        }).catch(() => {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':        'text/event-stream',
      'Cache-Control':       'no-cache',
      'Connection':          'keep-alive',
      'X-Accel-Buffering':   'no',  // tắt nginx buffer
    },
  });
}
```

---

### `GET & PATCH /api/vhltk/jobs/[jobId]`

**GET** — polling status từ queue page:

```typescript
// GET handler trong cùng route file
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const job = await prisma.bulkJob.findUnique({
    where: { id: params.jobId },
    include: {
      articles: {
        orderBy: { bulkIndex: 'asc' },
        select: { id: true, keyword: true, status: true, title: true,
                  wordCount: true, humannessScore: true, bulkIndex: true },
      },
    },
  });

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(job);
}
```

**PATCH** — pause / resume / cancel:

```typescript
// PATCH handler
export async function PATCH(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { action } = await req.json() as { action: 'pause' | 'resume' | 'cancel' };

  const statusMap = { pause: 'PAUSED', resume: 'RUNNING', cancel: 'FAILED' } as const;
  const newStatus = statusMap[action];
  if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  await prisma.bulkJob.update({
    where: { id: params.jobId },
    data: { status: newStatus },
  });

  return NextResponse.json({ success: true });
}
```

---

## 6. Config Page — `app/viet-hang-loat-tu-khoa/page.tsx`

### 8 Khối Config (theo chuẩn PAGE-STANDARD.md)

```
Khối 1 — Keywords (Bulk-specific)
  ├── Textarea: danh sách từ khóa (1 dòng = 1 bài)
  │     - Placeholder: "giường sắt 1m2\ntủ quần áo 3 cánh\n..."
  │     - Count badge: "X / 50 từ khóa" — đỏ khi > 50
  │     - Note: Mỗi dòng = 1 bài. Có thể thêm KW phụ cách nhau bằng "," trên cùng dòng
  ├── Duplicate mode toggle (allow / reject)
  ├── Title mode: ● Từ khóa là tiêu đề  ○ AI tạo tiêu đề
  ├── Outline mode:
  │     ○ Không dàn ý → show Target Length selector [1500][2000●][3000]
  │     ● AI tạo dàn ý → show Objective + Size selectors
Khối 2 — Image Option  (IMAGE_OPTIONS 4 card + Image Count 1–10 khi ≠ none)
Khối 3 — Language      (SUPPORTED_LANGUAGES dropdown)
Khối 4 — ẨN           (outline đã xử lý trong Khối 1)
Khối 5 — Tone          (KEYWORD_TONES 16 options — grid giống viet-theo-tu-khoa)
Khối 6 — AI Model      (<ModelPicker />)
Khối 7 — Brand Config  (<BrandSection lsKey="vhltk_brand_info" />)
Khối 8 — SEO Advanced  (<SeoAdvancedBlock /> — mặc định collapsed)
─────────────────────────────────────────────────────
[Thêm vào Hàng Đợi] button
```

> **Khối 4 bị ẩn** — outline mode được nhúng vào Khối 1 để UX mạch lạc hơn.  
> User không cần cuộn xuống Khối 4 sau khi nhập keywords.

### Key State Variables

```typescript
// Khối 1 — Bulk-specific
const [keywordsRaw, setKeywordsRaw] = useState('');  // raw textarea content
const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('reject');
const [titleMode, setTitleMode] = useState<TitleMode>('keyword_as_title');
const [outlineMode, setOutlineMode] = useState<BulkOutlineMode>('no_outline');
const [aiOutlineObjective, setAiOutlineObjective] = useState<AiOutlineObjective>('basic');
const [aiOutlineSize, setAiOutlineSize] = useState<AiOutlineSize>('5_6_h2');
const [targetLength, setTargetLength] = useState(2000);

// Khối 2
const [imageOption, setImageOption] = useState<ImageOption>('none');
const [imageCount, setImageCount] = useState(2);

// Khối 3–8 (chuẩn)
const [language, setLanguage] = useState('Vietnamese');
const [tone, setTone] = useState<KeywordTone>('seo_basic');
const [model, setModel] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);

// Derived
const keywordLines = keywordsRaw.split('\n').map(k => k.trim()).filter(Boolean);
const keywordCount = duplicateMode === 'reject'
  ? new Set(keywordLines.map(k => k.toLowerCase())).size
  : keywordLines.length;
```

### Keywords Textarea UI

```tsx
<div className="relative">
  <textarea
    rows={8}
    placeholder={"giường sắt 1m2\ntủ quần áo 3 cánh\nbàn làm việc gỗ\n..."}
    value={keywordsRaw}
    onChange={e => setKeywordsRaw(e.target.value)}
    className="w-full rounded-lg border p-3 font-mono text-sm resize-y"
  />
  <span className={`absolute bottom-2 right-3 text-xs font-medium
    ${keywordCount > 50 ? 'text-red-500' : 'text-gray-400'}`}>
    {keywordCount} / 50 từ khóa
  </span>
</div>

{/* Gợi ý format */}
<p className="mt-1 text-xs text-gray-400">
  Mỗi dòng = 1 bài viết. Thêm từ khóa phụ cách nhau bằng dấu phẩy trên cùng dòng.
  VD: <code>giường sắt 1m2, giường sắt giá rẻ, mua giường sắt</code>
</p>
```

### Secondary Keywords Per Line

Nếu user nhập `giường sắt 1m2, giường sắt giá rẻ, mua giường sắt` trên 1 dòng:
- Keyword chính: `giường sắt 1m2` (phần trước dấu phẩy đầu tiên)
- Secondary keywords: `["giường sắt giá rẻ", "mua giường sắt"]` (phần sau)

```typescript
function parseKeywordLine(line: string): { keyword: string; secondaryKeywords: string[] } {
  const parts = line.split(',').map(p => p.trim()).filter(Boolean);
  return {
    keyword:           parts[0] ?? '',
    secondaryKeywords: parts.slice(1).slice(0, 10),
  };
}
```

Pass `secondaryKeywords` vào `processKeyword()` per-article.

### Submit Handler

```typescript
async function handleSubmit() {
  if (keywordCount === 0) { alert('Nhập ít nhất 1 từ khóa'); return; }
  if (keywordCount > 50) { alert('Tối đa 50 từ khóa'); return; }
  if (!model) { alert('Chọn model AI'); return; }

  setIsSubmitting(true);

  // Parse keywords
  const lines = keywordsRaw.split('\n').map(l => l.trim()).filter(Boolean);

  const config: BulkKeywordConfig = {
    keywords: lines,
    duplicateMode,
    titleMode,
    outlineMode,
    aiOutlineObjective: outlineMode === 'ai_outline' ? aiOutlineObjective : undefined,
    aiOutlineSize:      outlineMode === 'ai_outline' ? aiOutlineSize : undefined,
    targetLength:       outlineMode === 'no_outline' ? targetLength : undefined,
    imageOption,
    imageCount,
    language,
    tone,
    model,
    // Brand từ BrandSection (đọc qua ref hoặc state)
    ...brandValues,
    // SEO Advanced
    ...seoAdvancedValues,
    boldMainKeyword,
    boldHeadings,
  };

  try {
    const res = await fetch('/api/vhltk/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    if (json.success) {
      sessionStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config));
      sessionStorage.setItem(LS_JOB_ID_KEY, json.jobId);
      router.push('/viet-hang-loat-tu-khoa/queue');
    } else {
      alert('Lỗi: ' + json.error);
    }
  } finally {
    setIsSubmitting(false);
  }
}
```

---

## 7. Queue Page — `app/viet-hang-loat-tu-khoa/queue/page.tsx`

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Viết Hàng Loạt — Theo Từ Khóa"                        │
│ Tóm tắt job: X bài · Language · Tone · Model · [Bắt đầu] btn   │
├─────────────────────────────────────────────────────────────────┤
│ Progress bar tổng: ██████░░░░ 30/50 bài (60%)                  │
│ Stats: ✅ 28 thành công  ❌ 2 lỗi  ⏳ 20 chờ                   │
├─────────────────────────────────────────────────────────────────┤
│ [Tạm dừng] / [Tiếp tục]  [Hủy]                                │
├─────────────────────────────────────────────────────────────────┤
│ Danh sách từng bài:                                             │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ #1 giường sắt 1m2               ● ĐANG VIẾT ██░░░ 40%    │ │
│ │ #2 tủ quần áo 3 cánh            ✅ XONG · 1,823 từ · H:82│ │
│ │ #3 bàn làm việc gỗ              ⏳ CHỜ                    │ │
│ │ #4 ghế văn phòng                ❌ LỖI: timeout           │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### State & SSE

```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VhltSSEEvent } from '@/lib/viet-hang-loat-tu-khoa/types';

type ItemState = {
  keyword:   string;
  status:    'pending' | 'outline' | 'writing' | 'scoring' | 'done' | 'error';
  progress:  number;           // 0–100
  articleId?: string;
  title?:     string;
  wordCount?: number;
  humanness?: number;
  error?:     string;
};

export default function QueuePage() {
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  useEffect(() => {
    const jid = sessionStorage.getItem('vhltk_jobId');
    if (!jid) { router.push('/viet-hang-loat-tu-khoa'); return; }
    setJobId(jid);

    // Load initial state từ DB
    fetch(`/api/vhltk/jobs/${jid}`).then(r => r.json()).then(job => {
      setItems(job.articles.map((a: any) => ({
        keyword:   a.keyword,
        status:    a.status === 'done' ? 'done' : a.status === 'error' ? 'error' : 'pending',
        progress:  a.status === 'done' ? 100 : 0,
        articleId: a.id,
        title:     a.title,
        wordCount: a.wordCount,
        humanness: a.humannessScore,
      })));
      setSuccessCount(job.successCount);
      setErrorCount(job.errorCount);
      if (job.status === 'RUNNING') startProcessing(jid);
    });
  }, []);

  async function startProcessing(jid: string) {
    if (isRunning) return;
    setIsRunning(true);
    setIsPaused(false);

    const res = await fetch(`/api/vhltk/process/${jid}`, { method: 'POST' });
    const reader = res.body!.getReader();
    readerRef.current = reader;
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event: VhltSSEEvent = JSON.parse(line.slice(6));
          handleSSEEvent(event);
        } catch { /* skip */ }
      }
    }
    setIsRunning(false);
  }

  function handleSSEEvent(event: VhltSSEEvent) {
    switch (event.type) {
      case 'item_start':
        setItems(prev => prev.map((it, i) =>
          i === event.index ? { ...it, status: 'writing', progress: 10 } : it
        ));
        break;
      case 'item_step':
        setItems(prev => prev.map((it, i) =>
          i === event.index ? { ...it, status: event.step, progress: event.progress } : it
        ));
        break;
      case 'item_done':
        setItems(prev => prev.map((it, i) =>
          i === event.index ? {
            ...it, status: 'done', progress: 100,
            articleId: event.articleId, title: event.title,
            wordCount: event.wordCount, humanness: event.humanness,
          } : it
        ));
        setSuccessCount(c => c + 1);
        break;
      case 'item_error':
        setItems(prev => prev.map((it, i) =>
          i === event.index ? { ...it, status: 'error', error: event.message } : it
        ));
        setErrorCount(c => c + 1);
        break;
      case 'job_done':
        setIsRunning(false);
        break;
    }
  }

  async function handlePause() {
    if (!jobId) return;
    await fetch(`/api/vhltk/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    setIsPaused(true);
  }

  async function handleResume() {
    if (!jobId) return;
    await fetch(`/api/vhltk/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    startProcessing(jobId);
  }

  const totalCount = items.length;
  const doneCount = successCount + errorCount;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header + controls */}
      {/* Progress bar */}
      {/* Items list */}
      {/* Item card per article (click → router.push(`/viet-hang-loat-tu-khoa/${item.articleId}`)) */}
    </div>
  );
}
```

### Item Card UI

| Status | Badge | Icon |
|--------|-------|------|
| `pending` | `⏳ Chờ` | gray |
| `outline` | `🔍 Tạo dàn ý... XX%` | blue |
| `writing` | `✍️ Đang viết... XX%` | blue |
| `scoring` | `📊 Chấm điểm...` | blue |
| `done` | `✅ Xong · W từ · H:XX` | green |
| `error` | `❌ Lỗi: message` | red |

Khi `status === 'done'` → item có thể click → navigate `/viet-hang-loat-tu-khoa/[articleId]`

---

## 8. Article View — `app/viet-hang-loat-tu-khoa/[id]/page.tsx`

**Reuse hoàn toàn** generate page editor của `viet-theo-tu-khoa/generate`.

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// Import ArticleEditor, 4 Panel Tabs từ viet-theo-tu-khoa hoặc shared components

export default function ArticleViewPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(r => r.json())
      .then(setArticle);
  }, [id]);

  if (!article) return <div>Đang tải...</div>;

  return (
    <div className="flex gap-4 h-screen">
      {/* ArticleEditor với article.content — dùng chung component từ viet-theo-tu-khoa */}
      {/* 4 Panel Tabs: SEO / Chất lượng / Internal Links / Đăng bài */}
    </div>
  );
}
```

> Không có "streaming" ở trang này — bài đã được viết xong từ queue.  
> Editor load ngay `article.content` từ DB.  
> 4 tabs giống hệt generate page chuẩn (xem AI-EDITOR-IMPLEMENTATION.md).

---

## 9. Refactor Bắt Buộc trước khi code

### Extract `buildWritingPrompt` + `applySeoOptions`

Hiện tại 2 function này nằm trong `app/api/viet-theo-tu-khoa/stream/route.ts`.  
**Bắt buộc extract** ra trước khi implement bulk:

```typescript
// web/lib/viet-theo-tu-khoa/writing.ts  ← FILE MỚI CẦN TẠO

export function buildWritingPrompt(config: KeywordArticleConfig): string { ... }
export function applySeoOptions(html: string, config: KeywordArticleConfig): string { ... }
```

Sau đó update `stream/route.ts` để import từ `writing.ts`, và `processor.ts` của bulk cũng import từ đây.

---

## 10. sessionStorage Keys

| Key | Nội dung | Set khi | Clear khi |
|-----|---------|---------|-----------|
| `vhltk_config` | `BulkKeywordConfig` JSON | Submit config page | Submit config mới |
| `vhltk_jobId` | job ID (string) | Enqueue thành công | User quay lại config page |

---

## 11. Bugs & Gotchas

| # | Bug | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | Keyword trùng nhau khi `duplicateMode='reject'` nhưng user dùng chữ hoa/thường khác nhau | So sánh case-sensitive | `parseKeywordList` lowercase trước khi dedup ✅ |
| 2 | User nhập keyword có dấu phẩy trong nội dung keyword (không phải secondary KW) | Ambiguous parsing | Ghi rõ trong UI: dấu phẩy đầu tiên = phân cách secondary KW |
| 3 | SSE bị ngắt khi process mất > 5 phút (timeout proxy) | Nginx/Vercel timeout | Thêm keepalive comment mỗi 30s: `controller.enqueue(": keepalive\n\n")` |
| 4 | `processKeyword` throw mà không save status='error' vào DB | Unhandled exception | Wrap trong try/catch trong `process/[jobId]`, update article status ✅ |
| 5 | Pause gửi PATCH thành công nhưng SSE vẫn tiếp tục chạy bài hiện tại | Check pause sau mỗi bài, không giữa bài | Đây là expected behavior — pause có hiệu lực từ bài TIẾP THEO |
| 6 | `buildWritingPrompt` chưa được extract → import lỗi trong processor.ts | Cần refactor trước | Xem Section 9 ✅ |
| 7 | `imageCount` không được truyền vào prompt nhưng UI cho chọn | Image count là cho backend image search pipeline, không phải prompt | Đảm bảo image processor (nếu có) đọc `config.imageCount` khi gắn ảnh vào bài |
| 8 | Secondary KW từ keyword line không được pass vào `generateOutline` | `processKeyword` hiện pass `[]` | Parse keyword line trong processor, extract secondary KWs |

---

## 12. Checklist triển khai

### Refactor trước (bắt buộc)
- [ ] Extract `buildWritingPrompt()` + `applySeoOptions()` ra `lib/viet-theo-tu-khoa/writing.ts`
- [ ] Update `app/api/viet-theo-tu-khoa/stream/route.ts` import từ `writing.ts`
- [ ] Verify `BulkJob` model + `Article.bulkJobId` + `Article.bulkIndex` đã có trong Prisma schema

### Files cần tạo mới
- [ ] `web/lib/viet-hang-loat-tu-khoa/types.ts`
- [ ] `web/lib/viet-hang-loat-tu-khoa/processor.ts`
- [ ] `web/app/viet-hang-loat-tu-khoa/page.tsx` ← Config page
- [ ] `web/app/viet-hang-loat-tu-khoa/queue/page.tsx`
- [ ] `web/app/viet-hang-loat-tu-khoa/[id]/page.tsx`
- [ ] `web/app/api/vhltk/enqueue/route.ts`
- [ ] `web/app/api/vhltk/process/[jobId]/route.ts`
- [ ] `web/app/api/vhltk/jobs/[jobId]/route.ts` (GET + PATCH)

### Sidebar
- [ ] Thêm "Viết Hàng Loạt — Từ Khóa" vào nhóm "Viết Hàng Loạt" trong Sidebar

### QA trước khi merge
- [ ] Test enqueue: 3 keywords → 3 Article records tạo đúng trong DB
- [ ] Test `duplicateMode='reject'`: input 5 dòng có 2 trùng → DB tạo 4 bài
- [ ] Test process SSE: queue page nhận đúng `item_start`, `item_step`, `item_done`
- [ ] Test `outlineMode='ai_outline'`: processor gọi `generateOutline()`, bài có structure theo outline
- [ ] Test `titleMode='keyword_as_title'`: title trong DB = keyword, H1 đầu bài = keyword
- [ ] Test `titleMode='ai_title'`: title trong DB khác keyword (AI-generated)
- [ ] Test pause: click Tạm dừng → bài đang chạy hoàn thành → bài tiếp theo không bắt đầu
- [ ] Test resume: click Tiếp tục → SSE tiếp tục từ bài còn pending
- [ ] Test article view page: click item done → load editor với content đúng
- [ ] Test secondary keywords trên cùng dòng: `giường sắt, giường 1m2, giá rẻ` → keyword chính + 2 secondary
- [ ] Test keepalive khi batch lớn (>20 bài): SSE không bị timeout
- [ ] Verify `source='viet-hang-loat-tu-khoa'` trong Article record
