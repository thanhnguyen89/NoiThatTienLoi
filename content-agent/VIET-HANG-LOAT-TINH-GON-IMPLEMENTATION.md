# VIET-HANG-LOAT-TINH-GON-IMPLEMENTATION.md
## Hướng dẫn code "Viết Hàng Loạt — Viết Tinh Gọn"

> Phân tích từ: https://aiktp.com/vi/bulk-write-simple  
> Base page: `/viet-tinh-gon` (đã code — đây là bản mở rộng bulk/queue)  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · PostgreSQL  
> Pattern: **P3 — Queue Bulk**

---

## 0. Nhóm & Pattern

| Nhóm | Page | Config | Queue | Article | Pattern | Spec |
|------|------|--------|-------|---------|---------|------|
| A | Viết Hàng Loạt — Tinh Gọn | `/viet-hang-loat-tinh-gon` | `/viet-hang-loat-tinh-gon/queue` | `/viet-hang-loat-tinh-gon/[id]` | **P3** | file này |

---

## ⚠️ Điểm khác biệt so với 2 Bulk variant còn lại

| # | Điểm | Smart AI | Từ Khóa | **Tinh Gọn** |
|---|------|----------|---------|--------------|
| 1 | Base logic | viet-bai-thong-minh | viet-theo-tu-khoa | **viet-tinh-gon** |
| 2 | Độ dài bài | 2500–4000 từ | 1500–3000 từ | **800–1500 từ** |
| 3 | Bước/bài | 5 bước | 2 bước | **3 bước** |
| 4 | Style selector | Content Type (7 loại) | KEYWORD_TONES (16) | **OUTLINE_TYPES (11 loại)** |
| 5 | Outline | AI auto (có semantic) | Optional (no/ai) | **Luôn AI, viết theo section** |
| 6 | Secondary KW | Topical map | Comma on same line | **Không có trong bulk** |
| 7 | Viết bài | 1 lần gọi AI | 1 lần gọi AI | **Viết từng section, ghép lại** |
| 8 | jobType BulkJob | `'smart'` | `'tu-khoa'` | **`'tinh-gon'`** |

> **Đặc điểm riêng của Tinh Gọn Bulk:**  
> Mỗi bài được viết theo từng H2 (giống `viet-tinh-gon/stream`), cho phép AI tập trung  
> vào từng section ngắn → chất lượng cao hơn so với viết 1 lần toàn bài.  
> Đổi lại: chậm hơn 1 chút do N+1 API calls (1 outline + N section calls).

---

## 1. Kiến trúc tổng quan

### 1.1 Flow hoạt động

```
User điền config:
  - Keywords textarea (1 dòng = 1 bài, tối đa 50)
  - Duplicate mode + Title mode
  - Outline Type (11 loại — chọn 1 cho cả batch)
  - Target Length (800/1000/1200/1500 từ)
  - 8 khối config chuẩn còn lại
  ↓
Submit → POST /api/vhltg/enqueue
  - Tạo BulkJob (jobType='tinh-gon') + N Article records (status=PENDING)
  - Trả về { jobId }
  - sessionStorage.setItem('vhltg_jobId', jobId)
  → Navigate sang /viet-hang-loat-tinh-gon/queue
  ↓
Queue page:
  POST /api/vhltg/process/[jobId]  ← user bấm "Bắt đầu"
  SSE stream — xử lý từng keyword tuần tự:
    ① AI tạo outline JSON (1 API call, ~5–10s)
    ② AI viết từng section (N calls, ~5–8s/section)
    ③ Ghép HTML + apply SEO + Humanness score + save DB
    Delay 1.5s → keyword tiếp theo
  Kết thúc: job_done event
  ↓
User click bài đã xong → /viet-hang-loat-tinh-gon/[id]
  Reuse generate page editor của viet-tinh-gon
```

### 1.2 Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-hang-loat-tinh-gon/
│   │   ├── page.tsx                          ← Config page
│   │   ├── queue/
│   │   │   └── page.tsx                      ← Queue management
│   │   └── [id]/
│   │       └── page.tsx                      ← Article view
│   └── api/
│       └── vhltg/
│           ├── enqueue/
│           │   └── route.ts                  ← POST: tạo BulkJob + N Articles
│           ├── process/
│           │   └── [jobId]/
│           │       └── route.ts              ← POST: SSE xử lý tuần tự
│           └── jobs/
│               └── [jobId]/
│                   └── route.ts              ← GET + PATCH
└── lib/
    └── viet-hang-loat-tinh-gon/
        ├── types.ts
        └── processor.ts
```

### 1.3 File tái sử dụng — KHÔNG tạo mới

| File | Từ đâu | Dùng gì |
|------|--------|---------|
| `app/api/tinh-gon/outline/route.ts` | viet-tinh-gon | Extract `buildOutlinePrompt()` ra lib để reuse |
| `app/api/tinh-gon/stream/route.ts` | viet-tinh-gon | Extract `writeSectionHtml()` + `scoreHumanness()` ra lib |
| `app/api/tinh-gon/outline/_outline-prompts.ts` | viet-tinh-gon | `OUTLINE_PROMPTS` (11 loại) |
| `lib/tinh-gon/humanness.ts` (nếu đã extract) | tinh-gon | `scoreHumanness()` |
| `lib/tinh-gon/text.ts` | tinh-gon | `sanitizeHtmlArticle()`, `buildMetaDescription()` |
| `lib/shared/options.ts` | shared | `SUPPORTED_LANGUAGES`, `IMAGE_OPTIONS` |
| `app/components/ModelPicker.tsx` | shared | ModelPicker |
| `app/components/BrandSection.tsx` | shared | BrandSection |
| `app/components/SeoAdvancedBlock.tsx` | shared | SeoAdvancedBlock |
| `app/viet-tinh-gon/page.tsx` | viet-tinh-gon | `OUTLINE_TYPES` constant (import hoặc extract) |

> ⚠️ **REFACTOR TRƯỚC KHI CODE:**  
> Giống như viet-hang-loat-tu-khoa cần extract writing logic, page này cần:  
> 1. Extract `generateTinhGonOutline(config)` từ `api/tinh-gon/outline/route.ts` → `lib/tinh-gon/outline.ts`  
> 2. Extract `writeSectionHtml(section, config, brandContext)` từ `api/tinh-gon/stream/route.ts` → `lib/tinh-gon/writer.ts`  
> 3. Extract `scoreHumanness(html)` → `lib/tinh-gon/humanness.ts` (nếu chưa)  
> 4. Extract `OUTLINE_TYPES` → `lib/tinh-gon/options.ts` (nếu chưa)

---

## 2. Types

```typescript
// web/lib/viet-hang-loat-tinh-gon/types.ts

import type { ImageOption } from '@/lib/shared/options';

export type TinhGonOutlineType =
  | 'review_product'
  | 'how_to_choose'
  | 'compare'
  | 'faq'
  | 'listicle'
  | 'problem_solution'
  | 'step_guide'
  | 'story_brand'
  | 'use_case'
  | 'buying_guide';

export type TitleMode =
  | 'keyword_as_title'  // Keyword = tiêu đề (mặc định)
  | 'ai_title';         // AI tạo tiêu đề sáng tạo

export type DuplicateMode = 'allow' | 'reject';

export interface BulkTinhGonConfig {
  // Khối 1 — Bulk-specific
  keywords: string[];
  duplicateMode: DuplicateMode;
  titleMode: TitleMode;
  outlineType: TinhGonOutlineType;  // áp dụng cho toàn bộ batch

  // Khối 2 — Image
  imageOption: ImageOption;
  imageCount: number;               // 1–10

  // Khối 3 — Language
  language: string;

  // Khối 4 — Target Length (override: không có outline mode)
  targetLength: 800 | 1000 | 1200 | 1500;

  // Khối 5 — ẨN (outline type đã cover ở Khối 1)

  // Khối 6 — Model
  model: string;

  // Khối 7 — Brand
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

// SSE Events từ /api/vhltg/process/[jobId]
export type VhltgSSEEvent =
  | { type: 'item_start';    index: number; keyword: string }
  | { type: 'item_step';     index: number; step: 'outline' | 'writing' | 'scoring'; detail?: string; progress: number }
  | { type: 'item_done';     index: number; articleId: string; title: string; wordCount: number; humanness: number }
  | { type: 'item_error';    index: number; message: string }
  | { type: 'job_done';      successCount: number; errorCount: number }
  | { type: 'error';         message: string };

// sessionStorage keys
export const LS_CONFIG_KEY = 'vhltg_config';
export const LS_JOB_ID_KEY = 'vhltg_jobId';
```

---

## 3. Prisma — Reuse BulkJob

Không tạo model mới. Dùng `BulkJob.jobType = 'tinh-gon'`.

> Xem `VIET-HANG-LOAT-THONG-MINH-IMPLEMENTATION.md` Section 3 để biết schema đầy đủ.  
> Nếu `BulkJob` chưa migrate → chạy `npx prisma migrate dev --name add-bulk-job` trước.

---

## 4. Processor Module

```typescript
// web/lib/viet-hang-loat-tinh-gon/processor.ts
// Xử lý 1 keyword → 1 Article hoàn chỉnh (3 bước)

import { generateTinhGonOutline } from '@/lib/tinh-gon/outline';
import { writeSectionHtml }        from '@/lib/tinh-gon/writer';
import { scoreHumanness }          from '@/lib/tinh-gon/humanness';
import { sanitizeHtmlArticle, buildMetaDescription } from '@/lib/tinh-gon/text';
import { computeSeoChecks }        from '@/lib/shared/seo-checks';
import { buildBrandPrompt }        from '@/app/api/tinh-gon/pipeline/_context';
import { prisma }                  from '@/lib/prisma';
import type { BulkTinhGonConfig }  from './types';

export interface ProcessResult {
  articleId: string;
  title: string;
  wordCount: number;
  humanness: number;
}

export async function processTinhGonKeyword(
  keyword: string,
  config: BulkTinhGonConfig,
  articleId: string,
  onStep: (step: 'outline' | 'writing' | 'scoring', detail: string, progress: number) => void,
): Promise<ProcessResult> {

  const brandContext = await buildBrandPrompt();

  // ── Bước 1: Tạo outline ──────────────────────────────────────────────────────
  onStep('outline', 'AI đang tạo dàn ý...', 10);

  const singleConfig = {
    keyword,
    outlineType:      config.outlineType,
    targetLength:     config.targetLength,
    secondaryKeywords: [],
    notes:            '',
    language:         config.language,
    model:            config.model,
  };

  const outline = await generateTinhGonOutline(singleConfig);

  // Quyết định tiêu đề
  const title = config.titleMode === 'keyword_as_title' ? keyword : outline.title;

  onStep('outline', `Dàn ý xong: ${outline.sections.length} mục`, 20);

  // ── Bước 2: Viết từng section ─────────────────────────────────────────────────
  let fullHtml = `<h1>${title}</h1>\n\n`;
  const sectionCount = outline.sections.length;

  for (let i = 0; i < sectionCount; i++) {
    const section = outline.sections[i];
    const sectionProgress = 20 + Math.round(((i + 1) / sectionCount) * 55);
    onStep('writing', `Viết: ${section.heading}`, sectionProgress);

    const sectionHtml = await writeSectionHtml(section, singleConfig, brandContext);
    fullHtml += sectionHtml + '\n\n';
  }

  // ── Bước 3: Post-process + score ──────────────────────────────────────────────
  onStep('scoring', 'Đang xử lý & chấm điểm...', 80);

  const cleanHtml        = sanitizeHtmlArticle(fullHtml, keyword);
  const finalHtml        = applySeoOptions(cleanHtml, config, keyword);
  const { score, decision } = scoreHumanness(finalHtml);
  const wordCount        = finalHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const metaDescription  = buildMetaDescription(finalHtml, keyword);
  const seoChecks        = computeSeoChecks(finalHtml, keyword);
  const seoScore         = seoChecks.filter((c: any) => c.passed).length;

  await prisma.article.update({
    where: { id: articleId },
    data: {
      title,
      content:           finalHtml,
      status:            'done',
      humannessScore:    score,
      humannessDecision: decision,
      metaDescription,
      wordCount,
      seoScore,
    },
  });

  onStep('scoring', 'Xong!', 100);

  return { articleId, title, wordCount, humanness: score };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applySeoOptions(html: string, config: BulkTinhGonConfig, keyword: string): string {
  let result = html;

  if (config.boldMainKeyword && keyword) {
    const kw = escapeRegex(keyword);
    result = result.replace(new RegExp(`(${kw})`, 'i'), '<strong>$1</strong>');
  }

  if (config.seoMainLink && keyword) {
    const kw = escapeRegex(keyword);
    result = result
      .replace(new RegExp(`<strong>(${kw})</strong>`, 'i'),
        `<a href="${config.seoMainLink}" title="${keyword}"><strong>$1</strong></a>`)
      .replace(new RegExp(`(?<!href=")(?<![>])(${kw})`, 'i'),
        `<a href="${config.seoMainLink}" title="${keyword}">$1</a>`);
  }

  if (config.seoKeywordLinks?.length) {
    for (const { keyword: kw, url } of config.seoKeywordLinks) {
      if (!kw || !url) continue;
      result = result.replace(new RegExp(`(${escapeRegex(kw)})`, 'i'),
        `<a href="${url}" title="${kw}">$1</a>`);
    }
  }

  if (config.footerContent) {
    result += `\n<div class="article-footer">${config.footerContent}</div>`;
  }

  return result;
}
```

---

## 5. Refactor cần làm trước (quan trọng)

Hiện tại logic nằm rải rác trong API routes. Cần extract ra lib trước khi implement bulk:

### 5.1 `lib/tinh-gon/outline.ts` — Extract từ `api/tinh-gon/outline/route.ts`

```typescript
// web/lib/tinh-gon/outline.ts

import { buildGeminiModel } from '@/app/api/tinh-gon/pipeline/_gemini';
import { buildBrandPrompt } from '@/app/api/tinh-gon/pipeline/_context';
import { OUTLINE_PROMPTS }  from '@/app/api/tinh-gon/outline/_outline-prompts';
import { v4 as uuidv4 }     from 'uuid';

export interface OutlineSection {
  id: string;
  heading: string;
  description: string;
  targetWords: number;
}

export interface OutlineData {
  title: string;
  metaDescription: string;
  sections: OutlineSection[];
  estimatedWordCount: number;
  keywordDensityTarget: number;
}

export async function generateTinhGonOutline(config: {
  keyword: string;
  outlineType: string;
  targetLength: number;
  secondaryKeywords: string[];
  notes?: string;
  language: string;
  model: string;
}): Promise<OutlineData> {
  const brandContext = await buildBrandPrompt();
  const outlinePromptTemplate = OUTLINE_PROMPTS[config.outlineType] || OUTLINE_PROMPTS['review_product'];
  const model = buildGeminiModel(config.model || 'gemini-flash');

  const prompt = `
${brandContext}

---
## YÊU CẦU TẠO OUTLINE

Từ khóa chính: "${config.keyword}"
${config.secondaryKeywords?.length ? `Từ khóa phụ: ${config.secondaryKeywords.join(', ')}` : ''}
${config.notes ? `Ghi chú: ${config.notes}` : ''}
Độ dài mục tiêu: ~${config.targetLength} từ
Ngôn ngữ: ${config.language === 'Vietnamese' ? 'Tiếng Việt' : 'English'}

${outlinePromptTemplate}

---
## OUTPUT FORMAT (JSON nghiêm ngặt)

{
  "title": "Tiêu đề bài viết hấp dẫn, có từ khóa chính",
  "metaDescription": "Mô tả SEO 150-160 ký tự",
  "sections": [
    {
      "id": "uuid",
      "heading": "Tiêu đề H2",
      "description": "Mô tả ngắn nội dung section (2-3 câu)",
      "targetWords": 150
    }
  ],
  "estimatedWordCount": ${config.targetLength},
  "keywordDensityTarget": 1.2
}

Số sections: ${config.targetLength <= 800 ? '4–5' : config.targetLength <= 1000 ? '5–6' : '6–7'} H2.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse outline JSON');

  const data: OutlineData = JSON.parse(match[0]);
  data.sections = data.sections.map((s: any) => ({ ...s, id: s.id || uuidv4() }));
  return data;
}
```

### 5.2 `lib/tinh-gon/writer.ts` — Extract từ `api/tinh-gon/stream/route.ts`

```typescript
// web/lib/tinh-gon/writer.ts

import { buildGeminiModel }   from '@/app/api/tinh-gon/pipeline/_gemini';
import { buildForbiddenList } from '@/app/api/tinh-gon/pipeline/_context';
import type { OutlineSection } from './outline';

export async function writeSectionHtml(
  section: OutlineSection,
  config: { keyword: string; secondaryKeywords?: string[]; model: string; language?: string },
  brandContext: string,
): Promise<string> {
  const forbiddenWords = buildForbiddenList();
  const model = buildGeminiModel(config.model || 'gemini-flash');

  const prompt = `
${brandContext}

---
## NHIỆM VỤ

Viết nội dung section sau trong bài viết về "${config.keyword}":

**H2: ${section.heading}**
Mô tả: ${section.description}
Số từ mục tiêu: ~${section.targetWords} từ
${config.secondaryKeywords?.length ? `Từ khóa phụ: ${config.secondaryKeywords.join(', ')}` : ''}

---
## QUY TẮC

- Câu ngắn xen câu dài, nhịp 7–18 từ
- Số liệu cụ thể (mm, kg, giá, ngày) thay tính từ chung chung
- KHÔNG dùng từ cấm: ${forbiddenWords.slice(0, 15).join(', ')}...
- Xưng "Minh Quân"/"chúng tôi", gọi khách "anh/chị"/"bạn"

---
## OUTPUT

Chỉ HTML thuần bắt đầu từ <h2>:

<h2>${section.heading}</h2>
<p>...</p>
`;

  // Bulk context: dùng generateContent (không stream) — sequential, không block
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
```

### 5.3 `lib/tinh-gon/humanness.ts` — Extract từ `api/tinh-gon/stream/route.ts`

```typescript
// web/lib/tinh-gon/humanness.ts

import { buildForbiddenList } from '@/app/api/tinh-gon/pipeline/_context';

export function scoreHumanness(html: string): {
  score: number;
  decision: 'PUBLISH' | 'REVIEW' | 'REWRITE';
} {
  const text = html.replace(/<[^>]+>/g, ' ');
  const forbiddenWords = buildForbiddenList();
  let score = 100;

  for (const fw of forbiddenWords) {
    const count = (text.match(new RegExp(fw, 'gi')) || []).length;
    score -= count * 3;
  }

  const aiPatterns = [
    /không chỉ.*mà còn/gi,
    /quan trọng là/gi,
    /tóm lại/gi,
    /như đã đề cập/gi,
  ];
  for (const p of aiPatterns) {
    score -= (text.match(p) || []).length * 5;
  }

  const numbersCount = (text.match(/\d+(\.\d+)?(mm|cm|m|kg|vnđ|đồng|h|ngày|tháng|%)/gi) || []).length;
  score += Math.min(numbersCount * 2, 15);
  score = Math.max(0, Math.min(100, score));

  const decision = score >= 76 ? 'PUBLISH' : score >= 60 ? 'REVIEW' : 'REWRITE';
  return { score, decision };
}
```

---

## 6. API Routes

### `POST /api/vhltg/enqueue`

```typescript
// web/app/api/vhltg/enqueue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma }                    from '@/lib/prisma';
import type { BulkTinhGonConfig }    from '@/lib/viet-hang-loat-tinh-gon/types';

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
    const body = await req.json();
    const config: BulkTinhGonConfig = body;

    if (!config.keywords?.length) {
      return NextResponse.json({ success: false, error: 'Chưa nhập từ khóa' }, { status: 400 });
    }

    const keywords = parseKeywords(config.keywords, config.duplicateMode);
    if (keywords.length > 50) {
      return NextResponse.json({ success: false, error: 'Tối đa 50 từ khóa' }, { status: 400 });
    }

    const job = await prisma.bulkJob.create({
      data: {
        jobType:    'tinh-gon',
        config:     config as any,
        keywords,
        totalCount: keywords.length,
        status:     'PENDING',
      },
    });

    await prisma.article.createMany({
      data: keywords.map((keyword, index) => ({
        keyword,
        language:  config.language,
        status:    'pending',
        source:    'viet-hang-loat-tinh-gon',
        bulkJobId: job.id,
        bulkIndex: index,
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

### `POST /api/vhltg/process/[jobId]` — SSE

```typescript
// web/app/api/vhltg/process/[jobId]/route.ts

import { NextRequest }               from 'next/server';
import { prisma }                    from '@/lib/prisma';
import { processTinhGonKeyword }     from '@/lib/viet-hang-loat-tinh-gon/processor';
import type { BulkTinhGonConfig }    from '@/lib/viet-hang-loat-tinh-gon/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      // Keepalive mỗi 30s tránh timeout proxy
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

        const config = job.config as BulkTinhGonConfig;

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
            const result = await processTinhGonKeyword(
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
              data:  { processedCount: { increment: 1 }, errorCount: { increment: 1 } },
            });
            send({ type: 'item_error', index, message: String(err) });
          }

          await new Promise(r => setTimeout(r, 1500));
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

### `GET & PATCH /api/vhltg/jobs/[jobId]`

Pattern giống hệt `vhltk` — chỉ đổi prefix:

```typescript
// web/app/api/vhltg/jobs/[jobId]/route.ts
// GET: load job + articles (select id, keyword, status, title, wordCount, humannessScore, bulkIndex)
// PATCH: { action: 'pause'|'resume'|'cancel' } → update BulkJobStatus
// Xem VIET-HANG-LOAT-TU-KHOA-IMPLEMENTATION.md Section 5 để lấy code mẫu
```

---

## 7. Config Page — `app/viet-hang-loat-tinh-gon/page.tsx`

### 8 Khối Config

```
Khối 1 — Keywords + Outline Type (Bulk-specific)
  ├── Textarea: danh sách từ khóa (1 dòng = 1 bài)
  │     Count badge: "X / 50 từ khóa" — đỏ khi > 50
  ├── Duplicate mode (allow / reject)
  ├── Title mode: ● Từ khóa là tiêu đề  ○ AI tạo tiêu đề
  └── Loại bài viết (OUTLINE_TYPES — 11 cards, grid 4-5 cột)
        ↳ Mô tả loại đang chọn (bg-blue-50) — giống viet-tinh-gon/page.tsx
Khối 2 — Image Option  (IMAGE_OPTIONS 4 card + imageCount 1–10 khi ≠ none)
Khối 3 — Language      (SUPPORTED_LANGUAGES dropdown)
Khối 4 — Target Length (4 buttons: 800 / 1000 / 1200 / 1500 từ)
           ← Override: không có 3-mode outline — AI luôn tạo outline tự động
Khối 5 — ẨN           (outline type ở Khối 1 đã cover style/tone)
Khối 6 — AI Model      (<ModelPicker />)
Khối 7 — Brand Config  (<BrandSection lsKey="vhltg_brand_info" />)
Khối 8 — SEO Advanced  (<SeoAdvancedBlock /> — collapsed)
─────────────────────────────────────────────────
[Thêm vào Hàng Đợi]  button
```

### Key State Variables

```typescript
// Khối 1
const [keywordsRaw, setKeywordsRaw] = useState('');
const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('reject');
const [titleMode, setTitleMode]         = useState<TitleMode>('keyword_as_title');
const [outlineType, setOutlineType]     = useState<TinhGonOutlineType>('review_product');

// Khối 2
const [imageOption, setImageOption] = useState<ImageOption>('none');
const [imageCount, setImageCount]   = useState(2);

// Khối 3
const [language, setLanguage] = useState('Vietnamese');

// Khối 4 — Target Length
const [targetLength, setTargetLength] = useState<800 | 1000 | 1200 | 1500>(1000);

// Khối 6
const [model, setModel] = useState('');

// Derived
const keywordLines = keywordsRaw.split('\n').map(k => k.trim()).filter(Boolean);
const keywordCount = duplicateMode === 'reject'
  ? new Set(keywordLines.map(k => k.toLowerCase())).size
  : keywordLines.length;
```

### Outline Type Grid

Reuse `OUTLINE_TYPES` constant từ `lib/tinh-gon/options.ts`:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Loại bài viết <span className="text-gray-400 font-normal">(áp dụng cho tất cả)</span>
  </label>
  <div className="grid grid-cols-5 gap-2">
    {OUTLINE_TYPES.map(t => (
      <button
        key={t.value}
        onClick={() => setOutlineType(t.value as TinhGonOutlineType)}
        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all text-center ${
          outlineType === t.value
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-200 hover:border-blue-300 text-gray-600'
        }`}
      >
        <span className="text-xl">{t.icon}</span>
        <span className="text-xs font-semibold leading-tight">{t.label}</span>
      </button>
    ))}
  </div>
  {/* Mô tả loại đang chọn */}
  {OUTLINE_TYPES.find(t => t.value === outlineType) && (
    <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg flex gap-2">
      <span>{OUTLINE_TYPES.find(t => t.value === outlineType)!.icon}</span>
      <p className="text-xs text-blue-700">
        {OUTLINE_TYPES.find(t => t.value === outlineType)!.note}
      </p>
    </div>
  )}
</div>
```

### Target Length Buttons (Khối 4)

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Độ dài bài viết</label>
  <div className="grid grid-cols-4 gap-2">
    {[
      { value: 800,  label: 'Tinh gọn',  sub: '~800 từ' },
      { value: 1000, label: 'Chuẩn',     sub: '~1.000 từ' },
      { value: 1200, label: 'Đủ đầy',    sub: '~1.200 từ' },
      { value: 1500, label: 'Chi tiết',  sub: '~1.500 từ' },
    ].map(({ value, label, sub }) => (
      <button
        key={value}
        onClick={() => setTargetLength(value as any)}
        className={`py-3 rounded-xl border-2 text-center transition-all ${
          targetLength === value
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-200 hover:border-blue-300 text-gray-600'
        }`}
      >
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-gray-400">{sub}</div>
      </button>
    ))}
  </div>
</div>
```

### Submit Handler

```typescript
async function handleSubmit() {
  if (keywordCount === 0) { alert('Nhập ít nhất 1 từ khóa'); return; }
  if (keywordCount > 50)  { alert('Tối đa 50 từ khóa'); return; }
  if (!model)             { alert('Chọn model AI'); return; }

  setIsSubmitting(true);
  const keywords = keywordsRaw.split('\n').map(l => l.trim()).filter(Boolean);

  const config: BulkTinhGonConfig = {
    keywords,
    duplicateMode,
    titleMode,
    outlineType,
    imageOption,
    imageCount,
    language,
    targetLength,
    model,
    ...brandValues,
    ...seoAdvancedValues,
    boldMainKeyword,
    boldHeadings,
  };

  try {
    const res = await fetch('/api/vhltg/enqueue', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(config),
    });
    const json = await res.json();
    if (json.success) {
      sessionStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config));
      sessionStorage.setItem(LS_JOB_ID_KEY, json.jobId);
      router.push('/viet-hang-loat-tinh-gon/queue');
    } else {
      alert('Lỗi: ' + json.error);
    }
  } finally {
    setIsSubmitting(false);
  }
}
```

---

## 8. Queue Page — `app/viet-hang-loat-tinh-gon/queue/page.tsx`

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Viết Hàng Loạt — Tinh Gọn                                       │
│ X bài · Outline: [Loại] · ~Y từ/bài · Model · [▶ Bắt đầu]      │
├──────────────────────────────────────────────────────────────────┤
│ Progress: ██████░░░░ 30/50 (60%)                                 │
│ ✅ 28 thành công  ❌ 2 lỗi  ⏳ 20 chờ                           │
├──────────────────────────────────────────────────────────────────┤
│ [⏸ Tạm dừng] / [▶ Tiếp tục]  [✕ Hủy]                          │
├──────────────────────────────────────────────────────────────────┤
│ #1 giường sắt 1m2    [🔍 Tạo dàn ý... 15%] ░░░░░░░░░           │
│ #2 tủ quần áo 3 cánh [✅ XONG · 947 từ · H:84]  [Xem bài →]   │
│ #3 bàn làm việc gỗ   [⏳ Chờ]                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Step Labels cho UI

| `step` SSE | Hiển thị khi | Label |
|------------|-------------|-------|
| `outline` | AI tạo dàn ý | `🔍 Tạo dàn ý... XX%` |
| `writing` | AI viết từng H2 | `✍️ Viết: [section heading]... XX%` |
| `scoring` | Chấm điểm + lưu | `📊 Đang xử lý...` |

> Dùng `event.detail` để hiện tên section đang viết trong real-time.  
> VD: `✍️ Viết: Thông số kỹ thuật... 45%`

### SSE handler — pattern giống viet-hang-loat-tu-khoa/queue

```typescript
// Xem VIET-HANG-LOAT-TU-KHOA-IMPLEMENTATION.md Section 7 để lấy full code.
// Chỉ thay:
// - Type VhltSSEEvent → VhltgSSEEvent
// - sessionStorage key 'vhltk_jobId' → 'vhltg_jobId'
// - API endpoint '/api/vhltk/...' → '/api/vhltg/...'
// - router.push path '/viet-hang-loat-tinh-gon/[id]'
```

---

## 9. Article View — `app/viet-hang-loat-tinh-gon/[id]/page.tsx`

Reuse generate page editor của `viet-tinh-gon/generate`:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
// Dùng lại ArticleEditor, HumannessPanel, KeywordDensityBar, InternalLinkSuggest
// từ viet-tinh-gon/generate hoặc shared components

export default function ArticleViewPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/articles/${id}`).then(r => r.json()).then(setArticle);
  }, [id]);

  if (!article) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;

  // Layout 2 cột giống viet-tinh-gon/generate — không có streaming
  // Editor load article.content trực tiếp (bài đã viết xong)
  // Right panel: HumannessPanel + KeywordDensityBar + InternalLinkSuggest + Publish tab
}
```

---

## 10. sessionStorage Keys

| Key | Nội dung | Set khi | Clear khi |
|-----|---------|---------|-----------|
| `vhltg_config` | `BulkTinhGonConfig` JSON | Submit config | Submit mới |
| `vhltg_jobId` | job ID | Enqueue OK | Quay lại config |
| `vhltg_brand_info` | Brand data | BrandSection | BrandSection clear |

---

## 11. So sánh 3 Bulk Variants — Tóm tắt cho Dev

| | Smart AI | Từ Khóa | **Tinh Gọn** |
|---|----------|---------|--------------|
| Route | `/viet-hang-loat` | `/viet-hang-loat-tu-khoa` | **`/viet-hang-loat-tinh-gon`** |
| sessionStorage prefix | `vhl_` | `vhltk_` | **`vhltg_`** |
| API prefix | `/api/vhl/` | `/api/vhltk/` | **`/api/vhltg/`** |
| BulkJob.jobType | `'smart'` | `'tu-khoa'` | **`'tinh-gon'`** |
| Bước/bài | 5 | 2 | **3** |
| Lib cần extract | vbt prompts | viet-theo-tu-khoa/writing | **lib/tinh-gon/{outline,writer,humanness}** |
| Style selector | Content type | KEYWORD_TONES | **OUTLINE_TYPES** |
| Max keywords | 50 | 50 | **50** |

---

## 12. Bugs & Gotchas

| # | Bug | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | `generateTinhGonOutline` trả về JSON không valid | AI thêm markdown code block (` ```json `) | Regex `text.match(/\{[\s\S]*\}/)` strip code block ✅ |
| 2 | `writeSectionHtml` trả về heading bị lặp (H2 đã có trong fullHtml) | AI thêm nội dung giới thiệu trước H2 | Trim + chỉ lấy từ `<h2>` trở đi trong kết quả |
| 3 | Timeout khi batch 50 bài × 6 sections × 8s = 2400s | SSE connection timeout | Keepalive comment `/: keepalive\n\n/` mỗi 30s ✅ |
| 4 | `OUTLINE_TYPES` chưa extract → import lỗi trong config page | Còn trong viet-tinh-gon/page.tsx | Xem Section 5 refactor ✅ |
| 5 | `scoreHumanness` chưa extract → import lỗi trong processor | Còn trong api/tinh-gon/stream | Xem Section 5 refactor ✅ |
| 6 | Bài viết 800 từ × 4 sections → mỗi section chỉ 200 từ → quá ngắn | `targetWords` mỗi section = targetLength / sectionCount | AI nhận `targetWords` và viết đủ — cần check prompt inject đúng số ✅ |
| 7 | `titleMode='ai_title'` nhưng AI viết H1 theo keyword → title vẫn = keyword | `outline.title` phụ thuộc vào prompt | Prompt outline phải dặn rõ: "Tạo tiêu đề sáng tạo, KHÔNG chỉ là từ khóa" |
| 8 | Duplicate reject nhưng case khác nhau (`Giường Sắt` vs `giường sắt`) | So sánh case-sensitive | Lowercase trước khi dedup ✅ |

---

## 13. Checklist triển khai

### Refactor bắt buộc trước
- [ ] Extract `generateTinhGonOutline()` → `lib/tinh-gon/outline.ts`
- [ ] Extract `writeSectionHtml()` → `lib/tinh-gon/writer.ts`
- [ ] Extract `scoreHumanness()` → `lib/tinh-gon/humanness.ts`
- [ ] Extract `OUTLINE_TYPES` constant → `lib/tinh-gon/options.ts`
- [ ] Update `api/tinh-gon/outline/route.ts` và `api/tinh-gon/stream/route.ts` import từ lib mới
- [ ] Verify `BulkJob` + `Article.bulkJobId/bulkIndex` đã migrate

### Files cần tạo mới
- [ ] `lib/viet-hang-loat-tinh-gon/types.ts`
- [ ] `lib/viet-hang-loat-tinh-gon/processor.ts`
- [ ] `app/viet-hang-loat-tinh-gon/page.tsx` ← Config
- [ ] `app/viet-hang-loat-tinh-gon/queue/page.tsx`
- [ ] `app/viet-hang-loat-tinh-gon/[id]/page.tsx`
- [ ] `app/api/vhltg/enqueue/route.ts`
- [ ] `app/api/vhltg/process/[jobId]/route.ts`
- [ ] `app/api/vhltg/jobs/[jobId]/route.ts`

### Sidebar
- [ ] Thêm "Viết Hàng Loạt — Tinh Gọn" vào nhóm "Viết Hàng Loạt"

### QA trước khi merge
- [ ] Enqueue 3 keywords → 3 Article records (status=pending, source='viet-hang-loat-tinh-gon')
- [ ] `duplicateMode='reject'`: input 5 dòng có 2 trùng (khác case) → DB tạo 4 bài
- [ ] Queue page: nhận đúng `item_step` với `step='outline'`, `step='writing'` (có `detail` = tên section)
- [ ] Mỗi bài xong: HTML có đúng số H2 theo `outline.sections.length`
- [ ] `titleMode='keyword_as_title'`: `article.title` = keyword đúng
- [ ] `titleMode='ai_title'`: `article.title` ≠ keyword (AI-generated)
- [ ] Target length 800: bài viết 700–900 từ; 1500: bài viết 1400–1600 từ
- [ ] Pause → bài đang chạy hoàn thành → bài tiếp không bắt đầu
- [ ] Article view page: load `article.content` đúng, HumannessPanel hiển thị score
- [ ] Test 10 bài liên tục: không timeout, keepalive nhận được từ SSE
- [ ] `source='viet-hang-loat-tinh-gon'` trong Article record
