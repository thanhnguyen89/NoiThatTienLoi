# VIET-HANG-LOAT-THEO-DAN-BAI-IMPLEMENTATION.md
## Hướng dẫn code "Viết Hàng Loạt — AI Viết Bài Theo Dàn Bài (Bulk Write By Outline)"

> Base page: `/viet-theo-dan-bai` (đã code — đây là bản mở rộng bulk/queue)  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · PostgreSQL  
> Pattern: **P3 — Queue Bulk**

---

## 0. Nhóm & Pattern

| Nhóm | Page | Config | Queue | Article | Pattern | Spec |
|------|------|--------|-------|---------|---------|------|
| A | Viết Hàng Loạt — Theo Dàn Bài | `/viet-hang-loat-theo-dan-bai` | `/viet-hang-loat-theo-dan-bai/queue` | `/viet-hang-loat-theo-dan-bai/[id]` | **P3** | file này |

---

## ⚠️ Điểm khác biệt so với các Bulk variant khác

| # | Điểm | Từ Khóa | Tinh Gọn | Google Search | Theo Nguồn | **Theo Dàn Bài** |
|---|------|---------|----------|---------------|------------|------------------|
| 1 | Base logic | viet-theo-tu-khoa | viet-tinh-gon | viet-tu-google-search | viet-theo-nguon | **viet-theo-dan-bai** |
| 2 | Input đặc thù | keyword | keyword | keyword | keyword + URLs | **keyword + postTitle + shared outline** |
| 3 | Outline | AI tạo tùy option | 11 outline type | no/ai | no/ai + AI type | **User cung cấp 1 outline chung cho mọi bài** |
| 4 | Bước/bài | 2 | 3 | 5 | 2–3 | **2 (writing → scoring)** |
| 5 | Tốc độ/bài | ~30s | ~40s | ~60–120s | ~30–50s | **~25–40s** (outline đã có → AI viết thẳng) |
| 6 | External API | Không | Không | SerpAPI | Không | **Không** |
| 7 | jobType BulkJob | `'tu-khoa'` | `'tinh-gon'` | `'google-search'` | `'theo-nguon'` | **`'dan-bai'`** |
| 8 | Delay giữa bài | 1.5s | 1.5s | 3s | 1.5s | **1.5s** |
| 9 | Khối 4 | ẩn | override = TargetLength | no/ai only | no/ai + AIType | **ẩn** (outline là Khối 1) |
| 10 | Tone riêng | Không | Không | Không | ArticleTone | **DanBaiTone (3 preset: seo_focus/confident/friendly)** |

> **Điểm đặc thù quan trọng:**  
> Tất cả bài trong batch dùng **1 outline chung** làm cấu trúc template.  
> Mỗi keyword → 1 bài viết với cùng H2/H3 structure nhưng nội dung tập trung vào keyword riêng.  
> Phù hợp khi cần viết series bài cùng format (product pages, category blog, so sánh...).  
>  
> **Line format keyword**: `postTitle | keyword` (pipe separator)  
> Nếu không có `|` → cả dòng là keyword, titleMode quyết định H1.

---

## 1. Kiến trúc tổng quan

### 1.1 Flow hoạt động

```
[Config page — /viet-hang-loat-theo-dan-bai]
  User nhập:
    - Keywords textarea: "postTitle | keyword" hoặc chỉ "keyword"
    - Shared outline (1 outline dùng cho mọi bài)
      → AI Suggest outline, crawl URL, hoặc nhập thủ công
    - Duplicate mode + Title mode
    - writeMethod (Balance / Detail)
    - DanBaiTone (seo_focus / confident / friendly)
    - Target length
    - 8 khối config (Khối 4 ẩn)
    ↓
  Submit → POST /api/vhldb/enqueue
    - Parse và validate outline (min 2 heading, max 30)
    - Deduplicate keywords
    - Tạo BulkJob + N Article records
    → Navigate sang /viet-hang-loat-theo-dan-bai/queue

[Queue page]
  POST /api/vhldb/process/[jobId]
  SSE stream — tuần tự từng keyword:
    ① AI viết bài theo outline + keyword  (~20–30s)
    ② Score humanness + SEO checks + save  (~5s)
    Delay 1.5s → keyword tiếp theo

[Article view — /viet-hang-loat-theo-dan-bai/[id]]
  Reuse generate page editor của viet-theo-dan-bai
  Sidebar: hiện outline đã dùng
```

### 1.2 Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-hang-loat-theo-dan-bai/
│   │   ├── page.tsx                              ← Config page
│   │   ├── queue/
│   │   │   └── page.tsx                          ← Queue management
│   │   └── [id]/
│   │       └── page.tsx                          ← Article view
│   └── api/
│       └── vhldb/
│           ├── enqueue/
│           │   └── route.ts
│           ├── process/
│           │   └── [jobId]/
│           │       └── route.ts
│           └── jobs/
│               └── [jobId]/
│                   └── route.ts
└── lib/
    └── viet-hang-loat-theo-dan-bai/
        ├── types.ts
        └── processor.ts
```

### 1.3 File tái sử dụng — KHÔNG tạo mới

| File | Từ đâu | Dùng gì |
|------|--------|---------|
| `lib/viet-theo-dan-bai/outline-parser.ts` | viet-theo-dan-bai | `parseOutline()`, `validateOutline()`, `renderOutlineForPrompt()` — đã có ✅ |
| `lib/viet-theo-dan-bai/options.ts` | viet-theo-dan-bai | `WRITE_METHODS`, `DAN_BAI_TONES`, `DAN_BAI_LENGTHS` |
| `lib/viet-theo-dan-bai/types.ts` | viet-theo-dan-bai | `DanBaiWriteMethod`, `DanBaiTone`, `ParsedHeading` |
| `lib/viet-theo-dan-bai/writer.ts` | viet-theo-dan-bai | `buildDanBaiPrompt()` ← **cần extract** |
| `lib/tinh-gon/model.ts` | tinh-gon | `buildTinhGonModel()` |
| `lib/tinh-gon/humanness.ts` | tinh-gon | `analyzeHumanness()` |
| `lib/tinh-gon/text.ts` | tinh-gon | `sanitizeHtmlArticle()`, `buildMetaDescription()`, `countWords()`, `computeKeywordDensity()` |
| `lib/tinh-gon/forbidden.ts` | tinh-gon | `buildForbiddenList()` |
| `lib/shared/options.ts` | shared | `SUPPORTED_LANGUAGES`, `IMAGE_OPTIONS` |
| `app/api/pipeline/_context.ts` | shared | `buildBrandPrompt()` |
| `app/api/viet-theo-dan-bai/suggest-outline/route.ts` | viet-theo-dan-bai | Reuse nguyên cho AI Suggest ✅ |
| `app/api/viet-theo-dan-bai/extract-outline/route.ts` | viet-theo-dan-bai | Reuse nguyên cho crawl URL ✅ |
| `app/components/ModelPicker.tsx` | shared | ModelPicker |
| `app/components/BrandSection.tsx` | shared | BrandSection |
| `app/components/SeoAdvancedBlock.tsx` | shared | SeoAdvancedBlock |

> ⚠️ **REFACTOR TRƯỚC KHI CODE:**  
> Extract từ `api/viet-theo-dan-bai/stream/route.ts`:  
> **`lib/viet-theo-dan-bai/writer.ts`** — function `buildDanBaiPrompt(config, parsedHeadings, brandPrompt, forbiddenList)`:  
> Chứa `WRITE_METHOD_INSTRUCTIONS`, `TONE_INSTRUCTIONS`, và toàn bộ prompt builder.  
> Update `api/viet-theo-dan-bai/stream/route.ts` import từ lib mới.

---

## 2. Types — `lib/viet-hang-loat-theo-dan-bai/types.ts`

```typescript
import type { DanBaiWriteMethod, DanBaiTone, ParsedHeading } from '@/lib/viet-theo-dan-bai/types';

// ── Shared enums ──────────────────────────────────────────────────────────────

export type DuplicateMode = 'allow' | 'reject';

export type TitleMode = 'keyword_as_title' | 'ai_title';

// ── Per-keyword item ──────────────────────────────────────────────────────────

export interface BulkDanBaiKeyword {
  keyword:   string;    // Từ khóa chính
  postTitle: string;    // Tiêu đề bài (từ pipe format, hoặc rỗng nếu ai_title)
}

// ── Main config ───────────────────────────────────────────────────────────────

export interface BulkDanBaiConfig {
  // Khối 1 — Keywords + Outline
  keywords:        BulkDanBaiKeyword[];
  duplicateMode:   DuplicateMode;
  titleMode:       TitleMode;

  // Shared outline — áp dụng cho mọi bài
  outline:         string;           // Raw outline text (lưu để restore UI)
  parsedHeadings:  ParsedHeading[];  // Pre-parsed tại submit time

  // Khối 2
  imageOption: '0' | 'yandex' | 'ai' | 'shutterstock';

  // Khối 3
  language: string;

  // Khối 4 — ẩn (outline là Khối 1)

  // Khối 5 — Dan-bai specific (không dùng WRITING_TONES chuẩn)
  writeMethod:   DanBaiWriteMethod;  // balance | detail
  tone:          DanBaiTone;         // seo_focus | confident | friendly
  targetLength:  number;             // 600 | 800 | 1000 | 1200 | 1500 | 2000

  // Khối 6
  model: string;

  // Khối 7
  brand: {
    enabled:        boolean;
    name?:          string;
    website?:       string;
    phone?:         string;
    ctaText?:       string;
    forbiddenExtra?: string;
  };

  // Khối 8
  seoOptions?: {
    mainLink?:     string;
    keywordLinks?: string;
    boldKeyword:   boolean;
    boldHeading:   boolean;
    footerContent?: string;
  };
}

// ── SSE event types ───────────────────────────────────────────────────────────

export type BulkDanBaiStep = 'writing' | 'scoring';

export type VhldbSSEEvent =
  | { type: 'item_start'; articleId: string; keyword: string; postTitle: string; index: number; total: number }
  | { type: 'item_step';  articleId: string; step: BulkDanBaiStep; detail: string; progress: number }
  | { type: 'item_done';  articleId: string; keyword: string; title: string; wordCount: number; humanness: number }
  | { type: 'item_error'; articleId: string; keyword: string; error: string }
  | { type: 'job_done';   jobId: string; successCount: number; errorCount: number }
  | { type: 'error';      message: string };

// ── Processor result ──────────────────────────────────────────────────────────

export interface ProcessResult {
  articleId: string;
  title:     string;
  wordCount: number;
  humanness: number;
}

// ── Enqueue ───────────────────────────────────────────────────────────────────

export interface VhldbEnqueueResponse {
  jobId:        string;
  articleCount: number;
  skippedCount: number;
}
```

---

## 3. Refactor — `lib/viet-theo-dan-bai/writer.ts`

> Extract toàn bộ prompt logic từ `api/viet-theo-dan-bai/stream/route.ts`

```typescript
import type { DanBaiConfig, ParsedHeading } from './types';
import { renderOutlineForPrompt }            from './outline-parser';
import { buildForbiddenList }               from '@/lib/tinh-gon/forbidden';

const WRITE_METHOD_INSTRUCTIONS: Record<string, string> = {
  balance: `Phương pháp BALANCE:
- Nội dung giữa các heading liền mạch, không nhắc lại ý đã viết ở section trước.
- Mỗi heading triển khai ý mới, không tóm tắt lại heading trước.
- Bài đọc như một văn bản liên tục — chỉ heading là điểm ngắt.`,

  detail: `Phương pháp DETAIL:
- Mỗi heading là một đơn vị độc lập — giải thích đầy đủ, tự đủ nghĩa.
- Ý có thể trùng lặp giữa các heading nếu cần để giải thích hoàn chỉnh.
- Phù hợp bài kỹ thuật, hướng dẫn, glossary.`,
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  seo_focus: `Tone SEO FOCUS:
- Keyword chính xuất hiện trong h1, h2 đầu tiên, và đoạn mở bài tự nhiên.
- Viết rõ ràng, súc tích — ưu tiên xếp hạng SERP.
- Tránh lan man, mỗi heading đi thẳng vào trọng tâm.`,

  confident: `Tone CONFIDENT:
- Viết như chuyên gia ngành — có quan điểm rõ ràng, số liệu cụ thể.
- Dùng "chúng tôi", "kinh nghiệm", "thực tế" để tăng E-E-A-T.
- Không viết chung chung — mỗi claim cần bằng chứng hoặc con số.`,

  friendly: `Tone FRIENDLY:
- Giọng văn ấm áp, tự nhiên như người thật viết cho người thật.
- Câu ngắn xen câu dài, có câu hỏi tu từ, ví dụ sinh động.
- Ưu tiên vượt qua AI detector — viết như blog cá nhân chuyên môn.`,
};

/**
 * Build prompt AI viết bài theo dàn bài.
 * Dùng cho cả single-page stream/route.ts và bulk processor.
 */
export function buildDanBaiPrompt(
  keyword:        string,
  postTitle:      string,       // H1 bắt buộc — do caller quyết định (keyword hoặc AI title)
  language:       string,
  targetLength:   number,
  writeMethod:    string,
  tone:           string,
  parsedHeadings: ParsedHeading[],
  brandPrompt:    string,
  forbiddenWords: string[],
): string {
  const outlineText            = renderOutlineForPrompt(parsedHeadings);
  const forbidden              = forbiddenWords.join(', ') || 'không có';
  const writeMethodInstruction = WRITE_METHOD_INSTRUCTIONS[writeMethod] ?? WRITE_METHOD_INSTRUCTIONS.balance;
  const toneInstruction        = TONE_INSTRUCTIONS[tone]               ?? TONE_INSTRUCTIONS.seo_focus;

  const titleInstruction = postTitle
    ? `Tiêu đề (H1): "${postTitle}" — dùng chính xác chuỗi này làm thẻ <h1>.`
    : `Tiêu đề (H1): Tự tạo tiêu đề phù hợp với từ khóa "${keyword}" và dàn bài — dùng làm thẻ <h1>.`;

  return `
Bạn là Writer Agent viết bài theo đúng dàn bài người dùng cung cấp.

${brandPrompt}

## Thông tin bài viết
- Từ khóa chính: ${keyword}
- ${titleInstruction}
- Ngôn ngữ: ${language}
- Độ dài mục tiêu: ${targetLength} từ

## Dàn bài (PHẢI tuân thủ đúng thứ tự và heading)
${outlineText}

## ${writeMethodInstruction}

## ${toneInstruction}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong 1 thẻ <article>.
- Thẻ <h1> là tiêu đề bài. Mỗi [H2] → <h2>. Mỗi [H3] → <h3>.
- KHÔNG thêm heading nào ngoài dàn bài đã cho.
- Dưới mỗi heading: 1–3 đoạn <p>. Tổng từ bám sát ${targetLength} từ.
- Phân bổ từ đều cho các heading — không để heading nào < 50 từ.
- Từ khóa "${keyword}" xuất hiện tự nhiên — mật độ 1.0–1.5%.
- Không dùng các từ/cụm: ${forbidden}
- Không thêm CSS, JavaScript, markdown hay lời giải thích ngoài thẻ <article>.

## Chống dấu vết AI
- Nhịp câu đa dạng: xen câu ngắn 3–6 từ với câu trung bình 12–18 từ.
- Mở đầu đoạn luân phiên: số liệu → câu hỏi → nhận xét → ví dụ.
- Dùng số liệu thực (mm, kg, ngày, giá tiền) thay tính từ chung chung.
- CTA cuối bài: cụ thể, không dùng "Hy vọng bài viết hữu ích".

Chỉ trả HTML.
`.trim();
}
```

> **Update sau refactor:** `api/viet-theo-dan-bai/stream/route.ts` → import `buildDanBaiPrompt` từ `lib/viet-theo-dan-bai/writer.ts`, bỏ local function.

---

## 4. Parsing keyword line — helper

```typescript
// lib/viet-hang-loat-theo-dan-bai/types.ts — hoặc inline trong enqueue/route.ts

/**
 * Parse 1 dòng từ keywords textarea.
 * Format: "postTitle | keyword"  hoặc chỉ "keyword"
 *
 * "Giường Sắt 1m2 Giá Rẻ - Top 5 Mẫu Đẹp | giường sắt 1m2"
 *   → { postTitle: 'Giường Sắt 1m2 Giá Rẻ - Top 5 Mẫu Đẹp', keyword: 'giường sắt 1m2' }
 *
 * "giường sắt 1m2"
 *   → { postTitle: '', keyword: 'giường sắt 1m2' }
 */
export function parseKeywordLine(line: string): BulkDanBaiKeyword {
  const pipeIdx = line.indexOf('|');
  if (pipeIdx > 0) {
    return {
      postTitle: line.slice(0, pipeIdx).trim(),
      keyword:   line.slice(pipeIdx + 1).trim(),
    };
  }
  return { postTitle: '', keyword: line.trim() };
}
```

---

## 5. Processor — `lib/viet-hang-loat-theo-dan-bai/processor.ts`

```typescript
import type { BulkDanBaiConfig, BulkDanBaiStep, ProcessResult } from './types';
import type { ParsedHeading }                                   from '@/lib/viet-theo-dan-bai/types';
import { buildDanBaiPrompt }   from '@/lib/viet-theo-dan-bai/writer';
import { buildTinhGonModel }   from '@/lib/tinh-gon/model';
import { analyzeHumanness }    from '@/lib/tinh-gon/humanness';
import { buildForbiddenList }  from '@/lib/tinh-gon/forbidden';
import {
  sanitizeHtmlArticle,
  buildMetaDescription,
  countWords,
  computeKeywordDensity,
}                              from '@/lib/tinh-gon/text';
import { buildBrandPrompt }    from '@/app/api/pipeline/_context';
import { prisma }              from '@/lib/prisma';

export async function processDanBaiKeyword(
  keyword:        string,
  postTitle:      string,          // Rỗng nếu titleMode = 'ai_title'
  config:         BulkDanBaiConfig,
  parsedHeadings: ParsedHeading[], // Shared outline đã parse
  articleId:      string,
  onStep: (step: BulkDanBaiStep, detail: string, progress: number) => void,
): Promise<ProcessResult> {

  // ── Bước 1: Viết bài ───────────────────────────────────────────────────────

  onStep('writing', `Đang viết: ${keyword}`, 50);

  const model       = buildTinhGonModel(config.model);
  const brandPrompt = await buildBrandPrompt(config.brand.enabled ? config.brand : undefined);

  // Load forbidden words từ DB (cache nếu cần)
  const dbForbiddenConfig = await prisma.aIConfig.findFirst({
    where: { type: 'FORBIDDEN_WORDS', isActive: true },
    orderBy: { updatedAt: 'desc' },
  }).catch(() => null);
  const forbiddenList = buildForbiddenList(
    dbForbiddenConfig?.items ?? [],
    config.brand?.forbiddenExtra,
  );

  const prompt = buildDanBaiPrompt(
    keyword,
    postTitle,            // Rỗng → AI tự tạo H1
    config.language,
    config.targetLength,
    config.writeMethod,
    config.tone,
    parsedHeadings,
    brandPrompt,
    forbiddenList,
  );

  let rawHtml = '';
  try {
    const aiStream = await model.generateContentStream(prompt);
    for await (const chunk of aiStream) {
      const text = chunk.text();
      if (text) rawHtml += text;
    }
  } catch {
    // Fallback non-stream
    const result = await model.generateContent(prompt);
    rawHtml = result.response.text();
  }

  // ── Bước 2: Score + Save ──────────────────────────────────────────────────

  onStep('scoring', `Chấm điểm: ${keyword}`, 90);

  // ⚠️ sanitizeHtmlArticle arg2: postTitle nếu có, ngược lại dùng keyword
  const html       = sanitizeHtmlArticle(rawHtml, postTitle || keyword);
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title      = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
    : postTitle || keyword;

  const wordCount       = countWords(html);
  const keywordDensity  = computeKeywordDensity(html, keyword);
  const humanness       = analyzeHumanness(html, forbiddenList);
  const metaDescription = buildMetaDescription(title, keyword);

  await prisma.article.update({
    where: { id: articleId },
    data:  {
      selectedTitle:   title,
      htmlContent:     html,
      metaDescription,
      wordCount,
      status:          'WRITTEN',
      aiDecision:      humanness.decision,
      humannessScore:  humanness.score,
      seoChecks:       { keywordDensity } as never,
      scoreBreakdown:  { humanness, keywordDensity } as never,
      outline: {
        flow:           'viet_hang_loat_dan_bai',
        stage:          'generate',
        writeMethod:    config.writeMethod,
        tone:           config.tone,
        rawOutline:     config.outline,
        parsedHeadings,
        keyword,
        postTitle,
      },
    },
  });

  return { articleId, title, wordCount, humanness: humanness.score };
}
```

---

## 6. API: `/api/vhldb/enqueue/route.ts`

```typescript
import { NextRequest, NextResponse }  from 'next/server';
import { prisma }                     from '@/lib/prisma';
import { requireAuth }                from '@/lib/server-auth';
import { parseOutline, validateOutline } from '@/lib/viet-theo-dan-bai/outline-parser';
import { parseKeywordLine }           from '@/lib/viet-hang-loat-theo-dan-bai/types';
import type { BulkDanBaiConfig, VhldbEnqueueResponse } from '@/lib/viet-hang-loat-theo-dan-bai/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json() as { config: BulkDanBaiConfig };

    const { config } = body;

    // Validate outline
    const parsedHeadings = parseOutline(config.outline);
    const outlineError   = validateOutline(parsedHeadings);
    if (outlineError) {
      return NextResponse.json({ error: outlineError }, { status: 400 });
    }

    if (!config.keywords || config.keywords.length === 0) {
      return NextResponse.json({ error: 'Cần ít nhất 1 từ khóa' }, { status: 400 });
    }

    // Deduplicate
    let keywords = config.keywords.filter((k) => k.keyword.trim());
    let skippedCount = 0;

    if (config.duplicateMode === 'reject') {
      const seen = new Set<string>();
      keywords = keywords.filter((k) => {
        const lower = k.keyword.toLowerCase();
        if (seen.has(lower)) { skippedCount++; return false; }
        seen.add(lower);
        return true;
      });
    }

    if (keywords.length === 0) {
      return NextResponse.json({ error: 'Không còn từ khóa nào sau khi lọc trùng' }, { status: 400 });
    }

    // Tạo BulkJob
    const bulkJob = await prisma.bulkJob.create({
      data: {
        userId:     user.userId,
        jobType:    'dan-bai',
        status:     'PENDING',
        totalCount: keywords.length,
        doneCount:  0,
        configJson: {
          ...config,
          keywords,
          parsedHeadings, // Lưu parsed headings vào job để processor dùng lại
        },
      },
    });

    // Tạo Article placeholder
    const articles = await Promise.all(
      keywords.map((kw, i) =>
        prisma.article.create({
          data: {
            userId:       user.userId,
            bulkJobId:    bulkJob.id,
            bulkIndex:    i,
            status:       'PENDING',
            keyword:      kw.keyword,
            language:     config.language,
            contentType:  `viet_hang_loat_dan_bai:${config.writeMethod}`,
            targetLength: config.targetLength,
            aiProvider:   config.model,
            brandConfig:  config.brand as never ?? {},
            selectedTitle: config.titleMode === 'keyword_as_title'
              ? (kw.postTitle || kw.keyword)
              : '',
            htmlContent:  '',
            outline: {
              flow:           'viet_hang_loat_dan_bai',
              stage:          'pending',
              rawOutline:     config.outline,
              parsedHeadings,
              keyword:        kw.keyword,
              postTitle:      kw.postTitle,
            },
          },
        })
      )
    );

    return NextResponse.json({
      jobId:        bulkJob.id,
      articleCount: articles.length,
      skippedCount,
    } satisfies VhldbEnqueueResponse);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}
```

---

## 7. API: `/api/vhldb/process/[jobId]/route.ts`

```typescript
import { NextRequest }  from 'next/server';
import { prisma }       from '@/lib/prisma';
import { requireAuth }  from '@/lib/server-auth';
import { processDanBaiKeyword } from '@/lib/viet-hang-loat-theo-dan-bai/processor';
import type { BulkDanBaiConfig, VhldbSSEEvent } from '@/lib/viet-hang-loat-theo-dan-bai/types';
import type { ParsedHeading }                   from '@/lib/viet-theo-dan-bai/types';

export const runtime     = 'nodejs';
export const maxDuration = 300;

const DELAY_MS     = 1500;
const KEEPALIVE_MS = 30_000;

function encode(event: VhldbSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    const user = await requireAuth();
    const { jobId } = params;

    const job = await prisma.bulkJob.findFirst({
      where: { id: jobId, userId: user.userId },
    });

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
    }
    if (job.status === 'RUNNING') {
      return new Response(JSON.stringify({ error: 'Job đang chạy' }), { status: 409 });
    }

    const articles = await prisma.article.findMany({
      where:   { bulkJobId: jobId, status: 'PENDING' },
      orderBy: { bulkIndex: 'asc' },
    });

    if (articles.length === 0) {
      return new Response(JSON.stringify({ error: 'Không có bài cần xử lý' }), { status: 400 });
    }

    const config         = job.configJson as BulkDanBaiConfig;
    const parsedHeadings = (config.parsedHeadings ?? []) as ParsedHeading[];

    await prisma.bulkJob.update({ where: { id: jobId }, data: { status: 'RUNNING' } });

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: VhldbSSEEvent) =>
          controller.enqueue(new TextEncoder().encode(encode(event)));

        const keepalive = setInterval(() => {
          try { controller.enqueue(new TextEncoder().encode(': keepalive\n\n')); } catch {}
        }, KEEPALIVE_MS);

        let successCount = 0;
        let errorCount   = 0;
        const total      = articles.length;

        try {
          for (let i = 0; i < articles.length; i++) {
            const article = articles[i];

            // Kiểm tra pause/cancel
            const fresh = await prisma.bulkJob.findUnique({
              where:  { id: jobId },
              select: { status: true },
            });
            if (fresh?.status === 'PAUSED' || fresh?.status === 'CANCELLED') break;

            // Lấy postTitle từ outline field của article
            const outlineData = article.outline as any;
            const postTitle   = (outlineData?.postTitle as string) ?? '';

            send({
              type: 'item_start',
              articleId: article.id,
              keyword:   article.keyword,
              postTitle,
              index:     i,
              total,
            });

            await prisma.article.update({ where: { id: article.id }, data: { status: 'WRITING' } });

            try {
              const result = await processDanBaiKeyword(
                article.keyword,
                postTitle,
                config,
                parsedHeadings,
                article.id,
                (step, detail, progress) =>
                  send({ type: 'item_step', articleId: article.id, step, detail, progress }),
              );

              successCount++;
              send({
                type:      'item_done',
                articleId: result.articleId,
                keyword:   article.keyword,
                title:     result.title,
                wordCount: result.wordCount,
                humanness: result.humanness,
              });

              await prisma.bulkJob.update({
                where: { id: jobId },
                data:  { doneCount: { increment: 1 } },
              });

            } catch (err) {
              errorCount++;
              const message = err instanceof Error ? err.message : 'Lỗi không xác định';
              await prisma.article.update({ where: { id: article.id }, data: { status: 'ERROR' } });
              send({ type: 'item_error', articleId: article.id, keyword: article.keyword, error: message });
            }

            if (i < articles.length - 1) {
              await new Promise((r) => setTimeout(r, DELAY_MS));
            }
          }

          await prisma.bulkJob.update({ where: { id: jobId }, data: { status: 'DONE' } });
          send({ type: 'job_done', jobId, successCount, errorCount });

        } catch (err) {
          await prisma.bulkJob.update({ where: { id: jobId }, data: { status: 'ERROR' } }).catch(() => null);
          send({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi stream' });
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

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'Unauthorized' ? 401 : 500,
    });
  }
}
```

---

## 8. API: `/api/vhldb/jobs/[jobId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma }                    from '@/lib/prisma';
import { requireAuth }               from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    const user = await requireAuth();
    const job  = await prisma.bulkJob.findFirst({
      where: { id: params.jobId, userId: user.userId },
    });
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const articles = await prisma.article.findMany({
      where:   { bulkJobId: params.jobId },
      orderBy: { bulkIndex: 'asc' },
      select:  { id: true, keyword: true, status: true, selectedTitle: true, wordCount: true, humannessScore: true },
    });

    // Trả outline summary để hiện trên queue page
    const cfg = job.configJson as any;
    const outlineSummary = (cfg?.parsedHeadings ?? []).map((h: any) => ({
      level: h.level,
      text:  h.text,
    }));

    return NextResponse.json({ job, articles, outlineSummary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    const user = await requireAuth();
    const { action } = await request.json() as { action: 'pause' | 'resume' | 'cancel' };
    const statusMap   = { pause: 'PAUSED', resume: 'PENDING', cancel: 'CANCELLED' } as const;
    const newStatus   = statusMap[action];
    if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    const job = await prisma.bulkJob.findFirst({ where: { id: params.jobId, userId: user.userId } });
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.bulkJob.update({ where: { id: params.jobId }, data: { status: newStatus } });
    return NextResponse.json({ ok: true, status: newStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
```

---

## 9. Config Page — `/viet-hang-loat-theo-dan-bai/page.tsx`

### 9.1 Khối 1A — Keywords textarea

```tsx
{/* ── PHẦN 1A: Keywords ────────────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    Danh sách từ khóa
  </label>
  <p className="text-xs text-gray-400 mb-2">
    Mỗi dòng = 1 bài · Format: <code className="bg-gray-100 px-1 rounded">Tiêu đề bài | từ khóa</code>
    hoặc chỉ <code className="bg-gray-100 px-1 rounded">từ khóa</code> · Tối đa 50 dòng
  </p>
  <textarea
    value={keywordsText}
    onChange={(e) => setKeywordsText(e.target.value)}
    rows={8}
    placeholder={"Giường Sắt 1m2 Giá Rẻ - Top 5 Mẫu | giường sắt 1m2\nTủ Quần Áo 3 Cánh Gỗ | tủ quần áo 3 cánh\nKệ Sách Gỗ Tự Nhiên\n..."}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y font-mono"
  />
  <div className="flex items-center justify-between mt-1.5">
    <p className="text-xs text-gray-400">{parsedKeywords.length}/50 bài</p>
    {parsedKeywords.length > 50 && (
      <p className="text-xs text-red-500">Vượt giới hạn — chỉ 50 dòng đầu được xử lý</p>
    )}
  </div>

  {/* Duplicate mode */}
  <div className="mt-3 flex gap-4">
    {(['allow', 'reject'] as const).map((mode) => (
      <label key={mode} className="flex items-center gap-2 cursor-pointer">
        <input type="radio" checked={duplicateMode === mode} onChange={() => setDuplicateMode(mode)} />
        <span className="text-xs text-gray-600">
          {mode === 'allow' ? 'Cho phép từ khóa trùng' : 'Bỏ qua từ khóa trùng'}
        </span>
      </label>
    ))}
  </div>

  {/* Title mode */}
  <div className="mt-2 flex gap-4">
    {(['keyword_as_title', 'ai_title'] as const).map((mode) => (
      <label key={mode} className="flex items-center gap-2 cursor-pointer">
        <input type="radio" checked={titleMode === mode} onChange={() => setTitleMode(mode)} />
        <span className="text-xs text-gray-600">
          {mode === 'keyword_as_title'
            ? 'Dùng tiêu đề từ | format (hoặc từ khóa nếu không có)'
            : 'AI tự tạo tiêu đề phù hợp'}
        </span>
      </label>
    ))}
  </div>

  {/* Preview parsed keywords */}
  {parsedKeywords.length > 0 && parsedKeywords.length <= 5 && (
    <div className="mt-3 space-y-1">
      {parsedKeywords.map((kw, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-mono text-gray-400">{i + 1}.</span>
          {kw.postTitle && <span className="font-medium text-gray-700">{kw.postTitle}</span>}
          {kw.postTitle && <span className="text-gray-400">→</span>}
          <span className="text-blue-600">{kw.keyword}</span>
        </div>
      ))}
    </div>
  )}
</div>
```

### 9.2 Khối 1B — Shared outline (reuse UI từ viet-theo-dan-bai)

```tsx
{/* ── PHẦN 1B: Shared outline ──────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    Dàn bài chung <span className="text-red-500">*</span>
  </label>
  <p className="text-xs text-gray-400 mb-3">
    Outline này áp dụng cho <strong>tất cả bài</strong> trong batch.
    Mỗi bài có cùng cấu trúc H2/H3 nhưng nội dung focus vào keyword riêng.
  </p>

  {/* Tab chọn cách nhập outline — reuse từ viet-theo-dan-bai */}
  <div className="flex gap-1 mb-3 flex-wrap">
    {(['ai_suggest', 'from_url', 'manual'] as const).map((tab) => (
      <button
        key={tab}
        onClick={() => setOutlineTab(tab)}
        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
          outlineTab === tab ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        {{ ai_suggest: '✨ AI Suggest', from_url: '🔗 Từ URL', manual: '✏️ Thủ công' }[tab]}
      </button>
    ))}
  </div>

  {/* AI Suggest — gọi /api/viet-theo-dan-bai/suggest-outline (reuse) */}
  {outlineTab === 'ai_suggest' && (
    <div className="mb-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={suggestKeyword}
          onChange={(e) => setSuggestKeyword(e.target.value)}
          placeholder="Nhập topic để AI gợi ý outline (VD: nội thất phòng ngủ)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => void handleAiSuggest()}
          disabled={suggestLoading}
          className="px-4 py-2 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {suggestLoading ? '⟳' : '✨ Gợi ý'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Gợi ý dàn bài chung — bạn có thể chỉnh sửa bên dưới sau khi generate.
      </p>
    </div>
  )}

  {/* From URL — gọi /api/viet-theo-dan-bai/extract-outline (reuse) */}
  {outlineTab === 'from_url' && (
    <div className="mb-3 flex gap-2">
      <input
        type="url"
        value={extractUrl}
        onChange={(e) => setExtractUrl(e.target.value)}
        placeholder="https://example.com/bai-viet-mau"
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      <button
        onClick={() => void handleExtractOutline()}
        disabled={urlLoading}
        className="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {urlLoading ? '⟳' : 'GET'}
      </button>
    </div>
  )}

  {/* Outline textarea (luôn hiển thị) */}
  <textarea
    value={outline}
    onChange={(e) => handleOutlineChange(e.target.value)}
    rows={10}
    placeholder={`Nhập dàn bài chung:\n\n[h2] Heading mục 1\n[h3] Heading phụ 1.1\n[h2] Heading mục 2\n[h2] Heading mục 3\n\nMỗi keyword sẽ được viết theo cùng cấu trúc này.`}
    className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y ${
      outlineError ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`}
  />

  {/* Status bar */}
  <div className="flex justify-between mt-1.5">
    <span className="text-xs text-red-500">{outlineError}</span>
    <span className="text-xs text-gray-400">
      {parsedHeadings.length} heading
    </span>
  </div>

  {/* Preview headings */}
  {parsedHeadings.length > 0 && !outlineError && (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">Preview cấu trúc</p>
      <ul className="space-y-0.5">
        {parsedHeadings.slice(0, 10).map((h, i) => (
          <li key={i} className={`text-xs ${h.level === 'h3' ? 'pl-4 text-gray-500' : 'text-gray-700 font-medium'}`}>
            {h.level === 'h2' ? '▸' : '◦'} {h.text}
          </li>
        ))}
        {parsedHeadings.length > 10 && (
          <li className="text-xs text-gray-400 pl-2">...và {parsedHeadings.length - 10} heading nữa</li>
        )}
      </ul>
    </div>
  )}
</div>
```

### 9.3 Khối 5 — Writing method + DanBai Tone (override standard Khối 5)

```tsx
{/* ── KHỐI 5A: Writing method ─────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-3">Phương pháp viết</label>
  <div className="grid grid-cols-2 gap-3">
    {WRITE_METHODS.map((method) => (
      <button key={method.value} onClick={() => setWriteMethod(method.value)}
        className={`p-3 rounded-lg border-2 text-left transition-colors ${
          writeMethod === method.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
        }`}>
        <div className="text-sm font-semibold text-gray-800">{method.label}</div>
        <div className="text-xs text-gray-500 mt-1">{method.note}</div>
      </button>
    ))}
  </div>
</div>

{/* ── KHỐI 5B: Dan-bai Tone ───────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-3">Tone giọng văn</label>
  <div className="grid grid-cols-3 gap-2">
    {DAN_BAI_TONES.map((t) => (
      <button key={t.value} onClick={() => setTone(t.value)}
        className={`p-3 rounded-lg border-2 text-left transition-colors ${
          tone === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
        }`}>
        <div className="text-sm font-semibold text-gray-800">{t.label}</div>
        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{t.note}</div>
      </button>
    ))}
  </div>
</div>

{/* ── Target length ────────────────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-3">Độ dài bài (từ)</label>
  <div className="flex flex-wrap gap-2">
    {DAN_BAI_LENGTHS.map((len) => (
      <button key={len.value} onClick={() => setTargetLength(len.value)}
        className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
          targetLength === len.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-blue-300'
        }`}>
        {len.label}
        {len.badge && <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">{len.badge}</span>}
      </button>
    ))}
  </div>
</div>
```

### 9.4 handleSubmit()

```typescript
async function handleSubmit() {
  // Parse keywords (tối đa 50)
  const rawLines     = keywordsText.split('\n').map((l) => l.trim()).filter(Boolean);
  const keywords     = rawLines.slice(0, 50).map(parseKeywordLine);
  const parsedKwOnly = keywords.filter((k) => k.keyword);

  if (parsedKwOnly.length === 0) { setError('Cần ít nhất 1 từ khóa'); return; }
  if (parsedHeadings.length < 2) { setError('Dàn bài cần ít nhất 2 heading'); return; }
  if (outlineError) { setError(outlineError); return; }

  setLoading(true);
  setError('');

  const config: Omit<BulkDanBaiConfig, 'keywords'> & { keywords: typeof parsedKwOnly } = {
    keywords:       parsedKwOnly,
    duplicateMode,
    titleMode,
    outline,
    parsedHeadings,
    imageOption,
    language,
    writeMethod,
    tone,
    targetLength,
    model,
    brand:          brandInfo,
    seoOptions:     undefined,
  };

  try {
    const res  = await fetch('/api/vhldb/enqueue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ config }),
    });
    const data = await res.json() as { jobId?: string; articleCount?: number; skippedCount?: number; error?: string };
    if (!res.ok) throw new Error(data.error || 'Không thể tạo job');

    sessionStorage.setItem('vhldb_config', JSON.stringify(config));
    sessionStorage.setItem('vhldb_jobId',  data.jobId!);

    router.push('/viet-hang-loat-theo-dan-bai/queue');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Lỗi');
    setLoading(false);
  }
}
```

### 9.5 Submit button + validation guards

```tsx
<button
  onClick={() => void handleSubmit()}
  disabled={loading || parsedKwOnly.length === 0 || parsedHeadings.length < 2 || !!outlineError}
  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
>
  {loading
    ? 'Đang tạo job...'
    : `🚀 Viết ${Math.min(parsedKwOnly.length, 50)} bài theo dàn bài`}
</button>

{parsedHeadings.length < 2 && parsedKwOnly.length > 0 && (
  <p className="text-xs text-orange-600 text-center mt-2">
    ⚠️ Cần nhập dàn bài (ít nhất 2 heading) trước khi submit
  </p>
)}
```

---

## 10. Queue Page — `/viet-hang-loat-theo-dan-bai/queue/page.tsx`

> Copy pattern từ `/viet-hang-loat-tu-khoa/queue` — sửa các key sau:

| # | Điểm | Từ Khóa | **Theo Dàn Bài** |
|---|------|---------|------------------|
| 1 | sessionStorage key | `vhltk_jobId` | **`vhldb_jobId`** |
| 2 | Process API | `/api/vhltk/process/[jobId]` | **`/api/vhldb/process/[jobId]`** |
| 3 | Job status API | `/api/vhltk/jobs/[jobId]` | **`/api/vhldb/jobs/[jobId]`** |
| 4 | Article view link | `/viet-hang-loat-tu-khoa/[id]` | **`/viet-hang-loat-theo-dan-bai/[id]`** |
| 5 | Steps hiển thị | writing/scoring | **writing/scoring** |
| 6 | Item info | keyword + wordCount + humanness | **keyword + postTitle + wordCount + humanness** |
| 7 | Sidebar panel | Không | **Outline summary panel** |

### 10.1 Outline summary panel trên Queue page

```tsx
{/* Outline đã dùng — lấy từ GET /api/vhldb/jobs/[jobId] */}
{outlineSummary.length > 0 && (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
      Cấu trúc dàn bài ({outlineSummary.length} heading)
    </p>
    <ul className="space-y-0.5">
      {outlineSummary.map((h: any, i: number) => (
        <li key={i} className={`text-xs ${
          h.level === 'h3' ? 'pl-4 text-gray-400' : 'text-gray-600 font-medium'
        }`}>
          {h.level === 'h2' ? '▸' : '◦'} {h.text}
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## 11. Article View — `/viet-hang-loat-theo-dan-bai/[id]/page.tsx`

> Reuse generate page editor của `viet-theo-dan-bai/generate` — sửa các điểm:

| # | Điểm | viet-theo-dan-bai/generate | **viet-hang-loat-theo-dan-bai/[id]** |
|---|------|----------------------------|--------------------------------------|
| 1 | Data source | sessionStorage | **GET /api/articles/${id}** |
| 2 | Start generation | Auto on load | **Article đã WRITTEN — hiện ngay** |
| 3 | Outline preview | Từ sessionStorage | **Từ `article.outline.parsedHeadings`** |
| 4 | "Bài mới" | `/viet-theo-dan-bai` | **`/viet-hang-loat-theo-dan-bai`** |
| 5 | "Back" button | N/A | **Link về `/viet-hang-loat-theo-dan-bai/queue?jobId=...`** |

### 11.1 Load + hiện outline sidebar

```tsx
// Outline panel — sidebar tab
{sideTab === 'outline' && (
  <div className="flex-1 overflow-y-auto p-4">
    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
      Dàn bài đã dùng
    </p>
    <ul className="space-y-1">
      {(articleOutline?.parsedHeadings ?? []).map((h: any, i: number) => (
        <li key={i} className={`text-xs ${
          h.level === 'h3' ? 'pl-4 text-gray-400' : 'text-gray-700 font-medium'
        }`}>
          {h.level === 'h2' ? '▸' : '◦'} {h.text}
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## 12. sessionStorage Keys

| Key | Giá trị | Dùng ở |
|-----|---------|--------|
| `vhldb_config` | `BulkDanBaiConfig` | Config page → Queue page |
| `vhldb_jobId` | string | Config page → Queue page |

---

## 13. BulkJob Schema

```
BulkJob {
  jobType:    'dan-bai'
  configJson: {
    keywords:        BulkDanBaiKeyword[]   // { keyword, postTitle }
    duplicateMode:   'allow' | 'reject'
    titleMode:       'keyword_as_title' | 'ai_title'
    outline:         string                // Raw outline text
    parsedHeadings:  ParsedHeading[]       // Pre-parsed — processor dùng trực tiếp
    imageOption:     '0' | 'yandex' | 'ai' | 'shutterstock'
    language:        string
    writeMethod:     'balance' | 'detail'
    tone:            'seo_focus' | 'confident' | 'friendly'
    targetLength:    number
    model:           string
    brand:           {...}
    seoOptions?:     {...}
  }
}
```

---

## 14. Ngoại lệ khối — So với 8 khối chuẩn

| Khối | Thay đổi |
|------|---------|
| Khối 1 | **Mở rộng**: keywords textarea (pipe format) + Duplicate mode + Title mode + Shared outline block (AI Suggest / From URL / Manual) |
| Khối 4 | **Ẩn** — outline là Khối 1 (giống viet-theo-dan-bai single page) |
| Khối 5 | **Override**: thay WRITING_TONES chuẩn bằng Writing Method + DanBaiTone + Target Length (3 controls riêng) |

---

## 15. Sidebar + Homepage

```tsx
// Sidebar — group "Viết Hàng Loạt"
{ label: 'Theo Dàn Bài', href: '/viet-hang-loat-theo-dan-bai' }

// Homepage card
{
  title:       'Viết Hàng Loạt — Theo Dàn Bài',
  description: 'Cung cấp 1 outline template, AI viết hàng loạt bài cho nhiều keyword theo cùng cấu trúc',
  color:       'from-indigo-500 to-indigo-700',
  href:        '/viet-hang-loat-theo-dan-bai',
  icon:        '📋',
}
```

---

## 16. Thứ tự implement

| Bước | File | Phụ thuộc |
|------|------|-----------|
| 1 | **Refactor** `lib/viet-theo-dan-bai/writer.ts` | Extract `buildDanBaiPrompt()` |
| 2 | `lib/viet-hang-loat-theo-dan-bai/types.ts` | — |
| 3 | `lib/viet-hang-loat-theo-dan-bai/processor.ts` | Cần bước 1 |
| 4 | `api/vhldb/enqueue/route.ts` | — |
| 5 | `api/vhldb/process/[jobId]/route.ts` | Cần bước 3 |
| 6 | `api/vhldb/jobs/[jobId]/route.ts` | — |
| 7 | `app/viet-hang-loat-theo-dan-bai/page.tsx` | Config form |
| 8 | `app/viet-hang-loat-theo-dan-bai/queue/page.tsx` | Copy + sửa từ vhltk queue |
| 9 | `app/viet-hang-loat-theo-dan-bai/[id]/page.tsx` | Copy + sửa từ viet-theo-dan-bai generate |
| 10 | Sidebar + Homepage | — |

---

## 17. Lưu ý kỹ thuật quan trọng

### A. `parsedHeadings` lưu trong BulkJob — không parse lại
```typescript
// Enqueue: parse 1 lần → lưu vào configJson.parsedHeadings
// Processor: đọc configJson.parsedHeadings → truyền thẳng vào buildDanBaiPrompt()
// → Không cần parse lại mỗi bài → đảm bảo consistency
```

### B. Pipe format keyword line
```typescript
// "Tiêu đề bài | từ khóa" — pipe (|) là separator
// Edge case: keyword có pipe trong text → chỉ split lần đầu tiên:
//   line.indexOf('|') → slice, không dùng split('|')
// Edge case: tiêu đề rỗng (chỉ có |keyword) → parseKeywordLine trả postTitle=''
```

### C. sanitizeHtmlArticle arg2 — postTitle vs keyword
```typescript
// Giữ nguyên rule từ viet-theo-dan-bai:
// arg2 là postTitle (user nhập) nếu có, ngược lại dùng keyword
// → sanitizeHtmlArticle(rawHtml, postTitle || keyword)
// KHÔNG bao giờ hardcode keyword làm arg2 nếu postTitle có giá trị
```

### D. titleMode = 'ai_title' → postTitle rỗng → AI tự tạo H1
```typescript
// processDanBaiKeyword():
// - postTitle rỗng → prompt instruction: "Tự tạo tiêu đề phù hợp..."
// - AI sẽ tạo H1 → extract từ <h1> sau sanitize
// - title cuối cùng = extracted H1 từ HTML AI generate
```

### E. Outline AI Suggest trên config page
```typescript
// Reuse hoàn toàn:
// POST /api/viet-theo-dan-bai/suggest-outline — không tạo endpoint mới
// suggestKeyword có thể khác với keyword đầu tiên trong list
// Ý tưởng: AI suggest theo "topic chung" của toàn batch
// VD: keywords = [giường sắt 1m2, giường sắt 1m4, giường sắt 1m6]
//     suggestKeyword = "giường sắt" → outline template cho series
```

### F. maxDuration — tương tự các bulk variant khác
```typescript
// 50 bài × 40s = 2000s → vượt maxDuration = 300
// → Queue page re-call process khi còn pending articles
//   (pattern giống viet-hang-loat-thong-minh)
// → Mỗi lần call xử lý ~7 bài (300/40s)
```

### G. DAN_BAI_LENGTHS trong bulk config
```typescript
// targetLength áp dụng cho TẤT CẢ bài trong batch
// Không có per-keyword targetLength — quá phức tạp
// User chọn 1 length chung cho toàn batch
```
