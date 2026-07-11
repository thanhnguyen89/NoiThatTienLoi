# VIET-LAI-URL-IMPLEMENTATION.md
## Hướng dẫn code tính năng "Viết lại URL"

> Phân tích từ: https://aiktp.com/vi/viet-lai-url-website  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API

---

## ⚠️ Điểm khác biệt & chú ý khi implement

| # | Điểm | Ghi chú |
|---|------|---------|
| 1 | **Bước crawl riêng biệt** trước khi generate | "Thu Thập" button → `/api/viet-lai-url/crawl` → populate 2 textareas. Đây là điểm khác biệt lớn nhất. |
| 2 | **2 textareas có thể chỉnh sửa** sau khi crawl | User sửa headings và content trước khi generate → AI nhận data đã được kiểm duyệt |
| 3 | **Idea Expander** — 18 ý tưởng mở rộng | Mỗi idea = 1 H2 section thêm vào prompt. Đây là tính năng độc đáo nhất |
| 4 | **Secondary keywords** tách với keyword chính | AI gợi ý qua `/api/viet-lai-url/suggest-keywords` (no requireAuth) |
| 5 | **Không có "Rewrite Method"** như viet-lai-bai-viet | Thay bằng "Structure" (9 options) — đây là viết bài mới từ nguồn, không phải rewrite nguyên bản |
| 6 | **Image injection** — 4 options | Reuse `injectYandexImages()` từ `lib/viet-toplist/image-injector.ts` |
| 7 | **Crawl timeout 10s** | Nhiều URL crawl chậm — phải có timeout + fallback empty content |
| 8 | **Heading extraction cần HTML** | `crawlUrl()` trong `lib/google-search/extract.ts` trả plain text — cần hàm mới `crawlUrlWithHeadings()` |
| 9 | sessionStorage prefix: `vlu_` | viet-**l**ai-**u**rl |
| 10 | `contentType = 'viet_lai_url'` | Prisma Article.contentType |

---

## 1. Tổng quan kiến trúc

### So sánh với các feature viết lại hiện có

| | Viết lại đoạn văn | Viết lại bài viết | **Viết lại URL** |
|---|---|---|---|
| Input | Text/HTML paste | Text/HTML paste | **URL** |
| Crawl bước | Không | Không | **Có — "Thu Thập" button** |
| Editable source | Không | Không | **Có — 2 textareas** |
| Idea Expander | Không | Không | **Có — 18 options** |
| Secondary KW | Không | Không | **Có + AI suggest** |
| Structure | Không | Không | **Có — 9 options** |
| Image injection | Không | Không | **Có — 4 options** |
| Rewrite Method | Không | 3 methods | **Không (dùng Structure thay)** |
| DB Article | Không | Có | **Có** |
| Split screen | Không | Có | **Có** |
| Auth | Không bắt buộc | Có | **Có** |

### Flow hoạt động

```
User nhập URL → click "Thu Thập"
     ↓ POST /api/viet-lai-url/crawl
     → Fetch URL HTML
     → extractHeadingsFromHtml() → heading list text
     → extractBodyText() → plain text content
     → Hiển thị vào 2 textareas (editable)
     ↓
User cấu hình: keyword, ideas, structure, tone, language, image, model, post-process...
     ↓ POST /api/viet-lai-url/start
     → Tạo Article record trong DB
     → Lưu crawled data + config vào outline{}
     ↓ Redirect → /viet-lai-url/generate
     ↓ POST /api/viet-lai-url/stream (SSE)
     → buildUrlRewritePrompt() — kết hợp headings + content + ideas
     → AI stream HTML bài mới
     → (nếu imageOption = 'yandex') injectYandexImages()
     → post-process: link inject, auto-bold, append
     → sanitizeHtmlArticle + analyzeHumanness
     → Update Article DB
     ↓ AI Editor (split screen: source URL content vs bài mới)
```

### Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-lai-url/
│   │   ├── page.tsx                       ← Config form (có crawl inline)
│   │   └── generate/
│   │       └── page.tsx                   ← Generate + AI Editor
│   └── api/
│       └── viet-lai-url/
│           ├── crawl/
│           │   └── route.ts               ← Thu Thập: fetch URL → headings + content
│           ├── suggest-keywords/
│           │   └── route.ts               ← AI gợi ý từ khóa phụ (no auth)
│           ├── start/
│           │   └── route.ts               ← Tạo Article record
│           └── stream/
│               └── route.ts               ← SSE stream AI viết bài
└── lib/
    └── viet-lai-url/
        ├── types.ts                        ← Types riêng
        ├── options.ts                      ← Constants (ideas, structures, tones)
        ├── crawler.ts                      ← crawlUrlWithHeadings() (hàm mới)
        └── prompt-builder.ts              ← buildUrlRewritePrompt()
```

### File tái sử dụng (KHÔNG tạo mới)

- `lib/tinh-gon/humanness.ts` → `analyzeHumanness()`
- `lib/tinh-gon/text.ts` → `countWords()`, `computeKeywordDensity()`, `buildMetaDescription()`, `sanitizeHtmlArticle()`
- `lib/tinh-gon/model.ts` → `buildTinhGonModel()`
- `lib/tinh-gon/forbidden.ts` → `mergeForbiddenWords()`
- `lib/tinh-gon/persistence.ts` → `createTinhGonRunId()`
- `app/api/pipeline/_context.ts` → `buildBrandPrompt()`
- `lib/viet-lai/post-process.ts` → `injectMainKeywordLink()`, `injectAdditionalLinks()`, `autoBoldContent()`, `appendContentToArticle()`
- `lib/viet-toplist/image-injector.ts` → `injectYandexImages()` (nếu imageOption = 'yandex')
- `components/editor/*` → Shared AI Editor

---

## 2. Types — `web/lib/viet-lai-url/types.ts`

```typescript
// 18 loại ý tưởng mở rộng (Idea Expander)
export type UrlIdeaType =
  | 'features'      // Tính năng nổi bật
  | 'overview'      // Tổng quan
  | 'who_is'        // Là ai / [Subject] là ai?
  | 'biography'     // Tiểu sử
  | 'who_uses'      // Ai sẽ dùng / Đối tượng phù hợp
  | 'what_is'       // Là gì / Định nghĩa
  | 'where'         // Ở đâu / Địa điểm
  | 'when'          // Khi nào / Thời điểm phù hợp
  | 'how_to'        // Cách sử dụng / Hướng dẫn
  | 'pros_cons'     // Ưu và Nhược điểm
  | 'similar'       // Sản phẩm / Dịch vụ tương tự
  | 'advice'        // Lời khuyên
  | 'opinions'      // Ý kiến / Nhận xét
  | 'examples'      // Ví dụ thực tế
  | 'comparison'    // So sánh
  | 'pricing'       // Giá bán / Chi phí
  | 'faq3'          // 3 câu hỏi thường gặp (FAQ)
  | 'faq5';         // 5 câu hỏi thường gặp (FAQ)

export type UrlImageOption = 'none' | 'yandex' | 'ai_generated' | 'shutterstock';

export interface UrlRewriteConfig {
  // Source URL
  sourceUrl:          string;

  // Crawled + editable data
  extractedHeadings:  string;   // Multiline: H2/H3/H4 list (one per line, indent = H3)
  extractedContent:   string;   // Plain text body từ URL (max ~6000 chars)
  sourceTitle:        string;   // <h1> hoặc <title> từ URL

  // SEO
  keyword:            string;   // Từ khóa chính
  secondaryKeywords:  string;   // Comma-separated từ khóa phụ
  seoMode:            boolean;

  // Idea Expander
  selectedIdeas:      UrlIdeaType[];

  // Article options
  structure:          string;   // 'auto' | 'inverted_pyramid' | ... (9 options, same as news)
  tone:               string;   // 'formal' | 'friendly' | ... (9 options, same as news)
  language:           string;

  // Image
  imageOption:        UrlImageOption;

  // Post-processing (shared với viet-lai)
  mainKeywordUrl:     string;
  additionalLinks:    Array<{ keyword: string; url: string }>;
  appendContent:      string;
  autoBold:           'none' | 'keyword' | 'headings' | 'both';

  // AI
  model:              string;
  brandConfig?:       Record<string, unknown>;
}

// Response từ /api/viet-lai-url/crawl
export interface UrlCrawlResult {
  url:      string;
  title:    string;        // <h1> hoặc <title> của trang
  headings: string;        // Formatted: "H2: Tiêu đề\n  H3: Phụ\n..."
  content:  string;        // Plain text body (cleaned, max 6000 chars)
  warning?: string;        // Nếu crawl một phần hoặc có lỗi nhẹ
}

// Response từ /api/viet-lai-url/start
export interface UrlRewriteStartResponse {
  articleId: string;
  runId:     string;
}

// SSE done event data
export interface UrlRewriteResult {
  runId:           string;
  html:            string;
  title:           string;
  metaDescription: string;
  wordCount:       number;
  keywordDensity:  number;
  humanness:       import('@/lib/tinh-gon/types').TinhGonHumannessResult;
  imagesInjected?: number;
}
```

---

## 3. Options — `web/lib/viet-lai-url/options.ts`

```typescript
import type { UrlIdeaType, UrlImageOption } from './types';

// 18 Idea Expander options
export const URL_IDEAS: Array<{
  value:   UrlIdeaType;
  label:   string;
  heading: string;    // H2 heading mà AI sẽ thêm vào bài
  faqCount?: number;  // Chỉ cho faq3 và faq5
}> = [
  { value: 'features',   label: 'Tính năng',           heading: 'Tính năng nổi bật' },
  { value: 'overview',   label: 'Tổng quan',            heading: 'Tổng quan' },
  { value: 'who_is',     label: 'Là ai',                heading: 'Là ai?' },
  { value: 'biography',  label: 'Tiểu sử',              heading: 'Tiểu sử' },
  { value: 'who_uses',   label: 'Ai sẽ dùng',           heading: 'Ai phù hợp để sử dụng?' },
  { value: 'what_is',    label: 'Là gì',                heading: 'Là gì?' },
  { value: 'where',      label: 'Ở đâu',                heading: 'Ở đâu?' },
  { value: 'when',       label: 'Khi nào',              heading: 'Khi nào nên dùng?' },
  { value: 'how_to',     label: 'Cách sử dụng',         heading: 'Cách sử dụng' },
  { value: 'pros_cons',  label: 'Ưu và Nhược điểm',    heading: 'Ưu và Nhược điểm' },
  { value: 'similar',    label: 'Sản phẩm tương tự',   heading: 'Sản phẩm / Dịch vụ tương tự' },
  { value: 'advice',     label: 'Lời khuyên',           heading: 'Lời khuyên' },
  { value: 'opinions',   label: 'Ý kiến',               heading: 'Ý kiến & Nhận xét' },
  { value: 'examples',   label: 'Ví dụ',                heading: 'Ví dụ thực tế' },
  { value: 'comparison', label: 'So sánh',              heading: 'So sánh' },
  { value: 'pricing',    label: 'Giá bán',              heading: 'Giá bán & Chi phí' },
  { value: 'faq3',       label: '3 FAQs',               heading: 'Câu hỏi thường gặp', faqCount: 3 },
  { value: 'faq5',       label: '5 FAQs',               heading: 'Câu hỏi thường gặp', faqCount: 5 },
];

export const URL_IMAGE_OPTIONS: Array<{
  value:  UrlImageOption;
  label:  string;
  note:   string;
}> = [
  { value: 'none',         label: 'Không có ảnh',            note: 'Bài viết thuần text' },
  { value: 'yandex',       label: 'Hình ảnh từ Yandex',      note: 'Crawl ảnh từ Yandex Image Search' },
  { value: 'ai_generated', label: 'Sử dụng AI tạo hình ảnh', note: 'Sinh ảnh bằng AI (cần API key)' },
  { value: 'shutterstock', label: 'Hình ảnh từ Shutterstock', note: 'Ảnh có bản quyền (cần API key)' },
];

// Dùng lại từ viet-tin-tuc/options.ts
export { NEWS_STRUCTURES as URL_STRUCTURES } from '@/lib/viet-tin-tuc/options';
export { NEWS_TONES as URL_TONES } from '@/lib/viet-tin-tuc/options';

// Dùng lại từ tinh-gon/options.ts
export { AI_MODELS } from '@/lib/tinh-gon/options';
```

---

## 4. Crawler — `web/lib/viet-lai-url/crawler.ts`

Hàm mới — khác với `crawlUrl()` trong `lib/google-search/extract.ts` vì cần **cả headings lẫn content** từ HTML.

```typescript
export interface CrawledUrlData {
  title:    string;
  headings: string;   // Formatted heading list
  content:  string;   // Clean body text
  warning?: string;
}

/**
 * Fetch URL và trích xuất headings + body text.
 *
 * Khác với crawlUrl() (chỉ trả plain text):
 * - Parse HTML để tách headings có cấu trúc
 * - Heuristic loại bỏ nav/footer/sidebar
 * - Timeout 10s (URL bên ngoài có thể chậm)
 */
export async function crawlUrlWithHeadings(url: string): Promise<CrawledUrlData> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL phải dùng http hoặc https');
    }
  } catch {
    throw new Error('URL không hợp lệ');
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0; +https://noi-that-minh-quan.com)',
      Accept:       'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(10_000),   // ⚠️ 10s timeout — URL ngoài có thể chậm
  });

  if (!response.ok) {
    throw new Error(`URL trả về lỗi ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error('URL không phải trang HTML (có thể là PDF, ảnh...)');
  }

  const html = await response.text();

  return {
    title:    extractTitle(html),
    headings: extractHeadingsList(html),
    content:  extractBodyText(html),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lấy tiêu đề từ <h1> trước, fallback sang <title> tag */
function extractTitle(html: string): string {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, '').trim().slice(0, 200);
  }
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 200)
    : '';
}

/**
 * Trích xuất H2/H3/H4 thành chuỗi text dạng cây.
 * H2 → không indent | H3 → indent 2 spaces | H4 → indent 4 spaces
 *
 * Output example:
 * "Giới thiệu sản phẩm\n  Thông số kỹ thuật\n    Khung sắt\nKết luận"
 */
function extractHeadingsList(html: string): string {
  // Loại bỏ script/style trước
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const lines: string[] = [];
  const headingRegex = /<(h[2-4])([^>]*)>([\s\S]*?)<\/h[2-4]>/gi;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(cleaned)) !== null) {
    const level = match[1].toLowerCase(); // 'h2', 'h3', 'h4'
    const inner = match[3].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();
    if (!inner || inner.length < 2) continue; // skip empty headings

    const indent = level === 'h2' ? '' : level === 'h3' ? '  ' : '    ';
    lines.push(`${indent}${inner}`);
  }

  return lines.join('\n');
}

/**
 * Trích xuất body text — loại bỏ nav/header/footer/sidebar/script/style.
 * Giới hạn 6000 ký tự để tránh prompt quá dài.
 */
function extractBodyText(html: string): string {
  let text = html
    // Loại bỏ các phần thường không phải content
    .replace(/<(script|style|noscript|nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Loại bỏ tags còn lại, giữ text
    .replace(/<[^>]+>/g, ' ')
    // Decode entities phổ biến
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Chuẩn hóa whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Giới hạn 6000 ký tự — tránh prompt bị cắt bởi model context limit
  if (text.length > 6000) {
    text = text.slice(0, 6000) + '...[nội dung bị cắt để tối ưu prompt]';
  }

  return text;
}
```

---

## 5. Prompt Builder — `web/lib/viet-lai-url/prompt-builder.ts`

```typescript
import type { UrlRewriteConfig } from './types';
import { URL_IDEAS } from './options';

// Dùng lại từ viet-tin-tuc
const STRUCTURE_INSTRUCTIONS: Record<string, string> = {
  auto:             'AI tự chọn cấu trúc phù hợp nhất với chủ đề.',
  inverted_pyramid: 'Kim Tự Tháp: thông tin quan trọng nhất ở đầu (5W1H), chi tiết phụ ở dưới.',
  storytelling:     'Kể Chuyện: mở đầu kịch tính, diễn biến theo thời gian, kết thúc.',
  qa:               'Q&A: mỗi section là câu hỏi (H2) và phần trả lời.',
  how_to:           'How-To: từng bước rõ ràng, có đánh số, hành động cụ thể.',
  pro_con:          'Pro & Con: ưu điểm → nhược điểm → kết luận.',
  historical:       'Lịch Sử: diễn biến từ quá khứ → hiện tại → xu hướng.',
  listicle:         'Danh Sách: mỗi điểm là H2 với 1–2 đoạn, rõ ràng, súc tích.',
  profile:          'Profile: giới thiệu → đặc điểm → thành tích → nhận định.',
  review:           'Review: tổng quan → ưu → nhược → chấm điểm → kết luận.',
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal:         'Giọng trang trọng, nghiêm túc. Dùng "độc giả" hoặc "bạn đọc".',
  intimate:       'Giọng thân mật, gần gũi như tạp chí. Dùng "bạn".',
  friendly:       'Giọng ấm áp, thân thiện. Dùng "bạn".',
  expert:         'Giọng chuyên môn, phân tích sâu. Có số liệu và lập luận.',
  humorous:       'Giọng vui vẻ, châm biếm nhẹ nhàng. Được phép dùng ẩn dụ hài.',
  inspirational:  'Giọng truyền cảm hứng, tích cực, động lực.',
  nostalgic:      'Giọng hoài cổ, gợi nhớ, cảm xúc.',
  shocking:       'Giọng gây chú ý, kịch tính, mở bài mạnh mẽ.',
  conversational: 'Giọng trò chuyện như blog cá nhân, thoải mái.',
};

export function buildUrlRewritePrompt(
  config:       UrlRewriteConfig,
  brandPrompt:  string,
  forbidden:    string,
): string {
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;
  const toneInstruction      = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal;

  // Build secondary keywords section
  const secondaryKwText = config.secondaryKeywords.trim()
    ? `Từ khóa phụ (tích hợp tự nhiên): ${config.secondaryKeywords}`
    : '';

  // Build SEO section
  const seoText = config.seoMode && config.keyword
    ? `- SEO: tích hợp từ khóa chính "${config.keyword}" tự nhiên ≥ 3 lần trong bài.`
    : '';

  // Build source headings section
  const headingsText = config.extractedHeadings.trim()
    ? `## Dàn bài từ URL nguồn (tham khảo cấu trúc)\n${config.extractedHeadings}`
    : '## Dàn bài từ URL nguồn\n(Không có heading — AI tự quyết định cấu trúc)';

  // Build source content section
  const contentText = config.extractedContent.trim()
    ? `## Nội dung nguồn (tham khảo, không copy)\n${config.extractedContent}`
    : '## Nội dung nguồn\n(Không có — dùng kiến thức về chủ đề từ URL để viết)';

  // Build idea expander sections
  const ideasText = buildIdeasSection(config.selectedIdeas, config.keyword);

  return `
Bạn là AI chuyên viết bài sáng tạo từ nguồn URL.

${brandPrompt}

## Thông tin bài viết
- Chủ đề / Từ khóa chính: ${config.keyword || config.sourceTitle || 'Theo nội dung nguồn'}
- ${secondaryKwText}
- Ngôn ngữ đầu ra: ${config.language}
- Cấu trúc bài: ${structureInstruction}
- Giọng văn: ${toneInstruction}
${seoText}
- Từ bị cấm: ${forbidden || 'Không có'}

## URL nguồn tham khảo
${config.sourceUrl}
Tiêu đề gốc: "${config.sourceTitle}"

${headingsText}

${contentText}

${ideasText}

## Quy tắc viết
- Viết bài MỚI hoàn toàn — KHÔNG sao chép nội dung gốc.
- Học cấu trúc + ý tưởng từ nguồn, diễn đạt lại bằng ngôn ngữ riêng.
- Thêm góc nhìn, ví dụ, phân tích sâu hơn so với bài gốc.
- Tổng số từ bám sát 1.200–1.800 từ (tuỳ nội dung).

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong 1 thẻ <article>.
- Bắt đầu bằng <h1> là tiêu đề bài (KHÁC với tiêu đề gốc "${config.sourceTitle}").
- Mỗi phần chính dùng <h2>, phần phụ dùng <h3>.
- Không thêm CSS, JavaScript, markdown hay giải thích ngoài bài.
- Chỉ trả HTML.
`.trim();
}

/**
 * Build phần "Ý tưởng mở rộng" — mỗi idea = 1 H2 thêm vào bài.
 * Ghi rõ tên heading để AI biết phải include.
 */
function buildIdeasSection(ideas: UrlIdeaType[], keyword: string): string {
  if (!ideas.length) return '';

  const lines = ['## Ý tưởng mở rộng bắt buộc', 'AI PHẢI thêm các phần sau vào bài (thứ tự phù hợp):'];

  for (const idea of ideas) {
    const def = URL_IDEAS.find((d) => d.value === idea);
    if (!def) continue;

    // Personalise heading với keyword nếu có
    let heading = def.heading;
    if (keyword && ['who_is', 'what_is', 'who_uses'].includes(idea)) {
      heading = `${keyword} ${def.heading.toLowerCase()}`;
    }

    if (def.faqCount) {
      lines.push(`- <h2>${heading}</h2> — gồm ${def.faqCount} câu hỏi và trả lời dạng Q&A`);
    } else {
      lines.push(`- <h2>${heading}</h2>`);
    }
  }

  lines.push('');
  lines.push('Thứ tự các ý tưởng mở rộng: đặt sau phần nội dung chính, trước kết luận.');

  return lines.join('\n');
}
```

---

## 6. API: `/api/viet-lai-url/crawl/route.ts`

Crawl URL → trả headings + content. Cần `requireAuth` vì có thể bị abuse crawl nhiều URL.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { crawlUrlWithHeadings } from '@/lib/viet-lai-url/crawler';

export const runtime = 'nodejs';

const crawlSchema = z.object({
  url: z.string().url('URL không hợp lệ'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const rawBody = await request.json();
    const parsed  = crawlSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'URL không hợp lệ' },
        { status: 400 },
      );
    }

    const { url } = parsed.data;

    try {
      const result = await crawlUrlWithHeadings(url);
      return NextResponse.json(result);
    } catch (crawlError) {
      // Trả 422 thay vì 500 để FE hiển thị thông báo thân thiện
      return NextResponse.json(
        {
          error: crawlError instanceof Error
            ? crawlError.message
            : 'Không thể đọc nội dung URL',
        },
        { status: 422 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

---

## 7. API: `/api/viet-lai-url/suggest-keywords/route.ts`

AI gợi ý 5–8 từ khóa phụ liên quan. **Không requireAuth** (cho phép dùng thử).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export const runtime = 'nodejs';

const schema = z.object({
  keyword:  z.string().min(1),
  url:      z.string().default(''),
  language: z.string().default('Vietnamese'),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed  = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Thiếu từ khóa' }, { status: 400 });
    }

    const { keyword, language } = parsed.data;
    const model = buildTinhGonModel('gemini-flash');

    const prompt = `
Tạo danh sách 6 từ khóa phụ (secondary keywords / LSI keywords) cho từ khóa chính:
"${keyword}"

Ngôn ngữ: ${language}

Yêu cầu:
- Từ khóa phụ phải liên quan chặt chẽ đến chủ đề
- Đa dạng: long-tail, câu hỏi, biến thể ngữ nghĩa
- Không lặp lại từ khóa chính
- Mỗi từ khóa trên 1 dòng riêng
- Chỉ trả danh sách, không giải thích
`.trim();

    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();

    // Parse thành mảng
    const keywords = text
      .split('\n')
      .map((line) =>
        line
          .replace(/^[\d\-\.\*\•]+\s*/, '')   // strip bullet/number prefix
          .trim()
      )
      .filter((k) => k.length > 2 && k.length < 100)
      .slice(0, 8);

    return NextResponse.json({ keywords });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lỗi AI' },
      { status: 500 },
    );
  }
}
```

---

## 8. API: `/api/viet-lai-url/start/route.ts`

Tạo Article record trong DB.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import type { UrlRewriteConfig } from '@/lib/viet-lai-url/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.object({
    sourceUrl:          z.string().url(),
    extractedHeadings:  z.string().default(''),
    extractedContent:   z.string().default(''),
    sourceTitle:        z.string().default(''),
    keyword:            z.string().default(''),
    secondaryKeywords:  z.string().default(''),
    seoMode:            z.boolean().default(false),
    selectedIdeas:      z.array(z.string()).default([]),
    structure:          z.string().default('auto'),
    tone:               z.string().default('formal'),
    language:           z.string().default('Vietnamese'),
    imageOption:        z.string().default('none'),
    mainKeywordUrl:     z.string().default(''),
    additionalLinks:    z.array(z.object({ keyword: z.string(), url: z.string() })).default([]),
    appendContent:      z.string().default(''),
    autoBold:           z.string().default('none'),
    model:              z.string().default('gemini-flash'),
    brandConfig:        z.record(z.unknown()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user    = await requireAuth();
    const rawBody = await request.json();
    const parsed  = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config } = parsed.data as { config: UrlRewriteConfig };

    // Cần ít nhất URL
    if (!config.sourceUrl) {
      return NextResponse.json({ error: 'Thiếu URL nguồn.' }, { status: 422 });
    }

    const keyword  = config.keyword.trim() || config.sourceTitle || new URL(config.sourceUrl).hostname;
    const runId    = createTinhGonRunId(keyword);

    const article = await prisma.article.create({
      data: {
        userId:           user.userId,
        runId,
        status:           'DRAFT',
        keyword,
        language:         config.language,
        contentType:      'viet_lai_url',
        targetLength:     1500,    // default — không có độ dài gốc
        aiProvider:       config.model,
        brandConfig:      (config.brandConfig as never) ?? {},
        selectedTitle:    config.sourceTitle || keyword,
        htmlContent:      '',
        competitorUrls:   [config.sourceUrl],   // lưu source URL để reference
        secondaryKeywords: config.secondaryKeywords
          ? config.secondaryKeywords.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        outline: {
          stage:  'config',
          config,                // lưu toàn bộ config kể cả extractedContent
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

## 9. API: `/api/viet-lai-url/stream/route.ts`

SSE stream — AI viết bài từ URL source data + ideas + post-process.

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { mergeForbiddenWords } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import {
  buildMetaDescription,
  computeKeywordDensity,
  countWords,
  sanitizeHtmlArticle,
} from '@/lib/tinh-gon/text';
import { buildUrlRewritePrompt } from '@/lib/viet-lai-url/prompt-builder';
import {
  injectMainKeywordLink,
  injectAdditionalLinks,
  autoBoldContent,
  appendContentToArticle,
} from '@/lib/viet-lai/post-process';
import { injectYandexImages } from '@/lib/viet-toplist/image-injector';
import type { UrlRewriteConfig, UrlRewriteResult } from '@/lib/viet-lai-url/types';

export const runtime = 'nodejs';

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

const streamSchema = z.object({
  articleId: z.string(),
  runId:     z.string(),
  config:    z.object({
    sourceUrl:          z.string(),
    extractedHeadings:  z.string().default(''),
    extractedContent:   z.string().default(''),
    sourceTitle:        z.string().default(''),
    keyword:            z.string().default(''),
    secondaryKeywords:  z.string().default(''),
    seoMode:            z.boolean().default(false),
    selectedIdeas:      z.array(z.string()).default([]),
    structure:          z.string().default('auto'),
    tone:               z.string().default('formal'),
    language:           z.string().default('Vietnamese'),
    imageOption:        z.string().default('none'),
    mainKeywordUrl:     z.string().default(''),
    additionalLinks:    z.array(z.object({ keyword: z.string(), url: z.string() })).default([]),
    appendContent:      z.string().default(''),
    autoBold:           z.string().default('none'),
    model:              z.string().default('gemini-flash'),
    brandConfig:        z.record(z.unknown()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user     = await requireAuth();
    const rawBody  = await request.json();
    const parsed   = streamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { articleId, runId, config } = parsed.data as {
      articleId: string;
      runId:     string;
      config:    UrlRewriteConfig;
    };

    // Verify ownership
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
    const forbidden   = mergeForbiddenWords(
      (config.brandConfig?.forbiddenExtra as string[] | undefined)
    ).join(', ');
    const prompt = buildUrlRewritePrompt(config, brandPrompt, forbidden);
    const model  = buildTinhGonModel(config.model);

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);

        try {
          send({ type: 'step', step: 'generate', label: 'AI đang viết bài từ URL nguồn...' });

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
            const result = await model.generateContent(prompt);
            rawHtml = result.response.text();
            send({ type: 'chunk', text: rawHtml });
          }

          send({ type: 'step_done', step: 'generate' });

          // ── Post-process ─────────────────────────────────────────────────
          send({ type: 'step', step: 'postprocess', label: 'Xử lý hậu kỳ...' });

          let html = rawHtml;
          let imagesInjected = 0;

          // 1. Yandex image injection
          if (config.imageOption === 'yandex') {
            send({ type: 'step', step: 'images', label: 'Tìm và chèn ảnh Yandex...' });
            try {
              const imgResult = await injectYandexImages(html, config.keyword || config.sourceTitle);
              html = imgResult.html;
              imagesInjected = imgResult.injectedCount;
            } catch {
              // Non-blocking — nếu lỗi vẫn tiếp tục không có ảnh
              console.warn('[viet-lai-url/stream] Yandex image inject failed, continuing');
            }
          }
          // Note: 'ai_generated' và 'shutterstock' chưa implement — bỏ qua

          // 2. Link injection
          if (config.mainKeywordUrl && config.keyword) {
            html = injectMainKeywordLink(html, config.keyword, config.mainKeywordUrl);
          }
          if (config.additionalLinks.length > 0) {
            html = injectAdditionalLinks(html, config.additionalLinks);
          }

          // 3. Auto-bold
          if (config.autoBold !== 'none') {
            html = autoBoldContent(
              html,
              config.keyword,
              config.autoBold as 'keyword' | 'headings' | 'both',
            );
          }

          // 4. Append content
          if (config.appendContent) {
            html = appendContentToArticle(html, config.appendContent);
          }

          // 5. Sanitize
          // ⚠️ sanitizeHtmlArticle cần arg 2 là title/keyword, KHÔNG phải html
          html = sanitizeHtmlArticle(html, config.keyword || config.sourceTitle);

          send({ type: 'step_done', step: 'postprocess' });

          // ── Analyze ──────────────────────────────────────────────────────
          send({ type: 'step', step: 'analyze', label: 'Phân tích chất lượng...' });

          // ⚠️ Extract h1 trước khi buildMetaDescription
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : (config.keyword || config.sourceTitle);

          const wordCount       = countWords(html);
          const keywordDensity  = config.keyword
            ? computeKeywordDensity(html, config.keyword)
            : 0;
          const humanness       = analyzeHumanness(
            html,
            (config.brandConfig?.forbiddenExtra as string[] | undefined),
          );
          const metaDescription = buildMetaDescription(title, config.keyword || title);

          // Update DB
          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle:    title,
              htmlContent:      html,
              metaDescription,
              wordCount,
              status:           'WRITTEN',
              aiDecision:       humanness.decision,
              humannessScore:   humanness.score,
              seoChecks:        { keywordDensity },
              scoreBreakdown:   { humanness, keywordDensity },
              outline: {
                stage:    'generate',
                config,
                imagesInjected,
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
              imagesInjected,
            } satisfies UrlRewriteResult,
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
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection:      'keep-alive',
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

## 10. Config Page — `web/app/viet-lai-url/page.tsx`

Form phức tạp với 3 giai đoạn: (A) nhập URL + crawl → (B) xem/sửa content → (C) cấu hình options.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AI_MODELS } from '@/lib/tinh-gon/options';
import { URL_IDEAS, URL_IMAGE_OPTIONS, URL_STRUCTURES, URL_TONES, REWRITE_LANGUAGES } from '@/lib/viet-lai-url/options';
import type { UrlIdeaType, UrlRewriteConfig, UrlCrawlResult, UrlRewriteStartResponse } from '@/lib/viet-lai-url/types';

const SS_KEY = 'vlu_config';   // sessionStorage prefix: vlu_

const DEFAULT_CONFIG: UrlRewriteConfig = {
  sourceUrl:          '',
  extractedHeadings:  '',
  extractedContent:   '',
  sourceTitle:        '',
  keyword:            '',
  secondaryKeywords:  '',
  seoMode:            false,
  selectedIdeas:      [],
  structure:          'auto',
  tone:               'formal',
  language:           'Vietnamese',
  imageOption:        'none',
  mainKeywordUrl:     '',
  additionalLinks:    [],
  appendContent:      '',
  autoBold:           'none',
  model:              'gemini-flash',
};

export default function VietLaiUrlPage() {
  const router = useRouter();
  const [config, setConfig]             = useState<UrlRewriteConfig>(DEFAULT_CONFIG);
  const [crawling, setCrawling]         = useState(false);
  const [crawlDone, setCrawlDone]       = useState(false);
  const [crawlError, setCrawlError]     = useState('');
  const [suggesting, setSuggesting]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [linkKeyword, setLinkKeyword]   = useState('');
  const [linkUrl, setLinkUrl]           = useState('');

  useEffect(() => {
    document.title = 'Viết lại URL - Content Agent';
    const stored = sessionStorage.getItem(SS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UrlRewriteConfig;
        setConfig(parsed);
        if (parsed.extractedHeadings || parsed.extractedContent) setCrawlDone(true);
      } catch { /* ignore */ }
    }
  }, []);

  // ── Crawl (Thu Thập) ──────────────────────────────────────────────────────

  async function handleCrawl() {
    const url = config.sourceUrl.trim();
    if (!url) { setCrawlError('Vui lòng nhập URL.'); return; }

    setCrawling(true);
    setCrawlError('');

    try {
      const response = await fetch('/api/viet-lai-url/crawl', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url }),
      });

      const data = await response.json() as UrlCrawlResult & { error?: string };

      if (!response.ok) {
        setCrawlError(data.error ?? 'Không thể đọc nội dung URL');
        return;
      }

      setConfig((prev) => ({
        ...prev,
        sourceTitle:        data.title,
        extractedHeadings:  data.headings,
        extractedContent:   data.content,
        // Auto-fill keyword từ title nếu chưa có
        keyword: prev.keyword || data.title.split(' ').slice(0, 4).join(' '),
      }));
      setCrawlDone(true);

      if (data.warning) setCrawlError(data.warning); // warning nhẹ — không block

    } catch (err) {
      setCrawlError(err instanceof Error ? err.message : 'Lỗi kết nối');
    } finally {
      setCrawling(false);
    }
  }

  // ── Suggest Keywords ──────────────────────────────────────────────────────

  async function handleSuggestKeywords() {
    if (!config.keyword.trim()) return;
    setSuggesting(true);
    try {
      const response = await fetch('/api/viet-lai-url/suggest-keywords', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          keyword:  config.keyword,
          url:      config.sourceUrl,
          language: config.language,
        }),
      });
      const data = await response.json() as { keywords?: string[]; error?: string };
      if (data.keywords?.length) {
        setConfig((prev) => ({
          ...prev,
          secondaryKeywords: data.keywords!.join(', '),
        }));
      }
    } catch { /* silent */ }
    finally { setSuggesting(false); }
  }

  // ── Idea toggle ───────────────────────────────────────────────────────────

  function toggleIdea(idea: UrlIdeaType) {
    setConfig((prev) => ({
      ...prev,
      selectedIdeas: prev.selectedIdeas.includes(idea)
        ? prev.selectedIdeas.filter((i) => i !== idea)
        : [...prev.selectedIdeas, idea],
    }));
  }

  // ── Additional links ──────────────────────────────────────────────────────

  function addLink() {
    if (!linkKeyword.trim() || !linkUrl.trim()) return;
    setConfig((prev) => ({
      ...prev,
      additionalLinks: [...prev.additionalLinks, { keyword: linkKeyword.trim(), url: linkUrl.trim() }],
    }));
    setLinkKeyword('');
    setLinkUrl('');
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleNext() {
    if (!config.sourceUrl.trim()) { setError('Vui lòng nhập URL nguồn.'); return; }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/viet-lai-url/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ config }),
      });

      const data = await response.json() as UrlRewriteStartResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Lỗi khởi tạo');

      // Lưu sessionStorage
      sessionStorage.setItem(SS_KEY,              JSON.stringify(config));
      sessionStorage.setItem('vlu_article_id',    data.articleId);
      sessionStorage.setItem('vlu_run_id',        data.runId);
      sessionStorage.removeItem('vlu_result');

      router.push('/viet-lai-url/generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto">

        {/* Tab nav */}
        <div className="flex border-b border-gray-200 mb-6 -mx-6 px-6">
          {[
            { label: 'Viết lại đoạn văn', href: '/viet-lai-doan-van' },
            { label: 'Viết lại bài viết',  href: '/viet-lai-bai-viet' },
            { label: 'Viết lại tin tức',   href: '/viet-lai-tin-tuc' },
            { label: 'Viết lại URL',        href: '/viet-lai-url',      active: true },
          ].map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab.active
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Viết lại URL bằng AI</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI đọc bài viết từ URL và tạo bài mới sáng tạo hơn.
          </p>
          <div className="flex items-center gap-2 mt-3">
            {['Cấu hình & Crawl', 'Viết lại & Chỉnh sửa'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 flex-1 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <span className={`text-xs whitespace-nowrap ${i === 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {i + 1}. {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section A: Keyword + URL Crawl ── */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Từ khóa mục tiêu SEO <span className="text-gray-400 font-normal">(tùy chọn)</span>
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={config.keyword}
              onChange={(e) => setConfig((prev) => ({ ...prev, keyword: e.target.value }))}
              placeholder="VD: giường sắt giá rẻ tphcm"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => void handleSuggestKeywords()}
              disabled={suggesting || !config.keyword.trim()}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
            >
              {suggesting ? '...' : 'Gợi ý từ khóa phụ'}
            </button>
          </div>

          {/* Secondary keywords */}
          {config.secondaryKeywords && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Từ khóa phụ</label>
              <textarea
                value={config.secondaryKeywords}
                onChange={(e) => setConfig((prev) => ({ ...prev, secondaryKeywords: e.target.value }))}
                placeholder="từ khóa 1, từ khóa 2, từ khóa 3..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Phân cách bằng dấu phẩy</p>
            </div>
          )}

          {/* URL input + crawl */}
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            URL nguồn <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={config.sourceUrl}
              onChange={(e) => {
                setConfig((prev) => ({ ...prev, sourceUrl: e.target.value }));
                setCrawlDone(false);   // reset crawl khi URL thay đổi
              }}
              placeholder="https://example.com/bai-viet-goc"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => void handleCrawl()}
              disabled={crawling || !config.sourceUrl.trim()}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                crawlDone
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {crawling ? '⏳...' : crawlDone ? '✓ Thu Thập' : 'Thu Thập'}
            </button>
          </div>

          {crawlError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              ⚠️ {crawlError}
            </p>
          )}
        </div>

        {/* ── Section B: Editable crawled content (hiện sau khi crawl) ── */}
        {crawlDone && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                Dữ liệu từ nguồn — AI sẽ dùng để viết bài
              </p>
              {config.sourceTitle && (
                <span className="text-xs text-gray-400 truncate max-w-xs" title={config.sourceTitle}>
                  "{config.sourceTitle}"
                </span>
              )}
            </div>

            {/* Headings editable */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Heading (H2, H3, H4)
                <span className="font-normal text-gray-400 ml-1">— có thể bỏ trống hoặc sửa</span>
              </label>
              <textarea
                value={config.extractedHeadings}
                onChange={(e) => setConfig((prev) => ({ ...prev, extractedHeadings: e.target.value }))}
                placeholder="Headings từ URL sẽ hiển thị ở đây..."
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Content editable */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nội dung nguồn
                <span className="font-normal text-gray-400 ml-1">— có thể bỏ trống hoặc sửa</span>
              </label>
              <textarea
                value={config.extractedContent}
                onChange={(e) => setConfig((prev) => ({ ...prev, extractedContent: e.target.value }))}
                placeholder="Nội dung text từ URL sẽ hiển thị ở đây..."
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                {config.extractedContent.length} ký tự (tối đa 6000)
              </p>
            </div>
          </div>
        )}

        {/* ── Section C: Idea Expander ── */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Bạn muốn bài viết dài hơn — Thêm ý tưởng
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Mỗi ý tưởng được chọn = AI thêm 1 phần (H2) vào bài. Không bắt buộc.
          </p>
          <div className="flex flex-wrap gap-2">
            {URL_IDEAS.map((idea) => {
              const selected = config.selectedIdeas.includes(idea.value);
              return (
                <button
                  key={idea.value}
                  onClick={() => toggleIdea(idea.value)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-500 text-white font-medium'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {idea.label}
                </button>
              );
            })}
          </div>
          {config.selectedIdeas.length > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              → AI sẽ thêm {config.selectedIdeas.length} phần: {
                config.selectedIdeas.map((id) => URL_IDEAS.find((d) => d.value === id)?.label).join(', ')
              }
            </p>
          )}
        </div>

        {/* ── Image options ── */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Bước 2: Hình ảnh cho bài viết
          </label>
          <div className="grid grid-cols-2 gap-2">
            {URL_IMAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setConfig((prev) => ({ ...prev, imageOption: opt.value }))}
                title={opt.note}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                  config.imageOption === opt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  config.imageOption === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`} />
                <div>
                  <p className={`text-xs font-medium ${config.imageOption === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{opt.note}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Language ── */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Ngôn ngữ bài viết</label>
          <select
            value={config.language}
            onChange={(e) => setConfig((prev) => ({ ...prev, language: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {REWRITE_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>

        {/* ── Structure ── */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Cấu trúc bài viết</label>
          <div className="grid grid-cols-2 gap-2">
            {URL_STRUCTURES.map((s) => (
              <button
                key={s.value}
                onClick={() => setConfig((prev) => ({ ...prev, structure: s.value }))}
                className={`flex items-start gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                  config.structure === s.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="text-base flex-shrink-0">{s.icon}</span>
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

        {/* ── Tone ── */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Giọng văn & Ngữ điệu</label>
          <div className="grid grid-cols-3 gap-2">
            {URL_TONES.map((t) => (
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
        </div>

        {/* ── AI Model ── */}
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

        {/* ── Advanced options (collapsible) ── */}
        <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700"
          >
            <span>⚙️ Tùy chọn nâng cao</span>
            <span className="text-gray-400">{showAdvanced ? '▲' : '▼'}</span>
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-4">
              {/* Main keyword link */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Gắn link sau vào từ khóa chính
                </label>
                <input
                  type="url"
                  value={config.mainKeywordUrl}
                  onChange={(e) => setConfig((prev) => ({ ...prev, mainKeywordUrl: e.target.value }))}
                  placeholder="https://example.com/san-pham"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Additional links */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Thêm link nếu nội dung có các từ khóa
                </label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={linkKeyword} onChange={(e) => setLinkKeyword(e.target.value)}
                    placeholder="Từ khóa"
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={addLink} className="px-3 py-1.5 bg-gray-100 text-xs rounded-lg hover:bg-gray-200">+ Thêm</button>
                </div>
                {config.additionalLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5 mb-1">
                    <span className="flex-1 truncate text-gray-700">{link.keyword}</span>
                    <span className="text-gray-400 truncate">→ {link.url}</span>
                    <button onClick={() => setConfig((prev) => ({ ...prev, additionalLinks: prev.additionalLinks.filter((_, j) => j !== i) }))}
                      className="text-red-400 hover:text-red-600">✕</button>
                  </div>
                ))}
              </div>

              {/* Append content */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Thêm nội dung sau vào cuối bài</label>
                <textarea value={config.appendContent}
                  onChange={(e) => setConfig((prev) => ({ ...prev, appendContent: e.target.value }))}
                  placeholder="HTML hoặc text (CTA, liên hệ...)..." rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>

              {/* Auto bold */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Tự động in đậm (bold)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'none',     label: 'Không' },
                    { value: 'keyword',  label: 'Từ khóa chính' },
                    { value: 'headings', label: 'Heading (H2, H3)' },
                    { value: 'both',     label: 'Cả hai' },
                  ].map((opt) => (
                    <button key={opt.value}
                      onClick={() => setConfig((prev) => ({ ...prev, autoBold: opt.value as UrlRewriteConfig['autoBold'] }))}
                      className={`py-2 text-xs rounded-lg border-2 transition-colors ${
                        config.autoBold === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEO Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Tùy chọn SEO</p>
                  <p className="text-xs text-gray-400">Tối ưu từ khóa trong output</p>
                </div>
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, seoMode: !prev.seoMode }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${config.seoMode ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.seoMode ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        {/* Submit */}
        <button
          onClick={() => void handleNext()}
          disabled={loading || !config.sourceUrl.trim()}
          className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '⏳ Đang khởi tạo...' : 'Tiếp theo →'}
        </button>

      </div>
    </div>
  );
}
```

---

## 11. Generate Page — `web/app/viet-lai-url/generate/page.tsx`

Giống `viet-lai-bai-viet/generate` nhưng: split screen hiện **source URL content** thay vì original HTML.

```tsx
'use client';
// Skeleton — chi tiết xem AI-EDITOR-IMPLEMENTATION.md + viet-lai-bai-viet/generate

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UrlRewriteConfig, UrlRewriteResult } from '@/lib/viet-lai-url/types';
// Import shared editor components...

export default function VietLaiUrlGeneratePage() {
  const router = useRouter();
  const [config, setConfig]       = useState<UrlRewriteConfig | null>(null);
  const [articleId, setArticleId] = useState('');
  const [runId, setRunId]         = useState('');
  const [html, setHtml]           = useState('');
  const [title, setTitle]         = useState('');
  const [metaDesc, setMetaDesc]   = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [humanness, setHumanness] = useState<{ score: number; decision: string } | null>(null);
  const [imagesInjected, setImagesInjected] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [steps, setSteps]         = useState<string[]>([]);
  const [error, setError]         = useState('');
  const [showSplit, setShowSplit] = useState(false);
  const didGenerate               = useRef(false);

  useEffect(() => {
    const storedConfig    = sessionStorage.getItem('vlu_config');
    const storedArticleId = sessionStorage.getItem('vlu_article_id');
    const storedRunId     = sessionStorage.getItem('vlu_run_id');
    const storedResult    = sessionStorage.getItem('vlu_result');

    if (!storedConfig || !storedArticleId || !storedRunId) {
      router.replace('/viet-lai-url');
      return;
    }

    try {
      const parsedConfig = JSON.parse(storedConfig) as UrlRewriteConfig;
      setConfig(parsedConfig);
      setArticleId(storedArticleId);
      setRunId(storedRunId);

      if (storedResult) {
        const result = JSON.parse(storedResult) as UrlRewriteResult;
        setHtml(result.html);
        setTitle(result.title);
        setMetaDesc(result.metaDescription);
        setWordCount(result.wordCount);
        if (result.humanness) setHumanness(result.humanness);
        if (result.imagesInjected) setImagesInjected(result.imagesInjected);
        return;
      }

      if (!didGenerate.current) {
        didGenerate.current = true;
        void startStream(parsedConfig, storedArticleId, storedRunId);
      }
    } catch {
      router.replace('/viet-lai-url');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startStream(cfg: UrlRewriteConfig, artId: string, rId: string) {
    setStreaming(true);
    setError('');

    try {
      const response = await fetch('/api/viet-lai-url/stream', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ articleId: artId, runId: rId, config: cfg }),
      });

      if (!response.ok || !response.body) throw new Error('Lỗi kết nối SSE');

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';
      let   accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string; step?: string; label?: string; text?: string;
              data?: UrlRewriteResult; message?: string;
            };

            if (event.type === 'step' && event.label) setSteps((p) => [...p, event.label!]);
            else if (event.type === 'chunk' && event.text) {
              accumulated += event.text;
              setHtml(accumulated);
            } else if (event.type === 'done' && event.data) {
              const r = event.data;
              setHtml(r.html);
              setTitle(r.title);
              setMetaDesc(r.metaDescription);
              setWordCount(r.wordCount);
              if (r.humanness) setHumanness(r.humanness);
              if (r.imagesInjected) setImagesInjected(r.imagesInjected);
              sessionStorage.setItem('vlu_result', JSON.stringify(r));
            } else if (event.type === 'error') setError(event.message ?? 'Lỗi AI');
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi stream');
    } finally {
      setStreaming(false);
    }
  }

  if (!config) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar với split screen toggle */}
      {/* ... (giống viet-lai-bai-viet/generate) ... */}

      {/* Split screen: Source URL content (left) vs New Article (right) */}
      {showSplit && (
        // Left: Extracted content từ URL (không phải HTML editor)
        <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-500">Nội dung nguồn</p>
            <a href={config.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline truncate">{config.sourceUrl}</a>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Headings */}
            {config.extractedHeadings && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">Headings (H2/H3/H4):</p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded p-3">
                  {config.extractedHeadings}
                </pre>
              </div>
            )}
            {/* Content */}
            {config.extractedContent && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Nội dung:</p>
                <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {config.extractedContent}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right: New article editor (shared AI Editor) */}
      {/* ... (giống viet-lai-bai-viet — ArticleEditor, SeoPanel, AiAssistPanel) ... */}

      {/* Images injected badge */}
      {imagesInjected > 0 && (
        <div className="text-xs text-green-600 px-4 py-1 bg-green-50 border-b">
          🖼️ Đã chèn {imagesInjected} ảnh từ Yandex
        </div>
      )}
    </div>
  );
}
```

---

## 12. sessionStorage Keys

| Key | Giá trị | Ghi chú |
|-----|---------|---------|
| `vlu_config` | `UrlRewriteConfig` JSON | Config đầy đủ (bao gồm extractedHeadings, extractedContent) |
| `vlu_article_id` | string | Article ID trong DB |
| `vlu_run_id` | string | Run ID |
| `vlu_result` | `UrlRewriteResult` JSON | Cache kết quả sau generate |

> Prefix `vlu_` — **V**iết **L**ại **U**RL. Không trùng: `vl_` (viet-lai-bai-viet), `vtt_` (tin tức), `vdb_` (dàn bài), `vtl_` (toplist), `tg_` (tinh gọn).

---

## 13. Prisma — không cần thêm schema mới

Dùng lại model `Article` với:

```prisma
// Các field đặc biệt của viet-lai-url:
// contentType     = 'viet_lai_url'
// competitorUrls  = [sourceUrl]  ← lưu URL nguồn để reference
// secondaryKeywords = [...parsed từ config.secondaryKeywords]
// outline.config  = UrlRewriteConfig (toàn bộ, kể cả extractedContent)
```

> ⚠️ `extractedContent` có thể lên tới 6000 ký tự. Prisma lưu `outline` dạng JSON (jsonb trong PostgreSQL) — không bị giới hạn size.

---

## 14. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `lib/viet-lai-url/types.ts` | Types + interfaces |
| 2 | `lib/viet-lai-url/options.ts` | Constants (18 ideas, re-export structures/tones) |
| 3 | `lib/viet-lai-url/crawler.ts` | `crawlUrlWithHeadings()` — test với vài URL trước |
| 4 | `api/viet-lai-url/crawl/route.ts` | Test với Postman/curl |
| 5 | `lib/viet-lai-url/prompt-builder.ts` | `buildUrlRewritePrompt()` — test prompt output bằng console.log |
| 6 | `api/viet-lai-url/suggest-keywords/route.ts` | Test với keyword thật |
| 7 | `api/viet-lai-url/start/route.ts` | Tạo Article record |
| 8 | `api/viet-lai-url/stream/route.ts` | SSE + post-process |
| 9 | `app/viet-lai-url/page.tsx` | Config form — test crawl + ideas + submit |
| 10 | `app/viet-lai-url/generate/page.tsx` | Generate + Editor |
| 11 | `components/Sidebar.tsx` | Thêm nav entry |
| 12 | Verify Yandex inject | Dùng URL bài có nhiều heading để test |

---

## 15. QA Checklist

### Crawl (Thu Thập)
- [ ] URL hợp lệ — crawl trả headings + content
- [ ] URL không tồn tại (404) — trả 422 với message thân thiện
- [ ] URL timeout (>10s) — trả 422 không block UI
- [ ] URL là PDF/image — trả 422 với "URL không phải trang HTML"
- [ ] URL không có heading → `extractedHeadings` = empty string (không crash)
- [ ] Headings textarea có thể sửa sau khi crawl
- [ ] Content textarea có thể sửa sau khi crawl
- [ ] Thay đổi URL → `crawlDone` reset về false
- [ ] Crawl thành công → auto-fill `keyword` từ h1 nếu keyword trống

### Idea Expander
- [ ] Click chip → toggle selected (blue = on, gray = off)
- [ ] Multi-select: nhiều chips cùng lúc
- [ ] Preview text hiển thị tên các ý tưởng đã chọn
- [ ] `faq3` → prompt yêu cầu "3 câu hỏi Q&A"
- [ ] `faq5` → prompt yêu cầu "5 câu hỏi Q&A"
- [ ] Idea có keyword → heading được personalise với keyword

### Suggest Keywords
- [ ] Nút "Gợi ý từ khóa phụ" chỉ active khi có keyword
- [ ] Keywords trả về hiện vào textarea secondaryKeywords (editable)
- [ ] Không requireAuth — unauthenticated user vẫn dùng được

### Generate
- [ ] SSE steps hiển thị: generate → postprocess → (images) → analyze
- [ ] Yandex images được inject khi `imageOption = 'yandex'`
- [ ] `imagesInjected` badge hiển thị số ảnh đã chèn
- [ ] Link inject, auto-bold, append hoạt động đúng
- [ ] Humanness badge đúng màu (xanh ≥76, vàng 60-75, đỏ <60)
- [ ] `<h1>` trong output KHÁC với tiêu đề gốc từ URL

### Split Screen
- [ ] Toggle "So sánh" hiện extracted headings + content từ URL bên trái
- [ ] Link URL nguồn clickable, mở tab mới
- [ ] New article editor bên phải scroll độc lập
- [ ] Resume từ `vlu_result` vẫn hiển thị split screen đúng

### Edge Cases
- [ ] URL nguồn là trang của chính mình (cùng domain) — cho phép
- [ ] URL có redirect 301/302 — `fetch()` tự follow
- [ ] URL có content rất ngắn (<200 từ) — AI vẫn viết được từ ideas
- [ ] Không chọn idea nào — AI viết từ headings + content gốc
- [ ] `extractedContent` bị cắt ở 6000 ký tự — marker [...] xuất hiện trong content textarea

---

## 16. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|---------|
| `crawlUrlWithHeadings()` timeout | URL server chậm hoặc block bot | Tăng timeout → 12s; hoặc trả partial kết quả |
| Headings trả về sai — lẫn nav/footer | `<nav>` dùng `<h2>` | Thêm strip nav trước `headingRegex.exec()` |
| Content quá ngắn sau extraction | Trang dùng JavaScript render (SPA) | Ghi rõ warning "Trang dùng JS — nội dung có thể không đầy đủ" |
| `buildUrlRewritePrompt()` quá dài | `extractedContent` + ideas + brand = >8000 tokens | Giảm content limit từ 6000 → 4000; cắt ideas nếu >5 |
| AI không thêm ideas vào bài | Prompt instruction không đủ mạnh | Thêm "BẮT BUỘC — PHẢI include" vào instruction |
| Yandex inject thất bại | Yandex thay đổi HTML structure | `injectYandexImages()` catch lỗi → trả `injectedCount: 0`, tiếp tục |
| `sanitizeHtmlArticle` arg 2 sai | Truyền `config.sourceUrl` thay vì keyword | Luôn dùng `config.keyword \|\| config.sourceTitle` |
| `buildMetaDescription` nhận html | Arg 1 phải là title text | Extract `<h1>` text trước, truyền vào arg 1 |
| Session mất sau reload | `vlu_result` không được lưu | Đảm bảo `sessionStorage.setItem('vlu_result', ...)` trong `type: 'done'` handler |
