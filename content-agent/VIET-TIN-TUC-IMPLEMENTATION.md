# VIET-TIN-TUC-IMPLEMENTATION.md
## Hướng dẫn code tính năng "AI Viết Tin Tức"

> Phân tích từ: https://aiktp.com/vi/news-writer  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API

---

## ⚠️ Lỗi đã phát hiện khi đối chiếu code thực tế

| # | Vị trí | Lỗi | Fix |
|---|--------|-----|-----|
| 1 | `stream/route.ts` | `sanitizeHtmlArticle(rawHtml)` — thiếu arg thứ 2 | `sanitizeHtmlArticle(rawHtml, config.keyword)` ✅ **Fixed trong Section 5** |
| 2 | `stream/route.ts` | `buildMetaDescription(html, keyword)` — arg 1 phải là `title`, không phải `html` | `buildMetaDescription(title, config.keyword)` (extract title trước) ✅ **Fixed trong Section 5** |
| 3 | Config page | Language chỉ có 2 nút (Vi/En) nhưng `NEWS_LANGUAGE_MAP` có 6 entries | Dùng `<select>` dropdown thay 2 nút |
| 4 | File tái sử dụng | `ConfigForm.tsx` không reuse được nguyên — coupled với `TinhGonConfig` | Rebuild brand section riêng inline, hoặc extract thành `BrandSection` component |
| 5 | `generate/page.tsx` | `bootstrap()` thiếu DB resume qua `?runId=` URL param | Thêm `loadFromDatabase(runId)` dùng route `by-runid/[runId]` đã có sẵn |
| 6 | DB resume | `parseTinhGonSnapshot(outline)` trả `null` cho news articles (vì thiếu `flow:'tinh_gon'`) | Parse `outline` trực tiếp: `(outline as {config?:NewsConfig})?.config` |

---

## 1. Tổng quan kiến trúc

### Điểm khác biệt so với "Viết tinh gọn"

| | Viết tinh gọn | Viết tin tức |
|---|---|---|
| Số bước | 3 (Config → Outline → Generate) | **2 (Config → Generate)** |
| Nguồn dữ liệu | AI thuần | **Google News RSS** |
| Độ dài bài | 800–1.500 từ | **400–800 từ** |
| Cấu trúc bài | 10 outline type SEO | **9 news structure** |
| Giọng văn | Brand tone cố định | **9 tone chọn được** |
| Outline editor | Có | **Không cần** |

### Flow hoạt động

```
User nhập keyword
     ↓
/viet-tin-tuc (Config Form)
     ↓ POST /api/viet-tin-tuc/start
     → Tạo Article record trong DB
     → Fetch Google News RSS (top 7 tin)
     ↓ Redirect → /viet-tin-tuc/generate
     ↓ POST /api/viet-tin-tuc/stream (SSE)
     → Hiện sources news đã fetch
     → AI đọc news → stream HTML
     → analyzeHumanness + computeKeywordDensity
     → Update Article DB
     ↓ Editor + SEO Panel + Save/Publish
```

### Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-tin-tuc/
│   │   ├── page.tsx                    ← Step 1: Config form
│   │   └── generate/
│   │       └── page.tsx                ← Step 2: Generate + Editor
│   └── api/
│       └── viet-tin-tuc/
│           ├── start/
│           │   └── route.ts            ← Tạo Article + fetch news
│           └── stream/
│               └── route.ts            ← SSE stream AI viết bài
└── lib/
    └── viet-tin-tuc/
        ├── types.ts                    ← Types riêng
        └── options.ts                  ← Constants (structure, tone, length)
```

### File tái sử dụng (KHÔNG tạo mới)

- `lib/tinh-gon/humanness.ts` → `analyzeHumanness()`
- `lib/tinh-gon/text.ts` → `countWords()`, `computeKeywordDensity()`, `buildMetaDescription()`, `slugify()`, `sanitizeHtmlArticle()`
- `lib/tinh-gon/model.ts` → `buildTinhGonModel()`
- `lib/tinh-gon/forbidden.ts` → `mergeForbiddenWords()`
- `lib/tinh-gon/persistence.ts` → `createTinhGonRunId()`
- `app/api/pipeline/_context.ts` → `buildBrandPrompt()`
- `components/tinh-gon/HumannessPanel.tsx`
- `components/tinh-gon/KeywordDensityBar.tsx`
- `components/tinh-gon/ConfigForm.tsx` (brand section)
- `app/api/tinh-gon/ai-edit/route.ts` (dùng lại nguyên)
- `app/api/tinh-gon/humanness/route.ts` (dùng lại nguyên)
- `app/api/articles/route.ts` (POST create article)
- `app/api/articles/[id]/save/route.ts`

---

## 2. Types — `web/lib/viet-tin-tuc/types.ts`

```typescript
import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export type NewsStructure =
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

export type NewsTone =
  | 'formal'
  | 'intimate'
  | 'friendly'
  | 'expert'
  | 'humorous'
  | 'inspirational'
  | 'nostalgic'
  | 'shocking'
  | 'conversational';

export interface NewsConfig {
  keyword: string;
  language: string;
  structure: NewsStructure;
  tone: NewsTone;
  model: string;
  targetLength: number;
  brandConfig?: TinhGonBrandConfig;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

export interface NewsStreamResult {
  runId: string;
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  humanness: TinhGonHumannessResult;
  sources: NewsItem[];
}

export interface NewsStartResponse {
  articleId: string;
  runId: string;
  sources: NewsItem[];
  warning?: string;
}
```

---

## 3. Options — `web/lib/viet-tin-tuc/options.ts`

```typescript
import type { NewsStructure, NewsTone } from './types';

export const NEWS_STRUCTURES: Array<{
  value: NewsStructure;
  icon: string;
  label: string;
  note: string;
}> = [
  { value: 'auto',             icon: '🤖', label: 'AI tự quyết định',   note: 'AI chọn cấu trúc phù hợp nhất với chủ đề.' },
  { value: 'inverted_pyramid', icon: '🔻', label: 'Kim tự tháp',         note: 'Tin quan trọng ở đầu, chi tiết phụ ở dưới. Phổ biến nhất.' },
  { value: 'storytelling',     icon: '📖', label: 'Kể chuyện',           note: 'Trình bày theo trình tự thời gian. Dùng cho phóng sự.' },
  { value: 'qa',               icon: '❓', label: 'Hỏi & Đáp',           note: 'Trình bày dạng câu hỏi và trả lời.' },
  { value: 'how_to',           icon: '👣', label: 'How-To / Từng bước',  note: 'Hướng dẫn quy trình từng bước thực hiện.' },
  { value: 'pro_con',          icon: '⚖️', label: 'Pro & Con',           note: 'Nêu ưu và nhược điểm. Dùng cho bài review.' },
  { value: 'historical',       icon: '🕰️', label: 'Lịch sử / Timeline',  note: 'Trình bày từ quá khứ đến hiện tại.' },
  { value: 'listicle',         icon: '📋', label: 'Danh sách',           note: 'Bài dạng liệt kê, phù hợp nhiều loại tin.' },
  { value: 'profile',          icon: '👤', label: 'Profile',             note: 'Bài về một người, địa điểm, tổ chức.' },
  { value: 'review',           icon: '⭐', label: 'Review',              note: 'Đánh giá sản phẩm, dịch vụ, sách, phim.' },
];

export const NEWS_TONES: Array<{
  value: NewsTone;
  label: string;
  note: string;
}> = [
  { value: 'formal',          label: 'Trang trọng',          note: 'Nghiêm túc — dùng cho tin tức, học thuật' },
  { value: 'intimate',        label: 'Thân mật',             note: 'Dùng cho tạp chí, bài cá nhân' },
  { value: 'friendly',        label: 'Friendly',             note: 'Ấm áp — tư vấn, hướng dẫn, câu chuyện' },
  { value: 'expert',          label: 'Chuyên môn',           note: 'Phân tích, xã luận, đánh giá' },
  { value: 'humorous',        label: 'Hài hước',             note: 'Vui vẻ, châm biếm nhẹ nhàng' },
  { value: 'inspirational',   label: 'Truyền cảm hứng',      note: 'Phát biểu, sứ mệnh thương hiệu' },
  { value: 'nostalgic',       label: 'Hoài cổ',              note: 'Bài luận cá nhân, hồ sơ' },
  { value: 'shocking',        label: 'Gây sốc',              note: 'Kịch tính, khiêu khích, thu hút ngay' },
  { value: 'conversational',  label: 'Trò chuyện',           note: 'Blog, chuyên mục tư vấn' },
];

export const NEWS_LENGTHS = [
  { value: 400,  label: 'Flash (~400 từ)',    badge: 'Nhanh' },
  { value: 600,  label: 'Chuẩn (~600 từ)',    badge: '' },
  { value: 800,  label: 'Đủ đầy (~800 từ)',   badge: 'Phổ biến' },
] as const;

// Google News RSS language/country mapping
export const NEWS_LANGUAGE_MAP: Record<string, { hl: string; gl: string; ceid: string }> = {
  Vietnamese: { hl: 'vi', gl: 'VN', ceid: 'VN:vi' },
  English:    { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  Japanese:   { hl: 'ja', gl: 'JP', ceid: 'JP:ja' },
  Korean:     { hl: 'ko', gl: 'KR', ceid: 'KR:ko' },
  Thai:       { hl: 'th', gl: 'TH', ceid: 'TH:th' },
  Indonesian: { hl: 'id', gl: 'ID', ceid: 'ID:id' },
};

// Fallback nếu ngôn ngữ không có trong map
export const DEFAULT_NEWS_LANG = { hl: 'vi', gl: 'VN', ceid: 'VN:vi' };
```

---

## 4. API: `/api/viet-tin-tuc/start/route.ts`

Route này làm 2 việc: **tạo Article record** + **fetch Google News RSS**.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { DEFAULT_NEWS_LANG, NEWS_LANGUAGE_MAP } from '@/lib/viet-tin-tuc/options';
import type { NewsConfig, NewsItem } from '@/lib/viet-tin-tuc/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.object({
    keyword:      z.string().min(1),
    language:     z.string().default('Vietnamese'),
    structure:    z.string().default('auto'),
    tone:         z.string().default('formal'),
    model:        z.string().default('gemini-flash'),
    targetLength: z.number().default(600),
    brandConfig:  z.record(z.unknown()).optional(),
  }),
});

// Parse Google News RSS XML → NewsItem[]
async function fetchGoogleNews(keyword: string, language: string): Promise<NewsItem[]> {
  const langMap = NEWS_LANGUAGE_MAP[language] ?? DEFAULT_NEWS_LANG;
  const q = encodeURIComponent(keyword);
  const url = `https://news.google.com/rss/search?q=${q}&hl=${langMap.hl}&gl=${langMap.gl}&ceid=${langMap.ceid}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0)' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return [];

  const xml = await response.text();
  const items: NewsItem[] = [];

  // Parse <item> blocks từ RSS XML (không cần thư viện)
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    if (items.length >= 7) break;          // Lấy tối đa 7 tin

    const block = match[1];
    const title   = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? block.match(/<title>(.*?)<\/title>/))?.[1]?.trim() ?? '';
    const link    = block.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? '';
    const source  = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim() ?? '';
    const desc    = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ?? block.match(/<description>(.*?)<\/description>/))?.[1] ?? '';

    // Lấy snippet sạch từ description (xóa HTML tags)
    const snippet = desc.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim().slice(0, 300);

    if (title && link) {
      items.push({ title, link, pubDate, source, snippet });
    }
  }

  return items;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const rawBody = await request.json();
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config } = parsed.data as { config: NewsConfig };
    const runId = createTinhGonRunId(config.keyword);

    // Tạo Article record
    const article = await prisma.article.create({
      data: {
        userId:           user.userId,
        runId,
        status:           'DRAFT',
        keyword:          config.keyword,
        language:         config.language,
        contentType:      `viet_tin_tuc:${config.structure}`,
        targetLength:     config.targetLength,
        aiProvider:       config.model,
        brandConfig:      config.brandConfig as never ?? {},
        selectedTitle:    config.keyword,
        htmlContent:      '',
        competitorUrls:   [],
        secondaryKeywords: [],
        outline:          {
          stage: 'config',
          structure: config.structure,
          tone: config.tone,
          config,
        },
      },
    });

    // Fetch Google News (non-blocking — nếu lỗi vẫn tiếp tục)
    let sources: NewsItem[] = [];
    let warning: string | undefined;

    try {
      sources = await fetchGoogleNews(config.keyword, config.language);
    } catch (fetchError) {
      warning = 'Không thể fetch Google News, AI sẽ dùng kiến thức sẵn có.';
      console.warn('[viet-tin-tuc/start] fetchGoogleNews failed:', fetchError);
    }

    return NextResponse.json({
      articleId: article.id,
      runId,
      sources,
      ...(warning ? { warning } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

---

## 5. API: `/api/viet-tin-tuc/stream/route.ts`

SSE stream — AI đọc news sources và viết bài.

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
import type { NewsConfig, NewsItem } from '@/lib/viet-tin-tuc/types';

export const runtime = 'nodejs';

// Map tone → hướng dẫn cho AI
const TONE_INSTRUCTIONS: Record<string, string> = {
  formal:         'Giọng văn trang trọng, nghiêm túc. Dùng "độc giả" hoặc "bạn đọc".',
  intimate:       'Giọng văn thân mật, gần gũi như tạp chí. Dùng "bạn".',
  friendly:       'Giọng văn ấm áp, thân thiện. Dùng "bạn".',
  expert:         'Giọng văn chuyên môn, phân tích sâu. Có số liệu và lập luận rõ.',
  humorous:       'Giọng văn vui vẻ, châm biếm nhẹ nhàng. Được phép dùng ẩn dụ hài.',
  inspirational:  'Giọng văn truyền cảm hứng, tích cực, động lực.',
  nostalgic:      'Giọng văn hoài cổ, gợi nhớ, cảm xúc.',
  shocking:       'Giọng văn gây chú ý, kịch tính, mở bài mạnh mẽ.',
  conversational: 'Giọng văn trò chuyện như blog cá nhân, thoải mái.',
};

// Map structure → hướng dẫn cho AI
const STRUCTURE_INSTRUCTIONS: Record<string, string> = {
  auto:             'Chọn cấu trúc phù hợp nhất với nội dung tin tức.',
  inverted_pyramid: 'Cấu trúc Kim Tự Tháp: tin quan trọng nhất ở đầu (5W1H), chi tiết phụ ở dưới.',
  storytelling:     'Cấu trúc Kể Chuyện: mở đầu kịch tính, diễn biến theo thời gian, kết thúc.',
  qa:               'Cấu trúc Q&A: mỗi section là một câu hỏi (H2) và phần trả lời.',
  how_to:           'Cấu trúc How-To: từng bước rõ ràng, có đánh số, hành động cụ thể.',
  pro_con:          'Cấu trúc Pro & Con: phần ưu điểm, phần nhược điểm, kết luận.',
  historical:       'Cấu trúc Lịch Sử: diễn biến từ quá khứ → hiện tại → xu hướng.',
  listicle:         'Cấu trúc Danh Sách: Top N điểm, mỗi điểm là H2 với 1-2 đoạn.',
  profile:          'Cấu trúc Profile: giới thiệu → đặc điểm nổi bật → thành tích → nhận định.',
  review:           'Cấu trúc Review: tổng quan → ưu điểm → nhược điểm → chấm điểm → kết luận.',
};

function buildNewsPrompt(
  config: NewsConfig,
  sources: NewsItem[],
  brandPrompt: string,
): string {
  const forbidden = mergeForbiddenWords(config.brandConfig?.forbiddenExtra).join(', ');
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal;
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;

  const sourcesText = sources.length > 0
    ? sources.map((s, i) =>
        `[${i + 1}] ${s.title}\n    Nguồn: ${s.source} | ${s.pubDate}\n    ${s.snippet}`
      ).join('\n\n')
    : 'Không có nguồn tin — dùng kiến thức sẵn có và ghi rõ đây là thông tin chung.';

  return `
Bạn là News Writer Agent — chuyên viết tin tức chính xác, nhanh, dễ đọc.

${brandPrompt}

## Thông tin bài viết
- Chủ đề / Từ khóa: ${config.keyword}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: ${config.targetLength} từ
- Cấu trúc: ${structureInstruction}
- Giọng văn: ${toneInstruction}

## Nguồn tin Google News (cập nhật mới nhất)
${sourcesText}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong 1 thẻ <article>.
- Bắt đầu bằng <h1> là tiêu đề bài, mỗi phần chính là <h2>.
- Tổng số từ bám sát ${config.targetLength} từ. Không lan man.
- Tổng hợp thông tin từ các nguồn tin — không copy nguyên văn.
- Có số liệu, ngày giờ, tên cụ thể nếu sources cung cấp.
- Cuối bài có thể có đoạn ngắn gợi ý góc nhìn hoặc hành động tiếp theo.
- Không dùng các từ/cụm từ: ${forbidden}
- Không thêm CSS, JavaScript, markdown hay lời giải thích ngoài bài.
- Chỉ trả HTML.
`.trim();
}

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

const streamSchema = z.object({
  articleId: z.string(),
  runId:     z.string(),
  config:    z.object({
    keyword:      z.string().min(1),
    language:     z.string(),
    structure:    z.string(),
    tone:         z.string(),
    model:        z.string(),
    targetLength: z.number(),
    brandConfig:  z.record(z.unknown()).optional(),
  }),
  sources: z.array(z.object({
    title:   z.string(),
    link:    z.string(),
    pubDate: z.string(),
    source:  z.string(),
    snippet: z.string(),
  })),
});

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

    const { articleId, runId, config, sources } = parsed.data as {
      articleId: string;
      runId: string;
      config: NewsConfig;
      sources: NewsItem[];
    };

    // Verify article ownership
    const article = await prisma.article.findFirst({
      where: { id: articleId, runId, userId: user.userId, deletedAt: null },
    });
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const brandPrompt = await buildBrandPrompt(config.brandConfig);
    const prompt = buildNewsPrompt(config, sources, brandPrompt);
    const model = buildTinhGonModel(config.model);

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);

        try {
          send({ type: 'step', step: 'generate', label: 'AI đang viết tin tức...' });

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
            // Fallback: non-stream
            const result = await model.generateContent(prompt);
            rawHtml = result.response.text();
            send({ type: 'chunk', text: rawHtml });
          }

          send({ type: 'step_done', step: 'generate' });
          send({ type: 'step', step: 'analyze', label: 'Phân tích chất lượng...' });

          // Post-process
          // ⚠️ BUG #1 fix: sanitizeHtmlArticle cần 2 args (raw, fallbackTitle)
          const html           = sanitizeHtmlArticle(rawHtml, config.keyword);
          // ⚠️ BUG #2 fix: Extract title TRƯỚC — buildMetaDescription nhận title (không phải html)
          const titleMatch     = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title          = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : config.keyword;
          const wordCount      = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness      = analyzeHumanness(html, config.brandConfig?.forbiddenExtra);
          const metaDescription = buildMetaDescription(title, config.keyword); // title đầu tiên, không phải html

          // Update Article DB
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
              seoChecks:       { keywordDensity },
              scoreBreakdown:  { humanness, keywordDensity },
              outline: {
                stage:    'generate',
                structure: config.structure,
                tone:      config.tone,
                config,
                sources,
              },
            },
          });

          send({ type: 'step_done', step: 'analyze' });
          send({
            type: 'done',
            data: {
              runId,
              html,
              title,
              metaDescription,
              wordCount,
              keywordDensity,
              humanness,
              sources,
            },
          });
        } catch (error) {
          send({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi stream' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
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

## 6. Config Page — `web/app/viet-tin-tuc/page.tsx`

**2 progress bars** (Config → Generate), không có bước Outline.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AI_MODELS } from '@/lib/tinh-gon/options';
import { NEWS_LENGTHS, NEWS_STRUCTURES, NEWS_TONES } from '@/lib/viet-tin-tuc/options';
import type { NewsConfig, NewsStartResponse } from '@/lib/viet-tin-tuc/types';

const DEFAULT_CONFIG: NewsConfig = {
  keyword:      '',
  language:     'Vietnamese',
  structure:    'auto',
  tone:         'formal',
  model:        'gemini-flash',
  targetLength: 600,
};

export default function VietTinTucPage() {
  const router = useRouter();
  const [config, setConfig]   = useState<NewsConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    document.title = 'Viết Tin Tức - Content Agent';
    const stored = sessionStorage.getItem('vtt_config');
    if (stored) {
      try { setConfig(JSON.parse(stored) as NewsConfig); } catch { /* ignore */ }
    }
  }, []);

  async function handleNext() {
    const keyword = config.keyword.trim();
    if (!keyword) { setError('Vui lòng nhập từ khóa hoặc chủ đề.'); return; }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/viet-tin-tuc/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ config: { ...config, keyword } }),
      });

      const data = await response.json() as NewsStartResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Không thể bắt đầu');

      // Lưu vào sessionStorage để generate page dùng
      sessionStorage.setItem('vtt_config',      JSON.stringify({ ...config, keyword }));
      sessionStorage.setItem('vtt_article_id',  data.articleId);
      sessionStorage.setItem('vtt_run_id',      data.runId);
      sessionStorage.setItem('vtt_sources',     JSON.stringify(data.sources));
      // Xóa result cũ
      sessionStorage.removeItem('vtt_result');

      router.push('/viet-tin-tuc/generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto">

        {/* Header + Progress */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">AI Viết Tin Tức</h1>
          <p className="text-sm text-gray-500 mb-4">
            AI tổng hợp từ Google News và viết bài tin tức nhanh, đủ thông tin.
          </p>
          {/* Progress bar — 2 bước */}
          <div className="flex items-center gap-2">
            {['Cấu hình', 'Viết & Chỉnh sửa'].map((label, index) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 flex-1 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <span className={`text-xs whitespace-nowrap ${index === 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {index + 1}. {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyword input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Từ khóa hoặc chủ đề tin tức <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.keyword}
            onChange={(e) => setConfig((prev) => ({ ...prev, keyword: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && void handleNext()}
            placeholder="VD: xu hướng nội thất 2026, giá gỗ tháng 5..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            Phù hợp với: xu hướng mới, sản phẩm ra mắt, tin nóng, giá cả thị trường.
            Không phù hợp với kinh nghiệm, kiến thức tĩnh.
          </p>
        </div>

        {/* Language */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Ngôn ngữ bài viết</label>
          <div className="flex gap-3">
            {[
              { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
              { value: 'English',    label: '🇬🇧 English' },
            ].map((lang) => (
              <button
                key={lang.value}
                onClick={() => setConfig((prev) => ({ ...prev, language: lang.value }))}
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

        {/* Structure */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Cấu trúc bài viết</label>
          <div className="grid grid-cols-2 gap-2">
            {NEWS_STRUCTURES.map((s) => (
              <button
                key={s.value}
                onClick={() => setConfig((prev) => ({ ...prev, structure: s.value }))}
                className={`flex items-start gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                  config.structure === s.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="text-base">{s.icon}</span>
                <div>
                  <p className={`text-xs font-semibold ${config.structure === s.value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{s.note}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Giọng văn & Ngữ điệu</label>
          <div className="grid grid-cols-3 gap-2">
            {NEWS_TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setConfig((prev) => ({ ...prev, tone: t.value }))}
                title={t.note}
                className={`py-2.5 px-3 rounded-lg border-2 text-xs font-medium transition-colors text-center ${
                  config.tone === t.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Hover để xem gợi ý dùng từng giọng văn.
          </p>
        </div>

        {/* Target length */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Độ dài bài</label>
          <div className="flex gap-3">
            {NEWS_LENGTHS.map((l) => (
              <button
                key={l.value}
                onClick={() => setConfig((prev) => ({ ...prev, targetLength: l.value }))}
                className={`flex-1 py-2.5 rounded-lg border-2 text-xs font-medium transition-colors relative ${
                  config.targetLength === l.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
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
        </div>

        {/* AI Model */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Model AI</label>
          <div className="grid grid-cols-2 gap-2">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setConfig((prev) => ({ ...prev, model: m.id }))}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                  config.model === m.id ? m.color : m.inactive
                }`}
              >
                <span>{m.icon}</span>
                <div className="text-left">
                  <p className="text-xs font-semibold">{m.label}</p>
                  <p className="text-[10px] opacity-70">{m.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => void handleNext()}
          disabled={loading || !config.keyword.trim()}
          className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Đang fetch Google News...
            </span>
          ) : 'Fetch News & Viết Bài →'}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          AI sẽ fetch tin tức mới nhất từ Google News rồi viết bài ngay — không cần bước outline.
        </p>
      </div>
    </div>
  );
}
```

---

## 7. Generate Page — `web/app/viet-tin-tuc/generate/page.tsx`

> **Layout giống `viet-bai-thong-minh/step4`** — rich text editor bên trái +  
> sidebar 3 tab bên phải: **SEO | Kiểm tra AI | Nguồn**  
>  
> ⚡ Tab "Kiểm tra AI" (`AICheckPanel`) là **bắt buộc** phải chạy trước khi publish —  
> Google dùng perplexity + burstiness để phát hiện AI. Chỉ publish khi AI Score < 35.

---

### 7.1 Layout tổng thể

```
┌─────────────────────────────────────────────┬──────────────────────┐
│  HEADER: title input · wordCount · Save · Publish                  │
├─────────────────────────────────────────────┼──────────────────────┤
│  TOOLBAR: Bold · Italic · Link · H2/H3 · ..  │  [SEO][AI ✓][Nguồn] │
├─────────────────────────────────────────────┤                      │
│                                             │  ← tab content       │
│  contentEditable editor (bài viết HTML)     │    SEO score bar     │
│                                             │    Humanness badge   │
│  (trong lúc stream: hiện raw text preview) │    SEO checklist     │
│                                             │    ─────────────     │
│                                             │    AI Check panel    │
│                                             │    (AICheckPanel)    │
│                                             │    ─────────────     │
│                                             │    Sources list      │
└─────────────────────────────────────────────┴──────────────────────┘
```

---

### 7.2 Imports

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AICheckPanel from '@/app/components/AICheckPanel';
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
import { SEO_WEIGHTS } from '@/lib/seo-weights';
import { computeKeywordDensity, countWords, slugify } from '@/lib/tinh-gon/text';
import type { NewsConfig, NewsItem, NewsStreamResult } from '@/lib/viet-tin-tuc/types';
import type { TinhGonDecision, TinhGonHumannessResult } from '@/lib/tinh-gon/types';
```

---

### 7.3 State đầy đủ

```typescript
// ── Data ──────────────────────────────────────────────────────────────────────
const [config, setConfig]               = useState<NewsConfig | null>(null);
const [articleId, setArticleId]         = useState<string | null>(null);
const [runId, setRunId]                 = useState('');
const [sources, setSources]             = useState<NewsItem[]>([]);
const [result, setResult]               = useState<NewsStreamResult | null>(null);

// ── Editor ────────────────────────────────────────────────────────────────────
const [editTitle, setEditTitle]         = useState('');
const [wordCountLive, setWordCountLive] = useState(0);
const contentRef                        = useRef<HTMLDivElement>(null);
const contentInited                     = useRef(false);

// ── Stream ────────────────────────────────────────────────────────────────────
const [streaming, setStreaming]         = useState(false);
const [streamLabel, setStreamLabel]     = useState('');

// ── Sidebar ───────────────────────────────────────────────────────────────────
const [sideTab, setSideTab]             = useState<'seo' | 'ai' | 'sources'>('sources');

// ── SEO (client-side recompute, giống step4) ──────────────────────────────────
const [manuallyFixed, setManuallyFixed] = useState<Set<number>>(new Set());
const [openBasic, setOpenBasic]         = useState(true);
const [openAdvanced, setOpenAdvanced]   = useState(true);
const [openTitle, setOpenTitle]         = useState(true);

// ── Humanness (debounced recheck) ────────────────────────────────────────────
const [recheckPending, setRecheckPending] = useState(false);
const recheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// ── Actions ───────────────────────────────────────────────────────────────────
const [saving, setSaving]               = useState(false);
const [savedFlash, setSavedFlash]       = useState(false);
const [publishing, setPublishing]       = useState(false);
const [publishedUrl, setPublishedUrl]   = useState('');
const [error, setError]                 = useState('');
```

---

### 7.4 sessionStorage keys

```typescript
const KEYS = {
  config:    'vtt_config',
  articleId: 'vtt_article_id',
  runId:     'vtt_run_id',
  sources:   'vtt_sources',
  result:    'vtt_result',
} as const;
```

---

### 7.5 bootstrap() + DB resume

```typescript
useEffect(() => {
  void bootstrap();
  return () => { if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current); };
}, []);

async function bootstrap() {
  const storedConfig    = sessionStorage.getItem(KEYS.config);
  const storedArticleId = sessionStorage.getItem(KEYS.articleId);
  const storedRunId     = sessionStorage.getItem(KEYS.runId);
  const storedSources   = sessionStorage.getItem(KEYS.sources);
  const storedResult    = sessionStorage.getItem(KEYS.result);

  // ── Thử DB resume trước nếu có ?runId= trong URL ──────────────────────────
  const urlRunId = new URLSearchParams(window.location.search).get('runId');
  if (urlRunId && (!storedRunId || storedRunId !== urlRunId)) {
    await loadFromDatabase(urlRunId);
    return;
  }

  if (!storedConfig || !storedArticleId || !storedRunId) {
    router.replace('/viet-tin-tuc');
    return;
  }

  const nextConfig    = JSON.parse(storedConfig)  as NewsConfig;
  const nextSources   = storedSources ? JSON.parse(storedSources) as NewsItem[] : [];

  setConfig(nextConfig);
  setSources(nextSources);
  setArticleId(storedArticleId);
  setRunId(storedRunId);

  // Resume từ sessionStorage
  if (storedResult) {
    const parsedResult = JSON.parse(storedResult) as NewsStreamResult;
    if (parsedResult.runId === storedRunId) {
      applyResult(parsedResult);
      return;
    }
  }

  await startGeneration(nextConfig, nextSources, storedRunId, storedArticleId);
}

// DB resume — dùng route có sẵn `api/articles/by-runid/[runId]`
// ⚠️ BUG #5 fix: PHẢI có hàm này để resume từ URL ?runId=
async function loadFromDatabase(rId: string) {
  try {
    const res = await fetch(`/api/articles/by-runid/${rId}`);
    if (!res.ok) { router.replace('/viet-tin-tuc'); return; }

    const article = await res.json() as {
      id: string; runId: string; keyword: string; language: string;
      htmlContent: string; selectedTitle: string; wordCount: number;
      metaDescription: string; humannessScore: number; aiDecision: TinhGonDecision;
      seoChecks?: { keywordDensity: number };
      // ⚠️ BUG #6 fix: outline là {config?, structure?, tone?, sources?}
      // KHÔNG dùng parseTinhGonSnapshot() — nó trả null cho news articles
      outline?: {
        config?: NewsConfig;
        structure?: string;
        tone?: string;
        sources?: NewsItem[];
      };
    };

    const cfg     = article.outline?.config ?? null;
    const srcs    = article.outline?.sources ?? [];

    setConfig(cfg);
    setSources(srcs);
    setArticleId(article.id);
    setRunId(rId);

    applyResult({
      runId:          rId,
      html:           article.htmlContent,
      title:          article.selectedTitle,
      metaDescription: article.metaDescription,
      wordCount:      article.wordCount,
      keywordDensity: article.seoChecks?.keywordDensity ?? 0,
      humanness: {
        score:        article.humannessScore ?? 0,
        decision:     article.aiDecision ?? 'REVIEW',
        issues: [], forbiddenFound: [],
        metrics: { sentenceCount:0, averageSentenceLength:0, passiveVoiceHits:0 },
      },
      sources: srcs,
    });

    // Sync sessionStorage
    if (cfg) sessionStorage.setItem(KEYS.config, JSON.stringify(cfg));
    sessionStorage.setItem(KEYS.articleId, article.id);
    sessionStorage.setItem(KEYS.runId, rId);
    if (srcs.length) sessionStorage.setItem(KEYS.sources, JSON.stringify(srcs));
  } catch {
    router.replace('/viet-tin-tuc');
  }
}
```

---

### 7.6 applyResult() — set state sau khi có data

```typescript
function applyResult(data: NewsStreamResult) {
  setResult(data);
  setEditTitle(data.title);
  setWordCountLive(data.wordCount);
  // Set editor content 1 lần (contentInited flag)
  if (contentRef.current && !contentInited.current) {
    contentInited.current = true;
    contentRef.current.innerHTML = data.html;
  }
  setSideTab('seo'); // Chuyển sang SEO sau khi có bài
  setStreaming(false);
}
```

---

### 7.7 startGeneration() — SSE stream

```typescript
async function startGeneration(
  cfg: NewsConfig,
  srcs: NewsItem[],
  rId: string,
  artId: string,
) {
  setStreaming(true);
  setStreamLabel('Đang kết nối...');
  setSideTab('sources'); // Hiện nguồn trong lúc chờ

  try {
    const response = await fetch('/api/viet-tin-tuc/stream', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ articleId: artId, runId: rId, config: cfg, sources: srcs }),
    });

    if (!response.ok || !response.body) {
      const data = await response.json() as { error?: string };
      throw new Error(data.error || 'Không thể bắt đầu stream');
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';
    let   rawHtml = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const line = event.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;

        const payload = JSON.parse(line.slice(6)) as {
          type: string; step?: string; label?: string;
          text?: string; message?: string; data?: NewsStreamResult;
        };

        if (payload.type === 'step' && payload.label) setStreamLabel(payload.label);

        if (payload.type === 'chunk' && payload.text) {
          rawHtml += payload.text;
          // Preview stream trong editor
          if (contentRef.current && !contentInited.current) {
            contentRef.current.innerHTML = rawHtml;
          }
        }

        if (payload.type === 'error') throw new Error(payload.message || 'Stream lỗi');

        if (payload.type === 'done' && payload.data) {
          contentInited.current = false; // Reset để applyResult có thể set
          applyResult(payload.data);
          sessionStorage.setItem(KEYS.result, JSON.stringify(payload.data));
        }
      }
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Không thể tạo bài');
    setStreaming(false);
  }
}
```

---

### 7.8 computeSeoChecks() — điều chỉnh cho tin tức

> **Khác step4**: Ngưỡng độ dài là ≥ **400 từ** (tin tức ngắn), không có secondary keywords bắt buộc.

```typescript
// Reuse toàn bộ từ step4 — chỉ thay 1 dòng:
{ group: 'basic', label: 'Độ dài nội dung ≥ 400 từ',
  pass: wordCount >= 400,
  detail: `${wordCount} từ — ${wordCount >= 800 ? 'Rất tốt!' : wordCount >= 400 ? 'Đạt chuẩn.' : 'Nên viết thêm.'}` },
```

---

### 7.9 handleContentInput() — debounced recheck humanness

```typescript
function handleContentInput() {
  if (!contentRef.current) return;
  const text  = contentRef.current.innerText || '';
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  setWordCountLive(words);

  // Debounced recheck (2.5s) — giống viet-tinh-gon generate page
  if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
  setRecheckPending(true);
  recheckTimerRef.current = setTimeout(() => {
    setRecheckPending(false);
    void refreshMetrics();
  }, 2500);
}

async function refreshMetrics() {
  if (!contentRef.current || !config) return;
  const html  = contentRef.current.innerHTML;
  const words = countWords(html);
  const density = computeKeywordDensity(html, config.keyword);
  // Gọi API humanness check
  try {
    const res  = await fetch('/api/tinh-gon/humanness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, forbiddenExtra: config.brandConfig?.forbiddenExtra }),
    });
    const data = await res.json() as { humanness: TinhGonHumannessResult };
    if (data.humanness) {
      setResult((prev) => prev
        ? { ...prev, wordCount: words, keywordDensity: density, humanness: data.humanness }
        : prev
      );
    }
  } catch { /* silent fail */ }
}
```

---

### 7.10 handleApplyFix() — áp dụng sửa câu từ AICheckPanel

```typescript
// AICheckPanel gọi onApplyFix(original, replacement) khi user bấm "Áp dụng"
function handleApplyFix(original: string, replacement: string) {
  if (!contentRef.current) return;
  // Thay thế text trong innerHTML (an toàn hơn execCommand)
  const html = contentRef.current.innerHTML;
  const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  contentRef.current.innerHTML = html.replace(new RegExp(escapedOriginal), replacement);
  handleContentInput();
}
```

---

### 7.11 Sidebar: 3 tabs SEO | Kiểm tra AI | Nguồn

```tsx
{/* ── Tab bar ─────────────────────────────────────────────────────────── */}
<div className="flex border-b border-gray-200">
  {([
    { key: 'seo',     label: 'SEO' },
    { key: 'ai',      label: '🔍 Kiểm tra AI' },   {/* ← Tab quan trọng nhất */}
    { key: 'sources', label: `Nguồn (${sources.length})` },
  ] as const).map((tab) => (
    <button key={tab.key} onClick={() => setSideTab(tab.key)}
      className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
        sideTab === tab.key
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}>
      {tab.label}
    </button>
  ))}
</div>
```

---

### 7.12 Tab SEO

```tsx
{sideTab === 'seo' && result && (
  <div className="flex-1 overflow-y-auto p-4 space-y-4">

    {/* SEO Score bar — giống step4 */}
    <SeoScoreBar score={seoScore} />

    {/* Humanness badge — PUBLISH / REVIEW / REWRITE */}
    {/* stale=recheckPending cho hiệu ứng spinner giống viet-tinh-gon */}
    <HumannessPanel humanness={result.humanness} stale={recheckPending} />

    {/* Keyword Density */}
    <KeywordDensityBar
      keyword={config?.keyword ?? ''}
      density={result.keywordDensity}
    />

    {/* SEO Checklist */}
    <div className="space-y-2">
      {/* Basic group */}
      <button onClick={() => setOpenBasic((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-gray-700">
        SEO Cơ bản <span>{openBasic ? '▲' : '▼'}</span>
      </button>
      {openBasic && seoChecks.filter((c) => c.group === 'basic').map((c, i) => (
        <SeoCheckRow key={i} check={c} idx={i} manuallyFixed={manuallyFixed}
          onToggleFix={(idx) => setManuallyFixed((prev) => {
            const s = new Set(prev);
            s.has(idx) ? s.delete(idx) : s.add(idx);
            return s;
          })} />
      ))}
      {/* Advanced group — tương tự */}
      {/* Title group — tương tự */}
    </div>
  </div>
)}
```

---

### 7.13 Tab Kiểm tra AI — `AICheckPanel`

> **Bắt buộc chạy trước khi publish.** Component này gọi `POST /api/pipeline/ai-check`  
> để phân tích từng câu — phát hiện DANGER 🔴 / WARNING 🟡 / SAFE 🟢.  
> User fix trực tiếp trong editor qua `onApplyFix`.

```tsx
{sideTab === 'ai' && (
  <div className="flex-1 overflow-y-auto p-4">
    {/* Nhắc nhở trước khi publish */}
    {!result && (
      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-700 font-medium">
          ⚠️ Chạy kiểm tra AI trước khi publish.
        </p>
        <p className="text-xs text-amber-600 mt-1">
          Mục tiêu: AI Score &lt; 35 (Nguy cơ Thấp).
        </p>
      </div>
    )}

    {/* AICheckPanel — reuse hoàn toàn từ app/components/AICheckPanel.tsx */}
    <AICheckPanel
      html={contentRef.current?.innerHTML ?? result?.html ?? ''}
      onApplyFix={handleApplyFix}
    />

    {/* Link kiểm tra ngoài (bypass.aiktp.com) */}
    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs text-gray-500 mb-2">Kiểm tra thêm với công cụ ngoài:</p>
      <a
        href="https://bypass.aiktp.com/vi/ai-detector"
        target="_blank" rel="noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        bypass.aiktp.com/vi/ai-detector ↗
      </a>
    </div>
  </div>
)}
```

---

### 7.14 Tab Nguồn tin

```tsx
{sideTab === 'sources' && (
  <div className="flex-1 overflow-y-auto p-4 space-y-3">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      Nguồn tin ({sources.length})
    </p>

    {streaming && (
      <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
        <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        {streamLabel}
      </div>
    )}

    {sources.length === 0 ? (
      <p className="text-sm text-gray-400">
        Không có nguồn tin từ Google News. AI sẽ dùng kiến thức sẵn có.
      </p>
    ) : (
      sources.map((s, i) => (
        <a key={i} href={s.link} target="_blank" rel="noreferrer"
          className="block p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <p className="text-xs font-medium text-gray-800 leading-snug mb-1 line-clamp-2">
            {i + 1}. {s.title}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-blue-600 font-medium">{s.source}</span>
            <span className="text-[10px] text-gray-400">{s.pubDate.slice(0, 16)}</span>
          </div>
          {s.snippet && (
            <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{s.snippet}</p>
          )}
        </a>
      ))
    )}
  </div>
)}
```

---

### 7.15 saveDraft() — lưu vào DB

```typescript
const handleSave = useCallback(async () => {
  if (!result || !contentRef.current || !articleId) return;
  setSaving(true);

  const updatedHtml = contentRef.current.innerHTML;
  const words       = countWords(updatedHtml);

  try {
    await fetch(`/api/articles/${articleId}/save`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedTitle:   editTitle,
        htmlContent:     updatedHtml,
        metaDescription: result.metaDescription,
        wordCount:       words,
        humannessScore:  result.humanness.score,
        seoChecks:       { keywordDensity: result.keywordDensity },
        createVersion:   true,
      }),
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  } catch (err) {
    console.error('[saveDraft]', err);
  } finally {
    setSaving(false);
  }
}, [result, editTitle, articleId]);
```

---

### 7.16 Checklist trước khi publish

Thêm dialog xác nhận khi user bấm **Publish**:

```tsx
const publishBlockers: string[] = [];
if (result && result.humanness.score < 60)
  publishBlockers.push(`Humanness Score quá thấp (${result.humanness.score}/100 — cần ≥ 60)`);
if (result && result.keywordDensity > 1.5)
  publishBlockers.push(`Keyword density quá cao (${result.keywordDensity.toFixed(2)}% — cần ≤ 1.5%)`);
// Nếu user chưa chạy AI check → nhắc
// (kiểm tra bằng ref hoặc local state aiChecked)

if (publishBlockers.length > 0) {
  // Hiện warning modal thay vì block hoàn toàn
  // User vẫn có thể publish nhưng phải xác nhận
}
```

---

### 7.17 Tái sử dụng từ `viet-tinh-gon/generate/page.tsx` — Checklist đầy đủ

> **Chiến lược**: `viet-tin-tuc/generate/page.tsx` về cơ bản là **fork của `viet-tinh-gon/generate`**.  
> Copy file gốc, sau đó **chỉ sửa những điểm khác biệt** liệt kê dưới đây.  
> Đây là cách đảm bảo có đầy đủ toolbar, modal, auto-save giống step4.

---

#### A. Những gì COPY NGUYÊN từ `viet-tinh-gon/generate/page.tsx`

**State — copy toàn bộ nhóm này (không thay đổi):**

```typescript
// Toolbar dropdowns
const [formatMenuOpen, setFormatMenuOpen]         = useState(false);
const [openSubmenu, setOpenSubmenu]               = useState<string | null>(null);
const [showColorPicker, setShowColorPicker]       = useState(false);
const [currentColor, setCurrentColor]             = useState('#000000');
const [showFontSizeMenu, setShowFontSizeMenu]     = useState(false);
const [currentFontSize, setCurrentFontSize]       = useState('14px');
const [showTableMenu, setShowTableMenu]           = useState(false);
const [tableGridSize, setTableGridSize]           = useState({ rows: 0, cols: 0 });
// Dropdown positioning (dùng cho portal render)
const [colorDropPos, setColorDropPos]             = useState({ top: 0, left: 0 });
const [fontDropPos, setFontDropPos]               = useState({ top: 0, left: 0 });
const [paragraphDropPos, setParagraphDropPos]     = useState({ top: 0, left: 0 });
const [tableDropPos, setTableDropPos]             = useState({ top: 0, left: 0 });
// Modals
const [showImgModal, setShowImgModal]             = useState(false);
const [imgUrl, setImgUrl]                         = useState('');
const [imgAlt, setImgAlt]                         = useState('');
const [imgTitle, setImgTitle]                     = useState('');
const [imgWidth, setImgWidth]                     = useState('');
const [imgHeight, setImgHeight]                   = useState('');
const [imgModalTab, setImgModalTab]               = useState<'general' | 'upload'>('general');
const [showLinkModal, setShowLinkModal]           = useState(false);
const [linkUrl, setLinkUrl]                       = useState('');
const [linkText, setLinkText]                     = useState('');
const [linkTitle, setLinkTitle]                   = useState('');
const [linkTarget, setLinkTarget]                 = useState('_self');
const [showSourceModal, setShowSourceModal]       = useState(false);
const [sourceCode, setSourceCode]                 = useState('');
const [showFindReplace, setShowFindReplace]       = useState(false);
const [findText, setFindText]                     = useState('');
const [replaceText, setReplaceText]               = useState('');
const [findCount, setFindCount]                   = useState<number | null>(null);
const [matchCase, setMatchCase]                   = useState(false);
const [wholeWord, setWholeWord]                   = useState(false);
const [findInSel, setFindInSel]                   = useState(false);
const [showFindOpts, setShowFindOpts]             = useState(false);
// Editor helpers
const [selectionLabel, setSelectionLabel]         = useState('');
const [aiEditing, setAiEditing]                   = useState(false);
const [hasHighlights, setHasHighlights]           = useState(false);
const [fixingDensity, setFixingDensity]           = useState(false);
const [fixingInternal, setFixingInternal]         = useState(false);
const [internalUrl, setInternalUrl]               = useState('');
const [internalText, setInternalText]             = useState('');
const [fixingExternal, setFixingExternal]         = useState(false);
const [externalUrl, setExternalUrl]               = useState('');
const [externalText, setExternalText]             = useState('');
// Slug + Meta editing
const [editMetaDescription, setEditMetaDescription] = useState('');
const [slugEdited, setSlugEdited]                 = useState(false);
const [customSlug, setCustomSlug]                 = useState('');
const [editingSlug, setEditingSlug]               = useState(false);
const [copiedSlug, setCopiedSlug]                 = useState(false);
// Field highlights (quick-fix visual feedback)
const [fieldHighlights, setFieldHighlights]       = useState({ title: false, slug: false, meta: false });
// SEO accordions
const [openBasic, setOpenBasic]                   = useState(true);
const [openAdvanced, setOpenAdvanced]             = useState(true);
const [openTitle, setOpenTitle]                   = useState(true);
// manuallyFixed — for SEO checklist checkboxes
const [manuallyFixed, setManuallyFixed]           = useState<Set<number>>(new Set());
```

**Refs — copy toàn bộ:**
```typescript
const savedRangeRef      = useRef<Range | null>(null);
const colorBtnRef        = useRef<HTMLButtonElement>(null);
const fontBtnRef         = useRef<HTMLButtonElement>(null);
const paragraphBtnRef    = useRef<HTMLButtonElement>(null);
const tableBtnRef        = useRef<HTMLButtonElement>(null);
const persistedSignatureRef = useRef('');
const contentInited      = useRef(false);
```

**Functions — copy NGUYÊN, không sửa:**
- `buildResultSignature()` — detect changes để trigger auto-save
- `computeSeoChecks()` — 14-item SEO checklist **(chỉ sửa ngưỡng wordCount: 400 thay 1000)**
- `SeoScoreBar` sub-component
- `execFormat()` — wrapper cho `document.execCommand`
- `wrapSelection()` — wrap selected text trong tag
- `saveSelection() / restoreSelection()` — lưu/phục hồi cursor trước khi mở modal
- `captureSelection()` — cập nhật `selectionLabel`
- `openLinkModal() / insertLink()` — link modal logic
- `applyColor() / applyFontSize()` — toolbar color + font
- `handleImgFileUpload() / insertImage()` — image insertion
- `insertTableWithSize()` — table grid picker
- `highlightFixedEl() / clearFixHighlights()` — highlight fixed elements
- `replaceFirstOccurrence()` — **DOM TreeWalker text replacement** (ĐÚNG cho `onApplyFix`)
- `replaceSavedRangeWithHtml()` — insert at cursor with highlight
- `buildFindRegex() / handleFind() / handleReplaceAll() / handleReplaceOne() / closeFindReplace()`
- `openSourceModal() / applySourceCode()`
- `fixTitle() / fixMetaDescription() / fixUrlSlug() / fixTitleToStart() / fixTitleNumber() / fixAltText()` — SEO quick fixes
- `insertExternalLink()`
- `exportToWord()`
- `handleDownload()`
- `applyAiEdit()` — AI Edit commands (POST /api/tinh-gon/ai-edit, dùng lại route)

**JSX — copy NGUYÊN:**
- Header bar (title input + slug input row)
- Toolbar (toàn bộ — Paragraph, H2/H3, Color, Font, B/I/U, Align, List, Link, Image, Table, Undo/Redo, Find, W↓, Source)
- contentEditable editor div + captureSelection + handleContentInput
- Sidebar: SEO tab (SERP preview, SEO score, Humanness, meta editor, slug editor, SEO checklist với quick-fix buttons, fixDensity)
- All modals (Image, Link, Source code, Find/Replace)
- Portal dropdowns (Color picker, Font size menu, Paragraph menu, Table grid picker)

**Auto-save useEffect — copy nguyên:**
```typescript
// Trigger auto-save 1.5s sau khi content thay đổi (không tạo version)
useEffect(() => {
  if (!articleId || !result || !config || loading) return;
  if (resultSignature === persistedSignatureRef.current) return;
  const timer = setTimeout(() => void saveDraft(false), 1500);
  return () => clearTimeout(timer);
}, [articleId, config, loading, result, resultSignature]);
```

---

#### B. Những gì PHẢI THAY ĐỔI khi fork

| # | Phần | viet-tinh-gon | viet-tin-tuc |
|---|------|---------------|--------------|
| 1 | SessionStorage keys | `tg_*` | `vtt_*` |
| 2 | `computeSeoChecks` wordCount threshold | ≥ 1000 | **≥ 400** |
| 3 | `saveDraft(false)` — outline field | `buildTinhGonSnapshot(...)` | `{ stage:'generate', structure, tone, config, sources }` |
| 4 | `saveDraft(false)` — contentType | `buildTinhGonContentType(...)` | `` `viet_tin_tuc:${config.structure}` `` |
| 5 | `saveDraft` — secondaryKeywords | `config.secondaryKeywords` | Bỏ (news không có) |
| 6 | `loadFromDatabase()` — parse outline | `parseTinhGonSnapshot(outline)` | Parse thủ công: `(outline as {config?:NewsConfig})` |
| 7 | Sidebar tab 3 | `image` (Image gallery) | `sources` (News sources panel) |
| 8 | `applyResult()` | Set `outline` + `config` từ snapshot | Không cần set `outline` |
| 9 | `refreshMetrics()` | Update `tg_result` trong sessionStorage | Update `vtt_result` |
| 10 | "Bài mới" button | Clear `tg_*` keys → `/viet-tinh-gon` | Clear `vtt_*` keys → `/viet-tin-tuc` |
| 11 | `handleApplyAIFix` | `replaceFirstOccurrence` + `refreshMetrics` | **Giữ nguyên** — chỉ update `vtt_result` |
| 12 | Sidebar SEO: secondary keywords editor | Có (addKwTag / removeKwTag) | **Bỏ** (news không nhập keyword phụ) |
| 13 | InternalLinkSuggest component | Có | Optional — bỏ cho v1 |

---

#### C. `saveDraft(false)` — đoạn khác biệt duy nhất

```typescript
// Chỉ phần PATCH body khác với viet-tinh-gon
body: JSON.stringify({
  keyword:         config.keyword,
  language:        config.language,
  // ⚠️ contentType khác
  contentType:     `viet_tin_tuc:${config.structure}`,
  targetLength:    config.targetLength,
  aiProvider:      config.model,
  brandConfig:     config.brandConfig,
  selectedTitle:   editTitle,
  // ⚠️ outline format khác — KHÔNG dùng buildTinhGonSnapshot
  outline:         { stage: 'generate', structure: config.structure, tone: config.tone, config, sources },
  htmlContent:     currentHtml,
  metaDescription: editMetaDescription,
  slug:            activeSlug || undefined,
  seoChecks:       { keywordDensity: computeKeywordDensity(currentHtml, config.keyword) },
  humannessScore:  result.humanness.score,
  scoreBreakdown:  { humanness: result.humanness, keywordDensity: computeKeywordDensity(currentHtml, config.keyword) },
  status:          'WRITTEN',
  aiDecision:      result.humanness.decision,
  // ⚠️ KHÔNG có secondaryKeywords
}),
```

---

#### D. `activeSlug` và `useMemo` cần giữ nguyên

```typescript
// Giữ nguyên từ viet-tinh-gon — slug tự động + cho phép override
const autoSlug   = useMemo(() => slugify(editTitle), [editTitle]);
const activeSlug = slugEdited ? customSlug : autoSlug;
const siteUrl    = 'noithatminhquan.vn';

// SEO recompute on every relevant change
const seoData = useMemo(
  () => config
    ? computeSeoChecks(editTitle, editMetaDescription, currentHtml, currentWordCount, config.keyword, [], activeSlug)
    : { checks: [], score: 0 },
  [activeSlug, config, currentHtml, currentWordCount, editMetaDescription, editTitle],
);
// secondaryKeywords = [] cho news (không có keyword phụ)
```

---

#### E. `handleApplyAIFix` — phiên bản đúng

```typescript
// ⚠️ Doc Section 7.10 dùng innerHTML.replace() — SAI cho text có special chars
// Phiên bản đúng: giống viet-tinh-gon, dùng DOM TreeWalker
async function handleApplyAIFix(original: string, replacement: string) {
  replaceFirstOccurrence(original, replacement, true); // highlight sau khi fix
  const currentHtml = contentRef.current?.innerHTML ?? '';
  await refreshMetrics(currentHtml);
}
// onApplyFix={handleApplyAIFix} truyền vào <AICheckPanel />
```

---

#### F. Kiểm tra trước khi submit PR

- [ ] Tất cả `tg_*` sessionStorage keys đã đổi thành `vtt_*`
- [ ] `computeSeoChecks` dùng ngưỡng 400 từ
- [ ] `saveDraft` không dùng `buildTinhGonSnapshot`
- [ ] `loadFromDatabase` parse outline theo `{config?: NewsConfig}`
- [ ] Tab 3 sidebar hiện Sources (không phải Image gallery)
- [ ] `handleApplyAIFix` dùng `replaceFirstOccurrence` (không phải `.replace()`)
- [ ] Không có `secondaryKeywords` UI trong sidebar
- [ ] "Bài mới" xóa `vtt_*` keys và redirect `/viet-tin-tuc`

---

### Sidebar — thêm vào group "Viết Bài"

```tsx
// web/components/Sidebar.tsx
// Thêm sau dòng { label: 'Viết Tinh Gọn', href: '/viet-tinh-gon' }
{ label: 'Viết Tin Tức', href: '/viet-tin-tuc' },
```

### Homepage — thêm card

```tsx
// web/app/page.tsx — thêm vào mảng templates
{
  title:       'Viết tin tức',
  description: 'Tổng hợp từ Google News, viết bài 400–800 từ, thông tin thực tế mới nhất',
  color:       'from-rose-400 to-rose-600',
  href:        '/viet-tin-tuc',
  featured:    false,
  icon:        '📰',
},
```

---

## 9. Thứ tự implement

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `lib/viet-tin-tuc/types.ts` | Types trước |
| 2 | `lib/viet-tin-tuc/options.ts` | Constants |
| 3 | `api/viet-tin-tuc/start/route.ts` | Fetch Google News + tạo Article |
| 4 | `api/viet-tin-tuc/stream/route.ts` | SSE stream AI |
| 5 | `app/viet-tin-tuc/page.tsx` | Config form |
| 6 | `app/viet-tin-tuc/generate/page.tsx` | Editor + Sources panel |
| 7 | Sidebar + Homepage | Thêm entry point |

---

## 9b. Chống AI Detection & Nội dung trùng lặp

> **Bắt buộc cho tính năng Viết Tin Tức.** Rủi ro ở đây cao hơn blog SEO thông thường
> vì AI tổng hợp từ nhiều nguồn — dễ bị Google phát hiện là duplicate nếu không xử lý đúng.

---

### A. Chống nội dung trùng từ Google News (ưu tiên #1)

Thêm block sau vào `buildNewsPrompt()` trong `stream/route.ts`:

```
## QUY TẮC CHỐNG TRÙNG NỘI DUNG (BẮT BUỘC)

1. KHÔNG copy nguyên văn bất kỳ câu nào từ sources — dù chỉ 1 câu.
   Nếu cần dùng thông tin, phải đổi cấu trúc hoàn toàn:
   - Nguồn viết "A xảy ra vì B" → mình viết "Do B, A đã diễn ra"
   - Nguồn viết danh sách → mình viết thành đoạn văn, hoặc ngược lại.

2. Tổng hợp ít nhất 2–3 nguồn nếu có. Không bài nào là "chính".
   Nếu chỉ có 1 nguồn → AI phải tự thêm phân tích/bình luận chiếm ≥30% nội dung.

3. Thêm góc nhìn riêng của thương hiệu vào cuối mỗi section chính:
   "Với người đang tìm mua nội thất..." / "Từ góc độ sản xuất..."

4. Tiêu đề bài PHẢI khác hoàn toàn với tiêu đề của tất cả các sources.
   Không được paraphrase tiêu đề — phải là góc nhìn mới.

5. Mở bài: KHÔNG bắt đầu bằng cách tóm tắt "Theo [nguồn], vào ngày X...".
   Mở bằng: tình huống, câu hỏi, số liệu ấn tượng, hoặc nhận định.
```

---

### B. Chống AI detection trong văn phong

Thêm block sau vào **cuối** `buildNewsPrompt()`, trước `Chỉ trả HTML.`:

```
## QUY TẮC VIẾT NHƯ NGƯỜI THẬT (BẮT BUỘC)

1. Nhịp câu đa dạng — quan trọng nhất:
   Xen kẽ câu ngắn (3–6 từ) và câu trung bình (12–18 từ).
   KHÔNG viết 5 câu liên tiếp cùng độ dài.
   
   TỐT: "Giá vàng lại tăng. Phiên sáng nay SJC ghi nhận mức 87 triệu đồng/lượng —
   cao nhất trong 3 tuần qua. Không phải bất ngờ nếu nhìn vào bối cảnh."
   
   XẤU: "Theo thông tin mới nhất được cập nhật, giá vàng SJC đã tăng lên mức
   87 triệu đồng mỗi lượng trong phiên giao dịch sáng nay, đây là mức cao nhất."

2. Mở đoạn: không lặp kiểu:
   Sai → "Theo đó... / Bên cạnh đó... / Ngoài ra... / Đáng chú ý..."
   Đúng → luân phiên: số liệu cụ thể → câu hỏi → nhận xét ngắn → ví dụ thực

3. Dùng số liệu và tên cụ thể từ sources (ngày, giờ, con số):
   Câu có "87 triệu đồng/lượng lúc 9h sáng ngày 20/5" tốt hơn "giá tăng cao".

4. Câu cấm dùng (AI signature — đặc biệt trong tin tức):
   - "Không thể phủ nhận rằng..."
   - "Trong bối cảnh hiện nay..."
   - "Đây là một tín hiệu tích cực..."
   - "Nhìn chung, có thể thấy rằng..."
   - "Chính vì vậy..."
   - "Tuy nhiên, bên cạnh đó..."
   
5. Kết bài: KHÔNG dùng "Hy vọng thông tin trên hữu ích".
   Thay bằng: một câu nhận định ngắn, hoặc câu hỏi mở cho độc giả.
```

---

### C. Implement trong code: `buildNewsPrompt()`

Trong `stream/route.ts`, cập nhật `buildNewsPrompt()` thêm 2 block:

```typescript
function buildNewsPrompt(config: NewsConfig, sources: NewsItem[], brandPrompt: string): string {
  // ... code hiện tại ...

  // Thêm 2 hằng số này
  const antiDuplicateBlock = `
## QUY TẮC CHỐNG TRÙNG NỘI DUNG (BẮT BUỘC)
- KHÔNG copy nguyên văn — mọi thông tin phải được diễn đạt lại hoàn toàn.
- Tổng hợp ≥2 nguồn nếu có. Nếu chỉ 1 nguồn, thêm phân tích thương hiệu ≥30%.
- Tiêu đề bài phải khác hoàn toàn với mọi tiêu đề sources.
- Mở bài: bắt đầu bằng tình huống / số liệu / câu hỏi — KHÔNG bằng "Theo [nguồn]...".
- Cuối mỗi section chính: thêm 1–2 câu góc nhìn thương hiệu.
`;

  const antiAiBlock = `
## QUY TẮC VIẾT NHƯ NGƯỜI THẬT (BẮT BUỘC)
- Nhịp câu: xen kẽ câu 3–6 từ và câu 12–18 từ. KHÔNG 5 câu liên tiếp cùng độ dài.
- Mở đoạn: luân phiên góc nhìn — số liệu → câu hỏi → nhận xét → ví dụ cụ thể.
- Dùng số liệu thực từ sources (ngày/giờ/con số cụ thể) thay mọi tính từ mơ hồ.
- Không dùng: "không chỉ X mà còn Y", "Không thể phủ nhận", "Nhìn chung", "Chính vì vậy".
- Kết bài: nhận định ngắn hoặc câu hỏi mở — KHÔNG "Hy vọng thông tin hữu ích".
`;

  return `
Bạn là News Writer Agent — chuyên viết tin tức chính xác, nhanh, dễ đọc.

${brandPrompt}

## Thông tin bài viết
...

## Nguồn tin Google News
${sourcesText}

${antiDuplicateBlock}

${antiAiBlock}

## Quy tắc output
...
Chỉ trả HTML.
`.trim();
}
```

---

### D. Humanness Score cho tin tức — ngưỡng điều chỉnh

Tin tức ngắn hơn blog → ít câu hơn → một số chỉ số tính khác. Cần điều chỉnh:

| Chỉ số | Blog SEO (800–1500 từ) | Tin tức (400–800 từ) |
|--------|----------------------|---------------------|
| Humanness ≥76 | PUBLISH | PUBLISH |
| Từ tối thiểu | 500 | **300** |
| Số liệu cụ thể | ≥1 | **≥2** (tin tức phải có số liệu) |
| Câu đồng nhất | <65% cùng độ dài | <65% cùng độ dài |

Trong `analyzeHumanness()`, khi gọi cho news, truyền `minWords: 300` nếu API hỗ trợ,
hoặc accept nếu wordCount ≥300 (thay vì 500 hiện tại).

---

### E. Checklist anti-AI & anti-duplicate

- [ ] `buildNewsPrompt()` có block `antiDuplicateBlock` và `antiAiBlock`
- [ ] Prompt không cho phép copy câu từ sources
- [ ] Test bài output: paste vào https://bypass.aiktp.com/vi/ai-detector → Human % ≥70
- [ ] Test bài output: paste vào https://aiktp.com/vi/duplicate-content-checker → không trùng với sources
- [ ] Tiêu đề bài khác hoàn toàn với tiêu đề của news sources đã fetch
- [ ] Mở bài không bắt đầu bằng "Theo [tên báo]..."
- [ ] HumannessPanel hiển thị score ngay sau khi stream done
- [ ] AI Edit "Tự nhiên hơn" hoạt động khi score < 76

---

## 10. Checklist kiểm thử

- [ ] Config form: validate keyword, default values đúng
- [ ] Google News fetch: hiện đúng 7 nguồn, xử lý khi lỗi network
- [ ] SSE stream: chunk hiện real-time, event `done` trigger đúng
- [ ] Sources panel: hiện tên nguồn, link, snippet
- [ ] Article lưu DB: `contentType = 'viet_tin_tuc:inverted_pyramid'`
- [ ] HumannessPanel: hiện đúng score sau khi stream xong
- [ ] Re-check debounce: chỉnh tay → 2.5s → tự chấm lại
- [ ] Save (Ctrl+S): patch article thành công
- [ ] Resume: tắt tab → mở lại → load từ sessionStorage
- [ ] Sidebar: link `/viet-tin-tuc` hiển thị đúng group
