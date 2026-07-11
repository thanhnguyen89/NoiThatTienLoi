# VIET-HANG-LOAT-THEO-NGUON-IMPLEMENTATION.md
## Hướng dẫn code "Viết Hàng Loạt — Viết Theo Nguồn (Bulk Write By Sources)"

> Phân tích từ: https://aiktp.com/vi/bulk-write-source  
> Base page: `/viet-theo-nguon` (đã code — đây là bản mở rộng bulk/queue)  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · PostgreSQL  
> Pattern: **P3 — Queue Bulk**

---

## 0. Nhóm & Pattern

| Nhóm | Page | Config | Queue | Article | Pattern | Spec |
|------|------|--------|-------|---------|---------|------|
| A | Viết Hàng Loạt — Theo Nguồn | `/viet-hang-loat-theo-nguon` | `/viet-hang-loat-theo-nguon/queue` | `/viet-hang-loat-theo-nguon/[id]` | **P3** | file này |

---

## ⚠️ Điểm khác biệt so với các Bulk variant khác

| # | Điểm | Smart AI | Từ Khóa | Google Search | **Theo Nguồn** |
|---|------|----------|---------|---------------|----------------|
| 1 | Base logic | viet-bai-thong-minh | viet-theo-tu-khoa | viet-tu-google-search | **viet-theo-nguon** |
| 2 | Nguồn dữ liệu | AI thuần | AI thuần | SerpAPI + HTTP crawl | **User cung cấp URL (crawl 1 lần)** |
| 3 | Crawl thời điểm | N/A | N/A | Per keyword (runtime) | **Tại lúc enqueue (1 lần cho mọi bài)** |
| 4 | Bước/bài | 5 | 2 | 5 | **2–3 (outline optional)** |
| 5 | Tốc độ/bài | ~60s | ~30s | ~60–120s | **~30–50s** |
| 6 | External API | Không | Không | SerpAPI | **Không** (crawl tự có) |
| 7 | jobType BulkJob | `'smart'` | `'tu-khoa'` | `'google-search'` | **`'theo-nguon'`** |
| 8 | Delay giữa bài | 1.5s | 1.5s | 3s | **1.5s** |
| 9 | Outline mode | smart | no/ai | no/ai | **no/ai + OutlineAIType** |
| 10 | Unique/Duplicate | Không | Không | Không | **Có — Jaccard check đã crawl sẵn** |

> **Điểm đặc thù quan trọng:**  
> Tất cả keyword trong batch **dùng chung 1 bộ nguồn URL đã crawl** (crawl 1 lần tại submit).  
> Mỗi keyword → 1 bài viết khác nhau từ cùng bộ nguồn — keyword khác nhau → AI focus khác nhau.  
> Phù hợp khi cần rewrite competitor content với nhiều angle keyword từ cùng nguồn.

---

## 1. Kiến trúc tổng quan

### 1.1 Flow hoạt động

```
[Config page — /viet-hang-loat-theo-nguon]
  User nhập:
    - Keywords textarea (1 dòng = 1 bài, tối đa 50)
    - URL sources (2–5 link) → bấm "Thu Thập"
    → POST /api/vhltn/crawl   ← Crawl URLs, preview sources
    → Hiện sources preview (unique/duplicate badge)
    - Duplicate mode + Title mode
    - 8 khối config (với Khối 4 chỉ no/ai outline)
    ↓
  Submit → POST /api/vhltn/enqueue
    - Validate keywords + sources
    - Deduplicate keywords (nếu reject mode)
    - Tạo BulkJob { jobType:'theo-nguon', configJson: { ...config, _crawledSources } }
    - Tạo Article record cho từng keyword (status=PENDING)
    - Lưu jobId vào sessionStorage
    → Navigate sang /viet-hang-loat-theo-nguon/queue

[Queue page — /viet-hang-loat-theo-nguon/queue]
  Hiện danh sách keyword + trạng thái
  User bấm "Bắt đầu" → POST /api/vhltn/process/[jobId]
  SSE stream — xử lý từng keyword tuần tự:
    ① Nếu outlineMode='ai_outline':
       AI generate outline cho keyword này (~10s)
    ② AI viết bài từ sources + outline (hoặc trực tiếp nếu no_outline) (~20–30s)
    ③ Humanness score + SEO checks + save DB (~3–5s)
    Delay 1.5s → keyword tiếp theo
  Kết thúc: job_done event

[Article view — /viet-hang-loat-theo-nguon/[id]]
  Reuse generate page editor của viet-theo-nguon
  Tab "Nguồn": hiện danh sách URL nguồn đã crawl
```

### 1.2 Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-hang-loat-theo-nguon/
│   │   ├── page.tsx                              ← Config page (8 khối + URL crawl + keywords)
│   │   ├── queue/
│   │   │   └── page.tsx                          ← Queue management
│   │   └── [id]/
│   │       └── page.tsx                          ← Article view (reuse viet-theo-nguon editor)
│   └── api/
│       └── vhltn/
│           ├── crawl/
│           │   └── route.ts                      ← Reuse lib/viet-theo-nguon/crawler.ts
│           ├── enqueue/
│           │   └── route.ts                      ← Tạo BulkJob + Articles
│           ├── process/
│           │   └── [jobId]/
│           │       └── route.ts                  ← SSE processor
│           └── jobs/
│               └── [jobId]/
│                   └── route.ts                  ← GET job status + PATCH pause/resume
└── lib/
    └── viet-hang-loat-theo-nguon/
        ├── types.ts                              ← BulkTheoNguonConfig, SSE event types
        └── processor.ts                          ← processTnKeyword()
```

### 1.3 File tái sử dụng — KHÔNG tạo mới

| File | Từ đâu | Dùng gì |
|------|--------|---------|
| `lib/viet-theo-nguon/crawler.ts` | viet-theo-nguon | `crawlUrls()` — đã có sẵn ✅ |
| `lib/viet-theo-nguon/types.ts` | viet-theo-nguon | `SourceItem`, `OutlineMode`, `OutlineAIType`, `ArticleStructure`, `ArticleTone`, `SeoOptions` |
| `lib/viet-theo-nguon/options.ts` | viet-theo-nguon | `OUTLINE_AI_OPTIONS`, `OUTLINE_AI_TYPE_TARGET`, `ARTICLE_STRUCTURES`, `ARTICLE_TONES` |
| `lib/viet-theo-nguon/writing.ts` | viet-theo-nguon | `buildStreamPrompt()`, `applySeoOptions()` ← **cần extract** |
| `lib/viet-theo-nguon/outline.ts` | viet-theo-nguon | `generateTheoNguonOutline()` ← **cần extract** |
| `lib/tinh-gon/model.ts` | tinh-gon | `buildTinhGonModel()` |
| `lib/tinh-gon/humanness.ts` | tinh-gon | `analyzeHumanness()` |
| `lib/tinh-gon/text.ts` | tinh-gon | `sanitizeHtmlArticle()`, `buildMetaDescription()`, `countWords()`, `computeKeywordDensity()` |
| `lib/shared/options.ts` | shared | `SUPPORTED_LANGUAGES`, `IMAGE_OPTIONS` |
| `lib/shared/seo-checks.ts` | shared | `computeSeoChecks()` |
| `app/components/ModelPicker.tsx` | shared | ModelPicker |
| `app/components/BrandSection.tsx` | shared | BrandSection |
| `app/components/SeoAdvancedBlock.tsx` | shared | SeoAdvancedBlock |
| `lib/bulk/job-helpers.ts` | bulk shared | `createBulkJob()`, `updateArticleStatus()` |

> ⚠️ **REFACTOR TRƯỚC KHI CODE:**  
> Extract từ `api/viet-theo-nguon/stream/route.ts`:  
> 1. **`lib/viet-theo-nguon/writing.ts`** — hàm `buildStreamPrompt(config, sources, outline, brandPrompt)`:  
>    build prompt từ sources + outline instructions + tone/structure + brand  
>    hàm `applySeoOptions(html, config)`: inject links, bold, footer  
> 2. **`lib/viet-theo-nguon/outline.ts`** — hàm `generateTheoNguonOutline(keyword, sources, outlineAIType, model)`:  
>    AI call để tạo outline cho 1 keyword dựa trên sources (tách khỏi config page's handleGenerateOutline)  
> 3. Update `api/viet-theo-nguon/stream/route.ts` import từ lib mới.

---

## 2. Types — `lib/viet-hang-loat-theo-nguon/types.ts`

```typescript
import type {
  SourceItem,
  OutlineAIType,
  ArticleStructure,
  ArticleTone,
  SeoOptions,
} from '@/lib/viet-theo-nguon/types';

// ── Shared enums ──────────────────────────────────────────────────────────────

export type DuplicateMode = 'allow' | 'reject';

export type TitleMode = 'keyword_as_title' | 'ai_title';

export type BulkOutlineMode = 'no_outline' | 'ai_outline';  // Không có user_outline trong bulk

// ── Main config ───────────────────────────────────────────────────────────────

export interface BulkTheoNguonConfig {
  // Khối 1 — Keywords + Source config
  keywords: string[];              // Đã parse từ textarea
  duplicateMode: DuplicateMode;
  titleMode: TitleMode;
  // URL inputs xử lý client-side, kết quả lưu _crawledSources
  urlInputs?: string[];            // Lưu để restore UI (không dùng ở processor)

  // Khối 2
  imageOption: '0' | 'yandex' | 'ai' | 'shutterstock';

  // Khối 3
  language: string;

  // Khối 4 — Outline (chỉ no/ai, không có user_outline)
  outlineMode: BulkOutlineMode;
  outlineAIType: OutlineAIType;   // Áp dụng khi outlineMode = 'ai_outline'

  // Khối 1 additions — Article structure (từ viet-theo-nguon)
  structure: ArticleStructure;

  // Khối 5 — Tone
  tone: ArticleTone;

  // Khối 6
  model: string;

  // Khối 7
  brand: {
    enabled: boolean;
    name?: string;
    website?: string;
    phone?: string;
    ctaText?: string;
    forbiddenExtra?: string;
  };

  // Khối 8 — SEO options (inherited from viet-theo-nguon)
  seoOptions: SeoOptions;

  // Internal — Crawled sources (set tại enqueue time)
  _crawledSources: SourceItem[];
}

// ── SSE event types ───────────────────────────────────────────────────────────

export type BulkTnStep = 'outline' | 'writing' | 'scoring';

export type VhltnSSEEvent =
  | { type: 'item_start';  articleId: string; keyword: string; index: number; total: number }
  | { type: 'item_step';   articleId: string; step: BulkTnStep; detail: string; progress: number }
  | { type: 'item_done';   articleId: string; keyword: string; title: string; wordCount: number; humanness: number; sourcesCount: number }
  | { type: 'item_error';  articleId: string; keyword: string; error: string }
  | { type: 'job_done';    jobId: string; successCount: number; errorCount: number }
  | { type: 'error';       message: string };

// ── Processor result ──────────────────────────────────────────────────────────

export interface ProcessResult {
  articleId:    string;
  title:        string;
  wordCount:    number;
  humanness:    number;  // 0-100
  sourcesCount: number;  // Số sources hợp lệ đã dùng
}

// ── Enqueue request ───────────────────────────────────────────────────────────

export interface VhltnEnqueueRequest {
  config:          Omit<BulkTheoNguonConfig, '_crawledSources'>;
  crawledSources:  SourceItem[];  // Gửi kèm từ client sau khi crawl
}

// ── Enqueue response ──────────────────────────────────────────────────────────

export interface VhltnEnqueueResponse {
  jobId:        string;
  articleCount: number;
  skippedCount: number;  // Số keyword bị bỏ do duplicate (nếu reject mode)
}
```

---

## 3. Refactor — `lib/viet-theo-nguon/writing.ts`

> Extract từ `api/viet-theo-nguon/stream/route.ts`

```typescript
import type { SourceConfig, SourceItem } from './types';
import { mergeForbiddenWords } from '@/lib/tinh-gon/forbidden';

// ── Instruction maps (giữ nguyên từ stream/route.ts) ────────────────────────

const STRUCTURE_INSTRUCTIONS: Record<string, string> = {
  auto:             'AI tự quyết định cấu trúc phù hợp nhất với nội dung nguồn.',
  inverted_pyramid: 'Cấu trúc Kim tự tháp: thông tin quan trọng nhất ở đầu, chi tiết phụ ở dưới.',
  storytelling:     'Trình tự thời gian: dẫn dắt từ bối cảnh → diễn biến → kết quả.',
  qa:               'Dạng hỏi & đáp: mỗi H2 là một câu hỏi, nội dung trả lời chi tiết.',
  how_to:           'Hướng dẫn từng bước: đánh số Step 1, 2, 3... Dễ thực hành ngay.',
  pro_con:          'Nêu ưu và nhược điểm cụ thể. Kết luận rõ ràng.',
  historical:       'Trình bày theo dòng thời gian từ quá khứ đến hiện tại.',
  listicle:         'Dạng danh sách: mỗi H2 là một mục. Có số thứ tự trong tiêu đề.',
  profile:          'Bài về một đối tượng: giới thiệu → chi tiết → đánh giá.',
  review:           'Đánh giá đa chiều: tổng quan → thông số → ưu điểm → nhược điểm → kết luận.',
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  intimate:       'Giọng thân mật, gần gũi như tạp chí. Dùng "bạn".',
  formal:         'Giọng trang trọng, nghiêm túc. Dùng "quý độc giả" hoặc "bạn đọc".',
  friendly:       'Giọng ấm áp, thân thiện. Dùng "bạn".',
  expert:         'Giọng chuyên môn, có số liệu và phân tích sâu.',
  humorous:       'Giọng vui vẻ, được phép dùng ẩn dụ hài.',
  inspirational:  'Giọng truyền cảm hứng, tích cực.',
  nostalgic:      'Giọng hoài cổ, gợi nhớ, cảm xúc.',
  shocking:       'Giọng kịch tính, mở bài mạnh, thu hút ngay.',
  conversational: 'Giọng trò chuyện, như bạn bè nói chuyện.',
};

// ── Exported builders ──────────────────────────────────────────────────────────

export function buildOutlineInstruction(
  outlineMode: 'none' | 'ai' | 'custom',
  outline: string,
): string {
  if (outlineMode === 'none') {
    return `Bài viết không cần outline cứng. AI tự chọn cấu trúc phù hợp. Độ dài ~1.000–1.500 từ.`;
  }
  if (outlineMode === 'ai' || outlineMode === 'custom') {
    return `## Dàn ý bắt buộc thực hiện\n\n${outline}\n\nThực hiện đúng thứ tự các heading. Không thêm hoặc bỏ bớt.`;
  }
  return '';
}

export function buildSourcesBlock(sources: SourceItem[]): string {
  const validSources = sources.filter((s) => !s.error && s.content.length > 50);
  if (validSources.length === 0) {
    return '## Nguồn tham khảo\nKhông có nguồn URL. AI dùng kiến thức sẵn có.';
  }
  const lines = validSources.map((s, i) => {
    const tag = s.isUnique
      ? '[UNIQUE — dùng trực tiếp, có thể trích dẫn ý tưởng]'
      : '[DUPLICATE — BẮT BUỘC viết lại hoàn toàn, không copy câu nào]';
    return `### Nguồn ${i + 1}: ${s.title} ${s.isManual ? '(thủ công)' : `(${s.url})`}
${tag}
${s.content.slice(0, 2000)}${s.content.length > 2000 ? '\n...(còn nữa)' : ''}`;
  });
  return `## Nguồn tham khảo (${validSources.length} nguồn)\n\n${lines.join('\n\n---\n\n')}`;
}

export function buildStreamPrompt(
  config: SourceConfig,
  sources: SourceItem[],
  outline: string,
  brandPrompt: string,
): string {
  const forbidden          = mergeForbiddenWords(config.brandConfig?.forbiddenExtra).join(', ');
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;
  const toneInstruction      = TONE_INSTRUCTIONS[config.tone]           ?? TONE_INSTRUCTIONS.formal;

  return `
Bạn là Writer Agent — viết bài SEO chất lượng cao dựa trên nguồn tham khảo.

${brandPrompt}

## Thông tin đầu vào
- Từ khóa chính: ${config.keyword}
- Từ khóa phụ: ${(config.secondaryKeywords ?? []).join(', ') || 'không có'}
- Ngôn ngữ: ${config.language}
- Cấu trúc: ${structureInstruction}
- Giọng văn: ${toneInstruction}

${buildOutlineInstruction(config.outlineMode, outline)}

${buildSourcesBlock(sources)}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong một thẻ <article>.
- Có đúng 1 thẻ <h1>, mỗi section là <h2>, có thể có <h3> bên trong.
- Không thêm CSS, JavaScript, markdown fence hay lời giải thích ngoài bài.
- Từ khóa "${config.keyword}" xuất hiện tự nhiên — mật độ 1.0–1.5%.
- Không dùng các từ sau: ${forbidden || 'không có từ cấm riêng'}

## Quy tắc xử lý nguồn (BẮT BUỘC)
- Nguồn [UNIQUE]: học ý tưởng, số liệu, có thể paraphrase nhẹ.
- Nguồn [DUPLICATE]: TUYỆT ĐỐI không copy nguyên văn dù 1 câu.
- Tổng hợp ≥ 2 nguồn nếu có. Thêm góc nhìn thương hiệu ≥ 20% nội dung.
- Tiêu đề bài PHẢI khác hoàn toàn với tất cả tiêu đề nguồn.
- Mở bài: KHÔNG bắt đầu bằng "Theo [nguồn]..." — mở bằng tình huống/số liệu/câu hỏi.

## Viết như người thật
- Nhịp câu: xen kẽ câu ngắn 3–6 từ và câu trung bình 12–18 từ.
- Mở đoạn: luân phiên — số liệu cụ thể → câu hỏi → nhận xét → ví dụ thực tế.
- Không dùng: "không chỉ X mà còn Y", "Nhìn chung", "Không thể phủ nhận", "Chính vì vậy".
- Kết bài: nhận định ngắn thực tế hoặc CTA cụ thể.

Chỉ trả HTML.
`.trim();
}

export function applySeoOptions(html: string, config: SourceConfig): string {
  // Giữ nguyên logic từ stream/route.ts — xem file gốc
  return html; // Placeholder — copy từ stream/route.ts applySeoOptions()
}
```

---

## 4. Refactor — `lib/viet-theo-nguon/outline.ts`

> Tách phần generate outline ra để cả single-page và bulk đều dùng được

```typescript
import type { OutlineAIType } from './types';
import type { SourceItem } from './types';

/**
 * AI generate outline dựa trên keyword + sources
 * Dùng cho cả config page (single) và processor (bulk)
 */
export async function generateTheoNguonOutline(
  keyword: string,
  sources: SourceItem[],
  outlineAIType: OutlineAIType,
  language: string,
  model: any,  // buildTinhGonModel() result
): Promise<string> {
  const validSources = sources.filter((s) => !s.error && s.content.length > 50);
  const sourceContext = validSources.slice(0, 3).map((s, i) =>
    `Nguồn ${i + 1}: ${s.title}\n${s.content.slice(0, 1500)}`
  ).join('\n\n---\n\n');

  const prompt = `
Tạo dàn ý bài viết SEO cho từ khóa: "${keyword}"
Ngôn ngữ: ${language}
Loại dàn ý: ${outlineAIType}
Dựa trên các nguồn tham khảo sau:

${sourceContext || 'Không có nguồn — tạo dàn ý từ kiến thức'}

Yêu cầu:
- Format: [h2] Tiêu đề mục\n[h3] Tiêu đề phụ (nếu cần)
- Dàn ý phải khác với tất cả tiêu đề nguồn
- Tập trung vào keyword "${keyword}"
- Chỉ trả dàn ý, không giải thích

Chỉ trả dàn ý dạng text thuần.
`.trim();

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    // Fallback: dàn ý cơ bản
    return `[h2] Tổng quan về ${keyword}\n[h2] Ưu điểm và đặc điểm nổi bật\n[h2] Hướng dẫn lựa chọn\n[h2] Câu hỏi thường gặp`;
  }
}
```

---

## 5. Processor — `lib/viet-hang-loat-theo-nguon/processor.ts`

```typescript
import type { BulkTheoNguonConfig, BulkTnStep, ProcessResult } from './types';
import type { SourceItem } from '@/lib/viet-theo-nguon/types';
import { buildStreamPrompt, applySeoOptions } from '@/lib/viet-theo-nguon/writing';
import { generateTheoNguonOutline }            from '@/lib/viet-theo-nguon/outline';
import { buildTinhGonModel }                   from '@/lib/tinh-gon/model';
import { analyzeHumanness }                    from '@/lib/tinh-gon/humanness';
import { sanitizeHtmlArticle, countWords, computeKeywordDensity, buildMetaDescription }
                                               from '@/lib/tinh-gon/text';
import { buildBrandPrompt }                    from '@/app/api/pipeline/_context';
import { prisma }                              from '@/lib/prisma';

export async function processTnKeyword(
  keyword:    string,
  config:     BulkTheoNguonConfig,
  sources:    SourceItem[],         // Pre-crawled sources từ BulkJob.configJson._crawledSources
  articleId:  string,
  onStep: (step: BulkTnStep, detail: string, progress: number) => void,
): Promise<ProcessResult> {

  const model       = buildTinhGonModel(config.model);
  const brandPrompt = await buildBrandPrompt(config.brand);

  // ── Bước 1: Outline (nếu ai_outline) ─────────────────────────────────────

  let outline = '';
  const totalSteps = config.outlineMode === 'ai_outline' ? 3 : 2;
  let currentStep  = 0;

  if (config.outlineMode === 'ai_outline') {
    onStep('outline', `Tạo dàn ý cho: ${keyword}`, Math.round((++currentStep / totalSteps) * 100));

    outline = await generateTheoNguonOutline(
      keyword,
      sources,
      config.outlineAIType,
      config.language,
      model,
    );
  }

  // ── Bước 2: Viết bài ──────────────────────────────────────────────────────

  onStep('writing', `Đang viết bài: ${keyword}`, Math.round((++currentStep / totalSteps) * 100));

  // Build SourceConfig-compatible object cho buildStreamPrompt
  const sourceConfig = {
    keyword,
    secondaryKeywords: [],
    language:  config.language,
    outlineMode: config.outlineMode === 'ai_outline' ? 'ai' : 'none',
    outlineAIType: config.outlineAIType,
    customOutline: '',
    structure: config.structure,
    tone:      config.tone,
    model:     config.model,
    targetLength: 1500,
    imageOption:  config.imageOption,
    seoOptions:   config.seoOptions,
    brandConfig:  config.brand.enabled ? { forbiddenExtra: config.brand.forbiddenExtra } : undefined,
  } as any;  // Cast — SourceConfig có một số fields không cần ở đây

  const prompt = buildStreamPrompt(sourceConfig, sources, outline, brandPrompt);

  let rawOutput = '';
  try {
    const streamResp = await model.generateContentStream(prompt);
    for await (const chunk of streamResp) {
      const text = chunk.text();
      if (text) rawOutput += text;
    }
  } catch {
    const fallback = await model.generateContent(prompt);
    rawOutput = fallback.response.text();
  }

  // ── Bước 3: Score + Save ──────────────────────────────────────────────────

  onStep('scoring', `Chấm điểm & lưu: ${keyword}`, Math.round((++currentStep / totalSteps) * 100));

  let html       = sanitizeHtmlArticle(rawOutput, keyword);
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title    = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : keyword;

  html = applySeoOptions(html, sourceConfig);

  const wordCount      = countWords(html);
  const keywordDensity = computeKeywordDensity(html, keyword);
  const humanness      = analyzeHumanness(html, config.brand?.forbiddenExtra);
  const metaDescription = buildMetaDescription(title, keyword);

  // Đếm valid sources
  const validSources = sources.filter((s) => !s.error && s.content.length > 50);

  await prisma.article.update({
    where: { id: articleId },
    data:  {
      selectedTitle:     title,
      htmlContent:       html,
      metaDescription,
      wordCount,
      status:            'WRITTEN',
      aiDecision:        humanness.decision,
      humannessScore:    humanness.score,
      seoChecks:         { keywordDensity },
      scoreBreakdown:    { humanness, keywordDensity },
      secondaryKeywords: [],
      outline: {
        stage:   'generate',
        config:  sourceConfig,
        outline,
        _sources: validSources.map((s) => ({ url: s.url, title: s.title, crawled: !s.isManual })),
      },
    },
  });

  return {
    articleId,
    title,
    wordCount,
    humanness:    humanness.score,
    sourcesCount: validSources.length,
  };
}
```

---

## 6. API: `/api/vhltn/crawl/route.ts`

> Proxy nhỏ — tái sử dụng `crawlUrls()` từ `lib/viet-theo-nguon/crawler.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z }                         from 'zod';
import { requireAuth }               from '@/lib/server-auth';
import { crawlUrls }                 from '@/lib/viet-theo-nguon/crawler';

export const runtime    = 'nodejs';
export const maxDuration = 30;   // 5 URLs × 8s timeout + buffer

const schema = z.object({
  urls: z.array(z.string().url()).min(1).max(5),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body   = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 });
    }
    const sources = await crawlUrls(parsed.data.urls);
    return NextResponse.json({ sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}
```

---

## 7. API: `/api/vhltn/enqueue/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma }                    from '@/lib/prisma';
import { requireAuth }               from '@/lib/server-auth';
import type { VhltnEnqueueRequest, VhltnEnqueueResponse } from '@/lib/viet-hang-loat-theo-nguon/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json() as VhltnEnqueueRequest;

    const { config, crawledSources } = body;

    if (!config.keywords || config.keywords.length === 0) {
      return NextResponse.json({ error: 'Cần ít nhất 1 từ khóa' }, { status: 400 });
    }
    if (crawledSources.length === 0) {
      return NextResponse.json({ error: 'Cần ít nhất 1 nguồn đã crawl' }, { status: 400 });
    }

    // Deduplicate keywords
    let keywords = config.keywords.map((k) => k.trim()).filter(Boolean);
    let skippedCount = 0;

    if (config.duplicateMode === 'reject') {
      const seen = new Set<string>();
      keywords = keywords.filter((k) => {
        const lower = k.toLowerCase();
        if (seen.has(lower)) { skippedCount++; return false; }
        seen.add(lower);
        return true;
      });
    }

    if (keywords.length === 0) {
      return NextResponse.json({ error: 'Tất cả từ khóa bị trùng lặp' }, { status: 400 });
    }

    // Tạo BulkJob với _crawledSources embed vào configJson
    const bulkJob = await prisma.bulkJob.create({
      data: {
        userId:    user.userId,
        jobType:   'theo-nguon',
        status:    'PENDING',
        totalCount: keywords.length,
        doneCount:  0,
        configJson: {
          ...config,
          keywords,
          _crawledSources: crawledSources,   // Crawled sources lưu 1 lần tại đây
        },
      },
    });

    // Tạo Article placeholder cho từng keyword
    const articles = await Promise.all(
      keywords.map((keyword, i) =>
        prisma.article.create({
          data: {
            userId:     user.userId,
            bulkJobId:  bulkJob.id,
            bulkIndex:  i,
            status:     'PENDING',
            keyword,
            language:   config.language,
            contentType: `viet_hang_loat_theo_nguon:${config.structure}`,
            targetLength: 1500,
            aiProvider:  config.model,
            brandConfig: config.brand as never ?? {},
            selectedTitle: config.titleMode === 'keyword_as_title' ? keyword : '',
            htmlContent: '',
            outline: {
              stage:   'pending',
              _sources: crawledSources.map((s) => ({ url: s.url, title: s.title })),
            },
          },
        })
      )
    );

    return NextResponse.json({
      jobId:        bulkJob.id,
      articleCount: articles.length,
      skippedCount,
    } satisfies VhltnEnqueueResponse);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}
```

---

## 8. API: `/api/vhltn/process/[jobId]/route.ts`

```typescript
import { NextRequest }  from 'next/server';
import { prisma }       from '@/lib/prisma';
import { requireAuth }  from '@/lib/server-auth';
import { processTnKeyword } from '@/lib/viet-hang-loat-theo-nguon/processor';
import type { BulkTheoNguonConfig, VhltnSSEEvent } from '@/lib/viet-hang-loat-theo-nguon/types';
import type { SourceItem } from '@/lib/viet-theo-nguon/types';

export const runtime     = 'nodejs';
export const maxDuration = 300;

const DELAY_MS     = 1500;
const KEEPALIVE_MS = 30_000;

function encode(event: VhltnSSEEvent): string {
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

    // Lấy pending articles
    const articles = await prisma.article.findMany({
      where: { bulkJobId: jobId, status: 'PENDING' },
      orderBy: { bulkIndex: 'asc' },
    });

    if (articles.length === 0) {
      return new Response(JSON.stringify({ error: 'Không có bài cần xử lý' }), { status: 400 });
    }

    const config  = job.configJson as BulkTheoNguonConfig;
    const sources = (config._crawledSources ?? []) as SourceItem[];

    await prisma.bulkJob.update({ where: { id: jobId }, data: { status: 'RUNNING' } });

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: VhltnSSEEvent) => controller.enqueue(new TextEncoder().encode(encode(event)));

        // Keepalive timer
        const keepalive = setInterval(() => {
          try { controller.enqueue(new TextEncoder().encode(': keepalive\n\n')); } catch {}
        }, KEEPALIVE_MS);

        let successCount = 0;
        let errorCount   = 0;
        const total      = articles.length;

        try {
          for (let i = 0; i < articles.length; i++) {
            const article = articles[i];

            // Kiểm tra job chưa bị pause
            const fresh = await prisma.bulkJob.findUnique({ where: { id: jobId }, select: { status: true } });
            if (fresh?.status === 'PAUSED' || fresh?.status === 'CANCELLED') break;

            send({ type: 'item_start', articleId: article.id, keyword: article.keyword, index: i, total });

            await prisma.article.update({ where: { id: article.id }, data: { status: 'WRITING' } });

            try {
              const result = await processTnKeyword(
                article.keyword,
                config,
                sources,
                article.id,
                (step, detail, progress) => send({ type: 'item_step', articleId: article.id, step, detail, progress }),
              );

              successCount++;
              send({
                type:         'item_done',
                articleId:    result.articleId,
                keyword:      article.keyword,
                title:        result.title,
                wordCount:    result.wordCount,
                humanness:    result.humanness,
                sourcesCount: result.sourcesCount,
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

            // Delay giữa các bài (skip sau bài cuối)
            if (i < articles.length - 1) {
              await new Promise((r) => setTimeout(r, DELAY_MS));
            }
          }

          // Job xong
          await prisma.bulkJob.update({
            where: { id: jobId },
            data:  { status: 'DONE' },
          });

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

## 9. API: `/api/vhltn/jobs/[jobId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma }                    from '@/lib/prisma';
import { requireAuth }               from '@/lib/server-auth';

export const runtime = 'nodejs';

// GET — lấy job status + articles list
export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    const user = await requireAuth();
    const job = await prisma.bulkJob.findFirst({
      where: { id: params.jobId, userId: user.userId },
    });
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const articles = await prisma.article.findMany({
      where:   { bulkJobId: params.jobId },
      orderBy: { bulkIndex: 'asc' },
      select:  { id: true, keyword: true, status: true, selectedTitle: true, wordCount: true, humannessScore: true },
    });

    // Strip _crawledSources từ configJson trước khi trả về (tránh response quá lớn)
    const { _crawledSources, ...safeConfig } = (job.configJson as any) ?? {};
    const crawledSummary = (_crawledSources as any[] ?? []).map((s: any) => ({
      url:      s.url,
      title:    s.title,
      isUnique: s.isUnique,
      error:    s.error,
    }));

    return NextResponse.json({ job: { ...job, configJson: safeConfig }, articles, crawledSummary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// PATCH — pause / resume / cancel
export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    const user = await requireAuth();
    const { action } = await request.json() as { action: 'pause' | 'resume' | 'cancel' };
    const statusMap = { pause: 'PAUSED', resume: 'PENDING', cancel: 'CANCELLED' } as const;
    const newStatus = statusMap[action];
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

## 10. Config Page — `/viet-hang-loat-theo-nguon/page.tsx`

### 10.1 Khối 1 — Keywords + URL sources (mở rộng)

```tsx
{/* ── PHẦN 1A: Keywords textarea ─────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    Danh sách từ khóa
  </label>
  <p className="text-xs text-gray-400 mb-2">
    Mỗi dòng = 1 bài viết · Tối đa 50 từ khóa · Tất cả bài dùng chung bộ nguồn bên dưới
  </p>
  <textarea
    value={keywordsText}
    onChange={(e) => setKeywordsText(e.target.value)}
    rows={8}
    placeholder={"giường sắt đơn giá rẻ\ntủ quần áo 3 cánh gỗ ép\nkệ sách gỗ tự nhiên\n..."}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y font-mono"
  />
  <div className="flex items-center justify-between mt-1.5">
    <p className="text-xs text-gray-400">{parsedKeywords.length}/50 từ khóa</p>
    {parsedKeywords.length > 50 && (
      <p className="text-xs text-red-500">Vượt giới hạn — chỉ 50 từ khóa đầu được xử lý</p>
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
          {mode === 'keyword_as_title' ? 'Dùng từ khóa làm tiêu đề' : 'AI tự tạo tiêu đề'}
        </span>
      </label>
    ))}
  </div>
</div>

{/* ── PHẦN 1B: Article Structure (từ viet-theo-nguon) ─────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-2">Cấu trúc bài viết</label>
  <div className="grid grid-cols-2 gap-2">
    {ARTICLE_STRUCTURES.map((s) => (
      <button
        key={s.value}
        onClick={() => setStructure(s.value)}
        title={s.note}
        className={`text-left p-2 rounded-lg border text-xs transition-colors ${
          structure === s.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-600'
        }`}
      >
        <span className="mr-1">{s.icon}</span>
        <span className="font-medium">{s.label}</span>
      </button>
    ))}
  </div>
</div>

{/* ── PHẦN 1C: URL sources + Crawl ─────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    Nguồn URL (dùng chung cho tất cả bài)
  </label>
  <p className="text-xs text-gray-400 mb-3">
    2–5 URL nguồn · AI dùng nội dung này để viết tất cả bài trong batch
  </p>

  <div className="space-y-2 mb-3">
    {urlInputs.map((url, i) => (
      <div key={i} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { const next = [...urlInputs]; next[i] = e.target.value; setUrlInputs(next); }}
          placeholder={`URL nguồn ${i + 1}... (https://)`}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {urlInputs.length > 1 && (
          <button onClick={() => setUrlInputs(urlInputs.filter((_, j) => j !== i))} className="px-2 text-gray-400 hover:text-red-500">✕</button>
        )}
      </div>
    ))}
  </div>

  <div className="flex gap-3">
    {urlInputs.length < 5 && (
      <button onClick={() => setUrlInputs([...urlInputs, ''])} className="text-xs text-blue-600 hover:underline">
        + Thêm URL
      </button>
    )}
    <button
      onClick={() => void handleCrawl()}
      disabled={crawling}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
    >
      {crawling ? (
        <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang thu thập...</>
      ) : '🔍 Thu Thập'}
    </button>
  </div>

  {crawlError && <p className="text-xs text-red-600 mt-2">{crawlError}</p>}
  <p className="text-xs text-gray-400 mt-2">Nếu AI không đọc được URL, dùng "Thêm nội dung thủ công".</p>

  {/* Sources preview — giống viet-theo-nguon page.tsx section 8.5 */}
  {crawledSources.length > 0 && (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-gray-600">Kết quả thu thập ({crawledSources.length} nguồn)</p>
      {crawledSources.map((s, i) => (
        <div key={i} className={`rounded-lg border p-3 ${
          s.error ? 'bg-red-50 border-red-200' :
          s.isUnique ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-gray-800 truncate flex-1">
              {s.isManual ? '📝 Thủ công' : `🔗 ${s.url.slice(0, 60)}`}
            </p>
            {s.error ? (
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">❌ Lỗi</span>
            ) : s.isUnique ? (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Unique</span>
            ) : (
              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">⚠️ Duplicate</span>
            )}
          </div>
          {!s.error && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.title}</p>}
          {s.error && <p className="text-xs text-red-600 mt-1">{s.error}</p>}
          {!s.error && <p className="text-[10px] text-gray-400 mt-1">{s.wordCount.toLocaleString()} từ</p>}
        </div>
      ))}

      {/* Manual content fallback */}
      <button onClick={() => setShowManual(!showManual)} className="text-xs text-blue-600 hover:underline mt-1">
        {showManual ? '▲ Ẩn' : '▼ Thêm nội dung thủ công'}
      </button>
      {showManual && (
        <textarea
          value={manualContent}
          onChange={(e) => setManualContent(e.target.value)}
          placeholder="Paste nội dung nếu URL không thể crawl..."
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-y"
        />
      )}
    </div>
  )}
</div>
```

### 10.2 Khối 4 — Outline (no/ai chỉ, không có user_outline)

```tsx
{/* ── KHỐI 4: Outline mode ─────────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-3">Dàn ý bài viết</label>

  <div className="space-y-2">
    <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
      outlineMode === 'no_outline' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <input type="radio" className="mt-0.5" checked={outlineMode === 'no_outline'} onChange={() => setOutlineMode('no_outline')} />
      <div>
        <p className="text-sm font-medium text-gray-700">Không dàn ý</p>
        <p className="text-xs text-gray-400">AI tự viết theo nguồn — ~1.000–1.500 từ/bài</p>
      </div>
    </label>

    <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
      outlineMode === 'ai_outline' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <input type="radio" className="mt-0.5" checked={outlineMode === 'ai_outline'} onChange={() => setOutlineMode('ai_outline')} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">
          AI Outline <span className="text-xs text-blue-600 font-semibold">(Khuyên dùng)</span>
        </p>
        <p className="text-xs text-gray-400 mb-2">AI tạo dàn ý riêng cho từng keyword — chất lượng cao hơn</p>

        {outlineMode === 'ai_outline' && (
          <div className="grid grid-cols-2 gap-1 mt-2">
            {OUTLINE_AI_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setOutlineAIType(o.value)}
                className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                  outlineAIType === o.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                <span className="font-medium">{o.label}</span>
                <span className="block text-[10px] text-gray-400">{o.estWords} từ</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  </div>

  {/* NOTE: Không có "Dàn ý tùy chỉnh" — bulk mode không thể per-keyword outline */}
  <p className="text-[10px] text-gray-400 mt-2">
    💡 Dàn ý tùy chỉnh không khả dụng trong chế độ hàng loạt — mỗi bài có keyword khác nhau.
  </p>
</div>
```

### 10.3 handleCrawl() — giống viet-theo-nguon

```typescript
async function handleCrawl() {
  const validUrls = urlInputs.filter((u) => u.trim().startsWith('http'));
  if (validUrls.length === 0) {
    setCrawlError('Vui lòng nhập ít nhất 1 URL hợp lệ');
    return;
  }

  setCrawling(true);
  setCrawlError('');
  setCrawledSources([]);

  try {
    const res  = await fetch('/api/vhltn/crawl', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: validUrls }),
    });
    const data = await res.json() as { sources?: any[]; error?: string };
    if (!res.ok) throw new Error(data.error || 'Crawl thất bại');

    const allSources = [...(data.sources ?? [])];
    if (manualContent.trim()) {
      allSources.push({
        url: 'manual', title: 'Nội dung thủ công',
        content: manualContent.trim(),
        wordCount: manualContent.trim().split(/\s+/).filter(Boolean).length,
        isUnique: true, isManual: true,
      });
    }

    setCrawledSources(allSources);
  } catch (err) {
    setCrawlError(err instanceof Error ? err.message : 'Không thể crawl');
  } finally {
    setCrawling(false);
  }
}
```

### 10.4 handleSubmit() — validation + enqueue

```typescript
async function handleSubmit() {
  const keywords = keywordsText.split('\n').map((k) => k.trim()).filter(Boolean).slice(0, 50);
  if (keywords.length === 0) { setError('Cần ít nhất 1 từ khóa'); return; }
  if (crawledSources.length === 0) { setError('Cần thu thập ít nhất 1 nguồn URL trước'); return; }

  setLoading(true);
  setError('');

  const config = {
    keywords,
    duplicateMode,
    titleMode,
    structure,
    outlineMode,
    outlineAIType,
    imageOption,
    language,
    tone,
    model,
    brand: brandInfo,
    seoOptions: {
      mainLink:      seoMainLink.trim() || undefined,
      keywordLinks:  seoKeywordLinks.trim() || undefined,
      boldKeyword,
      boldHeading,
      footerContent: footerContent.trim() || undefined,
    },
    urlInputs,
  };

  try {
    const res  = await fetch('/api/vhltn/enqueue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, crawledSources }),
    });
    const data = await res.json() as { jobId?: string; articleCount?: number; skippedCount?: number; error?: string };
    if (!res.ok) throw new Error(data.error || 'Không thể tạo job');

    sessionStorage.setItem('vhltn_config', JSON.stringify(config));
    sessionStorage.setItem('vhltn_jobId',  data.jobId!);
    // Lưu summary sources (không lưu full content vào sessionStorage)
    sessionStorage.setItem('vhltn_sources_summary', JSON.stringify(
      crawledSources.map((s) => ({ url: s.url, title: s.title, isUnique: s.isUnique, error: s.error }))
    ));

    router.push('/viet-hang-loat-theo-nguon/queue');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    setLoading(false);
  }
}
```

### 10.5 Submit button — validation guard

```tsx
<button
  onClick={() => void handleSubmit()}
  disabled={loading || parsedKeywords.length === 0 || crawledSources.length === 0}
  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
>
  {loading ? 'Đang tạo job...' : `🚀 Viết ${Math.min(parsedKeywords.length, 50)} bài từ nguồn`}
</button>

{crawledSources.length === 0 && parsedKeywords.length > 0 && (
  <p className="text-xs text-orange-600 text-center mt-2">
    ⚠️ Cần thu thập nguồn URL trước khi có thể submit
  </p>
)}
```

---

## 11. Queue Page — `/viet-hang-loat-theo-nguon/queue/page.tsx`

> Copy pattern từ `/viet-hang-loat-google-search/queue` — sửa các key sau:

| # | Điểm | Google Search | **Theo Nguồn** |
|---|------|---------------|----------------|
| 1 | sessionStorage key | `vhlgs_jobId` | **`vhltn_jobId`** |
| 2 | Process API | `/api/vhlgs/process/[jobId]` | **`/api/vhltn/process/[jobId]`** |
| 3 | Job status API | `/api/vhlgs/jobs/[jobId]` | **`/api/vhltn/jobs/[jobId]`** |
| 4 | Article view link | `/viet-hang-loat-google-search/[id]` | **`/viet-hang-loat-theo-nguon/[id]`** |
| 5 | Warning banner | SerpAPI rate limit | **Không có warning đặc biệt** |
| 6 | Steps hiển thị | searching/crawling/synthesizing/writing/scoring | **outline (nếu ai)/writing/scoring** |
| 7 | Estimated time | 60–120s/bài | **30–50s/bài** |
| 8 | Sources panel | Hiện URL từ search | **Hiện crawled sources từ job config** |

### 11.1 Sources summary panel trên Queue page

```tsx
{/* Hiện sources đã crawl — lấy từ API GET /api/vhltn/jobs/[jobId] */}
{crawledSummary.length > 0 && (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
    <p className="text-xs font-semibold text-gray-600 mb-2">
      Nguồn đang dùng ({crawledSummary.length} URL)
    </p>
    <div className="space-y-1">
      {crawledSummary.map((s, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className={s.isUnique ? 'text-green-600' : s.error ? 'text-red-500' : 'text-orange-500'}>
            {s.error ? '❌' : s.isUnique ? '✅' : '⚠️'}
          </span>
          <span className="truncate text-gray-600 flex-1">{s.title || s.url}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## 12. Article View — `/viet-hang-loat-theo-nguon/[id]/page.tsx`

> Reuse generate page editor của `viet-theo-nguon/generate` — sửa các điểm:

| # | Điểm | viet-theo-nguon/generate | **viet-hang-loat-theo-nguon/[id]** |
|---|------|--------------------------|-------------------------------------|
| 1 | Data source | sessionStorage | **GET /api/articles/${id}** |
| 2 | Start generation | Auto on load | **Article đã WRITTEN — hiện ngay** |
| 3 | Re-generate | Có | **Có — gọi lại `/api/vhltn/rewrite/[id]`** (optional) |
| 4 | Tab "Nguồn" | Sources từ sessionStorage | **Sources từ `article.outline._sources`** |
| 5 | "Bài mới" | `/viet-theo-nguon` | **`/viet-hang-loat-theo-nguon`** |
| 6 | "Back" button | N/A | **Link về `/viet-hang-loat-theo-nguon/queue?jobId=...`** |

### 12.1 Load article từ DB

```typescript
useEffect(() => {
  async function loadArticle() {
    const res  = await fetch(`/api/articles/${params.id}`);
    const data = await res.json() as { article?: any };
    if (data.article) {
      setHtml(data.article.htmlContent ?? '');
      setTitle(data.article.selectedTitle ?? '');
      // Parse sources từ outline field
      const sources = (data.article.outline as any)?._sources ?? [];
      setSources(sources);
    }
  }
  void loadArticle();
}, [params.id]);
```

---

## 13. sessionStorage Keys

| Key | Giá trị | Dùng ở |
|-----|---------|--------|
| `vhltn_config` | `BulkTheoNguonConfig` (không có `_crawledSources`) | Config page → Queue page |
| `vhltn_jobId` | string | Config page → Queue page |
| `vhltn_sources_summary` | `{url, title, isUnique, error}[]` | UI display only (không có full content) |

> **Lưu ý:** `_crawledSources` (full content) chỉ lưu trong `BulkJob.configJson` trên DB —  
> KHÔNG lưu vào sessionStorage vì có thể lên tới 40KB (5 nguồn × 8000 ký tự).

---

## 14. BulkJob Schema — Prisma (không cần thêm field mới)

Dùng model `BulkJob` hiện có:

```
BulkJob {
  jobType:    'theo-nguon'         ← jobType phân biệt với smart/tu-khoa/tinh-gon/google-search
  configJson: {
    keywords:          string[]
    duplicateMode:     'allow' | 'reject'
    titleMode:         'keyword_as_title' | 'ai_title'
    structure:         ArticleStructure
    outlineMode:       'no_outline' | 'ai_outline'
    outlineAIType:     OutlineAIType
    imageOption:       '0' | 'yandex' | 'ai' | 'shutterstock'
    language:          string
    tone:              ArticleTone
    model:             string
    brand:             {...}
    seoOptions:        {...}
    urlInputs:         string[]    ← lưu để restore UI
    _crawledSources:   SourceItem[]  ← content đầy đủ, 8000 ký tự/nguồn
  }
}
```

---

## 15. Ngoại lệ khối — So với 8 khối chuẩn

| Khối | Thay đổi |
|------|---------|
| Khối 1 | **Mở rộng**: keywords textarea + Duplicate mode + Title mode + Article Structure + URL inputs + crawl button + sources preview |
| Khối 4 | **Giảm xuống 2 mode**: chỉ `no_outline` và `ai_outline` (không có `user_outline`) |
| Khối 5 | Giữ nguyên `ArticleTone` (viet-theo-nguon có tone riêng, dùng `ARTICLE_TONES`) |
| Khối 8 | **Mở rộng**: thêm SEO options từ viet-theo-nguon (mainLink, keywordLinks, boldKeyword, boldHeading, footerContent) |

---

## 16. Sidebar + Homepage

```tsx
// Sidebar — group "Viết Hàng Loạt"
{ label: 'Theo Nguồn', href: '/viet-hang-loat-theo-nguon' }

// Homepage card
{
  title:       'Viết Hàng Loạt — Theo Nguồn',
  description: 'Nhập URLs nguồn, viết hàng loạt bài từ cùng bộ nguồn với nhiều keyword khác nhau',
  color:       'from-violet-500 to-violet-700',
  href:        '/viet-hang-loat-theo-nguon',
  icon:        '📦',
}
```

---

## 17. Thứ tự implement

| Bước | File | Phụ thuộc |
|------|------|-----------|
| 1 | **Refactor** `lib/viet-theo-nguon/writing.ts` | Extract từ stream/route.ts |
| 2 | **Refactor** `lib/viet-theo-nguon/outline.ts` | Extract AI outline logic |
| 3 | `lib/viet-hang-loat-theo-nguon/types.ts` | — |
| 4 | `lib/viet-hang-loat-theo-nguon/processor.ts` | Cần bước 1, 2 |
| 5 | `api/vhltn/crawl/route.ts` | Dùng `crawler.ts` có sẵn |
| 6 | `api/vhltn/enqueue/route.ts` | Cần types |
| 7 | `api/vhltn/process/[jobId]/route.ts` | Cần processor |
| 8 | `api/vhltn/jobs/[jobId]/route.ts` | — |
| 9 | `app/viet-hang-loat-theo-nguon/page.tsx` | Config form |
| 10 | `app/viet-hang-loat-theo-nguon/queue/page.tsx` | Copy + sửa từ vhlgs queue |
| 11 | `app/viet-hang-loat-theo-nguon/[id]/page.tsx` | Copy + sửa từ viet-theo-nguon generate |
| 12 | Sidebar + Homepage | — |

---

## 18. Lưu ý kỹ thuật quan trọng

### A. Crawl một lần — dùng nhiều lần
```typescript
// BulkJob.configJson._crawledSources được set tại enqueue
// Processor đọc từ job.configJson — không crawl lại mỗi bài
// → Tiết kiệm network + tránh block IP
// → Risk: nếu crawl fail một số URL → tất cả bài đều thiếu nguồn đó
//    → Giải quyết: hiện warning rõ ở queue page khi có URL crawl fail
```

### B. Kích thước configJson
```typescript
// _crawledSources max: 5 URLs × 8000 ký tự = 40.000 ký tự ≈ 40KB JSON
// JSONB field PostgreSQL có thể handle tốt với kích thước này
// Nhưng khi GET job status → strip _crawledSources (trả crawledSummary thay thế)
//   xem: GET /api/vhltn/jobs/[jobId] section 9
```

### C. Giữ nguyên Unique/Duplicate trong processor
```typescript
// _crawledSources đã có isUnique flag từ Jaccard check tại enqueue
// processor.ts dùng sources này nguyên vẹn → buildSourcesBlock() đánh tag [UNIQUE]/[DUPLICATE] đúng
// Không cần chạy lại Jaccard per-article
```

### D. Keepalive — ít critical hơn Google Search
```typescript
// Mỗi bài ~30–50s — vẫn cần keepalive nhưng ít nguy cơ timeout hơn GS variant
// Comment ": keepalive\n\n" mỗi 30s vẫn là best practice
```

### E. titleMode xử lý trong processor
```typescript
// titleMode = 'keyword_as_title': H1 trong HTML do AI tạo, nhưng selectedTitle = keyword
// titleMode = 'ai_title': selectedTitle = title extract từ <h1> của AI
// Implement trong processTnKeyword():
const finalTitle = config.titleMode === 'keyword_as_title' ? keyword : title;
await prisma.article.update({ data: { selectedTitle: finalTitle, ... } });
```

### F. maxDuration của process route
```typescript
// 50 bài × 50s = 2.500s → vượt maxDuration = 300
// → Giải quyết: Queue page gọi process nhiều lần (mỗi call xử lý 1 batch nhỏ)
//   hoặc dùng background job runner
// → Trong spec này: maxDuration = 300 → xử lý tối đa ~6 bài/lần (300/50s)
// → Queue page tự động re-call khi nhận job_done với còn pending articles
//   (xem pattern từ viet-hang-loat-thong-minh queue page)
```
