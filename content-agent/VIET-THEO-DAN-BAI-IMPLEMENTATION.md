# VIET-THEO-DAN-BAI-IMPLEMENTATION.md
## Hướng dẫn code tính năng "AI Viết bài theo dàn bài"

> Phân tích từ: https://aiktp.com/vi/write-step-1-outline  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API

---

## ⚠️ Điểm khác biệt & chú ý khi implement

| # | Điểm | Ghi chú |
|---|------|---------|
| 1 | Outline do **user cung cấp** — không phải AI tạo | Khác viet-tinh-gon (AI tạo outline ở step 2) |
| 2 | Có **5 cách nhập outline** | AI Suggest, From Search, AI SERP URL, From URL, Manual |
| 3 | **Outline parser** cần hỗ trợ 2 format | Plain text lines + `[h2][h3]` tag syntax |
| 4 | **Writing method** ảnh hưởng hoàn toàn cách AI viết | Balance ≠ Detail — phải map rõ vào prompt |
| 5 | `suggest-outline` là endpoint riêng, **không requireAuth** | Giống `suggest-keywords` của tinh-gon |
| 6 | `sanitizeHtmlArticle(rawHtml, config.postTitle)` — arg 2 là `postTitle` | Dùng `config.postTitle` (user nhập), không phải `config.keyword` |
| 7 | `buildMetaDescription(title, config.keyword)` — extract `<h1>` trước | Tương tự bug #2 trong VIET-TIN-TUC |
| 8 | sessionStorage prefix: `vdb_` | viet-**d**an-**b**ai |

---

## 1. Tổng quan kiến trúc

### So sánh với các feature hiện có

| | Viết tinh gọn | Viết tin tức | **Viết theo dàn bài** |
|---|---|---|---|
| Số bước | 3 (Config → Outline → Generate) | 2 (Config → Generate) | **2 (Config → Generate)** |
| Outline | AI tạo tự động | Không có | **User cung cấp / AI gợi ý** |
| Nguồn dữ liệu | AI + Google Search | Google News RSS | **Outline text + optional URL crawl** |
| Cấu trúc bài | 10 outline type | 9 news structure | **Theo đúng outline user nhập** |
| Giọng viết | Brand tone cố định | 9 tone | **3 tone (SEO / Confident / Friendly)** |
| Writing method | Không | Không | **Balance / Detail** |
| Độ dài | 800–1.500 từ | 400–800 từ | **600–2.000 từ** |

### Flow hoạt động

```
User nhập keyword + outline + tiêu đề
     ↓
/viet-theo-dan-bai (Config Form — 5 tab nhập outline)
     ↓ POST /api/viet-theo-dan-bai/start
     → Validate outline (min 2 headings)
     → Tạo Article record trong DB
     ↓ Redirect → /viet-theo-dan-bai/generate
     ↓ POST /api/viet-theo-dan-bai/stream (SSE)
     → Parse outline → structured headings
     → AI stream HTML theo đúng outline
     → analyzeHumanness + computeKeywordDensity
     → Update Article DB
     ↓ Editor + SEO Panel + Save/Publish
```

### Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-theo-dan-bai/
│   │   ├── page.tsx                         ← Step 1: Config + Outline input
│   │   └── generate/
│   │       └── page.tsx                     ← Step 2: SSE generate + Editor
│   └── api/
│       └── viet-theo-dan-bai/
│           ├── start/
│           │   └── route.ts                 ← Validate + tạo Article
│           ├── stream/
│           │   └── route.ts                 ← SSE stream AI viết bài
│           └── suggest-outline/
│               └── route.ts                 ← AI gợi ý outline từ keyword
└── lib/
    └── viet-theo-dan-bai/
        ├── types.ts                         ← Types riêng
        ├── options.ts                       ← Constants
        └── outline-parser.ts               ← Parse outline text → headings
```

### File tái sử dụng (KHÔNG tạo mới)

- `lib/tinh-gon/humanness.ts` → `analyzeHumanness()`
- `lib/tinh-gon/text.ts` → `countWords()`, `computeKeywordDensity()`, `buildMetaDescription()`, `sanitizeHtmlArticle()`
- `lib/tinh-gon/model.ts` → `buildTinhGonModel()`
- `lib/tinh-gon/forbidden.ts` → `buildForbiddenList()`
- `lib/tinh-gon/persistence.ts` → `createTinhGonRunId()`
- `lib/tinh-gon/options.ts` → `AI_MODELS`
- `app/api/pipeline/_context.ts` → `buildBrandPrompt()`
- `app/api/tinh-gon/ai-edit/route.ts` (dùng lại nguyên)
- `app/api/tinh-gon/humanness/route.ts` (dùng lại nguyên)
- `components/tinh-gon/HumannessPanel.tsx`
- `components/tinh-gon/KeywordDensityBar.tsx`

---

## 2. Types — `web/lib/viet-theo-dan-bai/types.ts`

```typescript
import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

/** Phương pháp viết — ảnh hưởng cách AI triển khai nội dung */
export type DanBaiWriteMethod = 'balance' | 'detail';

/** Tone giọng văn — 3 preset */
export type DanBaiTone = 'seo_focus' | 'confident' | 'friendly';

/** Cách user nhập outline */
export type DanBaiOutlineTab = 'ai_suggest' | 'from_search' | 'ai_serp_url' | 'from_url' | 'manual';

/** Một heading đã parse từ outline text */
export interface ParsedHeading {
  level: 'h2' | 'h3';
  text: string;
}

export interface DanBaiConfig {
  keyword: string;
  language: string;
  postTitle: string;            // Tiêu đề bài viết (user nhập)
  outline: string;              // Raw outline text
  parsedHeadings: ParsedHeading[]; // Đã parse, dùng khi build prompt
  writeMethod: DanBaiWriteMethod;
  tone: DanBaiTone;
  model: string;
  targetLength: number;
  brandConfig?: TinhGonBrandConfig;
}

export interface DanBaiStartResponse {
  articleId: string;
  runId: string;
}

export interface DanBaiStreamResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
}

export interface SuggestOutlineResponse {
  outline: string;   // Raw text với [h2][h3] tags
  headings: ParsedHeading[];
}
```

---

## 3. Options — `web/lib/viet-theo-dan-bai/options.ts`

```typescript
import type { DanBaiTone, DanBaiWriteMethod } from './types';

export const WRITE_METHODS: Array<{
  value: DanBaiWriteMethod;
  label: string;
  note: string;
}> = [
  {
    value: 'balance',
    label: 'Balance',
    note: 'Nội dung liền mạch, tránh trùng ý giữa các heading. Bài đọc tự nhiên hơn.',
  },
  {
    value: 'detail',
    label: 'Detail',
    note: 'Giải thích chi tiết từng heading. Ý có thể lặp lại — phù hợp bài kỹ thuật.',
  },
];

export const DAN_BAI_TONES: Array<{
  value: DanBaiTone;
  label: string;
  note: string;
}> = [
  {
    value: 'seo_focus',
    label: 'SEO Focus',
    note: 'Tối ưu từ khóa, heading rõ ràng, cố gắng đạt xếp hạng SERP cao.',
  },
  {
    value: 'confident',
    label: 'Confident',
    note: 'Viết như chuyên gia, tập trung từ khóa, có quan điểm và số liệu cụ thể.',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    note: 'Nội dung tự nhiên, ấm áp, tối ưu vượt qua AI detector.',
  },
];

export const DAN_BAI_LENGTHS = [
  { value: 600,  label: '~600 từ',  badge: 'Ngắn' },
  { value: 800,  label: '~800 từ',  badge: '' },
  { value: 1000, label: '~1.000 từ', badge: 'Phổ biến' },
  { value: 1200, label: '~1.200 từ', badge: '' },
  { value: 1500, label: '~1.500 từ', badge: '' },
  { value: 2000, label: '~2.000 từ', badge: 'Dài' },
] as const;

export const OUTLINE_TAB_LABELS: Record<string, string> = {
  ai_suggest:  'AI Outline',
  from_search: 'Từ Search',
  ai_serp_url: 'AI SERP URL',
  from_url:    'Từ URL',
  manual:      'Nhập thủ công',
};
```

---

## 4. Outline Parser — `web/lib/viet-theo-dan-bai/outline-parser.ts`

Hỗ trợ **2 format** outline:

**Format 1 — Plain text** (mỗi dòng là 1 heading, dấu `-` hoặc `*` tuỳ ý):
```
Nên mua giường sắt hay giường gỗ?
Giường sắt khung 1.4mm có bền không
Các lỗi thường gặp khi lắp ráp
```

**Format 2 — Tag syntax** (aiktp advanced format):
```
[h2] Nên mua giường sắt hay giường gỗ?
[h3] So sánh độ bền
[h3] So sánh giá thành
[h2] Các lỗi thường gặp khi lắp ráp
```

```typescript
import type { ParsedHeading } from './types';

/**
 * Parse outline text → ParsedHeading[].
 *
 * Hỗ trợ 2 format:
 *   1. [h2] Text / [h3] Text  (aiktp tag syntax)
 *   2. Plain line — mặc định là h2, trừ khi bắt đầu bằng khoảng trắng/tab → h3
 */
export function parseOutline(rawOutline: string): ParsedHeading[] {
  if (!rawOutline.trim()) return [];

  const lines = rawOutline
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const headings: ParsedHeading[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Format tag: [h2] hoặc [h3]
    const tagMatch = trimmed.match(/^\[(h[23])\]\s*(.+)/i);
    if (tagMatch) {
      headings.push({
        level: tagMatch[1].toLowerCase() as 'h2' | 'h3',
        text: tagMatch[2].trim(),
      });
      continue;
    }

    // Skip dòng trống sau strip
    const text = trimmed.replace(/^[-*•]\s*/, '').trim();
    if (!text) continue;

    // Nếu dòng bắt đầu bằng whitespace (trước khi trimEnd) → h3
    const isIndented = line !== trimmed && line.startsWith('  ');
    headings.push({
      level: isIndented ? 'h3' : 'h2',
      text,
    });
  }

  return headings;
}

/**
 * Validate outline — tối thiểu phải có 2 heading
 */
export function validateOutline(headings: ParsedHeading[]): string | null {
  if (headings.length < 2) return 'Dàn bài cần ít nhất 2 heading.';
  if (headings.length > 30) return 'Dàn bài quá dài (tối đa 30 heading).';
  return null;
}

/**
 * Render headings → text block cho prompt
 * VD:
 *   [H2] Nên mua giường sắt hay giường gỗ?
 *     [H3] So sánh độ bền
 *     [H3] So sánh giá thành
 *   [H2] Các lỗi thường gặp
 */
export function renderOutlineForPrompt(headings: ParsedHeading[]): string {
  return headings
    .map((h) => {
      const indent = h.level === 'h3' ? '  ' : '';
      return `${indent}[${h.level.toUpperCase()}] ${h.text}`;
    })
    .join('\n');
}
```

---

## 5. API: `/api/viet-theo-dan-bai/suggest-outline/route.ts`

AI gợi ý outline từ keyword — **không requireAuth** (tương tự `suggest-keywords`).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { parseOutline } from '@/lib/viet-theo-dan-bai/outline-parser';

export const runtime = 'nodejs';

const schema = z.object({
  keyword: z.string().min(1).max(200),
  language: z.string().default('Vietnamese'),
});

function buildSuggestPrompt(keyword: string, language: string): string {
  return `
Tạo dàn bài SEO cho bài viết về: "${keyword}"
Ngôn ngữ: ${language}

Yêu cầu:
- 6–10 heading (mix h2 và h3)
- Format: [h2] Tiêu đề chính / [h3] Tiêu đề phụ
- Bao phủ search intent: thông tin, so sánh, hướng dẫn, lời khuyên
- Không nhồi keyword — viết tự nhiên như mục lục sách
- Chỉ trả danh sách heading, không thêm giải thích

Ví dụ format:
[h2] Tại sao nên chọn giường sắt khung vuông?
[h3] Độ bền khung 1.4mm so với 1.2mm
[h3] Chi phí bảo trì dài hạn
[h2] Kích thước nào phù hợp phòng ngủ nhỏ?
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { keyword, language } = parsed.data;
    const model = buildTinhGonModel('gemini-flash'); // Dùng model nhanh, không tốn credit user

    const result = await model.generateContent(buildSuggestPrompt(keyword, language));
    const outline = result.response.text().trim();
    const headings = parseOutline(outline);

    return NextResponse.json({ outline, headings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## 6. API: `/api/viet-theo-dan-bai/start/route.ts`

Validate outline + tạo Article record.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { parseOutline, validateOutline } from '@/lib/viet-theo-dan-bai/outline-parser';
import type { DanBaiConfig } from '@/lib/viet-theo-dan-bai/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.object({
    keyword:      z.string().min(1),
    language:     z.string().default('Vietnamese'),
    postTitle:    z.string().min(1, 'Tiêu đề bài viết không được để trống'),
    outline:      z.string().min(10, 'Dàn bài quá ngắn'),
    writeMethod:  z.enum(['balance', 'detail']).default('balance'),
    tone:         z.enum(['seo_focus', 'confident', 'friendly']).default('seo_focus'),
    model:        z.string().default('gemini-flash'),
    targetLength: z.number().min(600).max(2000).default(1000),
    brandConfig:  z.record(z.unknown()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ', issues: parsed.error.flatten() }, { status: 400 });
    }

    const { config } = parsed.data as { config: DanBaiConfig };

    // Parse và validate outline
    const parsedHeadings = parseOutline(config.outline);
    const outlineError = validateOutline(parsedHeadings);
    if (outlineError) {
      return NextResponse.json({ error: outlineError }, { status: 400 });
    }

    const runId = createTinhGonRunId(config.keyword);

    const article = await prisma.article.create({
      data: {
        userId:            user.userId,
        runId,
        status:            'DRAFT',
        keyword:           config.keyword,
        language:          config.language,
        contentType:       `viet_dan_bai:${config.writeMethod}`,
        targetLength:      config.targetLength,
        aiProvider:        config.model,
        brandConfig:       config.brandConfig as never ?? {},
        selectedTitle:     config.postTitle,
        htmlContent:       '',
        competitorUrls:    [],
        secondaryKeywords: [],
        outline: {
          flow:           'viet_dan_bai',
          stage:          'config',
          writeMethod:    config.writeMethod,
          tone:           config.tone,
          rawOutline:     config.outline,
          parsedHeadings,
          config,
        },
      },
    });

    return NextResponse.json({
      articleId: article.id,
      runId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

---

## 7. API: `/api/viet-theo-dan-bai/stream/route.ts`

SSE stream — AI viết bài theo đúng outline user cung cấp.

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import { parseOutline, renderOutlineForPrompt } from '@/lib/viet-theo-dan-bai/outline-parser';
import type { DanBaiConfig, ParsedHeading } from '@/lib/viet-theo-dan-bai/types';

export const runtime = 'nodejs';

// ─── Prompt instructions ────────────────────────────────────────────────────

const WRITE_METHOD_INSTRUCTIONS: Record<string, string> = {
  balance: `
Phương pháp BALANCE:
- Nội dung giữa các heading liền mạch, không nhắc lại ý đã viết ở section trước.
- Mỗi heading triển khai ý mới, không tóm tắt lại heading trước.
- Bài đọc như một văn bản liên tục — chỉ heading là điểm ngắt.`.trim(),

  detail: `
Phương pháp DETAIL:
- Mỗi heading là một đơn vị độc lập — giải thích đầy đủ, tự đủ nghĩa.
- Ý có thể trùng lặp giữa các heading nếu cần để giải thích hoàn chỉnh.
- Phù hợp bài kỹ thuật, hướng dẫn, glossary.`.trim(),
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  seo_focus: `
Tone SEO FOCUS:
- Keyword chính xuất hiện trong h1, h2 đầu tiên, và đoạn mở bài tự nhiên.
- Viết rõ ràng, súc tích — ưu tiên xếp hạng SERP.
- Tránh lan man, mỗi heading đi thẳng vào trọng tâm.`.trim(),

  confident: `
Tone CONFIDENT:
- Viết như chuyên gia ngành — có quan điểm rõ ràng, số liệu cụ thể.
- Dùng "chúng tôi", "kinh nghiệm", "thực tế" để tăng E-E-A-T.
- Không viết chung chung — mỗi claim cần có bằng chứng hoặc con số.`.trim(),

  friendly: `
Tone FRIENDLY:
- Giọng văn ấm áp, tự nhiên như người thật viết cho người thật.
- Câu ngắn xen câu dài, có câu hỏi tu từ, ví dụ sinh động.
- Không dùng cấu trúc câu cứng nhắc, lặp lại, máy móc.
- Ưu tiên vượt qua AI detector — viết như blog cá nhân chuyên môn.`.trim(),
};

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildDanBaiPrompt(
  config: DanBaiConfig,
  parsedHeadings: ParsedHeading[],
  brandPrompt: string,
  forbiddenList: string[],
): string {
  const outlineText = renderOutlineForPrompt(parsedHeadings);
  const forbidden = forbiddenList.join(', ');
  const writeMethodInstruction = WRITE_METHOD_INSTRUCTIONS[config.writeMethod] ?? WRITE_METHOD_INSTRUCTIONS.balance;
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.seo_focus;

  return `
Bạn là Writer Agent viết bài theo đúng dàn bài người dùng cung cấp.

${brandPrompt}

## Thông tin bài viết
- Từ khóa chính: ${config.keyword}
- Tiêu đề: ${config.postTitle}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: ${config.targetLength} từ

## Dàn bài (PHẢI tuân thủ đúng thứ tự và heading)
${outlineText}

## ${writeMethodInstruction}

## ${toneInstruction}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong 1 thẻ <article>.
- Thẻ <h1> là tiêu đề bài: "${config.postTitle}"
- Mỗi [H2] → thẻ <h2>, mỗi [H3] → thẻ <h3>. KHÔNG thêm heading ngoài dàn bài.
- Dưới mỗi <h2> hoặc <h3>: 1–3 đoạn <p>. Tổng từ bám sát ${config.targetLength} từ.
- Phân bổ từ đều cho các heading — không để heading nào quá ngắn (<50 từ).
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

// ─── SSE helper ──────────────────────────────────────────────────────────────

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// ─── Zod schema ──────────────────────────────────────────────────────────────

const streamSchema = z.object({
  articleId: z.string(),
  runId:     z.string(),
  config: z.object({
    keyword:      z.string().min(1),
    language:     z.string(),
    postTitle:    z.string().min(1),
    outline:      z.string(),
    writeMethod:  z.string(),
    tone:         z.string(),
    model:        z.string(),
    targetLength: z.number(),
    brandConfig:  z.record(z.unknown()).optional(),
  }),
});

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload không hợp lệ' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { articleId, runId, config } = parsed.data as {
      articleId: string;
      runId: string;
      config: DanBaiConfig;
    };

    const article = await prisma.article.findFirst({
      where: { id: articleId, runId, userId: user.userId, deletedAt: null },
    });
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);

        try {
          // Load từ cấm từ DB
          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );

          const parsedHeadings = parseOutline(config.outline);
          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          const prompt = buildDanBaiPrompt(config, parsedHeadings, brandPrompt, forbiddenList);
          const model = buildTinhGonModel(config.model);

          send({ type: 'step', step: 'writing', label: 'AI đang viết bài theo dàn bài...' });

          let rawHtml = '';
          try {
            const aiStream = await model.generateContentStream(prompt);
            for await (const chunk of aiStream) {
              const text = chunk.text();
              if (!text) continue;
              rawHtml += text;
              send({ type: 'chunk', text });
            }
          } catch {
            // Fallback non-stream
            const result = await model.generateContent(prompt);
            rawHtml = result.response.text();
            send({ type: 'chunk', text: rawHtml });
          }

          send({ type: 'step_done', step: 'writing' });
          send({ type: 'step', step: 'scoring', label: 'Đang chấm điểm...' });

          // Post-process
          // ⚠️ arg 2 là postTitle (user nhập) — không phải keyword
          const html = sanitizeHtmlArticle(rawHtml, config.postTitle);
          // ⚠️ Extract <h1> cho buildMetaDescription
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : config.postTitle;

          const wordCount       = countWords(html);
          const keywordDensity  = computeKeywordDensity(html, config.keyword);
          const humanness       = analyzeHumanness(html, forbiddenList);
          const metaDescription = buildMetaDescription(title, config.keyword);

          await prisma.article.update({
            where: { id: articleId },
            data: {
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
                flow:           'viet_dan_bai',
                stage:          'generate',
                writeMethod:    config.writeMethod,
                tone:           config.tone,
                rawOutline:     config.outline,
                parsedHeadings,
                config,
              },
            },
          });

          send({ type: 'step_done', step: 'scoring' });
          send({
            type: 'done',
            data: { runId, html, title, metaDescription, wordCount, keywordDensity, humanness },
          });
        } catch (error) {
          await prisma.article.update({
            where: { id: articleId },
            data: { status: 'DRAFT' },
          }).catch(() => null);
          send({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi stream' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':   'text/event-stream',
        'Cache-Control':  'no-cache',
        Connection:       'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

---

## 8. Config Page — `web/app/viet-theo-dan-bai/page.tsx`

Đây là page phức tạp nhất — có **5 tab nhập outline**. Chia thành các section:

### 8a. State & types

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AI_MODELS } from '@/lib/tinh-gon/options';
import { DAN_BAI_LENGTHS, DAN_BAI_TONES, OUTLINE_TAB_LABELS, WRITE_METHODS } from '@/lib/viet-theo-dan-bai/options';
import { parseOutline, validateOutline } from '@/lib/viet-theo-dan-bai/outline-parser';
import type { DanBaiConfig, DanBaiOutlineTab } from '@/lib/viet-theo-dan-bai/types';

const DEFAULT_CONFIG: DanBaiConfig = {
  keyword:        '',
  language:       'Vietnamese',
  postTitle:      '',
  outline:        '',
  parsedHeadings: [],
  writeMethod:    'balance',
  tone:           'seo_focus',
  model:          'gemini-flash',
  targetLength:   1000,
};

export default function VietTheoDanBaiPage() {
  const router = useRouter();
  const [config, setConfig]             = useState<DanBaiConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab]       = useState<DanBaiOutlineTab>('ai_suggest');
  const [loading, setLoading]               = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [urlLoading, setUrlLoading]         = useState(false);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [error, setError]                   = useState('');
  const [outlineError, setOutlineError]     = useState('');
  const [serpUrl, setSerpUrl]               = useState('');
  const [fromUrl, setFromUrl]               = useState('');
  // Sources hiển thị sau khi "Từ Search" thành công
  const [searchSources, setSearchSources] = useState<
    Array<{ title: string; url: string; headingCount: number }>
  >([]);

  // Restore từ sessionStorage
  useEffect(() => {
    document.title = 'Viết Theo Dàn Bài - Content Agent';
    const stored = sessionStorage.getItem('vdb_config');
    if (stored) {
      try { setConfig(JSON.parse(stored) as DanBaiConfig); } catch { /* ignore */ }
    }
  }, []);

  // Validate outline khi thay đổi
  useEffect(() => {
    if (!config.outline.trim()) {
      setOutlineError('');
      return;
    }
    const headings = parseOutline(config.outline);
    const err = validateOutline(headings);
    setOutlineError(err ?? '');
  }, [config.outline]);

  // ── Helpers ──
  function updateOutline(text: string) {
    const headings = parseOutline(text);
    setConfig((prev) => ({ ...prev, outline: text, parsedHeadings: headings }));
  }
```

### 8b. Tab handlers

```tsx
  // AI gợi ý outline từ keyword
  async function handleAiSuggest() {
    if (!config.keyword.trim()) {
      setError('Vui lòng nhập từ khóa trước khi gợi ý dàn bài.');
      return;
    }
    setSuggestLoading(true);
    setError('');
    try {
      const res = await fetch('/api/viet-theo-dan-bai/suggest-outline', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keyword: config.keyword, language: config.language }),
      });
      const data = await res.json() as { outline?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Không thể gợi ý dàn bài');
      if (data.outline) updateOutline(data.outline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSuggestLoading(false);
    }
  }

  // Tab "Từ Search": Google CSE → crawl top 5 pages → AI merge outline
  async function handleSearchOutline() {
    if (!config.keyword.trim()) {
      setError('Vui lòng nhập từ khóa trước khi lấy dàn bài từ Search.');
      return;
    }
    setSearchLoading(true);
    setSearchSources([]);
    setError('');
    try {
      const res = await fetch('/api/viet-theo-dan-bai/search-outline', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keyword: config.keyword, language: config.language }),
      });
      const data = await res.json() as {
        outline?: string;
        sources?: Array<{ title: string; url: string; headingCount: number }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Không thể lấy dàn bài từ Search');
      if (data.outline) updateOutline(data.outline);
      if (data.sources) setSearchSources(data.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSearchLoading(false);
    }
  }

  // Crawl URL → extract headings làm outline
  async function handleCrawlUrl(url: string) {
    if (!url.trim()) return;
    setUrlLoading(true);
    setError('');
    try {
      // Dùng lại endpoint Google Search crawlUrl — hoặc tạo endpoint riêng
      const res = await fetch('/api/viet-theo-dan-bai/extract-outline', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url }),
      });
      const data = await res.json() as { outline?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Không thể crawl URL');
      if (data.outline) updateOutline(data.outline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setUrlLoading(false);
    }
  }
```

### 8c. Submit handler

```tsx
  async function handleNext() {
    const keyword = config.keyword.trim();
    const postTitle = config.postTitle.trim();

    if (!keyword) { setError('Vui lòng nhập từ khóa.'); return; }
    if (!postTitle) { setError('Vui lòng nhập tiêu đề bài viết.'); return; }
    if (!config.outline.trim()) { setError('Vui lòng nhập dàn bài.'); return; }

    const headings = parseOutline(config.outline);
    const outlineErr = validateOutline(headings);
    if (outlineErr) { setError(outlineErr); return; }

    setLoading(true);
    setError('');

    try {
      const finalConfig: DanBaiConfig = { ...config, keyword, postTitle, parsedHeadings: headings };

      const res = await fetch('/api/viet-theo-dan-bai/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ config: finalConfig }),
      });

      const data = await res.json() as { articleId?: string; runId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Không thể bắt đầu');

      sessionStorage.setItem('vdb_config',     JSON.stringify(finalConfig));
      sessionStorage.setItem('vdb_article_id', data.articleId!);
      sessionStorage.setItem('vdb_run_id',     data.runId!);
      sessionStorage.removeItem('vdb_result');

      router.push('/viet-theo-dan-bai/generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }
```

### 8d. JSX layout

```tsx
  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto">

        {/* Header + Progress (2 bước) */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">AI Viết Bài Theo Dàn Bài</h1>
          <p className="text-sm text-gray-500 mb-4">
            Cung cấp dàn bài — AI triển khai bài viết đầy đủ theo đúng cấu trúc của bạn.
          </p>
          <div className="flex items-center gap-2">
            {['Cấu hình & Dàn bài', 'Viết & Chỉnh sửa'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 flex-1 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <span className={`text-xs whitespace-nowrap ${i === 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {i + 1}. {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyword */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Từ khóa chính <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.keyword}
            onChange={(e) => setConfig((p) => ({ ...p, keyword: e.target.value }))}
            placeholder="VD: giường sắt 1m2, tủ quần áo cánh kính..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tiêu đề bài viết */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tiêu đề bài viết <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.postTitle}
            onChange={(e) => setConfig((p) => ({ ...p, postTitle: e.target.value }))}
            placeholder="VD: Giường Sắt 1m2 Nên Mua Loại Nào? So Sánh 5 Mẫu Bán Chạy 2025"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Outline input — 5 tabs */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Dàn bài <span className="text-red-500">*</span>
          </label>

          {/* Tab selector */}
          <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 pb-2">
            {(Object.keys(OUTLINE_TAB_LABELS) as DanBaiOutlineTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {OUTLINE_TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* AI Suggest tab */}
          {activeTab === 'ai_suggest' && (
            <div className="mb-3">
              <button
                onClick={handleAiSuggest}
                disabled={suggestLoading || !config.keyword.trim()}
                className="w-full py-2.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {suggestLoading ? (
                  <><span className="animate-spin">⟳</span> Đang gợi ý dàn bài...</>
                ) : (
                  <>✨ Gợi ý dàn bài từ AI</>
                )}
              </button>
              <p className="text-xs text-gray-400 mt-2">
                AI sẽ gợi ý 6–10 heading dựa trên từ khóa. Bạn có thể chỉnh sửa bên dưới.
              </p>
            </div>
          )}

          {/* From Search tab */}
          {activeTab === 'from_search' && (
            <div className="mb-3">
              <button
                onClick={handleSearchOutline}
                disabled={searchLoading || !config.keyword.trim()}
                className="w-full py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {searchLoading ? (
                  <><span className="animate-spin">⟳</span> Đang phân tích top SERP...</>
                ) : (
                  <>🔍 Lấy dàn bài từ top Google</>
                )}
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Crawl heading từ 5 trang đứng đầu Google, AI tổng hợp thành 1 dàn bài.
                Tốn 1 quota Google Search (100/ngày free).
              </p>

              {/* Hiển thị nguồn sau khi thành công */}
              {searchSources.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-2">
                    Tổng hợp từ {searchSources.length} trang:
                  </p>
                  <ul className="space-y-1">
                    {searchSources.map((src, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-xs text-green-600 font-mono mt-0.5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline line-clamp-1 block"
                          >
                            {src.title}
                          </a>
                          <span className="text-xs text-gray-400">{src.headingCount} heading</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* AI SERP URL tab */}
          {activeTab === 'ai_serp_url' && (
            <div className="mb-3 flex gap-2">
              <input
                type="url"
                value={serpUrl}
                onChange={(e) => setSerpUrl(e.target.value)}
                placeholder="https://example.com/article-url"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleCrawlUrl(serpUrl)}
                disabled={urlLoading || !serpUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {urlLoading ? '⟳' : 'GET'}
              </button>
            </div>
          )}

          {/* From URL tab */}
          {activeTab === 'from_url' && (
            <div className="mb-3 flex gap-2">
              <input
                type="url"
                value={fromUrl}
                onChange={(e) => setFromUrl(e.target.value)}
                placeholder="https://example.com/bai-viet-mau"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleCrawlUrl(fromUrl)}
                disabled={urlLoading || !fromUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {urlLoading ? '⟳' : 'GET'}
              </button>
            </div>
          )}

          {/* Outline textarea (hiển thị trong mọi tab) */}
          <textarea
            value={config.outline}
            onChange={(e) => updateOutline(e.target.value)}
            rows={10}
            placeholder={`Nhập dàn bài (mỗi dòng 1 heading):\n\nVD plain text:\n  Nên mua giường 1m2 hay 1m4?\n  Khung 1.4mm có bền không?\n  Giá dao động bao nhiêu?\n\nVD tag format:\n  [h2] Nên mua giường 1m2 hay 1m4?\n  [h3] Phòng nhỏ dưới 12m2\n  [h2] Khung 1.4mm có bền không?`}
            className={`w-full border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
              outlineError ? 'border-red-400' : 'border-gray-300'
            }`}
          />

          {/* Outline status bar */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-red-500">{outlineError}</span>
            <span className="text-xs text-gray-400">
              {parseOutline(config.outline).length} heading |{' '}
              <a
                href="https://vn.docs.aiktp.com/tinh-nang/huong-dan-viet-bai/dan-y"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Hướng dẫn format [h2][h3]
              </a>
            </span>
          </div>
        </div>

        {/* Writing Method */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Phương pháp viết</label>
          <div className="grid grid-cols-2 gap-3">
            {WRITE_METHODS.map((method) => (
              <button
                key={method.value}
                onClick={() => setConfig((p) => ({ ...p, writeMethod: method.value }))}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  config.writeMethod === method.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-800">{method.label}</div>
                <div className="text-xs text-gray-500 mt-1">{method.note}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Tone giọng văn</label>
          <div className="grid grid-cols-3 gap-2">
            {DAN_BAI_TONES.map((tone) => (
              <button
                key={tone.value}
                onClick={() => setConfig((p) => ({ ...p, tone: tone.value }))}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  config.tone === tone.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-800">{tone.label}</div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{tone.note}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Target Length */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Độ dài bài</label>
          <div className="flex flex-wrap gap-2">
            {DAN_BAI_LENGTHS.map((len) => (
              <button
                key={len.value}
                onClick={() => setConfig((p) => ({ ...p, targetLength: len.value }))}
                className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                  config.targetLength === len.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {len.label}
                {len.badge && (
                  <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    {len.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* AI Model */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Chọn Model AI</label>
          <select
            value={config.model}
            onChange={(e) => setConfig((p) => ({ ...p, model: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Ngôn ngữ</label>
          <div className="flex gap-3">
            {[
              { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
              { value: 'English',    label: '🇬🇧 English' },
            ].map((lang) => (
              <button
                key={lang.value}
                onClick={() => setConfig((p) => ({ ...p, language: lang.value }))}
                className={`flex-1 py-2.5 text-sm rounded-lg border-2 transition-colors ${
                  config.language === lang.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleNext}
          disabled={loading || !!outlineError}
          className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin">⟳</span> Đang xử lý...</>
          ) : (
            'Viết bài theo dàn bài →'
          )}
        </button>
      </div>
    </div>
  );
}
```

---

## 9b. API: `/api/viet-theo-dan-bai/search-outline/route.ts`

Tab "Từ Search" — crawl top 5 trang SERP → extract headings → AI tổng hợp thành outline duy nhất.

**Reuse:** `lib/google-search/search.ts` → `fetchGoogleSearchData()` (đã có sẵn, `crawl: false` để lấy URLs nhanh).

**Flow:**
```
keyword → Google CSE (top 5 URLs) → crawl parallel (8s/URL) → extract h2/h3 per page
→ AI merge + deduplicate → outline [h2][h3] format + danh sách nguồn
```

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { parseOutline } from '@/lib/viet-theo-dan-bai/outline-parser';

export const runtime = 'nodejs';

const schema = z.object({
  keyword:  z.string().min(1).max(200),
  language: z.string().default('Vietnamese'),
});

/** Extract h2/h3 headings từ raw HTML string — theo thứ tự xuất hiện */
function extractHeadingsFromHtml(
  html: string,
  maxHeadings = 15,
): Array<{ level: 'h2' | 'h3'; text: string }> {
  const allMatches: { index: number; level: 'h2' | 'h3'; text: string }[] = [];

  for (const [level, regex] of [
    ['h2', /<h2[^>]*>([\s\S]*?)<\/h2>/gi],
    ['h3', /<h3[^>]*>([\s\S]*?)<\/h3>/gi],
  ] as const) {
    for (const m of html.matchAll(regex)) {
      const text = m[1].replace(/<[^>]+>/g, '').replace(/&[a-z#\d]+;/gi, ' ').trim();
      if (text.length > 3 && text.length < 200) {
        allMatches.push({ index: m.index ?? 0, level, text });
      }
    }
  }

  return allMatches
    .sort((a, b) => a.index - b.index)
    .slice(0, maxHeadings)
    .map(({ level, text }) => ({ level, text }));
}

/** Crawl một URL → lấy headings. Timeout 8s, trả [] nếu lỗi */
async function crawlHeadings(
  url: string,
): Promise<Array<{ level: 'h2' | 'h3'; text: string }>> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const html = await response.text();
    return extractHeadingsFromHtml(html);
  } catch {
    return [];
  }
}

/** Gọi Google Custom Search API → top N kết quả (không crawl) */
async function fetchTopUrls(
  keyword: string,
  language: string,
  num = 5,
): Promise<Array<{ title: string; url: string }>> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx     = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) return [];

  const langCode = language === 'Vietnamese' ? 'vi' : 'en';
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q:   keyword,
    num: String(Math.min(num, 10)),
    lr:  `lang_${langCode}`,
    gl:  langCode === 'vi' ? 'vn' : 'us',
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (res.status === 429) {
      throw new Error('Google Search quota vượt giới hạn 100 truy vấn/ngày.');
    }
    if (!res.ok) throw new Error(`Google Search API lỗi ${res.status}`);

    const payload = await res.json() as {
      items?: Array<{ title?: string; link?: string }>;
    };

    return (payload.items ?? [])
      .filter((item) => item.link)
      .map((item) => ({ title: item.title ?? item.link!, url: item.link! }));
  } catch (error) {
    throw error; // Re-throw — route handler bắt và trả lỗi cho FE
  }
}

/** AI tổng hợp headings từ nhiều nguồn → outline chuẩn [h2][h3] */
async function synthesizeOutline(
  keyword: string,
  language: string,
  sources: Array<{ title: string; headings: Array<{ level: 'h2' | 'h3'; text: string }> }>,
): Promise<string> {
  const sourcesText = sources
    .map((s, i) => {
      if (s.headings.length === 0) return null;
      const headingLines = s.headings
        .map((h) => `  [${h.level}] ${h.text}`)
        .join('\n');
      return `### Nguồn ${i + 1}: ${s.title}\n${headingLines}`;
    })
    .filter(Boolean)
    .join('\n\n');

  if (!sourcesText) throw new Error('Không có heading nào thu được từ SERP.');

  const prompt = `
Bạn là SEO analyst. Từ các heading thu thập được từ top SERP cho keyword "${keyword}", hãy tổng hợp thành 1 dàn bài chuẩn.

## Headings từ top ${sources.length} trang SERP:
${sourcesText}

## Yêu cầu dàn bài output:
- 6–10 heading tổng cộng (mix h2 và h3)
- Ngôn ngữ: ${language}
- Bao phủ các góc độ quan trọng nhất từ nhiều nguồn
- Loại bỏ heading trùng lặp hoặc quá chung chung
- Thêm angle chưa ai cover nếu phù hợp
- Format: mỗi dòng bắt đầu bằng [h2] hoặc [h3]
- Chỉ trả danh sách heading — không thêm giải thích

Ví dụ format:
[h2] So sánh giường sắt 1m2 và 1m4: nên chọn loại nào?
[h3] Phù hợp phòng dưới 12m2
[h3] Chi phí chênh lệch thực tế
[h2] Khung 1.4mm có thực sự bền hơn 1.2mm không?
`.trim();

  const model = buildTinhGonModel('gemini-flash');
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(); // Tab này cần auth — tốn Google API quota của user

    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { keyword, language } = parsed.data;

    // Bước 1: Lấy top 5 URLs từ Google
    const topUrls = await fetchTopUrls(keyword, language, 5);
    if (topUrls.length === 0) {
      return NextResponse.json(
        { error: 'Google Search chưa được cấu hình hoặc không trả kết quả. Kiểm tra GOOGLE_SEARCH_API_KEY và GOOGLE_SEARCH_CX trong .env.local.' },
        { status: 503 },
      );
    }

    // Bước 2: Crawl headings từ tất cả URLs song song
    const headingResults = await Promise.all(
      topUrls.map(async ({ title, url }) => ({
        title,
        url,
        headings: await crawlHeadings(url),
      })),
    );

    // Filter: bỏ source không có heading
    const validSources = headingResults.filter((s) => s.headings.length > 0);

    // Bước 3: AI tổng hợp
    const outline = await synthesizeOutline(keyword, language, validSources);
    const headings = parseOutline(outline);

    return NextResponse.json({
      outline,
      headings,
      // Trả về danh sách nguồn để FE hiển thị badge "Tổng hợp từ N trang"
      sources: validSources.map(({ title, url, headings: h }) => ({
        title,
        url,
        headingCount: h.length,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể lấy dữ liệu từ Search';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Biến môi trường cần có** (đã dùng cho tinh-gon Google Search):
```bash
# .env.local
GOOGLE_SEARCH_API_KEY=AIza...
GOOGLE_SEARCH_CX=your-search-engine-id
```

> **Quota:** Google Custom Search API free = 100 truy vấn/ngày. Mỗi lần nhấn "Từ Search" tốn 1 query. Hết quota → trả lỗi 429, frontend hiển thị message rõ ràng.

---

## 9. API: `/api/viet-theo-dan-bai/extract-outline/route.ts`

Crawl URL → extract headings h2/h3 → trả về outline text. Dùng cho tab **AI SERP URL** và **From URL**.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const schema = z.object({
  url: z.string().url(),
});

async function extractHeadingsFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const headings: string[] = [];

  // Extract h2 và h3
  const h2Matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  const h3Matches = html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi);

  // Build ordered list theo vị trí trong HTML
  const allMatches: { index: number; level: 'h2' | 'h3'; text: string }[] = [];

  for (const m of h2Matches) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();
    if (text && text.length > 3 && text.length < 200) {
      allMatches.push({ index: m.index ?? 0, level: 'h2', text });
    }
  }
  for (const m of h3Matches) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();
    if (text && text.length > 3 && text.length < 200) {
      allMatches.push({ index: m.index ?? 0, level: 'h3', text });
    }
  }

  allMatches.sort((a, b) => a.index - b.index);

  for (const item of allMatches.slice(0, 20)) { // Tối đa 20 heading
    headings.push(`[${item.level}] ${item.text}`);
  }

  if (headings.length === 0) throw new Error('Không tìm thấy heading nào trên trang này.');

  return headings.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 });
    }

    const outline = await extractHeadingsFromUrl(parsed.data.url);
    return NextResponse.json({ outline });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể crawl URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## 10. Generate Page — `web/app/viet-theo-dan-bai/generate/page.tsx`

Reuse hoàn toàn pattern từ `viet-tin-tuc/generate/page.tsx` — chỉ thay:

| Thay | Từ | Thành |
|------|-----|-------|
| sessionStorage prefix | `vtt_` | `vdb_` |
| Stream endpoint | `/api/viet-tin-tuc/stream` | `/api/viet-theo-dan-bai/stream` |
| Page title | `'Viết Tin Tức - Content Agent'` | `'Viết Theo Dàn Bài - Content Agent'` |
| `sources` payload | Có truyền sources | Không có sources |
| DB resume parse | `outline?.config as NewsConfig` | `outline?.config as DanBaiConfig` |
| Back link | `/viet-tin-tuc` | `/viet-theo-dan-bai` |

**Payload gửi lên stream:**
```typescript
// Không có sources — chỉ config
const payload = {
  articleId: sessionStorage.getItem('vdb_article_id'),
  runId:     sessionStorage.getItem('vdb_run_id'),
  config:    JSON.parse(sessionStorage.getItem('vdb_config') ?? '{}') as DanBaiConfig,
};
```

**Outline preview** — thêm 1 panel nhỏ hiển thị parsed headings trước khi stream:
```tsx
// Hiển thị outline user đã nhập (trước khi viết)
{config?.parsedHeadings?.length > 0 && !result && (
  <div className="bg-gray-50 rounded-lg p-4 mb-4">
    <p className="text-xs font-semibold text-gray-500 mb-2">DÀN BÀI</p>
    <ul className="space-y-1">
      {config.parsedHeadings.map((h, i) => (
        <li key={i} className={`text-sm text-gray-700 ${h.level === 'h3' ? 'pl-4 text-gray-500' : 'font-medium'}`}>
          {h.level === 'h2' ? '▸' : '◦'} {h.text}
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## 11. Sidebar — thêm vào `web/components/Sidebar.tsx`

```typescript
// Trong navGroups, nhóm "Viết Bài":
{ label: 'Viết Theo Dàn Bài', href: '/viet-theo-dan-bai' },
```

Thêm sau `{ label: 'Viết Tinh Gọn', href: '/viet-tinh-gon' }`.

---

## 12. Thứ tự implement (11 bước)

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `lib/viet-theo-dan-bai/types.ts` | Types đầu tiên |
| 2 | `lib/viet-theo-dan-bai/options.ts` | Constants |
| 3 | `lib/viet-theo-dan-bai/outline-parser.ts` | Parser + unit test ngay |
| 4 | `api/viet-theo-dan-bai/suggest-outline/route.ts` | Test với Postman/curl |
| 5 | `api/viet-theo-dan-bai/extract-outline/route.ts` | Test crawl URL thật |
| 6 | `api/viet-theo-dan-bai/search-outline/route.ts` | **Cần GOOGLE_SEARCH_API_KEY** — test sau khi có key |
| 7 | `api/viet-theo-dan-bai/start/route.ts` | Test validate outline |
| 8 | `api/viet-theo-dan-bai/stream/route.ts` | Test SSE với curl |
| 9 | `app/viet-theo-dan-bai/page.tsx` | UI phức tạp — test từng tab |
| 10 | `app/viet-theo-dan-bai/generate/page.tsx` | Copy + chỉnh từ tin-tuc |
| 11 | `components/Sidebar.tsx` | Thêm link cuối cùng |

---

## 13. QA Checklist

### Outline parser
- [ ] Plain text: mỗi dòng là h2 ✓
- [ ] Plain text có indent (2+ spaces): h3 ✓
- [ ] Tag `[h2]` và `[H2]` (case-insensitive) ✓
- [ ] Tag `[h3]` ✓
- [ ] Dòng có dấu `- ` ở đầu: strip ✓
- [ ] Dòng trống: bỏ qua ✓
- [ ] Outline < 2 heading: validate error ✓
- [ ] Outline > 30 heading: validate error ✓

### Config page
- [ ] Tab "AI Outline": gọi suggest-outline khi click → fill textarea ✓
- [ ] Tab "Từ Search": gọi search-outline → fill textarea + hiển thị source list ✓
- [ ] Tab "Từ Search": khi Google key chưa cấu hình → error message rõ ràng ✓
- [ ] Tab "Từ Search": quota 429 → hiển thị "Đã hết 100 truy vấn/ngày" ✓
- [ ] Tab "AI SERP URL": crawl URL → fill textarea ✓
- [ ] Tab "From URL": crawl URL → fill textarea ✓
- [ ] Tab "Manual": chỉ có textarea ✓
- [ ] Outline counter hiển thị số heading đúng ✓
- [ ] Validate error hiển thị realtime khi nhập ✓
- [ ] Nút submit disable khi có outlineError ✓
- [ ] sessionStorage lưu đúng với prefix `vdb_` ✓
- [ ] Redirect sang `/viet-theo-dan-bai/generate` ✓

### Stream
- [ ] Prompt chứa đúng outline đã parse ✓
- [ ] `sanitizeHtmlArticle(rawHtml, config.postTitle)` — không dùng keyword ✓
- [ ] Số heading trong HTML khớp với dàn bài user nhập ✓
- [ ] `buildMetaDescription(title, keyword)` — title extract từ h1 ✓
- [ ] Forbidden words load từ DB ✓
- [ ] Article status: DRAFT → WRITTEN ✓

### Generate page
- [ ] Outline preview panel hiển thị headings trước khi stream ✓
- [ ] SSE stream nhận `chunk`, `step`, `step_done`, `done`, `error` ✓
- [ ] HumannessPanel + KeywordDensityBar hiển thị sau khi done ✓
- [ ] Nút Lưu bài hoạt động ✓
- [ ] DB resume qua `?runId=` URL param hoạt động ✓

### Edge cases
- [ ] Keyword có ký tự đặc biệt (dấu `/`, `?`) không crash ✓
- [ ] URL crawl timeout 10s → hiển thị error, không crash ✓
- [ ] AI suggest khi keyword rỗng: disable button ✓
- [ ] Model không có stream fallback → non-stream ✓

---

## 14. Lỗi thường gặp khi implement

| # | Lỗi | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | Outline preview trống | `parsedHeadings` không được lưu vào sessionStorage | Đảm bảo `finalConfig.parsedHeadings = headings` trước khi `JSON.stringify` |
| 2 | AI bỏ qua một số heading | Prompt quá dài khi outline có nhiều h3 | Giới hạn max 30 heading trong `validateOutline` |
| 3 | `sanitizeHtmlArticle` strip mất h1 | Truyền `config.keyword` thay vì `config.postTitle` | Luôn dùng `config.postTitle` làm fallback title |
| 4 | Tab "From Search" chưa implement | Cần Google Custom Search API | Implement sau — hiện tại disable tab hoặc redirect sang "AI SERP URL" |
| 5 | Crawl URL bị block (Cloudflare) | Site có bot protection | Hiển thị error cụ thể: "Trang web này chặn truy cập tự động" |
| 6 | AI thêm heading không có trong outline | Prompt không đủ rõ | Thêm vào prompt: "KHÔNG thêm bất kỳ heading nào ngoài danh sách trên" |
| 7 | Tab "Từ Search" → "503 Google Search chưa được cấu hình" | `.env.local` thiếu key | Thêm `GOOGLE_SEARCH_API_KEY` và `GOOGLE_SEARCH_CX` vào `.env.local` — xem hướng dẫn tại `lib/google-search/search.ts` |
| 8 | Tab "Từ Search" → quota 429 | Hết 100 truy vấn/ngày | Báo user chờ đến ngày hôm sau hoặc nâng gói Google CSE |
| 9 | `searchSources` hiển thị nhưng heading count = 0 | URL bị Cloudflare block | Lọc: `validSources.filter((s) => s.headings.length > 0)` — đã có trong route, FE chỉ hiển thị source có `headingCount > 0` |
| 10 | AI synthesis trả outline không đúng format | Model tự ý bỏ `[h2]` | Thêm example format rõ hơn trong `synthesizeOutline` prompt — hoặc post-process: nếu không có tag thì wrap toàn bộ dòng thành `[h2]` |
