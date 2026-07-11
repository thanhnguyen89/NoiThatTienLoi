# VIET-THEO-NGUON-IMPLEMENTATION.md
## Hướng dẫn code tính năng "AI Viết Bài Theo Nguồn URL"

> Phân tích từ: https://aiktp.com/vi/write-step-1-source  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini/OpenAI API

---

## 1. Tổng quan kiến trúc

### Điểm khác biệt so với các tính năng hiện có

| | Viết tinh gọn | Viết tin tức | **Viết theo nguồn** |
|---|---|---|---|
| Nguồn dữ liệu | AI thuần | Google News RSS tự động | **User cung cấp URL** |
| Outline | 3 bước (Config→Outline→Generate) | Không outline | **Nhiều chiến lược outline** |
| Số bước | 3 | 2 | **2 (Config → Generate)** |
| Độ dài | 800–1.500 từ | 400–800 từ | **1.000–3.000+ từ** |
| Crawl | Không | Không | **Có — server crawl URL** |
| Unique/Duplicate | Không | Không | **Có — phân tích nội dung nguồn** |
| SEO options | Không | Không | **Có — inject link, bold, footer** |

### Flow hoạt động

```
User nhập keyword + URL nguồn
     ↓ Bấm "Thu Thập"
POST /api/viet-theo-nguon/crawl
     → Server fetch từng URL (timeout 8s)
     → Extract title + text content
     → Phân tích Unique vs Duplicate (Jaccard)
     → Trả về SourceItem[] để hiện preview
     ↓ User xem preview, thêm thủ công nếu cần
     ↓ Bấm "Viết bài"
POST /api/viet-theo-nguon/start
     → Tạo Article record
     → Lưu sources + config vào outline field
     ↓ Redirect → /viet-theo-nguon/generate
POST /api/viet-theo-nguon/stream (SSE)
     → Render nguồn trong sidebar (Nguồn tab)
     → AI đọc sources + viết bài
     → analyzeHumanness + SEO metrics
     → Post-process: inject links, bold keywords
     → Update Article DB
     ↓ Editor + SEO + AI Check panel + Save/Publish
```

### Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-theo-nguon/
│   │   ├── page.tsx                    ← Config form (Step 1)
│   │   └── generate/
│   │       └── page.tsx                ← Editor + Sources (Step 2)
│   └── api/
│       └── viet-theo-nguon/
│           ├── crawl/
│           │   └── route.ts            ← Crawl URL → extract content
│           ├── start/
│           │   └── route.ts            ← Tạo Article + lưu sources
│           └── stream/
│               └── route.ts            ← SSE stream AI viết bài
└── lib/
    └── viet-theo-nguon/
        ├── types.ts                    ← Types riêng
        ├── options.ts                  ← Constants (outline, tone, model)
        └── crawler.ts                  ← URL fetch + content extraction
```

### File tái sử dụng (KHÔNG tạo mới)

- `lib/tinh-gon/humanness.ts` → `analyzeHumanness()`
- `lib/tinh-gon/text.ts` → `countWords()`, `computeKeywordDensity()`, `buildMetaDescription()`, `sanitizeHtmlArticle()`
- `lib/tinh-gon/model.ts` → `buildTinhGonModel()`
- `lib/tinh-gon/forbidden.ts` → `mergeForbiddenWords()`
- `lib/tinh-gon/persistence.ts` → `createTinhGonRunId()`
- `app/api/pipeline/_context.ts` → `buildBrandPrompt()`
- `components/tinh-gon/HumannessPanel.tsx`
- `components/tinh-gon/KeywordDensityBar.tsx`
- `app/components/AICheckPanel.tsx`
- `app/api/tinh-gon/ai-edit/route.ts` (dùng lại nguyên)
- `app/api/tinh-gon/humanness/route.ts` (dùng lại nguyên)
- `app/api/articles/by-runid/[runId]/route.ts` (DB resume)
- `app/api/articles/[id]/save/route.ts`
- `lib/seo-weights.ts`

---

## 2. Types — `web/lib/viet-theo-nguon/types.ts`

```typescript
import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

// ── Crawled source ────────────────────────────────────────────────────────────

export interface SourceItem {
  url:        string;           // URL gốc
  title:      string;           // Title extracted từ <title> hoặc <h1>
  content:    string;           // Text content (stripped HTML)
  wordCount:  number;
  isUnique:   boolean;          // true = content gốc / false = cần rewrite
  isManual:   boolean;          // true = user paste thủ công
  error?:     string;           // Nếu crawl fail
}

// ── Outline options ───────────────────────────────────────────────────────────

export type OutlineMode =
  | 'none'        // Không outline — AI tự viết
  | 'ai'          // AI tạo outline tự động
  | 'custom';     // User tự nhập outline

export type OutlineAIType =
  | 'h2h3_detail' // Chi tiết h2+h3 ~2500+ từ
  | 'h2_10'       // 9-10 h2 ~3000 từ
  | 'h2_8'        // 7-8 h2 ~2500 từ
  | 'h2_6'        // 5-6 h2 ~2000 từ
  | 'h2_4'        // 3-4 h2 ~1500 từ
  | 'problem'     // Vấn đề & Giải pháp
  | 'step'        // Step by Step
  | 'compare'     // So sánh A vs B
  | 'story';      // Kể chuyện

export type ArticleStructure =
  | 'auto'
  | 'inverted_pyramid'
  | 'storytelling'
  | 'qa'
  | 'how_to'
  | 'pro_con'
  | 'historical'
  | 'listicle'
  | 'profile'
  | 'review';

export type ArticleTone =
  | 'intimate'
  | 'formal'
  | 'friendly'
  | 'expert'
  | 'humorous'
  | 'inspirational'
  | 'nostalgic'
  | 'shocking'
  | 'conversational';

// ── SEO injection options ─────────────────────────────────────────────────────

export interface SeoOptions {
  mainLink?:      string;   // Link gắn vào từ khóa chính
  keywordLinks?:  string;   // "kw1|url1\nkw2|url2" format
  boldKeyword:    boolean;  // Auto-bold từ khóa chính
  boldHeading:    boolean;  // Auto-bold nội dung heading
  footerContent?: string;   // HTML append cuối bài
}

// ── Main config ───────────────────────────────────────────────────────────────

export interface SourceConfig {
  keyword:           string;
  secondaryKeywords: string[];
  language:          string;
  outlineMode:       OutlineMode;
  outlineAIType:     OutlineAIType;
  customOutline:     string;
  structure:         ArticleStructure;
  tone:              ArticleTone;
  model:             string;
  targetLength:      number;        // Ước tính — từ outline type
  imageOption:       '0' | 'yandex' | 'ai' | 'shutterstock';
  seoOptions:        SeoOptions;
  brandConfig?:      TinhGonBrandConfig;
}

// ── Stream result ─────────────────────────────────────────────────────────────

export interface SourceStreamResult {
  runId:           string;
  html:            string;
  title:           string;
  metaDescription: string;
  wordCount:       number;
  keywordDensity:  number;
  humanness:       TinhGonHumannessResult;
  sources:         SourceItem[];
}

// ── Start response ────────────────────────────────────────────────────────────

export interface SourceStartResponse {
  articleId: string;
  runId:     string;
}
```

---

## 3. Options — `web/lib/viet-theo-nguon/options.ts`

```typescript
import type { OutlineAIType, ArticleStructure, ArticleTone } from './types';

export const OUTLINE_AI_OPTIONS: Array<{
  value: OutlineAIType;
  label: string;
  estWords: string;
  group: 'detail' | 'objective' | 'basic';
}> = [
  // Nhóm: Chi tiết
  { value: 'h2h3_detail', label: 'Dàn ý chi tiết [h2] & [h3]', estWords: '~2.500+', group: 'detail' },
  // Nhóm: Theo mục tiêu
  { value: 'problem',  label: 'Vấn đề & Giải pháp',       estWords: '~1.500', group: 'objective' },
  { value: 'compare',  label: 'So sánh — A vs B',          estWords: '~1.500', group: 'objective' },
  { value: 'step',     label: 'Từng bước — Step by Step',  estWords: '~1.800', group: 'objective' },
  { value: 'story',    label: 'Kể chuyện — Trải nghiệm',   estWords: '~1.200', group: 'objective' },
  // Nhóm: Cơ bản
  { value: 'h2_10', label: 'Dàn ý 9–10 [h2]', estWords: '~3.000', group: 'basic' },
  { value: 'h2_8',  label: 'Dàn ý 7–8 [h2]',  estWords: '~2.500', group: 'basic' },
  { value: 'h2_6',  label: 'Dàn ý 5–6 [h2]',  estWords: '~2.000', group: 'basic' },
  { value: 'h2_4',  label: 'Dàn ý 3–4 [h2]',  estWords: '~1.500', group: 'basic' },
];

export const OUTLINE_AI_TYPE_TARGET: Record<OutlineAIType, number> = {
  h2h3_detail: 2500,
  h2_10:       3000,
  h2_8:        2500,
  h2_6:        2000,
  h2_4:        1500,
  problem:     1500,
  compare:     1500,
  step:        1800,
  story:       1200,
};

export const ARTICLE_STRUCTURES: Array<{
  value: ArticleStructure;
  icon: string;
  label: string;
  note: string;
}> = [
  { value: 'auto',             icon: '🤖', label: 'AI tự quyết định',  note: 'AI chọn cấu trúc phù hợp nhất với nội dung nguồn.' },
  { value: 'inverted_pyramid', icon: '🔻', label: 'Kim tự tháp',        note: 'Thông tin quan trọng ở đầu. Phổ biến nhất cho bài SEO.' },
  { value: 'storytelling',     icon: '📖', label: 'Kể chuyện',          note: 'Theo trình tự thời gian. Tốt cho phóng sự, case study.' },
  { value: 'qa',               icon: '❓', label: 'Hỏi & Đáp',          note: 'Dạng câu hỏi và trả lời. Tốt cho FAQ, tư vấn.' },
  { value: 'how_to',           icon: '👣', label: 'How-To',             note: 'Hướng dẫn từng bước. Dùng cho tutorial, hướng dẫn cài đặt.' },
  { value: 'pro_con',          icon: '⚖️', label: 'Pro & Con',          note: 'Nêu ưu nhược điểm. Dùng cho bài review, đánh giá.' },
  { value: 'historical',       icon: '🕰️', label: 'Lịch sử / Timeline', note: 'Từ quá khứ đến hiện tại. Tốt cho bài tổng quan chủ đề.' },
  { value: 'listicle',         icon: '📋', label: 'Danh sách',          note: 'Liệt kê có cấu trúc. Phù hợp nhiều loại bài.' },
  { value: 'profile',          icon: '👤', label: 'Profile',            note: 'Bài về một đối tượng cụ thể (người, sản phẩm, địa điểm).' },
  { value: 'review',           icon: '⭐', label: 'Review',             note: 'Đánh giá sản phẩm/dịch vụ. Kèm thông số kỹ thuật.' },
];

export const ARTICLE_TONES: Array<{
  value: ArticleTone;
  label: string;
  note: string;
}> = [
  { value: 'intimate',       label: 'Thân mật',           note: 'Tạp chí, bài báo cá nhân' },
  { value: 'formal',         label: 'Trang trọng',         note: 'Tin tức, học thuật, kỹ thuật' },
  { value: 'friendly',       label: 'Friendly',            note: 'Tư vấn, hướng dẫn, câu chuyện' },
  { value: 'expert',         label: 'Chuyên môn',          note: 'Phân tích, xã luận, đánh giá' },
  { value: 'humorous',       label: 'Hài hước',            note: 'Vui vẻ, châm biếm nhẹ nhàng' },
  { value: 'inspirational',  label: 'Truyền cảm hứng',     note: 'Phát biểu, sứ mệnh thương hiệu' },
  { value: 'nostalgic',      label: 'Hoài cổ',             note: 'Bài luận cá nhân, hồ sơ' },
  { value: 'shocking',       label: 'Gây sốc',             note: 'Kịch tính, thu hút ngay' },
  { value: 'conversational', label: 'Trò chuyện',          note: 'Blog, chuyên mục tư vấn' },
];

export const IMAGE_OPTIONS = [
  { value: '0',           label: 'Không chèn ảnh',    icon: '🚫' },
  { value: 'yandex',      label: 'Ảnh từ Yandex',     icon: '🔍' },
  { value: 'ai',          label: 'AI tạo ảnh',        icon: '🎨' },
  { value: 'shutterstock',label: 'Shutterstock',      icon: '📸' },
] as const;

export const SUPPORTED_LANGUAGES = [
  'Vietnamese', 'English', 'Japanese', 'Korean', 'Thai',
  'Indonesian', 'Chinese', 'French', 'German', 'Spanish',
  'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Italian',
];
```

---

## 4. Crawler — `web/lib/viet-theo-nguon/crawler.ts`

> Module server-only. Không import ở client components.

```typescript
import type { SourceItem } from './types';

// ── HTML → plain text extractor ───────────────────────────────────────────────

function extractTextFromHtml(html: string): { title: string; content: string } {
  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle   = titleMatch?.[1]?.trim() ?? '';

  // Extract <h1> nếu không có title hoặc title ngắn
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text  = h1Match?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';

  const title = rawTitle || h1Text || 'Không có tiêu đề';

  // Remove: script, style, nav, header, footer, aside, form, noscript
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Strip remaining tags → plain text
  const content = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 8000); // Giới hạn 8000 ký tự để tránh quá dài

  return { title, content };
}

// ── Jaccard similarity (word-level) ──────────────────────────────────────────

function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union        = new Set([...words1, ...words2]).size;

  return union > 0 ? intersection / union : 0;
}

// ── Single URL crawl ──────────────────────────────────────────────────────────

async function crawlSingleUrl(url: string): Promise<{ title: string; content: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0; +https://noithatminhquan.vn)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { title: '', content: '', error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return { title: '', content: '', error: 'URL không phải trang HTML' };
    }

    const html = await response.text();
    const { title, content } = extractTextFromHtml(html);

    if (!content || content.length < 100) {
      return { title, content: '', error: 'Không đọc được nội dung (< 100 ký tự)' };
    }

    return { title, content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không thể kết nối';
    return { title: '', content: '', error: msg.slice(0, 100) };
  }
}

// ── Crawl multiple URLs + detect unique/duplicate ────────────────────────────

export async function crawlUrls(urls: string[]): Promise<SourceItem[]> {
  const results = await Promise.all(urls.map((url) => crawlSingleUrl(url)));

  const sources: SourceItem[] = results.map((r, i) => ({
    url:       urls[i],
    title:     r.title,
    content:   r.content,
    wordCount: r.content.split(/\s+/).filter(Boolean).length,
    isUnique:  true,   // Default unique; will update after cross-check
    isManual:  false,
    error:     r.error,
  }));

  // Cross-check: so sánh từng cặp, nếu similarity > 0.5 → đánh dấu duplicate
  // Rule: source đầu tiên luôn là "gốc", các source sau nếu quá giống → duplicate
  for (let i = 1; i < sources.length; i++) {
    if (sources[i].error) continue;
    for (let j = 0; j < i; j++) {
      if (sources[j].error) continue;
      const sim = jaccardSimilarity(sources[i].content, sources[j].content);
      if (sim > 0.5) {
        sources[i].isUnique = false; // Quá giống với source trước → cần rewrite
        break;
      }
    }
  }

  return sources;
}
```

---

## 5. API: `/api/viet-theo-nguon/crawl/route.ts`

> Endpoint này được gọi khi user bấm "Thu Thập" — không cần auth không?  
> **Có cần auth** để tránh abuse (bất kỳ ai crawl qua server của mình).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { crawlUrls } from '@/lib/viet-theo-nguon/crawler';

export const runtime = 'nodejs';
// Tăng timeout vì crawl nhiều URL
export const maxDuration = 30;

const crawlSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(5), // Tối đa 5 URL
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const rawBody = await request.json();
    const parsed  = crawlSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'URL không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { urls } = parsed.data;
    const sources  = await crawlUrls(urls);

    return NextResponse.json({ sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

---

## 6. API: `/api/viet-theo-nguon/start/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import type { SourceConfig, SourceItem } from '@/lib/viet-theo-nguon/types';
import { OUTLINE_AI_TYPE_TARGET } from '@/lib/viet-theo-nguon/options';

export const runtime = 'nodejs';

const startSchema = z.object({
  config:  z.record(z.unknown()),   // SourceConfig — validate loosely
  sources: z.array(z.record(z.unknown())).default([]),
  outline: z.string().optional(),   // Outline text nếu outlineMode = 'ai' | 'custom'
});

export async function POST(request: NextRequest) {
  try {
    const user    = await requireAuth();
    const rawBody = await request.json();
    const parsed  = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config, sources, outline } = parsed.data;
    const cfg = config as SourceConfig;

    const runId      = createTinhGonRunId(cfg.keyword);
    const targetLen  = OUTLINE_AI_TYPE_TARGET[cfg.outlineAIType] ?? 1500;

    const article = await prisma.article.create({
      data: {
        userId:            user.userId,
        runId,
        status:            'DRAFT',
        keyword:           cfg.keyword,
        language:          cfg.language,
        contentType:       `viet_theo_nguon:${cfg.structure}`,
        targetLength:      cfg.outlineMode === 'none' ? 1200 : targetLen,
        aiProvider:        cfg.model,
        brandConfig:       cfg.brandConfig as never ?? {},
        selectedTitle:     cfg.keyword,
        htmlContent:       '',
        competitorUrls:    [],
        secondaryKeywords: cfg.secondaryKeywords ?? [],
        outline: {
          stage:   'config',
          config:  cfg,
          sources: sources as SourceItem[],
          outline: outline ?? '',
        },
      },
    });

    return NextResponse.json({ articleId: article.id, runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

---

## 7. API: `/api/viet-theo-nguon/stream/route.ts`

### 7.1 Prompt builder

```typescript
// Instruction maps cho structure và tone (giống viet-tin-tuc)
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

function buildOutlineInstruction(config: SourceConfig, outline: string): string {
  if (config.outlineMode === 'none') {
    return `Bài viết không cần outline cứng. AI tự chọn cấu trúc phù hợp. Độ dài ~1.000–1.500 từ.`;
  }

  if (config.outlineMode === 'custom' || config.outlineMode === 'ai') {
    return `## Dàn ý bắt buộc thực hiện\n\n${outline}\n\nThực hiện đúng thứ tự các heading. Không thêm hoặc bỏ bớt.`;
  }

  return '';
}

function buildSourcesBlock(sources: SourceItem[]): string {
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

function buildStreamPrompt(
  config: SourceConfig,
  sources: SourceItem[],
  outline: string,
  brandPrompt: string,
): string {
  const forbidden = mergeForbiddenWords(config.brandConfig?.forbiddenExtra).join(', ');
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;
  const toneInstruction      = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal;

  return `
Bạn là Writer Agent — viết bài SEO chất lượng cao dựa trên nguồn tham khảo.

${brandPrompt}

## Thông tin đầu vào
- Từ khóa chính: ${config.keyword}
- Từ khóa phụ: ${config.secondaryKeywords.join(', ') || 'không có'}
- Ngôn ngữ: ${config.language}
- Cấu trúc: ${structureInstruction}
- Giọng văn: ${toneInstruction}

${buildOutlineInstruction(config, outline)}

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
  Cách viết lại: đổi cấu trúc câu, đổi góc nhìn, thêm ví dụ riêng.
- Tổng hợp ≥ 2 nguồn nếu có. Thêm góc nhìn thương hiệu ≥ 20% nội dung.
- Tiêu đề bài PHẢI khác hoàn toàn với tất cả tiêu đề nguồn.
- Mở bài: KHÔNG bắt đầu bằng "Theo [nguồn]..." — mở bằng tình huống/số liệu/câu hỏi.

## Viết như người thật (chống AI detection — BẮT BUỘC)
- Nhịp câu: xen kẽ câu ngắn 3–6 từ và câu trung bình 12–18 từ.
  KHÔNG 5 câu liên tiếp cùng độ dài.
- Mở đoạn: luân phiên — số liệu cụ thể → câu hỏi → nhận xét → ví dụ thực tế.
- Dùng số liệu thực (mm, kg, năm, giá) thay tính từ mơ hồ.
- Không dùng: "không chỉ X mà còn Y", "Nhìn chung", "Không thể phủ nhận",
  "Chính vì vậy", "Bên cạnh đó", "Đáng chú ý là".
- Kết bài: nhận định ngắn thực tế hoặc CTA cụ thể — KHÔNG "Hy vọng bài viết hữu ích".

Chỉ trả HTML.
`.trim();
}
```

### 7.2 SEO post-processing

```typescript
// Áp dụng các SEO options sau khi AI viết xong
function applySeoOptions(html: string, config: SourceConfig): string {
  let result = html;

  // 1. Bold từ khóa chính
  if (config.seoOptions.boldKeyword && config.keyword) {
    const esc = config.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Chỉ bold lần đầu tiên xuất hiện trong mỗi đoạn <p>
    let firstInParagraph = true;
    result = result.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, content) => {
      if (firstInParagraph) {
        firstInParagraph = false;
        const bolded = content.replace(new RegExp(esc, 'i'), (m: string) => `<strong>${m}</strong>`);
        return `<p${attrs}>${bolded}</p>`;
      }
      return match;
    });
  }

  // 2. Gắn link vào từ khóa chính
  if (config.seoOptions.mainLink?.trim() && config.keyword) {
    const esc  = config.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const link = config.seoOptions.mainLink.trim();
    // Chỉ link lần đầu tiên
    result = result.replace(
      new RegExp(`(?<!href=["'][^"']*)\\b(${esc})\\b`, 'i'),
      `<a href="${link}" title="${config.keyword}">$1</a>`,
    );
  }

  // 3. Keyword links (format: "keyword1|url1\nkeyword2|url2")
  if (config.seoOptions.keywordLinks?.trim()) {
    const pairs = config.seoOptions.keywordLinks.split('\n').map((line) => {
      const [kw, url] = line.split('|').map((s) => s.trim());
      return { kw, url };
    }).filter((p) => p.kw && p.url);

    for (const { kw, url } of pairs) {
      const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`(?<!href=["'][^"']*)\\b(${esc})\\b`, 'i'), `<a href="${url}">${kw}</a>`);
    }
  }

  // 4. Footer content
  if (config.seoOptions.footerContent?.trim()) {
    result = result.replace(/<\/article>$/, `${config.seoOptions.footerContent}\n</article>`);
  }

  return result;
}
```

### 7.3 Full route

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { mergeForbiddenWords } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import type { SourceConfig, SourceItem } from '@/lib/viet-theo-nguon/types';

export const runtime = 'nodejs';

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

const streamSchema = z.object({
  articleId: z.string(),
  runId:     z.string(),
  config:    z.record(z.unknown()),
  sources:   z.array(z.record(z.unknown())).default([]),
  outline:   z.string().optional().default(''),
});

export async function POST(request: NextRequest) {
  try {
    const user    = await requireAuth();
    const rawBody = await request.json();
    const parsed  = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload không hợp lệ' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { articleId, runId, outline } = parsed.data;
    const config  = parsed.data.config as SourceConfig;
    const sources = parsed.data.sources as SourceItem[];

    const article = await prisma.article.findFirst({
      where: { id: articleId, runId, userId: user.userId, deletedAt: null },
    });

    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);

        try {
          await prisma.article.update({
            where: { id: articleId },
            data:  { status: 'WRITING' },
          });

          send({ type: 'step', step: 'writing', label: 'AI đang viết bài từ nguồn...' });

          const brandPrompt = await buildBrandPrompt(config.brandConfig);
          const prompt      = buildStreamPrompt(config, sources, outline, brandPrompt);
          const model       = buildTinhGonModel(config.model);

          let rawOutput = '';
          try {
            const streamResp = await model.generateContentStream(prompt);
            for await (const chunk of streamResp) {
              const text = chunk.text();
              if (!text) continue;
              rawOutput += text;
              send({ type: 'chunk', text });
            }
          } catch {
            const fallback = await model.generateContent(prompt);
            rawOutput = fallback.response.text();
            send({ type: 'chunk', text: rawOutput });
          }

          send({ type: 'step_done', step: 'writing' });
          send({ type: 'step', step: 'analyze', label: 'Xử lý SEO & chấm điểm...' });

          // ⚠️ BUG FIX: sanitizeHtmlArticle cần 2 args
          let html = sanitizeHtmlArticle(rawOutput, config.keyword);

          // ⚠️ BUG FIX: extract title TRƯỚC khi gọi buildMetaDescription
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : config.keyword;

          // Apply SEO post-processing
          html = applySeoOptions(html, config);

          const wordCount      = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness      = analyzeHumanness(html, config.brandConfig?.forbiddenExtra);
          const metaDescription = buildMetaDescription(title, config.keyword);

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
              secondaryKeywords: config.secondaryKeywords ?? [],
              outline: {
                stage:   'generate',
                config,
                sources,
                outline,
              },
            },
          });

          send({ type: 'step_done', step: 'analyze' });
          send({
            type: 'done',
            data: { runId, html, title, metaDescription, wordCount, keywordDensity, humanness, sources },
          });
        } catch (error) {
          await prisma.article.update({
            where: { id: articleId },
            data:  { status: 'DRAFT' },
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
        'Connection':     'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

---

## 8. Config Page — `web/app/viet-theo-nguon/page.tsx`

### 8.1 State đầy đủ

```typescript
// ── Form cơ bản ───────────────────────────────────────────────────────────────
const [keyword, setKeyword]                     = useState('');
const [secondaryKeywords, setSecondaryKeywords] = useState('');  // comma-separated
const [language, setLanguage]                   = useState('Vietnamese');

// ── URL sources ───────────────────────────────────────────────────────────────
const [urlInputs, setUrlInputs]   = useState<string[]>(['', '']);  // Start with 2 rows
const [sources, setSources]       = useState<SourceItem[]>([]);
const [crawling, setCrawling]     = useState(false);
const [crawlError, setCrawlError] = useState('');
// Manual content (textarea fallback)
const [showManual, setShowManual]     = useState(false);
const [manualContent, setManualContent] = useState('');

// ── Outline ───────────────────────────────────────────────────────────────────
const [outlineMode, setOutlineMode]         = useState<OutlineMode>('ai');
const [outlineAIType, setOutlineAIType]     = useState<OutlineAIType>('h2h3_detail');
const [customOutline, setCustomOutline]     = useState('');
const [aiOutline, setAiOutline]             = useState('');
const [generatingOutline, setGeneratingOutline] = useState(false);

// ── Article settings ──────────────────────────────────────────────────────────
const [structure, setStructure] = useState<ArticleStructure>('auto');
const [tone, setTone]           = useState<ArticleTone>('formal');
const [model, setModel]         = useState('gemini-flash');
const [imageOption, setImageOption] = useState<'0' | 'yandex' | 'ai' | 'shutterstock'>('0');

// ── SEO options ───────────────────────────────────────────────────────────────
const [showSeo, setShowSeo]               = useState(false);
const [seoMainLink, setSeoMainLink]       = useState('');
const [seoKeywordLinks, setSeoKeywordLinks] = useState('');
const [boldKeyword, setBoldKeyword]       = useState(false);
const [boldHeading, setBoldHeading]       = useState(false);
const [footerContent, setFooterContent]   = useState('');

// ── Brand config ──────────────────────────────────────────────────────────────
const [showBrand, setShowBrand]               = useState(false);
const [brandForbidden, setBrandForbidden]     = useState('');

// ── UI ────────────────────────────────────────────────────────────────────────
const [loading, setLoading]   = useState(false);
const [error, setError]       = useState('');
```

### 8.2 handleCrawl() — gọi /api/viet-theo-nguon/crawl

```typescript
async function handleCrawl() {
  const validUrls = urlInputs.filter((u) => u.trim().startsWith('http'));
  if (validUrls.length === 0) {
    setCrawlError('Vui lòng nhập ít nhất 1 URL hợp lệ (bắt đầu bằng http)');
    return;
  }

  setCrawling(true);
  setCrawlError('');
  setSources([]);

  try {
    const res  = await fetch('/api/viet-theo-nguon/crawl', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ urls: validUrls }),
    });

    const data = await res.json() as { sources?: SourceItem[]; error?: string };
    if (!res.ok) throw new Error(data.error || 'Crawl thất bại');

    // Append manual content nếu có
    const allSources: SourceItem[] = [...(data.sources ?? [])];
    if (manualContent.trim()) {
      allSources.push({
        url:       'manual',
        title:     'Nội dung thêm thủ công',
        content:   manualContent.trim(),
        wordCount: manualContent.trim().split(/\s+/).filter(Boolean).length,
        isUnique:  true,
        isManual:  true,
      });
    }

    setSources(allSources);
  } catch (err) {
    setCrawlError(err instanceof Error ? err.message : 'Không thể crawl URL');
  } finally {
    setCrawling(false);
  }
}
```

### 8.3 handleGenerateOutline() — gọi /api/pipeline/generate-outline (reuse)

```typescript
async function handleGenerateOutline() {
  if (!keyword.trim()) { setError('Nhập từ khóa trước'); return; }
  setGeneratingOutline(true);
  setAiOutline('');

  try {
    const res = await fetch('/api/pipeline/generate-outline', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: keyword.trim(),
        language,
        tone,
        outlineType: outlineAIType,
      }),
    });

    if (!res.ok || !res.body) throw new Error('Lỗi tạo dàn ý');

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const chunk = line.slice(6);
          if (chunk !== '[DONE]' && !chunk.startsWith('[ERROR]')) {
            setAiOutline((prev) => prev + chunk);
          }
        }
      }
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Không thể tạo dàn ý');
  } finally {
    setGeneratingOutline(false);
  }
}
```

### 8.4 handleSubmit() — tạo Article và redirect

```typescript
async function handleSubmit() {
  if (!keyword.trim()) { setError('Vui lòng nhập từ khóa'); return; }
  if (sources.length === 0) { setError('Vui lòng thu thập ít nhất 1 nguồn'); return; }

  setLoading(true);
  setError('');

  const config: SourceConfig = {
    keyword:           keyword.trim(),
    secondaryKeywords: secondaryKeywords.split(',').map((k) => k.trim()).filter(Boolean),
    language,
    outlineMode,
    outlineAIType,
    customOutline,
    structure,
    tone,
    model,
    targetLength:      1500,   // bị override bởi OUTLINE_AI_TYPE_TARGET trong start route
    imageOption,
    seoOptions: {
      mainLink:      seoMainLink.trim() || undefined,
      keywordLinks:  seoKeywordLinks.trim() || undefined,
      boldKeyword,
      boldHeading,
      footerContent: footerContent.trim() || undefined,
    },
    brandConfig: brandForbidden.trim() ? { forbiddenExtra: brandForbidden.trim() } : undefined,
  };

  const outlineText = outlineMode === 'ai' ? aiOutline : outlineMode === 'custom' ? customOutline : '';

  try {
    const res  = await fetch('/api/viet-theo-nguon/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, sources, outline: outlineText }),
    });

    const data = await res.json() as { articleId?: string; runId?: string; error?: string };
    if (!res.ok) throw new Error(data.error || 'Không thể tạo bài');

    // Lưu sessionStorage
    sessionStorage.setItem('vtn_config',     JSON.stringify(config));
    sessionStorage.setItem('vtn_article_id', data.articleId!);
    sessionStorage.setItem('vtn_run_id',     data.runId!);
    sessionStorage.setItem('vtn_sources',    JSON.stringify(sources));
    sessionStorage.setItem('vtn_outline',    outlineText);
    sessionStorage.removeItem('vtn_result');

    router.push('/viet-theo-nguon/generate');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    setLoading(false);
  }
}
```

### 8.5 Sources preview UI

```tsx
{/* ── Sources preview sau khi crawl ─────────────────────────────────────────── */}
{sources.length > 0 && (
  <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-700">
        Dữ liệu từ nguồn ({sources.length} nguồn)
      </h3>
      <p className="text-xs text-gray-400">AI dùng nội dung này để viết bài</p>
    </div>

    <div className="space-y-3">
      {sources.map((s, i) => (
        <div key={i} className={`rounded-lg border p-3 ${
          s.error ? 'bg-red-50 border-red-200' :
          s.isUnique ? 'bg-green-50 border-green-200' :
          'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {s.isManual ? '📝 Thủ công' : `🔗 ${s.url.slice(0, 60)}...`}
              </p>
              {!s.error && (
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{s.title}</p>
              )}
            </div>
            {s.error ? (
              <span className="shrink-0 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                ❌ Lỗi
              </span>
            ) : s.isUnique ? (
              <span className="shrink-0 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✅ Unique
              </span>
            ) : (
              <span className="shrink-0 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                ⚠️ Duplicate
              </span>
            )}
          </div>

          {s.error ? (
            <p className="text-xs text-red-600 mt-1">{s.error}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{s.content.slice(0, 150)}...</p>
          )}

          {!s.error && (
            <p className="text-[10px] text-gray-400 mt-1">{s.wordCount.toLocaleString()} từ</p>
          )}

          {/* Chú thích cho user */}
          {!s.error && (
            <p className="text-[10px] mt-1 font-medium" style={{ color: s.isUnique ? '#15803d' : '#c2410c' }}>
              {s.isUnique
                ? 'Đây là nội dung Unique, AI chỉ cần học và thêm vào bài'
                : 'Đây là nội dung trùng lặp, AI cần xử lý tránh duplicate, học và thêm vào bài'}
            </p>
          )}
        </div>
      ))}
    </div>

    {/* Thêm nội dung thủ công */}
    <button
      onClick={() => setShowManual(!showManual)}
      className="mt-3 text-xs text-blue-600 hover:underline"
    >
      {showManual ? '▲ Ẩn' : '▼ Thêm nội dung thủ công'}
    </button>
    {showManual && (
      <textarea
        value={manualContent}
        onChange={(e) => setManualContent(e.target.value)}
        placeholder="Dán nội dung vào đây nếu AI không thể đọc được URL..."
        rows={4}
        className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
      />
    )}
  </div>
)}
```

### 8.6 URL inputs UI

```tsx
{/* ── URL inputs ──────────────────────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-3">
    Link nguồn dữ liệu
  </label>

  <div className="space-y-2 mb-3">
    {urlInputs.map((url, i) => (
      <div key={i} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            const next = [...urlInputs];
            next[i] = e.target.value;
            setUrlInputs(next);
          }}
          placeholder={`URL nguồn ${i + 1}... (https://)`}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {urlInputs.length > 1 && (
          <button
            onClick={() => setUrlInputs(urlInputs.filter((_, j) => j !== i))}
            className="px-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    ))}
  </div>

  <div className="flex gap-3">
    {urlInputs.length < 5 && (
      <button
        onClick={() => setUrlInputs([...urlInputs, ''])}
        className="text-xs text-blue-600 hover:underline"
      >
        + Thêm URL
      </button>
    )}
    <button
      onClick={() => void handleCrawl()}
      disabled={crawling}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
    >
      {crawling ? (
        <>
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Đang thu thập...
        </>
      ) : '🔍 Thu Thập'}
    </button>
  </div>

  {crawlError && (
    <p className="text-xs text-red-600 mt-2">{crawlError}</p>
  )}
  <p className="text-xs text-gray-400 mt-2">
    Nếu AI không đọc được URL, dùng "Thêm nội dung thủ công" để paste text vào.
  </p>
</div>
```

### 8.7 Outline selector UI

```tsx
{/* ── Outline options ──────────────────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <label className="block text-sm font-semibold text-gray-700 mb-3">Chọn phương án dàn ý</label>

  <div className="space-y-2">
    {/* Không dàn ý */}
    <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
      outlineMode === 'none' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <input type="radio" className="mt-0.5" checked={outlineMode === 'none'} onChange={() => setOutlineMode('none')} />
      <div>
        <p className="text-sm font-medium text-gray-700">Không cần dàn ý</p>
        <p className="text-xs text-gray-400">AI tự viết theo nguồn — khoảng 1.000–1.500 từ</p>
      </div>
    </label>

    {/* AI Outline */}
    <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
      outlineMode === 'ai' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <input type="radio" className="mt-0.5" checked={outlineMode === 'ai'} onChange={() => setOutlineMode('ai')} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">AI Outline <span className="text-xs text-blue-600 font-semibold">(Khuyên dùng)</span></p>
        <p className="text-xs text-gray-400 mb-2">AI tạo dàn ý chi tiết trước — bài viết chất lượng hơn</p>

        {outlineMode === 'ai' && (
          <>
            {/* AI outline type picker */}
            {(['detail', 'objective', 'basic'] as const).map((group) => (
              <div key={group} className="mb-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                  {group === 'detail' ? 'Chi tiết' : group === 'objective' ? 'Theo mục tiêu' : 'Cơ bản'}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {OUTLINE_AI_OPTIONS.filter((o) => o.group === group).map((o) => (
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
              </div>
            ))}

            {/* Generate outline button */}
            <button
              onClick={() => void handleGenerateOutline()}
              disabled={generatingOutline || !keyword.trim()}
              className="mt-2 w-full py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              {generatingOutline ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang tạo dàn ý...</>
              ) : '✨ Tạo dàn ý tự động'}
            </button>

            {/* AI outline preview + edit */}
            {aiOutline && (
              <textarea
                value={aiOutline}
                onChange={(e) => setAiOutline(e.target.value)}
                rows={8}
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
              />
            )}
          </>
        )}
      </div>
    </label>

    {/* Custom outline */}
    <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
      outlineMode === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <input type="radio" className="mt-0.5" checked={outlineMode === 'custom'} onChange={() => setOutlineMode('custom')} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">Tùy chỉnh dàn ý</p>
        <p className="text-xs text-gray-400 mb-2">Tự nhập dàn ý theo format [h2] và [h3]</p>
        {outlineMode === 'custom' && (
          <textarea
            value={customOutline}
            onChange={(e) => setCustomOutline(e.target.value)}
            rows={6}
            placeholder="[h2] Tiêu đề mục 1&#10;[h3] Tiêu đề phụ 1.1&#10;[h2] Tiêu đề mục 2..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          />
        )}
      </div>
    </label>
  </div>
</div>
```

### 8.8 SEO options UI (collapsible)

```tsx
{/* ── SEO Options (tùy chọn) ──────────────────────────────────────────────────── */}
<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
  <button
    onClick={() => setShowSeo(!showSeo)}
    className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
  >
    Tùy chọn SEO
    <span className="text-gray-400">{showSeo ? '▲' : '▼'}</span>
  </button>

  {showSeo && (
    <div className="mt-4 space-y-4">
      {/* Gắn link vào từ khóa chính */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Gắn link sau vào từ khóa chính
        </label>
        <input
          type="url"
          value={seoMainLink}
          onChange={(e) => setSeoMainLink(e.target.value)}
          placeholder="https://noithatminhquan.vn/san-pham/..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Keyword → URL mapping */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Thêm link nếu nội dung có từ khóa (format: từ khóa|url, mỗi dòng 1 cặp)
        </label>
        <textarea
          value={seoKeywordLinks}
          onChange={(e) => setSeoKeywordLinks(e.target.value)}
          rows={3}
          placeholder={'giường sắt|https://example.com/giuong-sat\ntủ quần áo|https://example.com/tu-quan-ao'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
        />
      </div>

      {/* Footer content */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Thêm nội dung sau vào cuối bài
        </label>
        <textarea
          value={footerContent}
          onChange={(e) => setFooterContent(e.target.value)}
          rows={3}
          placeholder="<p>📞 Liên hệ Nội Thất Minh Quân: 0909 123 456</p>"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
        />
      </div>

      {/* Bold options */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={boldKeyword} onChange={(e) => setBoldKeyword(e.target.checked)} className="rounded" />
          <span className="text-xs text-gray-600">Tự động in đậm từ khóa chính</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={boldHeading} onChange={(e) => setBoldHeading(e.target.checked)} className="rounded" />
          <span className="text-xs text-gray-600">In đậm heading (H2, H3)</span>
        </label>
      </div>
    </div>
  )}
</div>
```

---

## 9. Generate Page — `web/app/viet-theo-nguon/generate/page.tsx`

### Chiến lược: Fork `viet-tinh-gon/generate/page.tsx`

> Giống hệt `viet-tin-tuc/generate` — copy toàn bộ viet-tinh-gon/generate, sửa các điểm sau:

### 9.1 Điểm khác biệt so với `viet-tinh-gon/generate`

| # | Phần | viet-tinh-gon | **viet-theo-nguon** |
|---|------|---------------|---------------------|
| 1 | SessionStorage keys | `tg_*` | **`vtn_*`** |
| 2 | Outline state | `outline` (TinhGonOutlineData) | **Không cần** |
| 3 | `computeSeoChecks` wordCount | ≥ 1000 | **≥ 1000 (giữ nguyên — bài dài)** |
| 4 | `saveDraft(false)` — outline | `buildTinhGonSnapshot(...)` | **`{ stage:'generate', config, sources, outline }`** |
| 5 | `saveDraft(false)` — contentType | `buildTinhGonContentType(...)` | **`` `viet_theo_nguon:${config.structure}` ``** |
| 6 | `loadFromDatabase()` — parse | `parseTinhGonSnapshot()` | **Parse thủ công: `(outline as {config?:SourceConfig})`** |
| 7 | Sidebar tab 3 | `image` | **`sources` (crawled URLs list)** |
| 8 | `startGeneration()` body | config + outline | **config + sources + outline** |
| 9 | "Bài mới" redirect | `/viet-tinh-gon` | **`/viet-theo-nguon`** |
| 10 | secondaryKeywords | có UI tags | **Giữ nguyên (news article có secondaryKeywords)** |

### 9.2 sessionStorage keys

```typescript
const KEYS = {
  config:    'vtn_config',
  articleId: 'vtn_article_id',
  runId:     'vtn_run_id',
  sources:   'vtn_sources',
  outline:   'vtn_outline',
  result:    'vtn_result',
} as const;
```

### 9.3 startGeneration() — thêm `sources` + `outline` vào body

```typescript
body: JSON.stringify({
  articleId: artId,
  runId:     rId,
  config:    cfg,
  sources:   srcs,       // ← THÊM
  outline:   outlineText, // ← THÊM
}),
```

### 9.4 Tab "Nguồn" — hiện crawled sources

```tsx
{sideTab === 'sources' && (
  <div className="flex-1 overflow-y-auto p-4 space-y-3">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      Nguồn ({sources.length})
    </p>
    {sources.map((s, i) => (
      <div key={i} className={`p-3 rounded-lg border text-xs ${
        s.error ? 'bg-red-50 border-red-200' :
        s.isUnique ? 'bg-green-50 border-green-200' :
        'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-gray-800 truncate flex-1">{s.title || s.url}</p>
          <span className={`shrink-0 ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            s.isUnique ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {s.isUnique ? 'Unique' : 'Duplicate'}
          </span>
        </div>
        {!s.isManual && (
          <a href={s.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate block">
            {s.url}
          </a>
        )}
        <p className="text-gray-500 mt-1 line-clamp-2">{s.content.slice(0, 120)}...</p>
        <p className="text-gray-400 mt-1">{s.wordCount.toLocaleString()} từ</p>
      </div>
    ))}
  </div>
)}
```

---

## 10. Sidebar + Homepage

```tsx
// web/components/Sidebar.tsx — thêm vào group "Viết Bài"
{ label: 'Viết Theo Nguồn', href: '/viet-theo-nguon' },

// web/app/page.tsx — thêm card
{
  title:       'Viết theo nguồn',
  description: 'Cung cấp URL nguồn, AI phân tích và viết bài mới — tránh duplicate tự động',
  color:       'from-violet-400 to-violet-600',
  href:        '/viet-theo-nguon',
  featured:    false,
  icon:        '🔗',
},
```

---

## 11. Thứ tự implement

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `lib/viet-theo-nguon/types.ts` | Types trước |
| 2 | `lib/viet-theo-nguon/options.ts` | Constants |
| 3 | `lib/viet-theo-nguon/crawler.ts` | URL crawl + Jaccard |
| 4 | `api/viet-theo-nguon/crawl/route.ts` | Crawl endpoint |
| 5 | `api/viet-theo-nguon/start/route.ts` | Tạo Article |
| 6 | `api/viet-theo-nguon/stream/route.ts` | SSE + SEO post-process |
| 7 | `app/viet-theo-nguon/page.tsx` | Config form (dài nhất) |
| 8 | `app/viet-theo-nguon/generate/page.tsx` | Fork + sửa 10 điểm |
| 9 | Sidebar + Homepage | Entry points |

---

## 12. Chống AI Detection & Nội dung trùng lặp

> **Rủi ro cao nhất** trong tất cả các tính năng — AI dùng nội dung đã index trên Google,  
> nếu không xử lý đúng sẽ bị penalize cho duplicate content.

### A. Unique vs Duplicate — phân loại trong prompt

Đã implement trong `buildSourcesBlock()`:
- `[UNIQUE]`: AI học ý tưởng, số liệu — **được phép paraphrase**
- `[DUPLICATE]`: AI phải **viết lại hoàn toàn** — đổi cấu trúc câu, thêm ví dụ riêng

### B. 5 kỹ thuật viết lại duplicate content

```
1. ĐẢO CẤU TRÚC:
   Nguồn: "A xảy ra vì B"
   AI viết: "Do B, A đã diễn ra — điều này phù hợp với..."

2. ĐỔI GÓOC NHÌN:
   Nguồn: viết theo góc nhìn nhà sản xuất
   AI viết: viết theo góc nhìn người mua / chủ homestay

3. THÊM SỐ LIỆU CỤ THỂ:
   Nguồn: "nội thất phòng ngủ rất phổ biến"
   AI viết: "theo khảo sát Q1/2026 của Hội Nội Thất Việt Nam, 73% gia đình trẻ ưu tiên nội thất..."

4. CHUYỂN ĐOẠN VĂN → DANH SÁCH hoặc ngược lại

5. THÊM GÓC NHÌN THƯƠNG HIỆU:
   Mỗi section kết thúc bằng 1-2 câu từ góc độ Nội Thất Minh Quân
```

### C. Kiểm tra trước khi publish

```typescript
// Trong generate page — warning khi publish nếu:
const sourceHasHighDuplicate = sources.filter((s) => !s.isUnique).length > sources.length / 2;
// → Hiện warning: "Hơn 50% nguồn là duplicate content — đảm bảo AI đã viết lại hoàn toàn"
```

### D. Checklist QC sau khi bài viết xong

- [ ] **AI Check** (tab "Kiểm tra AI"): AI Score < 35
- [ ] **Keyword density**: 1.0–1.5%
- [ ] **Humanness**: ≥ 76 → PUBLISH
- [ ] **Tiêu đề bài** khác hoàn toàn với tất cả tiêu đề nguồn
- [ ] **Mở bài** không bắt đầu bằng "Theo [tên nguồn]..."
- [ ] **Kiểm tra ngoài**: https://bypass.aiktp.com/vi/ai-detector

---

## 13. Lưu ý kỹ thuật quan trọng

### Crawl limitations

```typescript
// ⚠️ Một số website KHÔNG thể crawl:
// - Trang yêu cầu login
// - Trang dùng JavaScript render (SPA) — content không có trong HTML
// - Trang có Cloudflare bot protection
// - Trang có robots.txt chặn bots
//
// → Khi crawler.ts trả về error → user dùng "Thêm thủ công"
// → isManual = true → AI xử lý như UNIQUE content
```

### maxDuration cho crawl route

```typescript
// Phải set maxDuration nếu crawl nhiều URL với timeout 8s/URL
export const maxDuration = 30; // 5 URLs × 8s timeout + buffer
```

### Crawl content limit

```typescript
// Giới hạn 8000 ký tự/nguồn để:
// 1. Tránh vượt context window của AI model
// 2. Tránh response quá chậm
// 3. 5 nguồn × 8000 ký tự = 40.000 ký tự + prompt = ~50k tokens OK
```

### applySeoOptions — regex safety

```typescript
// Regex link injection dùng negative lookbehind để không wrap link đã có:
// (?<!href=["'][^"']*)  ← không match nếu đã trong href
// Tuy nhiên không hoàn hảo với nested HTML
// → Test kỹ với HTML thực tế trước khi ship
```
