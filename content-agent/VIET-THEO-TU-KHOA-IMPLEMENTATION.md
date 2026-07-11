# VIET-THEO-TU-KHOA-IMPLEMENTATION.md
## Hướng dẫn code tính năng "Viết Bài Theo Từ Khóa"

> Phân tích từ: https://aiktp.com/vi/write-step-1-keywords  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API  
> Flow: Config + Outline → Generate + Editor (2 pages)

---

## ⚠️ Điểm khác biệt & chú ý khi implement

| # | Điểm | Ghi chú |
|---|------|---------|
| 1 | aiktp dùng WebSocket — ta dùng SSE | ReadableStream + controller.enqueue() |
| 2 | aiktp có 70+ ngôn ngữ — ta dùng 15 | Import SUPPORTED_LANGUAGES từ lib/shared/options.ts |
| 3 | aiktp cho chọn model tạo outline riêng — ta dùng cùng model đã chọn | Đơn giản hóa UX |
| 4 | Outline mode "AI Outline" cần 1 API call riêng trước khi write | POST /api/viet-theo-tu-khoa/outline → JSON (không phải SSE) |
| 5 | Toplist checkbox ảnh hưởng prompt — phải pass vào cả outline và stream | Khi isToplist=true: prompt yêu cầu dùng `<ul><li>` structure |
| 6 | Secondary keywords lưu dạng string comma-separated trên UI, parse thành array khi gửi API | Validate: không quá 10 keywords |
| 7 | aiktp outline editable trên cùng trang — ta giữ nguyên pattern, không navigate sang page mới chỉ để edit | Outline hiện inline phía dưới form sau khi AI generate |

---

## 1. Tổng quan kiến trúc

### 1.1 So sánh với tính năng gần nhất (Viết Tinh Gọn)

| Tiêu chí | Viết Tinh Gọn | Viết Theo Từ Khóa |
|---|---|---|
| Outline | Không có | 3 mode: No / User / AI |
| Từ khóa phụ | Không | Có (comma-separated, max 10) |
| Tone | Dùng chung WRITING_TONES | 16 KEYWORD_TONES riêng |
| Image | Không | Có (4 options) |
| Bước trung gian | Không | AI Outline API call (tuỳ chọn) |
| DB record | `Article` | `Article` |
| SEO options | Cơ bản | Đầy đủ (link injection, auto-bold, footer) |

### 1.2 Flow hoạt động

```
User nhập keyword + secondary keywords + config
     ↓
[Nếu outlineMode === 'ai_outline']
     POST /api/viet-theo-tu-khoa/outline
     → AI tạo outline text → JSON response
     → Hiện outline textarea inline (user có thể edit)
     ↓ User bấm "Viết bài"

[Nếu outlineMode !== 'ai_outline']
     → Thẳng xuống bước tiếp theo

     POST /api/viet-theo-tu-khoa/start
     → Validate + tạo Article record
     → Lưu configJson vào DB
     → Trả về { articleId }
     → Frontend lưu ttk_config + ttk_runId vào sessionStorage
     → Navigate sang /viet-theo-tu-khoa/generate

Generate page:
     Đọc ttk_runId từ sessionStorage
     → POST /api/viet-theo-tu-khoa/stream { articleId }
     → SSE: AI stream HTML content
     → analyzeHumanness → DB update status + score
     → Editor + 4 Panel Tabs
```

### 1.3 Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-theo-tu-khoa/
│   │   ├── page.tsx                    ← Config form + inline outline editor
│   │   └── generate/
│   │       └── page.tsx                ← Generate + Editor
│   └── api/
│       └── viet-theo-tu-khoa/
│           ├── outline/
│           │   └── route.ts            ← POST: AI tạo outline (JSON, không SSE)
│           ├── start/
│           │   └── route.ts            ← POST: tạo Article record
│           └── stream/
│               └── route.ts            ← POST: SSE stream viết bài
└── lib/
    └── viet-theo-tu-khoa/
        ├── types.ts
        ├── options.ts
        └── outline-generator.ts
```

### 1.4 File tái sử dụng (KHÔNG tạo mới)

- `lib/tinh-gon/humanness.ts` → `analyzeHumanness()`
- `lib/tinh-gon/text.ts` → `sanitizeHtmlArticle()`, `buildMetaDescription()`
- `lib/tinh-gon/model.ts` → `buildTinhGonModel(modelId)`
- `lib/shared/options.ts` → `SUPPORTED_LANGUAGES`, `IMAGE_OPTIONS`, `TARGET_LENGTHS`
- `app/components/ModelPicker.tsx` → chọn AI model
- `app/components/BrandSection.tsx` → brand config block (sau khi extract theo PAGE-STANDARD.md)
- `app/components/SeoAdvancedBlock.tsx` → SEO options block (sau khi extract)

---

## 2. Types

```typescript
// web/lib/viet-theo-tu-khoa/types.ts

import type { ImageOption } from '@/lib/shared/options';

export type OutlineMode = 'no_outline' | 'user_outline' | 'ai_outline';

export type AiOutlineObjective =
  | 'basic'            // Tập trung vào chủ đề được cung cấp
  | 'problem_solution' // Vấn đề & Giải pháp
  | 'listicle'         // Danh sách ý tưởng
  | 'comparison'       // So sánh sản phẩm / dịch vụ
  | 'step_by_step'     // Từng bước thực hiện
  | 'story';           // Kể chuyện / kinh nghiệm

export type AiOutlineSize =
  | '2_3_h2'   // ~1,000 từ
  | '3_4_h2'   // ~1,000–1,500 từ
  | '5_6_h2'   // ~1,500–2,000 từ  ← default
  | '7_8_h2'   // ~2,100–2,500 từ
  | '9_10_h2'; // ~2,500–3,500 từ

export type KeywordTone =
  | 'seo_basic'      // Tập trung keyword — tốt với câu hỏi
  | 'seo_focus'      // Tối ưu SERP ranking
  | 'seo_extended'   // Giải thích + ví dụ + so sánh
  | 'seo_longform'   // Dài nhất có thể
  | 'seo_nofaq'      // SEO focus, không có FAQ cuối bài
  | 'how_to'         // Hướng dẫn từng bước
  | 'listicle'       // Danh sách
  | 'comparison'     // So sánh A vs B, có bảng
  | 'story'          // Tiểu sử, kể chuyện
  | 'technical'      // Kỹ thuật, có code nếu cần
  | 'friendly'       // Thân thiện, vượt AI detector
  | 'formal'         // Trang trọng, báo cáo, doanh nghiệp
  | 'confident'      // Tự tin, không FAQ
  | 'year_in_title'  // Thêm năm vào tiêu đề H1
  | 'cooking'        // Công thức, nguyên liệu, dinh dưỡng
  | 'random';        // Random giữa seo_focus / confident / friendly

export interface KeywordArticleConfig {
  keyword: string;
  secondaryKeywords: string[];       // max 10, đã split + trim
  isToplist: boolean;                // true → yêu cầu <ul><li> structure
  outlineMode: OutlineMode;
  // Chỉ dùng khi outlineMode === 'no_outline'
  targetLength: number;              // 1500 | 2000 | 3000
  // Chỉ dùng khi outlineMode === 'ai_outline'
  aiOutlineObjective?: AiOutlineObjective;
  aiOutlineSize?: AiOutlineSize;
  // Outline cuối cùng — có giá trị khi user_outline hoặc sau khi AI tạo + edit
  resolvedOutline?: string;
  // Display
  imageOption: ImageOption;
  language: string;
  tone: KeywordTone;
  model: string;
  // SEO options
  seoMainLink?: string;
  seoKeywordLinks?: Array<{ keyword: string; url: string }>;
  footerContent?: string;
  boldMainKeyword: boolean;
  boldHeadings: boolean;
  // Brand
  brandProfileId?: number;
  brandName?: string;
  brandPhone?: string;
  brandAddress?: string;
  brandCta?: string;
}

// SSE Event types cho /stream route
export type StreamEvent =
  | { type: 'status';    message: string }
  | { type: 'chunk';     html: string }
  | { type: 'humanness'; score: number; decision: 'PUBLISH' | 'REVIEW' | 'REWRITE' }
  | { type: 'done';      articleId: number; wordCount: number }
  | { type: 'error';     message: string };
```

---

## 3. Options / Constants

```typescript
// web/lib/viet-theo-tu-khoa/options.ts

import type { KeywordTone, AiOutlineObjective, AiOutlineSize } from './types';

export const KEYWORD_TONES: {
  value: KeywordTone;
  label: string;
  note: string;
  hot?: boolean;
}[] = [
  { value: 'seo_basic',     label: 'SEO Cơ bản',    note: 'Tập trung keyword — tốt với dạng câu hỏi', hot: true },
  { value: 'seo_focus',     label: 'SEO Focus',      note: 'Tối ưu ranking SERP cao' },
  { value: 'seo_extended',  label: 'SEO Mở rộng',   note: 'Giải thích + ví dụ + so sánh', hot: true },
  { value: 'seo_longform',  label: 'SEO Long Form',  note: 'Viết dài nhất có thể', hot: true },
  { value: 'seo_nofaq',     label: 'SEO No FAQ',     note: 'Tối ưu SEO, không có FAQ cuối bài' },
  { value: 'how_to',        label: 'Hướng dẫn',     note: 'Các bước thực hiện từng bước' },
  { value: 'listicle',      label: 'Danh sách',     note: 'Liệt kê ý tưởng hoặc kinh nghiệm' },
  { value: 'comparison',    label: 'So sánh',       note: 'So sánh sản phẩm hoặc dịch vụ' },
  { value: 'story',         label: 'Kể chuyện',     note: 'Chia sẻ kinh nghiệm, tường thuật' },
  { value: 'technical',     label: 'Kỹ thuật',      note: 'Thông số chính xác, code nếu cần' },
  { value: 'friendly',      label: 'Thân thiện',    note: 'Gần gũi, vượt qua máy dò AI' },
  { value: 'formal',        label: 'Trang trọng',   note: 'Báo cáo, thông tin doanh nghiệp' },
  { value: 'confident',     label: 'Tự tin',        note: 'Khẳng định, không có FAQ' },
  { value: 'year_in_title', label: 'Có năm',        note: 'Thêm năm vào tiêu đề, nổi bật SERP' },
  { value: 'cooking',       label: 'Nấu ăn',        note: 'Công thức và dinh dưỡng' },
  { value: 'random',        label: 'Ngẫu nhiên',    note: 'Random trong SEO / Confident / Friendly' },
];

export const AI_OUTLINE_OBJECTIVES: {
  value: AiOutlineObjective;
  label: string;
  note: string;
}[] = [
  { value: 'basic',            label: 'Cơ bản',             note: 'Tập trung vào chủ đề được cung cấp' },
  { value: 'problem_solution', label: 'Vấn đề & Giải pháp', note: 'Đưa ra vấn đề và giải pháp' },
  { value: 'listicle',         label: 'Danh sách',          note: 'Liệt kê ý tưởng hoặc kinh nghiệm' },
  { value: 'comparison',       label: 'So sánh',            note: 'So sánh sản phẩm hoặc dịch vụ' },
  { value: 'step_by_step',     label: 'Từng bước',          note: 'Step by Step thực hiện vấn đề' },
  { value: 'story',            label: 'Kể chuyện',          note: 'Chia sẻ kinh nghiệm, trải nghiệm' },
];

export const AI_OUTLINE_SIZES: {
  value: AiOutlineSize;
  label: string;
  wordRange: string;
}[] = [
  { value: '2_3_h2',  label: '2–3 H2',   wordRange: '~1,000 từ' },
  { value: '3_4_h2',  label: '3–4 H2',   wordRange: '~1,000–1,500 từ' },
  { value: '5_6_h2',  label: '5–6 H2',   wordRange: '~1,500–2,000 từ' },  // default
  { value: '7_8_h2',  label: '7–8 H2',   wordRange: '~2,100–2,500 từ' },
  { value: '9_10_h2', label: '9–10 H2',  wordRange: '~2,500–3,500 từ' },
];

// Độ dài khi outlineMode === 'no_outline'
export const NO_OUTLINE_LENGTHS = [
  { value: 1500, label: 'Ngắn ~1,500 từ' },
  { value: 2000, label: 'Trung bình ~2,000 từ', isDefault: true },
  { value: 3000, label: 'Dài ~3,000 từ' },
] as const;

// sessionStorage keys
export const LS_CONFIG_KEY = 'ttk_config';
export const LS_RUN_ID_KEY = 'ttk_runId';
```

---

## 4. Outline Generator (Module đặc thù)

```typescript
// web/lib/viet-theo-tu-khoa/outline-generator.ts

import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import type { AiOutlineObjective, AiOutlineSize } from './types';

/**
 * Tạo outline text từ AI.
 * Trả về string plain text dạng [h2]Tiêu đề[/h2] [h3]...[/h3]
 * Format dùng chung với aiktp.com — user có thể edit trước khi viết bài.
 */
export async function generateOutline(params: {
  keyword: string;
  secondaryKeywords: string[];
  isToplist: boolean;
  objective?: AiOutlineObjective;
  size?: AiOutlineSize;
  language: string;
  model: string;
}): Promise<string> {
  const model = buildTinhGonModel(params.model);

  const objectiveMap: Record<AiOutlineObjective, string> = {
    basic:            'Tập trung vào chủ đề',
    problem_solution: 'Đưa ra vấn đề và đề xuất giải pháp',
    listicle:         'Liệt kê danh sách các mục',
    comparison:       'So sánh hai hay nhiều sự vật / dịch vụ',
    step_by_step:     'Hướng dẫn từng bước (Step by Step)',
    story:            'Kể chuyện theo kinh nghiệm cá nhân',
  };

  const sizeMap: Record<AiOutlineSize, string> = {
    '2_3_h2':  'Tạo 2–3 mục H2',
    '3_4_h2':  'Tạo 3–4 mục H2',
    '5_6_h2':  'Tạo 5–6 mục H2',
    '7_8_h2':  'Tạo 7–8 mục H2',
    '9_10_h2': 'Tạo 9–10 mục H2',
  };

  const objectiveInstruction = params.objective
    ? `Phong cách dàn ý: ${objectiveMap[params.objective]}.`
    : '';

  const sizeInstruction = params.size ? sizeMap[params.size] : 'Tạo 5–6 mục H2';

  const toplistNote = params.isToplist
    ? 'Đây là bài dạng toplist — mỗi H2 là một mục trong danh sách được đánh số.'
    : '';

  const secondaryNote = params.secondaryKeywords.length > 0
    ? `Từ khóa phụ cần có trong outline: ${params.secondaryKeywords.join(', ')}.`
    : '';

  const prompt = `Tạo dàn ý bài viết cho từ khóa: "${params.keyword}"
Ngôn ngữ: ${params.language}
${objectiveInstruction}
${sizeInstruction}
${toplistNote}
${secondaryNote}

FORMAT BẮT BUỘC:
- Dùng [h2]Tiêu đề H2[/h2] cho mục chính
- Dùng [h3]Tiêu đề H3[/h3] cho mục phụ (không bắt buộc)
- KHÔNG thêm giải thích — chỉ output dàn ý thuần
- KHÔNG dùng markdown (*, **, #)

Ví dụ output đúng:
[h2]X là gì?[/h2]
[h3]Định nghĩa X[/h3]
[h3]Lịch sử X[/h3]
[h2]Cách sử dụng X hiệu quả[/h2]
[h2]So sánh X và Y[/h2]`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Render outline [h2]...[h3] thành HTML preview để hiển thị bên cạnh textarea edit.
 */
export function parseOutlineToPreview(outlineText: string): string {
  return outlineText
    .replace(/\[h2\](.*?)\[\/h2\]/g, '<p class="font-semibold text-gray-800 mt-2">$1</p>')
    .replace(/\[h3\](.*?)\[\/h3\]/g, '<p class="text-gray-500 ml-4 text-sm">— $1</p>');
}
```

---

## 5. API Routes

### `POST /api/viet-theo-tu-khoa/outline` — AI tạo dàn ý

**Request body:**
```typescript
{
  keyword: string;
  secondaryKeywords: string[];
  isToplist: boolean;
  aiOutlineObjective?: AiOutlineObjective;
  aiOutlineSize?: AiOutlineSize;
  language: string;
  model: string;
}
```

**Response:**
```typescript
{ success: true; outline: string }
// hoặc
{ success: false; error: string }
```

**Code đầy đủ:**
```typescript
// web/app/api/viet-theo-tu-khoa/outline/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateOutline } from '@/lib/viet-theo-tu-khoa/outline-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      keyword, secondaryKeywords = [], isToplist = false,
      aiOutlineObjective, aiOutlineSize,
      language = 'Vietnamese', model,
    } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu từ khóa' }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ success: false, error: 'Thiếu model' }, { status: 400 });
    }

    const outline = await generateOutline({
      keyword: keyword.trim(),
      secondaryKeywords,
      isToplist,
      objective: aiOutlineObjective,
      size: aiOutlineSize,
      language,
      model,
    });

    return NextResponse.json({ success: true, outline });
  } catch (err) {
    console.error('[outline] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
```

---

### `POST /api/viet-theo-tu-khoa/start` — Tạo Article record

**Request body:** `KeywordArticleConfig` (toàn bộ object, bao gồm `resolvedOutline` nếu có)

**Response:** `{ success: true; articleId: number }`

**Code đầy đủ:**
```typescript
// web/app/api/viet-theo-tu-khoa/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { KeywordArticleConfig } from '@/lib/viet-theo-tu-khoa/types';

export async function POST(req: NextRequest) {
  try {
    const config: KeywordArticleConfig = await req.json();

    if (!config.keyword?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu từ khóa' }, { status: 400 });
    }

    const article = await prisma.article.create({
      data: {
        keyword:    config.keyword.trim(),
        language:   config.language,
        status:     'pending',
        // ⚠️ configJson + source phải có trong Prisma schema — xem Checklist
        configJson: JSON.stringify(config),
        source:     'viet-theo-tu-khoa',
      },
    });

    return NextResponse.json({ success: true, articleId: article.id });
  } catch (err) {
    console.error('[start] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
```

---

### `POST /api/viet-theo-tu-khoa/stream` — SSE stream viết bài

**Request body:** `{ articleId: number }`

**SSE Events (theo thứ tự):**
```
{ type: 'status',    message: string }
{ type: 'chunk',     html: string }         ← nhiều lần
{ type: 'humanness', score: number, decision: 'PUBLISH'|'REVIEW'|'REWRITE' }
{ type: 'done',      articleId: number, wordCount: number }
{ type: 'error',     message: string }      ← khi có lỗi
```

**Code đầy đủ:**
```typescript
// web/app/api/viet-theo-tu-khoa/stream/route.ts

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { sanitizeHtmlArticle, buildMetaDescription } from '@/lib/tinh-gon/text';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import type { KeywordArticleConfig } from '@/lib/viet-theo-tu-khoa/types';

export async function POST(req: NextRequest) {
  const { articleId } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // 1. Load config từ DB
        const article = await prisma.article.findUnique({ where: { id: articleId } });
        if (!article?.configJson) {
          send({ type: 'error', message: 'Không tìm thấy bài viết' });
          return;
        }
        const config: KeywordArticleConfig = JSON.parse(article.configJson);

        // 2. Build prompt + gọi AI
        send({ type: 'status', message: 'AI đang viết bài...' });
        const model = buildTinhGonModel(config.model);
        const prompt = buildWritingPrompt(config);
        const result = await model.generateContentStream(prompt);

        // 3. Stream chunks
        let fullHtml = '';
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullHtml += text;
            send({ type: 'chunk', html: text });
          }
        }

        // 4. Sanitize + SEO post-process
        send({ type: 'status', message: 'Đang xử lý nội dung...' });
        const cleanHtml = sanitizeHtmlArticle(fullHtml, config.keyword);
        const finalHtml = applySeoOptions(cleanHtml, config);

        // 5. Humanness
        send({ type: 'status', message: 'Đang phân tích Humanness Score...' });
        const { score, decision } = await analyzeHumanness(finalHtml);
        send({ type: 'humanness', score, decision });

        // 6. Save to DB
        const wordCount = finalHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        const metaDescription = buildMetaDescription(finalHtml, config.keyword);

        await prisma.article.update({
          where: { id: articleId },
          data: {
            content:        finalHtml,
            status:         'done',
            humannessScore: score,
            metaDescription,
            wordCount,
          },
        });

        send({ type: 'done', articleId, wordCount });
      } catch (err) {
        console.error('[stream] error:', err);
        send({ type: 'error', message: String(err) });
        await prisma.article.update({
          where: { id: articleId },
          data: { status: 'error' },
        }).catch(() => {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildWritingPrompt(config: KeywordArticleConfig): string {
  const toneMap: Record<string, string> = {
    seo_basic:     'Tập trung vào từ khóa, câu ngắn, thực tế. Có FAQ cuối bài.',
    seo_focus:     'Tối ưu SEO: keyword density 1–1.5%, heading rõ ràng, có FAQ.',
    seo_extended:  'Giải thích đầy đủ + ví dụ cụ thể + so sánh khi phù hợp.',
    seo_longform:  'Viết dài nhất có thể — mở rộng tối đa mọi khía cạnh liên quan.',
    seo_nofaq:     'Tối ưu SEO, KHÔNG thêm mục FAQ ở cuối bài.',
    how_to:        'Dạng hướng dẫn từng bước — đánh số Step 1, Step 2...',
    listicle:      'Dạng danh sách — liệt kê rõ ràng, mỗi mục một ý chính.',
    comparison:    'Dạng so sánh — có bảng so sánh nếu phù hợp.',
    story:         'Kể chuyện — narrative, cảm xúc, trải nghiệm cá nhân.',
    technical:     'Kỹ thuật — số liệu chính xác, có code example nếu cần.',
    friendly:      'Thân thiện — câu ngắn, gần gũi, tránh từ AI điển hình.',
    formal:        'Trang trọng — phù hợp báo cáo, thông cáo doanh nghiệp.',
    confident:     'Tự tin — khẳng định rõ ràng, không dùng "có thể", không FAQ.',
    year_in_title: 'Thêm năm hiện tại vào tiêu đề H1 để nổi bật trên SERP.',
    cooking:       'Tập trung công thức nấu ăn, nguyên liệu, dinh dưỡng.',
    random:        'Chọn ngẫu nhiên phong cách giữa SEO Focus, Confident, Friendly.',
  };

  const toplistNote = config.isToplist
    ? 'Bài viết dạng toplist — mỗi H2 là một mục được đánh số. Dùng <ul><li> khi liệt kê.'
    : '';

  const secondaryNote = config.secondaryKeywords.length > 0
    ? `Từ khóa phụ cần xuất hiện tự nhiên trong bài: ${config.secondaryKeywords.join(', ')}.`
    : '';

  const outlineNote = config.resolvedOutline
    ? `Viết theo đúng dàn ý sau — KHÔNG thay đổi cấu trúc:\n${config.resolvedOutline}`
    : `Tự tạo cấu trúc phù hợp. Độ dài mục tiêu: ~${config.targetLength || 2000} từ.`;

  const brandNote = config.brandName
    ? `Thương hiệu: ${config.brandName}. CTA cuối bài: "${config.brandCta || 'Liên hệ ngay để được tư vấn'}".`
    : '';

  return `Viết bài chuẩn SEO bằng ${config.language} về chủ đề: "${config.keyword}"

${secondaryNote}
${toplistNote}

Phong cách viết: ${toneMap[config.tone] || toneMap.seo_basic}

${outlineNote}

${brandNote}

YÊU CẦU OUTPUT BẮT BUỘC:
- Trả về HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a>
- KHÔNG có <html>, <body>, <head>, <!DOCTYPE>
- KHÔNG dùng markdown (**, *, #)
- Keyword density: 1.0–1.5%
- Câu 7–18 từ — tránh: "bên cạnh đó", "quan trọng", "tuy nhiên", "không chỉ...mà còn"
- Mỗi H2 tối thiểu 2 đoạn <p>`;
}

// ── SEO options applier ───────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applySeoOptions(html: string, config: KeywordArticleConfig): string {
  let result = html;

  // Bold từ khóa chính — chỉ lần đầu gặp
  if (config.boldMainKeyword && config.keyword) {
    const kw = escapeRegex(config.keyword);
    result = result.replace(new RegExp(`(${kw})`, 'i'), '<strong>$1</strong>');
  }

  // Gắn link vào từ khóa chính (bao <strong> nếu đã bold)
  if (config.seoMainLink && config.keyword) {
    const kw = escapeRegex(config.keyword);
    // Thử wrap <strong> trước, fallback sang text thuần
    result = result
      .replace(
        new RegExp(`<strong>(${kw})</strong>`, 'i'),
        `<a href="${config.seoMainLink}" title="${config.keyword}"><strong>$1</strong></a>`,
      )
      .replace(
        new RegExp(`(?<!<strong>)(${kw})(?!</strong>)`, 'i'),
        `<a href="${config.seoMainLink}" title="${config.keyword}">$1</a>`,
      );
  }

  // Gắn keyword links
  if (config.seoKeywordLinks?.length) {
    for (const { keyword, url } of config.seoKeywordLinks) {
      if (!keyword || !url) continue;
      const kw = escapeRegex(keyword);
      result = result.replace(
        new RegExp(`(${kw})`, 'i'),
        `<a href="${url}" title="${keyword}">$1</a>`,
      );
    }
  }

  // Footer content
  if (config.footerContent) {
    result += `\n<div class="article-footer">${config.footerContent}</div>`;
  }

  return result;
}
```

---

## 6. Page Components

### `app/viet-theo-tu-khoa/page.tsx` — Config Form

**State variables:**

| State | Type | Mặc định | Ghi chú |
|---|---|---|---|
| `keyword` | `string` | `''` | Min 3 ký tự khi submit |
| `secondaryKeywordsRaw` | `string` | `''` | Comma-separated — parse khi submit |
| `isToplist` | `boolean` | `false` | Checkbox |
| `outlineMode` | `OutlineMode` | `'ai_outline'` | 3 radio options |
| `aiOutlineObjective` | `AiOutlineObjective` | `'basic'` | Hiện khi outlineMode=ai_outline |
| `aiOutlineSize` | `AiOutlineSize` | `'5_6_h2'` | Hiện khi outlineMode=ai_outline |
| `userOutlineText` | `string` | `''` | Hiện khi outlineMode=user_outline |
| `generatedOutline` | `string` | `''` | Raw output từ /outline API |
| `editedOutline` | `string` | `''` | User có thể sửa generatedOutline trước khi submit |
| `isGeneratingOutline` | `boolean` | `false` | Loading nút "Tạo Dàn Ý" |
| `targetLength` | `number` | `2000` | Hiện khi outlineMode=no_outline |
| `imageOption` | `ImageOption` | `'none'` | 4 options từ IMAGE_OPTIONS |
| `language` | `string` | `'Vietnamese'` | Từ SUPPORTED_LANGUAGES |
| `tone` | `KeywordTone` | `'seo_basic'` | Từ KEYWORD_TONES |
| `model` | `string` | `''` | Từ ModelPicker (auto-select default) |
| `seoMainLink` | `string` | `''` | SEO Advanced Block |
| `footerContent` | `string` | `''` | SEO Advanced Block |
| `boldMainKeyword` | `boolean` | `true` | |
| `boldHeadings` | `boolean` | `false` | |
| `brandProfileId` | `number \| undefined` | `undefined` | BrandSection |
| `isSubmitting` | `boolean` | `false` | Disable button khi đang gọi /start |

**sessionStorage keys:**

| Key | Nội dung | Xóa khi nào |
|---|---|---|
| `ttk_config` | `KeywordArticleConfig` JSON | Đầu mỗi lần submit mới |
| `ttk_runId` | `Article.id` (string) | Khi user rời generate page |

**Key UI layout:**
```
┌──────────────────────────────────────────────────────┐
│ Block D: Keyword Input                               │
│   [Từ khóa chính *] (input)                         │
│   [Từ khóa phụ] comma-separated (input)             │
│   □ Viết dạng danh sách (toplist)                   │
├──────────────────────────────────────────────────────┤
│ Block D: Phương án dàn ý (3 radio)                  │
│   ○ Không dàn ý  ○ Dàn ý của bạn  ● AI Tạo dàn ý  │
│                                                      │
│   [Nếu 'no_outline']                                │
│     Chọn độ dài: [1500][2000●][3000]                │
│                                                      │
│   [Nếu 'user_outline']                              │
│     Textarea: nhập [h2]...[h3] format               │
│                                                      │
│   [Nếu 'ai_outline']                               │
│     Mục tiêu: [Cơ bản●][Vấn đề&GP][Danh sách]...  │
│     Số H2:    [2-3][3-4][5-6●][7-8][9-10]          │
│     [Tạo Dàn Ý] ← button (loading spinner)         │
│     ── Sau khi tạo:                                 │
│       Textarea (editedOutline) — user sửa được      │
│       Preview HTML bên cạnh (parseOutlineToPreview) │
├──────────────────────────────────────────────────────┤
│ Block A: Language picker + ModelPicker              │
├──────────────────────────────────────────────────────┤
│ Block B: Image Option (4 radio) + Tone (16 options) │
├──────────────────────────────────────────────────────┤
│ Block C: SEO Advanced (collapsible)                 │
│   Link vào từ khóa chính                            │
│   Footer content                                    │
│   Auto bold: □ Từ khóa chính  □ Heading            │
├──────────────────────────────────────────────────────┤
│ Block D: BrandSection component                     │
├──────────────────────────────────────────────────────┤
│ [Bắt đầu Viết Bài] button                          │
└──────────────────────────────────────────────────────┘
```

**"Tạo Dàn Ý" button handler:**
```typescript
async function handleGenerateOutline() {
  if (keyword.trim().length < 3) { alert('Nhập từ khóa trước'); return; }
  if (!model) { alert('Chọn model AI trước'); return; }

  setIsGeneratingOutline(true);
  try {
    const res = await fetch('/api/viet-theo-tu-khoa/outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        secondaryKeywords: secondaryKeywordsRaw.split(',').map(s => s.trim()).filter(Boolean),
        isToplist,
        aiOutlineObjective,
        aiOutlineSize,
        language,
        model,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setGeneratedOutline(json.outline);
      setEditedOutline(json.outline); // user sửa editedOutline
    } else {
      alert('Lỗi tạo dàn ý: ' + json.error);
    }
  } finally {
    setIsGeneratingOutline(false);
  }
}
```

**Submit handler:**
```typescript
async function handleSubmit() {
  if (keyword.trim().length < 3) { alert('Từ khóa tối thiểu 3 ký tự'); return; }
  if (!model) { alert('Chọn model AI'); return; }

  // Resolve outline
  let resolvedOutline: string | undefined;
  if (outlineMode === 'user_outline') {
    resolvedOutline = userOutlineText.trim() || undefined;
  } else if (outlineMode === 'ai_outline') {
    // ⚠️ Nếu user chưa bấm "Tạo Dàn Ý" mà đã submit → tạo trước
    if (!editedOutline.trim()) {
      await handleGenerateOutline();
      // setState là async — không thể dùng editedOutline ngay sau await
      // → yêu cầu user bấm lại sau khi outline hiện ra
      alert('Dàn ý đã được tạo. Kiểm tra và bấm "Bắt đầu Viết Bài" lại.');
      return;
    }
    resolvedOutline = editedOutline.trim();
  }

  setIsSubmitting(true);

  const config: KeywordArticleConfig = {
    keyword:           keyword.trim(),
    secondaryKeywords: secondaryKeywordsRaw
      .split(',').map(s => s.trim()).filter(Boolean).slice(0, 10),
    isToplist,
    outlineMode,
    targetLength,
    aiOutlineObjective: outlineMode === 'ai_outline' ? aiOutlineObjective : undefined,
    aiOutlineSize:      outlineMode === 'ai_outline' ? aiOutlineSize : undefined,
    resolvedOutline,
    imageOption,
    language,
    tone,
    model,
    seoMainLink:     seoMainLink || undefined,
    footerContent:   footerContent || undefined,
    boldMainKeyword,
    boldHeadings,
    brandProfileId,
  };

  try {
    const res = await fetch('/api/viet-theo-tu-khoa/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    if (json.success) {
      sessionStorage.removeItem('ttk_config');
      sessionStorage.removeItem('ttk_runId');
      sessionStorage.setItem('ttk_config', JSON.stringify(config));
      sessionStorage.setItem('ttk_runId', String(json.articleId));
      router.push('/viet-theo-tu-khoa/generate');
    } else {
      alert('Lỗi: ' + json.error);
    }
  } finally {
    setIsSubmitting(false);
  }
}
```

---

### `app/viet-theo-tu-khoa/generate/page.tsx` — Generate + Editor

**State variables:**

| State | Type | Ghi chú |
|---|---|---|
| `articleId` | `number` | Đọc từ `ttk_runId` sessionStorage |
| `config` | `KeywordArticleConfig` | Đọc từ `ttk_config` sessionStorage |
| `html` | `string` | Accumulated HTML từ stream |
| `status` | `'idle'\|'streaming'\|'done'\|'error'` | |
| `statusMessage` | `string` | Từ SSE `status` event |
| `humannessScore` | `number` | Từ SSE `humanness` event |
| `humannessDecision` | `'PUBLISH'\|'REVIEW'\|'REWRITE'` | |
| `wordCount` | `number` | Từ SSE `done` event |
| `activeTab` | `string` | `'seo'\|'quality'\|'links'\|'publish'` |

**SSE client handler:**
```typescript
useEffect(() => {
  const runId   = sessionStorage.getItem('ttk_runId');
  const cfgRaw  = sessionStorage.getItem('ttk_config');
  if (!runId || !cfgRaw) { router.push('/viet-theo-tu-khoa'); return; }

  setArticleId(Number(runId));
  setConfig(JSON.parse(cfgRaw));
  startStream(Number(runId));
}, []);

async function startStream(articleId: number) {
  setStatus('streaming');
  let accumulated = '';

  const res = await fetch('/api/viet-theo-tu-khoa/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId }),
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
        switch (event.type) {
          case 'status':
            setStatusMessage(event.message);
            break;
          case 'chunk':
            accumulated += event.html;
            setHtml(accumulated);
            break;
          case 'humanness':
            setHumannessScore(event.score);
            setHumannessDecision(event.decision);
            break;
          case 'done':
            setStatus('done');
            setWordCount(event.wordCount);
            break;
          case 'error':
            setStatus('error');
            setStatusMessage(event.message);
            break;
        }
      } catch { /* skip malformed line */ }
    }
  }
}
```

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ Header: {keyword} · {wordCount} từ · {status badge}│
├──────────────────────┬─────────────────────────────┤
│                      │ [SEO][Chất lượng]           │
│  ArticleEditor       │ [Nội bộ][Đăng bài]         │
│  (60% width)         │                             │
│  streaming=true khi  │ → Tab SEO: SeoPanel (14 ck) │
│  status=streaming    │ → Tab Chất lượng:           │
│                      │   HumannessPanel (score)    │
│                      │   AICheckPanel              │
│                      │   KeywordDensityBar         │
│                      │ → Tab Nội bộ:               │
│                      │   InternalLinkSuggest       │
│                      │ → Tab Đăng bài:             │
│                      │   Google/Bing Index btns    │
│                      │   WP Publish button         │
└──────────────────────┴─────────────────────────────┘
│ AiFloatingToolbar (hiện khi user select đoạn văn)  │
└────────────────────────────────────────────────────┘
```

> Xem `PAGE-STANDARD.md` Section 3 để lấy code đầy đủ cho 4 tabs, SeoPanel 14 checks, HumannessPanel, InternalLinkSuggest, và AiFloatingToolbar.

---

## 7. Bugs & Gotchas

| # | Bug | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | User bấm submit khi `outlineMode='ai_outline'` mà chưa tạo dàn ý | `editedOutline` rỗng khi submit | Handler tự gọi `handleGenerateOutline()` rồi return — yêu cầu user bấm lại. Xem submit handler ✅ |
| 2 | `editedOutline` không sync ngay sau `setEditedOutline` trong cùng async flow | React setState bất đồng bộ | Dùng `ref` song song hoặc pattern return-sớm như trên |
| 3 | Outline textarea hiển thị `[h2]...[h3]` raw — khó đọc | Format aiktp.com dùng tag tự định nghĩa | Render preview bằng `parseOutlineToPreview()` song song với textarea edit |
| 4 | `applySeoOptions` regex throw khi keyword có ký tự đặc biệt (`+`, `(`, `)`) | Không escape regex | Hàm `escapeRegex()` đã apply ✅ |
| 5 | `configJson` và `source` chưa có trong Prisma `Article` model | Fields mới, chưa migrate | Thêm vào schema + migrate trước khi code route — xem Checklist |
| 6 | SSE bị buffer bởi nginx/proxy → client không nhận chunk theo thời gian thực | Nginx buffer response | Thêm header `X-Accel-Buffering: no` vào SSE response nếu deploy sau nginx |
| 7 | `tone === 'random'` — AI không biết phải random gì | Prompt mơ hồ | Trong `buildWritingPrompt`, `random` → prompt rõ: "Chọn ngẫu nhiên giữa SEO Focus, Confident, Friendly" ✅ |
| 8 | Secondary keywords > 10 gây prompt quá dài | Không validate số lượng | `.slice(0, 10)` trong submit handler ✅ |

**Chưa phát hiện bug. Cần test với:**
- Keyword tiếng Việt có dấu → regex escaping
- Keyword rất dài (> 100 ký tự) → truncate nếu cần
- Model trả về markdown (** hoặc #) thay vì HTML thuần → `sanitizeHtmlArticle` phải strip

---

## 8. Checklist triển khai

### Files cần tạo mới
- [ ] `web/lib/viet-theo-tu-khoa/types.ts`
- [ ] `web/lib/viet-theo-tu-khoa/options.ts`
- [ ] `web/lib/viet-theo-tu-khoa/outline-generator.ts`
- [ ] `web/app/viet-theo-tu-khoa/page.tsx`
- [ ] `web/app/viet-theo-tu-khoa/generate/page.tsx`
- [ ] `web/app/api/viet-theo-tu-khoa/outline/route.ts`
- [ ] `web/app/api/viet-theo-tu-khoa/start/route.ts`
- [ ] `web/app/api/viet-theo-tu-khoa/stream/route.ts`

### Schema / Migration
- [ ] Kiểm tra `Article` model trong `prisma/schema.prisma` có đủ các fields sau:
  ```prisma
  configJson      String?   // JSON config đầy đủ
  source          String?   // 'viet-theo-tu-khoa'
  wordCount       Int?
  humannessScore  Float?
  metaDescription String?
  ```
- [ ] Nếu thiếu → thêm + chạy `npx prisma migrate dev --name add-keyword-article-fields`

### Tích hợp cần làm trước khi code page
- [ ] `web/lib/shared/options.ts` — đã tạo (SUPPORTED_LANGUAGES, IMAGE_OPTIONS)
- [ ] `web/app/components/BrandSection.tsx` — đã extract (dùng trong page.tsx)
- [ ] `web/app/components/SeoAdvancedBlock.tsx` — đã extract (dùng trong page.tsx)
- [ ] `web/components/Sidebar.tsx` — thêm link "Viết Theo Từ Khóa" vào nhóm Viết Bài
- [ ] `IMPLEMENTATION-GUIDE-STANDARD.md` Section 13 — thêm dòng: `| viet-theo-tu-khoa | ttk_ | ttk_config, ttk_runId |`

### QA trước khi merge
- [ ] Test keyword rỗng → hiện lỗi, không submit
- [ ] Test `outlineMode=no_outline` → chọn độ dài → submit thẳng, không gọi /outline
- [ ] Test `outlineMode=user_outline` → nhập [h2]...[h3] → submit, check `resolvedOutline` đúng
- [ ] Test `outlineMode=ai_outline` → bấm Tạo Dàn Ý → outline hiện → edit → submit
- [ ] Test `outlineMode=ai_outline` submit khi chưa tạo dàn ý → auto-generate rồi yêu cầu bấm lại
- [ ] Test `isToplist=true` → bài viết có `<ul><li>` structure
- [ ] Test secondary keywords > 10 → bị cắt còn 10
- [ ] Test SSE stream → từng chunk append vào Editor theo thời gian thực
- [ ] Test Humanness Score hiện đúng sau khi stream xong
- [ ] Test network lỗi giữa stream → SSE gửi `{type:'error'}` → UI hiện thông báo
- [ ] Verify article xuất hiện ở dashboard sau khi done với đúng `source='viet-theo-tu-khoa'`
- [ ] Test trên mobile viewport — outline textarea + preview cần responsive
