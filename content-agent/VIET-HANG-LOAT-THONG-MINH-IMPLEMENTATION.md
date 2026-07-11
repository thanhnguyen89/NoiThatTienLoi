# VIET-HANG-LOAT-THONG-MINH-IMPLEMENTATION.md
## Hướng dẫn code — Viết Hàng Loạt · Viết Thông Minh

> Phân tích từ: https://aiktp.com/vi/bulk-write-smart-ai-basic  
> Chuẩn: `PAGE-STANDARD.md` · `DEV-PAGE-ROUTING-NOTE.md` · `DEV-CODING-ORDER.md`  
> **Nhóm A — P3** (Queue Bulk)  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API  
> **Đọc trước:** `VIET-BAI-THONG-MINH-IMPLEMENTATION.md` — tái dùng phần lớn từ đó

---

## 0. Tổng quan

| Mục | Giá trị |
|-----|---------|
| Nhóm | **A** — Viết Bài Chính (Article + DB + Publish WP) |
| Pattern | **P3** — Queue Bulk |
| Config route | `/viet-hang-loat` |
| Queue route | `/viet-hang-loat/queue` |
| Article view | `/viet-hang-loat/[id]` |
| sessionStorage | `vhl_config` + `vhl_brand_info` |
| DB model | `Article` (đã có) + `BulkJob` (mới) |
| contentType | `viet_hang_loat:smart` |

### Nguyên tắc cốt lõi

```
Viết Hàng Loạt = Viết Bài Thông Minh chạy tự động N lần, không cần user review từng bài.

Khác biệt chính:
  Viết Bài Thông Minh → 4-step wizard, user review semantic + outline từng bài
  Viết Hàng Loạt      → 1 lần config, AI tự analyze + title + outline + write, lưu DB
```

---

## 1. So sánh aiktp vs Local

| # | Điểm | aiktp | Local |
|---|------|-------|-------|
| 1 | Transport | WebSocket | **SSE** per job |
| 2 | Keywords input | Textarea 1 keyword/dòng | **Textarea 1 keyword/dòng** |
| 3 | Duplicate handling | Allow / Reject | **Allow / Reject** |
| 4 | Title option | Keyword + / = keyword | **AI tự chọn best title** (tái dùng `/api/vbt/titles`) |
| 5 | Image source | Google/Bing/YouTube/Pexels | **IMAGE_OPTIONS từ shared** |
| 6 | Data source | AI / Google+AI | **4 modes từ vbt** |
| 7 | Outline size | 5-6 / 7-8 / 9-10 headings | **TARGET_LENGTHS từ shared** |
| 8 | Article goal | Balance/SEO/Bypass AI | **WRITING_TONES từ shared** |
| 9 | FAQ cuối bài | Yes/No | **Trong SeoAdvancedBlock** |
| 10 | Model | Static list | **`<ModelPicker />`** |
| 11 | Auto publish | Yes/No + schedule + category | **Publish tab per article** |
| 12 | Brand | ❌ | **`<BrandSection />`** |
| 13 | Queue UI | Progress bar per item | **Real-time SSE per item** + status badges |
| 14 | Pause / Cancel | ❌ | **Có — pause queue, cancel item** |
| 15 | Retry lỗi | ❌ | **Có — retry từng item** |
| 16 | Humanness Score | ❌ | **Có — per article** |
| 17 | Cannibalization | ❌ | **Check per keyword trước khi enqueue** |

---

## 2. Routing — P3 Pattern

```
/viet-hang-loat              ← Config page (8 khối + keyword list + Submit)
/viet-hang-loat/queue        ← Queue management (real-time progress)
/viet-hang-loat/[id]         ← Xem / chỉnh sửa từng Article đã viết xong
```

### Flow tổng

```
User điền config + danh sách keyword
      ↓ Submit → POST /api/vhl/enqueue
      → Tạo BulkJob + N Article records (status=PENDING)
      → Redirect /viet-hang-loat/queue
            ↓
Queue page tự động bắt đầu xử lý từng job:
      POST /api/vhl/process/{jobId}  (SSE)
      → Per keyword:
          1. POST /api/vbt/analyze    → semantic
          2. POST /api/vbt/titles     → chọn title tốt nhất
          3. POST /api/vbt/outline    → build outline
          4. GET  /api/vbt/stream     → viết bài
          5. Lưu Article DB (status=WRITTEN)
      → Cập nhật BulkJob progress
```

---

## 3. DB Model — `BulkJob`

Thêm vào `prisma/schema.prisma`:

```prisma
model BulkJob {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])

  // Config
  jobType     String        // "smart" | "tinh_gon" | ...
  config      Json          // VhlConfig (language, tone, model, dataSource, imageOption...)
  brandConfig Json?         // BrandSection state

  // Keywords
  keywords    String[]      // danh sách keyword đã dedup
  totalCount  Int           // = keywords.length

  // Progress
  processedCount Int        @default(0)
  successCount   Int        @default(0)
  errorCount     Int        @default(0)
  status         BulkJobStatus @default(PENDING)

  // Relations — mỗi keyword → 1 Article
  articles    Article[]     @relation("BulkJobArticles")

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  startedAt   DateTime?
  completedAt DateTime?

  @@index([userId, status])
}

enum BulkJobStatus {
  PENDING     // Chưa bắt đầu
  RUNNING     // Đang chạy
  PAUSED      // Tạm dừng (user bấm pause)
  COMPLETED   // Xong hết
  FAILED      // Lỗi hệ thống
}
```

Thêm relation vào `Article`:

```prisma
model Article {
  // ... existing fields ...
  bulkJobId   String?
  bulkJob     BulkJob?  @relation("BulkJobArticles", fields: [bulkJobId], references: [id])
  bulkIndex   Int?      // thứ tự trong bulk job (0-based)
}
```

Migration:

```bash
npx prisma migrate dev --name add-bulk-job
```

---

## 4. Types — `web/lib/viet-hang-loat/types.ts`

```typescript
// Tái dùng từ viet-bai-thong-minh:
import type { DataSourceMode, ContentType, TopicalMapRole } from '@/lib/viet-bai-thong-minh/types';

export interface VhlConfig {
  // Khối 1 — đặc thù của bulk (không có single keyword)
  keywordsRaw:      string;         // raw textarea — 1 keyword/dòng
  duplicateMode:    'allow' | 'reject';
  dataSourceMode:   DataSourceMode; // ai_only | url_crawl | manual_text | google_search
  contentType:      ContentType;    // blog_seo | how_to | listicle | ...
  topicalMapRole:   TopicalMapRole; // hub | spoke | standalone

  // Khối 2
  imageOption:      'none' | 'yandex' | 'ai_generated' | 'shutterstock';

  // Khối 3
  language:         string;

  // Khối 4 (Outline + Length)
  targetLength:     number;         // TARGET_LENGTHS value

  // Khối 5
  tone:             string;

  // Khối 6
  modelId:          string;

  // Brand (Khối 7) — lưu riêng vào vhl_brand_info
  // SEO (Khối 8) — lưu riêng qua SeoAdvancedBlock
}

// Per-keyword job item (FE state)
export interface BulkJobItem {
  keyword:    string;
  articleId:  string | null;
  status:     'pending' | 'analyzing' | 'writing' | 'done' | 'error';
  step:       string;              // "🔍 Phân tích...", "✍️ Đang viết...", ...
  progress:   number;              // 0–100
  title:      string | null;       // khi xong
  wordCount:  number | null;
  humanness:  number | null;
  error:      string | null;
}

// SSE events từ /api/vhl/process
export type VhlSSEEvent =
  | { type: 'item_start';    index: number; keyword: string }
  | { type: 'item_step';     index: number; step: string; progress: number }
  | { type: 'item_done';     index: number; articleId: string; title: string; wordCount: number; humanness: number }
  | { type: 'item_error';    index: number; message: string }
  | { type: 'job_done';      successCount: number; errorCount: number }
  | { type: 'error';         message: string };
```

---

## 5. Options — `web/lib/viet-hang-loat/options.ts`

```typescript
// Tái dùng từ shared và vbt — không định nghĩa lại
export { SUPPORTED_LANGUAGES, IMAGE_OPTIONS, TARGET_LENGTHS, WRITING_TONES } from '@/lib/shared/options';
export { CONTENT_TYPES, TOPICAL_MAP_ROLES, DATA_SOURCE_MODES } from '@/lib/viet-bai-thong-minh/options';

export const DUPLICATE_MODES = [
  { value: 'reject', label: 'Loại bỏ trùng', note: 'Không viết nếu keyword đã có bài' },
  { value: 'allow',  label: 'Cho phép trùng', note: 'AI viết 2 bài khác nhau cho 1 keyword' },
] as const;

/** Parse raw keywords textarea → dedup nếu cần */
export function parseKeywordList(raw: string, duplicateMode: 'allow' | 'reject'): string[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (duplicateMode === 'reject') {
    return [...new Set(lines.map((l) => l.toLowerCase()))].map(
      (lc) => lines.find((l) => l.toLowerCase() === lc) ?? lc
    );
  }
  return lines;
}

export const MAX_KEYWORDS_PER_JOB = 50;  // Hard limit
```

---

## 6. API Routes

### 6.1 Enqueue — `POST /api/vhl/enqueue/route.ts`

Tạo BulkJob + N Article records.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { parseKeywordList, MAX_KEYWORDS_PER_JOB } from '@/lib/viet-hang-loat/options';

export const runtime = 'nodejs';

const schema = z.object({
  config:      z.record(z.unknown()),
  brandConfig: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user   = await requireAuth();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config, brandConfig } = parsed.data;
    const cfg    = config as Record<string, unknown>;
    const rawKws = (cfg.keywordsRaw as string) ?? '';
    const dupMode = (cfg.duplicateMode as string) === 'allow' ? 'allow' : 'reject';

    const keywords = parseKeywordList(rawKws, dupMode);
    if (keywords.length === 0) {
      return NextResponse.json({ error: 'Danh sách keyword trống' }, { status: 400 });
    }
    if (keywords.length > MAX_KEYWORDS_PER_JOB) {
      return NextResponse.json({ error: `Tối đa ${MAX_KEYWORDS_PER_JOB} keyword mỗi lần` }, { status: 400 });
    }

    // Tạo BulkJob
    const bulkJob = await prisma.bulkJob.create({
      data: {
        userId:     user.userId,
        jobType:    'smart',
        config:     config as never,
        brandConfig: (brandConfig ?? {}) as never,
        keywords,
        totalCount: keywords.length,
        status:     'PENDING',
      },
    });

    // Tạo Article record placeholder cho mỗi keyword
    const articles = await prisma.$transaction(
      keywords.map((kw, i) =>
        prisma.article.create({
          data: {
            userId:      user.userId,
            bulkJobId:   bulkJob.id,
            bulkIndex:   i,
            status:      'PENDING',
            keyword:     kw,
            language:    (cfg.language as string) ?? 'Vietnamese',
            contentType: `viet_hang_loat:smart`,
            htmlContent: '',
            selectedTitle: kw,  // placeholder
            outline: { flow: 'viet_hang_loat', stage: 'pending', config: cfg },
          },
        })
      )
    );

    return NextResponse.json({
      jobId:      bulkJob.id,
      totalCount: keywords.length,
      articleIds: articles.map((a) => a.id),
    });
  } catch (err) {
    const msg    = err instanceof Error ? err.message : 'Lỗi server';
    const status = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
```

---

### 6.2 Process — `POST /api/vhl/process/[jobId]/route.ts`

SSE — xử lý từng keyword trong BulkJob tuần tự.

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { computeKeywordDensity, countWords, sanitizeHtmlArticle, buildMetaDescription } from '@/lib/tinh-gon/text';
// Tái dùng từ vbt:
import { buildSemanticAnalysisPrompt } from '@/lib/viet-bai-thong-minh/prompts';
import { buildSmartWritePrompt } from '@/lib/viet-bai-thong-minh/prompts';

export const runtime  = 'nodejs';
export const maxDuration = 300;  // 5 phút timeout cho N bài

function sse(ctrl: ReadableStreamDefaultController, data: object) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const user = await requireAuth();
    const { jobId } = params;

    const bulkJob = await prisma.bulkJob.findFirst({
      where: { id: jobId, userId: user.userId },
      include: { articles: { orderBy: { bulkIndex: 'asc' } } },
    });
    if (!bulkJob) {
      return new Response(JSON.stringify({ error: 'BulkJob not found' }), { status: 404 });
    }

    // Chỉ xử lý articles chưa xong
    const pendingArticles = bulkJob.articles.filter(
      (a) => a.status === 'PENDING' || a.status === 'DRAFT'
    );

    const cfg         = bulkJob.config as Record<string, unknown>;
    const brandConfig = bulkJob.brandConfig as Record<string, unknown> | null;

    // Mark job RUNNING
    await prisma.bulkJob.update({
      where:  { id: jobId },
      data:   { status: 'RUNNING', startedAt: bulkJob.startedAt ?? new Date() },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sse(controller, data);

        try {
          const model       = buildTinhGonModel((cfg.modelId as string) ?? 'gemini-flash');
          const brandPrompt = await buildBrandPrompt(brandConfig as never);
          const dbForbidden = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true }, orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(dbForbidden?.items ?? [], brandConfig?.forbiddenExtra as string);

          for (const article of pendingArticles) {
            const idx = article.bulkIndex ?? 0;
            const kw  = article.keyword;

            // Check pause status giữa các bài
            const currentJob = await prisma.bulkJob.findUnique({ where: { id: jobId } });
            if (currentJob?.status === 'PAUSED') {
              send({ type: 'paused', processedSoFar: idx });
              break;
            }

            send({ type: 'item_start', index: idx, keyword: kw });

            try {
              await prisma.article.update({ where: { id: article.id }, data: { status: 'GENERATING' } });

              // ── STEP 1: Semantic Analysis ────────────────────────────────
              send({ type: 'item_step', index: idx, step: '🔍 Phân tích semantic...', progress: 10 });

              const analyzePrompt = buildSemanticAnalysisPrompt({
                keyword:        kw,
                contentType:    (cfg.contentType as string) ?? 'blog_seo',
                topicalMapRole: (cfg.topicalMapRole as string) ?? 'standalone',
                language:       (cfg.language as string) ?? 'Vietnamese',
                dataSource:     '',   // bulk mode: ai_only cho speed
              });
              const analyzeResult  = await model.generateContent(analyzePrompt);
              const semanticRaw    = analyzeResult.response.text();

              // ── STEP 2: Generate Title ───────────────────────────────────
              send({ type: 'item_step', index: idx, step: '📝 Tạo tiêu đề...', progress: 25 });

              const titlePrompt = `
Bạn là chuyên gia SEO. Tạo 1 tiêu đề tốt nhất cho bài về: "${kw}"
Ngôn ngữ: ${cfg.language ?? 'Vietnamese'}
Yêu cầu: chứa keyword, 50–65 ký tự, hấp dẫn, tránh clickbait rẻ tiền.
Chỉ trả tiêu đề, không giải thích.`.trim();

              const titleResult = await model.generateContent(titlePrompt);
              const title       = titleResult.response.text().trim().replace(/^["']|["']$/g, '');

              // ── STEP 3: Build Outline ────────────────────────────────────
              send({ type: 'item_step', index: idx, step: '📋 Xây dựng dàn ý...', progress: 40 });

              const targetLength = (cfg.targetLength as number) ?? 1200;
              const outlinePrompt = `
Tạo dàn ý cho bài viết SEO về: "${kw}"
Tiêu đề: ${title}
Độ dài mục tiêu: ~${targetLength} từ
Ngôn ngữ: ${cfg.language ?? 'Vietnamese'}
Content type: ${cfg.contentType ?? 'blog_seo'}

Semantic context:
${semanticRaw.slice(0, 500)}

Trả về dàn ý dạng:
H2: [heading]
  H3: [sub-heading nếu cần]
Chỉ trả dàn ý, không giải thích.`.trim();

              const outlineResult = await model.generateContent(outlinePrompt);
              const outline       = outlineResult.response.text().trim();

              // ── STEP 4: Write Article ────────────────────────────────────
              send({ type: 'item_step', index: idx, step: '✍️ Đang viết bài...', progress: 55 });

              const writePrompt = buildSmartWritePrompt({
                keyword:      kw,
                title,
                outline,
                language:     (cfg.language as string) ?? 'Vietnamese',
                tone:         (cfg.tone as string) ?? 'friendly_ai_bypass',
                targetLength,
                contentType:  (cfg.contentType as string) ?? 'blog_seo',
                brandPrompt,
                forbiddenList,
                semanticContext: semanticRaw.slice(0, 800),
              });

              let rawHtml = '';
              try {
                const aiStream = await model.generateContentStream(writePrompt);
                for await (const chunk of aiStream) {
                  rawHtml += chunk.text() ?? '';
                }
              } catch {
                const r = await model.generateContent(writePrompt);
                rawHtml = r.response.text();
              }

              // ── STEP 5: Score & Save ─────────────────────────────────────
              send({ type: 'item_step', index: idx, step: '📊 Chấm điểm & lưu...', progress: 90 });

              const html           = sanitizeHtmlArticle(rawHtml, kw);
              const wordCount      = countWords(html);
              const keywordDensity = computeKeywordDensity(html, kw);
              const humanness      = analyzeHumanness(html, forbiddenList);
              const metaDesc       = buildMetaDescription(title, kw);

              await prisma.article.update({
                where: { id: article.id },
                data: {
                  selectedTitle:   title,
                  htmlContent:     html,
                  metaDescription: metaDesc,
                  wordCount,
                  status:          'WRITTEN',
                  aiDecision:      humanness.decision,
                  humannessScore:  humanness.score,
                  seoChecks:       { keywordDensity } as never,
                  scoreBreakdown:  { humanness, keywordDensity } as never,
                  outline: {
                    flow: 'viet_hang_loat', stage: 'generate',
                    config: cfg, semanticSummary: semanticRaw.slice(0, 200),
                  },
                },
              });

              await prisma.bulkJob.update({
                where: { id: jobId },
                data:  { processedCount: { increment: 1 }, successCount: { increment: 1 } },
              });

              send({ type: 'item_done', index: idx, articleId: article.id, title, wordCount, humanness: humanness.score });

            } catch (itemErr) {
              const msg = itemErr instanceof Error ? itemErr.message : 'Lỗi xử lý';
              await prisma.article.update({ where: { id: article.id }, data: { status: 'DRAFT' } }).catch(() => null);
              await prisma.bulkJob.update({
                where: { id: jobId },
                data:  { processedCount: { increment: 1 }, errorCount: { increment: 1 } },
              }).catch(() => null);
              send({ type: 'item_error', index: idx, message: msg });
            }

            // Delay giữa các bài để tránh rate limit
            await new Promise((r) => setTimeout(r, 1500));
          }

          // Mark job COMPLETED nếu hết pending
          const finalJob = await prisma.bulkJob.findUnique({ where: { id: jobId } });
          if (finalJob?.status === 'RUNNING') {
            await prisma.bulkJob.update({
              where: { id: jobId },
              data:  { status: 'COMPLETED', completedAt: new Date() },
            });
          }

          send({ type: 'job_done', successCount: finalJob?.successCount ?? 0, errorCount: finalJob?.errorCount ?? 0 });

        } catch (err) {
          await prisma.bulkJob.update({ where: { id: jobId }, data: { status: 'FAILED' } }).catch(() => null);
          send({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi stream' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        Connection:          'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    const msg    = err instanceof Error ? err.message : 'Lỗi server';
    const status = msg === 'Unauthorized' ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status });
  }
}
```

---

### 6.3 Pause/Resume — `PATCH /api/vhl/jobs/[jobId]/route.ts`

```typescript
// PATCH { action: 'pause' | 'resume' | 'cancel' }
export async function PATCH(request: NextRequest, { params }: { params: { jobId: string } }) {
  const user    = await requireAuth();
  const { action } = await request.json() as { action: string };
  const jobId   = params.jobId;

  const statusMap: Record<string, string> = {
    pause:  'PAUSED',
    resume: 'RUNNING',
    cancel: 'FAILED',
  };
  const newStatus = statusMap[action];
  if (!newStatus) return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });

  await prisma.bulkJob.updateMany({
    where: { id: jobId, userId: user.userId },
    data:  { status: newStatus as never },
  });
  return NextResponse.json({ ok: true });
}
```

---

### 6.4 Job Status — `GET /api/vhl/jobs/[jobId]/route.ts`

```typescript
// Trả về BulkJob + articles summary để queue page polling
export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  const user = await requireAuth();
  const job  = await prisma.bulkJob.findFirst({
    where: { id: params.jobId, userId: user.userId },
    include: {
      articles: {
        select: {
          id: true, bulkIndex: true, keyword: true, status: true,
          selectedTitle: true, wordCount: true, humannessScore: true,
        },
        orderBy: { bulkIndex: 'asc' },
      },
    },
  });
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(job);
}
```

---

## 7. Config Page — `web/app/viet-hang-loat/page.tsx`

### 8 Khối Config (đúng thứ tự)

```
Khối 1 — Keyword List + Duplicate mode + Data source + Content type + Topical Map
Khối 2 — Image Option       ← IMAGE_OPTIONS từ lib/shared
Khối 3 — Language           ← SUPPORTED_LANGUAGES
Khối 4 — Outline + Length   ← TARGET_LENGTHS (chuẩn — không override vì không có structure preset)
Khối 5 — Tone               ← WRITING_TONES
Khối 6 — AI Model           ← <ModelPicker />
Khối 7 — Brand Config       ← <BrandSection lsKey="vhl_brand_info" />
Khối 8 — SEO Advanced       ← <SeoAdvancedBlock />
─────────────────────────────
Submit → POST /api/vhl/enqueue → redirect /viet-hang-loat/queue
```

### Khối 1 — Keyword List (đặc thù)

```tsx
{/* ═══ KHỐI 1 ═══════════════════════════════════════════════════════ */}
<div className="bg-white rounded-lg shadow-sm p-6 mb-4">
  <h2 className="text-sm font-bold text-gray-800 mb-4">1. Danh sách từ khóa</h2>

  <div className="flex justify-between items-center mb-1.5">
    <label className="text-xs font-semibold text-gray-700">
      Từ khóa <span className="text-red-500">*</span>
    </label>
    <span className={`text-xs font-medium ${keywordCount > MAX_KEYWORDS_PER_JOB ? 'text-red-500' : 'text-gray-400'}`}>
      {keywordCount}/{MAX_KEYWORDS_PER_JOB} từ khóa
    </span>
  </div>
  <textarea
    value={config.keywordsRaw}
    onChange={(e) => update({ keywordsRaw: e.target.value })}
    rows={8}
    placeholder={`giường sắt 1m8 giá rẻ\ntủ quần áo 3 cánh gỗ ép\nbàn học sinh gấp gọn\n...`}
    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono resize-y focus:ring-2 focus:ring-blue-500"
  />
  <p className="text-xs text-gray-400 mt-1">
    1 từ khóa = 1 bài viết. Tối đa {MAX_KEYWORDS_PER_JOB} từ khóa/lần.
    Có thể thêm từ khóa phụ cùng dòng: "giường sắt, giường sắt 1m8, giường hộp sắt".
  </p>

  {/* Duplicate mode */}
  <div className="mt-4">
    <label className="block text-xs font-semibold text-gray-700 mb-2">Từ khóa trùng</label>
    <div className="grid grid-cols-2 gap-2">
      {DUPLICATE_MODES.map((opt) => (
        <button key={opt.value} onClick={() => update({ duplicateMode: opt.value })}
          className={`p-3 rounded-lg border-2 text-left transition-colors ${config.duplicateMode === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
          <div className="text-sm font-semibold">{opt.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{opt.note}</div>
        </button>
      ))}
    </div>
  </div>

  {/* Data source */}
  <div className="mt-4">
    <label className="block text-xs font-semibold text-gray-700 mb-2">Nguồn dữ liệu AI</label>
    <div className="grid grid-cols-2 gap-2">
      {DATA_SOURCE_MODES.filter((m) => ['ai_only', 'google_search'].includes(m.value)).map((opt) => (
        <button key={opt.value} onClick={() => update({ dataSourceMode: opt.value as never })}
          className={`p-3 rounded-lg border-2 text-left transition-colors ${config.dataSourceMode === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
          <div className="text-sm font-semibold">{opt.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{opt.note}</div>
        </button>
      ))}
    </div>
    <p className="text-xs text-amber-600 mt-2">
      ⚠️ Google+AI chậm hơn ~10s/bài. Với 20 bài = thêm ~3 phút.
    </p>
  </div>

  {/* Content type */}
  <div className="mt-4">
    <label className="block text-xs font-semibold text-gray-700 mb-2">Loại nội dung</label>
    <select value={config.contentType} onChange={(e) => update({ contentType: e.target.value as never })}
      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500">
      {CONTENT_TYPES.map((ct) => (
        <option key={ct.value} value={ct.value}>{ct.label} — {ct.note}</option>
      ))}
    </select>
  </div>
</div>
```

### Submit + Estimated time

```tsx
{/* Estimated time badge */}
{keywordCount > 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm text-blue-700">
    📊 Ước tính: <strong>{keywordCount} bài</strong> ·{' '}
    <strong>~{Math.ceil(keywordCount * 45 / 60)} phút</strong>{' '}
    (khoảng 45s/bài · {config.dataSourceMode === 'google_search' ? '+10s/bài cho Google Search' : 'AI only'})
  </div>
)}

{error && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
    {error}
  </div>
)}

<button onClick={() => void handleSubmit()} disabled={loading || keywordCount === 0 || keywordCount > MAX_KEYWORDS_PER_JOB}
  className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
  {loading
    ? <><span className="animate-spin">⟳</span> Đang khởi tạo...</>
    : `🚀 Bắt đầu viết ${keywordCount} bài →`}
</button>
```

### Submit handler

```typescript
async function handleSubmit() {
  const keywords = parseKeywordList(config.keywordsRaw, config.duplicateMode);
  if (keywords.length === 0) { setError('Danh sách keyword trống.'); return; }
  if (keywords.length > MAX_KEYWORDS_PER_JOB) { setError(`Tối đa ${MAX_KEYWORDS_PER_JOB} keyword.`); return; }

  setLoading(true);
  setError('');

  try {
    const brandConfig = (() => {
      try { return JSON.parse(sessionStorage.getItem('vhl_brand_info') ?? '{}'); }
      catch { return {}; }
    })();

    const finalConfig: VhlConfig = { ...config, keywordsRaw: config.keywordsRaw };

    const res  = await fetch('/api/vhl/enqueue', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ config: finalConfig, brandConfig }),
    });
    const data = await res.json() as { jobId?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? 'Lỗi khởi tạo');

    sessionStorage.setItem('vhl_config',  JSON.stringify(finalConfig));
    sessionStorage.setItem('vhl_job_id',  data.jobId!);

    router.push('/viet-hang-loat/queue');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    setLoading(false);
  }
}
```

---

## 8. Queue Page — `web/app/viet-hang-loat/queue/page.tsx`

### Layout tổng

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: "Đang viết X/N bài" · Progress bar tổng · [Pause] [Cancel] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Item 1 ─────────────────────────────────────────────────┐  │
│  │  ✅ giường sắt 1m8 giá rẻ                                 │  │
│  │  "Top 5 Giường Sắt 1m8 Giá Rẻ Tốt Nhất 2025"           │  │
│  │  1.243 từ · Humanness 82 · [Xem bài] [Đăng bài]        │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌─ Item 2 ─────────────────────────────────────────────────┐  │
│  │  ✍️ tủ quần áo 3 cánh gỗ ép                              │  │
│  │  📋 Xây dựng dàn ý... ████████░░ 40%                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌─ Item 3–N ────────────────────────────────────────────────┐  │
│  │  ⏳ bàn học sinh gấp gọn (pending)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Status badge colors

```typescript
const STATUS_CONFIG = {
  pending:   { icon: '⏳', color: 'text-gray-400', bg: 'bg-gray-50',   label: 'Đang chờ' },
  analyzing: { icon: '🔍', color: 'text-blue-600', bg: 'bg-blue-50',   label: 'Phân tích' },
  writing:   { icon: '✍️', color: 'text-purple-600', bg: 'bg-purple-50', label: 'Đang viết' },
  done:      { icon: '✅', color: 'text-green-600', bg: 'bg-green-50',  label: 'Hoàn thành' },
  error:     { icon: '❌', color: 'text-red-600',   bg: 'bg-red-50',    label: 'Lỗi' },
} as const;
```

### Queue page logic

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BulkJobItem, VhlSSEEvent } from '@/lib/viet-hang-loat/types';

export default function VietHangLoatQueuePage() {
  const router  = useRouter();
  const [items, setItems]         = useState<BulkJobItem[]>([]);
  const [jobStatus, setJobStatus] = useState<'pending' | 'running' | 'paused' | 'completed' | 'failed'>('pending');
  const [totalCount, setTotal]    = useState(0);
  const [doneCount, setDone]      = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const jobId = typeof window !== 'undefined' ? sessionStorage.getItem('vhl_job_id') : null;

  // Guard
  useEffect(() => {
    if (!jobId) router.replace('/viet-hang-loat');
  }, [jobId, router]);

  // Khởi động SSE khi mount
  useEffect(() => {
    if (!jobId) return;
    startProcessing(jobId);
  }, [jobId]);

  async function startProcessing(jid: string) {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setJobStatus('running');

    try {
      const res = await fetch(`/api/vhl/process/${jid}`, {
        method: 'POST',
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error('Kết nối thất bại');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as VhlSSEEvent;
            handleSSEEvent(event);
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setJobStatus('failed');
      }
    }
  }

  function handleSSEEvent(event: VhlSSEEvent) {
    switch (event.type) {
      case 'item_start':
        setItems((prev) => prev.map((item, i) =>
          i === event.index ? { ...item, status: 'analyzing', step: '🔍 Phân tích...' } : item
        ));
        break;
      case 'item_step':
        setItems((prev) => prev.map((item, i) =>
          i === event.index ? { ...item, step: event.step, progress: event.progress } : item
        ));
        break;
      case 'item_done':
        setItems((prev) => prev.map((item, i) =>
          i === event.index ? {
            ...item, status: 'done', articleId: event.articleId,
            title: event.title, wordCount: event.wordCount, humanness: event.humanness,
            progress: 100,
          } : item
        ));
        setDone((d) => d + 1);
        break;
      case 'item_error':
        setItems((prev) => prev.map((item, i) =>
          i === event.index ? { ...item, status: 'error', error: event.message } : item
        ));
        setDone((d) => d + 1);
        break;
      case 'job_done':
        setJobStatus('completed');
        break;
      case 'error':
        setJobStatus('failed');
        break;
    }
  }

  async function handlePause() {
    if (!jobId) return;
    await fetch(`/api/vhl/jobs/${jobId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'pause' }),
    });
    abortRef.current?.abort();
    setJobStatus('paused');
  }

  async function handleResume() {
    if (!jobId) return;
    await fetch(`/api/vhl/jobs/${jobId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'resume' }),
    });
    startProcessing(jobId);
  }
```

### Queue item card

```tsx
function QueueItemCard({ item, index }: { item: BulkJobItem; index: number }) {
  const cfg = STATUS_CONFIG[item.status];

  return (
    <div className={`rounded-xl border p-4 transition-all ${cfg.bg} ${item.status === 'writing' || item.status === 'analyzing' ? 'border-blue-300 shadow-sm' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        {/* Index */}
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-500 flex items-center justify-center mt-0.5">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          {/* Keyword */}
          <p className="text-xs text-gray-500 truncate">{item.keyword}</p>

          {/* Title khi xong */}
          {item.title && (
            <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-snug">{item.title}</p>
          )}

          {/* Progress bar khi đang chạy */}
          {(item.status === 'analyzing' || item.status === 'writing') && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{item.step}</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats khi done */}
          {item.status === 'done' && item.wordCount && (
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>📝 {item.wordCount?.toLocaleString()} từ</span>
              {item.humanness && (
                <span className={item.humanness >= 76 ? 'text-green-600 font-medium' : 'text-amber-600'}>
                  🧬 Humanness {item.humanness}
                </span>
              )}
            </div>
          )}

          {/* Error */}
          {item.status === 'error' && (
            <p className="text-xs text-red-600 mt-1">{item.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg} border border-current/20`}>
            {cfg.icon} {cfg.label}
          </span>
          {item.status === 'done' && item.articleId && (
            <a href={`/viet-hang-loat/${item.articleId}`}
              className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Xem
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 9. Article View — `web/app/viet-hang-loat/[id]/page.tsx`

Tái dùng **y hệt** generate page chuẩn (Editor + 4 tabs). Chỉ thay:

| Thay | Giá trị |
|------|---------|
| Back link | `/viet-hang-loat/queue` |
| Load article | `GET /api/articles/${params.id}` (thay vì từ SSE) |
| Publish button | Vẫn dùng Publish tab chuẩn |
| Header | Hiện breadcrumb: "Hàng Loạt → [keyword]" |

> Không cần tạo mới — import `ArticleEditorPage` component từ `viet-bai-thong-minh/step4` nếu đã extract thành shared component.

---

## 10. Sidebar — `web/components/Sidebar.tsx`

```typescript
// Nhóm "Viết Hàng Loạt" — section riêng:
{
  label: 'Viết Hàng Loạt',
  items: [
    { href: '/viet-hang-loat', icon: '🚀', label: 'Viết Thông Minh' },
    // Các bulk tools khác thêm vào đây sau:
    // { href: '/viet-hang-loat-tinh-gon', icon: '⚡', label: 'Viết Tinh Gọn' },
  ],
},
```

---

## 11. Thứ tự implement

| Bước | File | Test |
|------|------|------|
| 1 | `prisma/schema.prisma` — thêm BulkJob model | `npx prisma migrate dev --name add-bulk-job` |
| 2 | `lib/viet-hang-loat/types.ts` | — |
| 3 | `lib/viet-hang-loat/options.ts` | Test `parseKeywordList()` |
| 4 | `api/vhl/enqueue/route.ts` | Postman: 5 keywords → jobId + 5 articleIds |
| 5 | `api/vhl/process/[jobId]/route.ts` | Postman: SSE events tuần tự |
| 6 | `api/vhl/jobs/[jobId]/route.ts` (GET + PATCH) | Postman |
| 7 | `app/viet-hang-loat/page.tsx` | Config form 8 khối |
| 8 | `app/viet-hang-loat/queue/page.tsx` | Test với 3 keywords |
| 9 | `app/viet-hang-loat/[id]/page.tsx` | Xem bài xong |
| 10 | `components/Sidebar.tsx` | Thêm section |
| 11 | E2E: 5 keywords, 1 lỗi giữa chừng, pause + resume | — |

---

## 12. QA Checklist

### Config page — 8 khối
- [ ] Khối 1: textarea, count badge đỏ khi > 50
- [ ] Khối 1: duplicate mode 2 options
- [ ] Khối 1: data source 2 options (AI only / Google+AI)
- [ ] Khối 1: content type dropdown (7 loại từ vbt)
- [ ] Khối 2–8: chuẩn shared components
- [ ] Estimated time badge cập nhật realtime khi đổi count/dataSource
- [ ] Submit disabled khi keyword = 0 hoặc > 50

### API: enqueue
- [ ] parseKeywordList dedup đúng khi duplicateMode = 'reject'
- [ ] N Article records tạo đúng (status=PENDING, bulkIndex đúng thứ tự)
- [ ] BulkJob tạo đúng với totalCount

### API: process (SSE)
- [ ] Events đúng thứ tự: item_start → item_step × N → item_done/error
- [ ] Delay 1.5s giữa các bài
- [ ] Pause: job status → PAUSED, SSE dừng sau bài hiện tại
- [ ] Resume: tiếp tục từ PENDING articles còn lại
- [ ] job_done event khi hết pending

### Queue page
- [ ] Guard: không có vhl_job_id → redirect về config
- [ ] SSE bắt đầu tự động khi mount
- [ ] Progress bar cập nhật per-item
- [ ] Status badge đổi màu đúng
- [ ] Pause button → job dừng, Resume → tiếp tục
- [ ] Item done → hiện title + word count + humanness + nút "Xem"
- [ ] Item error → hiện message lỗi màu đỏ
- [ ] Job hoàn thành → hiện summary (N thành công / M lỗi)

### Article view
- [ ] Load đúng article từ DB
- [ ] Editor render HTML
- [ ] Publish tab hoạt động

---

## 13. Bugs thường gặp

| # | Lỗi | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | SSE disconnect giữa chừng | Vercel timeout 30s | Set `maxDuration = 300`, dùng `X-Accel-Buffering: no` |
| 2 | Pause không dừng ngay | Check pause chỉ giữa các bài | OK — thiết kế vậy, không thể dừng giữa bài đang viết |
| 3 | Resume viết lại bài đã done | Filter `status = PENDING / DRAFT` không chặn | Đã xử lý trong `pendingArticles` filter |
| 4 | `brandConfig` null khi process | `vhl_brand_info` không đọc trước enqueue | Đọc trong submit handler, lưu vào BulkJob.brandConfig |
| 5 | Rate limit Gemini khi N > 20 | Nhiều request liên tiếp | Tăng delay lên 3s/bài, hoặc dùng exponential backoff |
| 6 | Queue page không reload khi navigate | SSE abort khi unmount | `abortRef.current?.abort()` trong cleanup của useEffect |
| 7 | `bulkIndex` bị null | Không set trong prisma.create | Đảm bảo `bulkIndex: i` trong transaction |
