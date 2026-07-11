# VIET-LAI-IMPLEMENTATION.md
## Hướng dẫn code tính năng "Viết Lại" (Rewriter)

> Phân tích từ:
> - https://aiktp.com/vi/viet-lai-doan-van — Viết lại đoạn văn (tool đơn giản)
> - https://aiktp.com/vi/viet-lai-bai-viet — Viết lại bài viết (full pipeline)
>
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API

---

## ⚠️ Lỗi cần tránh

| # | Vị trí | Lỗi | Fix |
|---|--------|-----|-----|
| 1 | `stream/route.ts` | `sanitizeHtmlArticle(rawHtml)` — thiếu arg thứ 2 | `sanitizeHtmlArticle(rawHtml, config.originalTitle \|\| config.keyword)` |
| 2 | `stream/route.ts` | `buildMetaDescription(html, keyword)` — arg 1 phải là title | Extract `<h1>` trước, truyền `title` vào arg 1 |
| 3 | `html-parser.ts` | `innerHTML` của heading chứa inline tags (`<strong>`, `<em>`) | Strip tags khi lấy text: `.replace(/<[^>]+>/g, '').trim()` |
| 4 | `post-process.ts` | Inject link cùng keyword nhiều lần trong một bài | Chỉ inject **lần xuất hiện đầu tiên** của mỗi keyword — track bằng `Set` |
| 5 | `paragraph/route.ts` | Trả plain text nhưng không strip markdown — AI đôi khi trả `**bold**` | Thêm `stripMarkdown()` trước khi enqueue chunk |
| 6 | Config page | `viet-lai-bai-viet` thiếu validate: nội dung gốc trống | Check `originalHtml.trim().length > 0` trước `handleNext()` |
| 7 | `html-parser.ts` | `extractSectionsByHeading()` với bài không có `<h2>` → trả `[]` | Fallback: nếu không có heading → trả nguyên bài như 1 section |

---

## 1. Tổng quan kiến trúc

### Hai công cụ — hai flow khác nhau

| | Viết lại đoạn văn | Viết lại bài viết |
|---|---|---|
| URL | `/viet-lai-doan-van` | `/viet-lai-bai-viet` |
| Mục đích | Rewrite đoạn văn ngắn, tool nhanh | Rewrite toàn bài, có AI Editor |
| DB Article | ❌ Không tạo | ✅ Tạo Article record |
| Layout | 2 cột ngang (input/output) | Config page → Generate page → Editor |
| Bước | 1 bước (form + submit) | 2 bước (Config → Generate) |
| Streaming | SSE qua `/api/viet-lai/paragraph` | SSE qua `/api/viet-lai/stream` |
| Post-process | Không | Link inject + Auto-bold + Append |
| Humanness | Không | ✅ `analyzeHumanness()` |
| SEO panel | Không | ✅ Shared AI Editor components |
| Word limit | Có (free user quota) | Theo DB Article |
| Auth | Không bắt buộc (free) | `requireAuth()` |

### Flow: Viết lại đoạn văn

```
User paste text + chọn model/language/style
     ↓ click "Do Rewrite"
     POST /api/viet-lai/paragraph (SSE)
     → AI stream rewritten text
     → Hiển thị real-time vào right panel
     → Copy button enabled khi done
```

### Flow: Viết lại bài viết

```
User paste HTML/text bài gốc + cấu hình
     ↓ POST /api/viet-lai/start
     → Parse HTML gốc → extractSectionsByHeading()
     → Tạo Article record (DB)
     ↓ Redirect → /viet-lai-bai-viet/generate
     ↓ POST /api/viet-lai/stream (SSE)
     → AI rewrite từng section theo method
     → Post-process: link inject + auto-bold + append
     → sanitizeHtmlArticle + analyzeHumanness
     → Update Article DB
     ↓ Shared AI Editor (split screen + SEO panel)
```

### Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-lai-doan-van/
│   │   └── page.tsx                    ← Tool đơn giản, 2 cột
│   ├── viet-lai-bai-viet/
│   │   ├── page.tsx                    ← Config form (Step 1)
│   │   └── generate/
│   │       └── page.tsx                ← Generate + AI Editor (Step 2)
│   └── api/
│       └── viet-lai/
│           ├── paragraph/
│           │   └── route.ts            ← SSE cho viết lại đoạn văn
│           ├── start/
│           │   └── route.ts            ← Tạo Article + parse sections
│           └── stream/
│               └── route.ts            ← SSE cho viết lại bài viết
└── lib/
    └── viet-lai/
        ├── types.ts                    ← Types riêng
        ├── options.ts                  ← Constants (styles, methods)
        ├── html-parser.ts              ← extractSectionsByHeading()
        └── post-process.ts             ← injectLinks, autoBold, appendContent
```

### File tái sử dụng (KHÔNG tạo mới)

- `lib/tinh-gon/humanness.ts` → `analyzeHumanness()`
- `lib/tinh-gon/text.ts` → `countWords()`, `computeKeywordDensity()`, `buildMetaDescription()`, `sanitizeHtmlArticle()`
- `lib/tinh-gon/model.ts` → `buildTinhGonModel()`
- `lib/tinh-gon/forbidden.ts` → `mergeForbiddenWords()`
- `lib/tinh-gon/persistence.ts` → `createTinhGonRunId()`
- `app/api/pipeline/_context.ts` → `buildBrandPrompt()`
- `components/editor/*` → Shared AI Editor (từ AI-EDITOR-IMPLEMENTATION.md)

---

## 2. Types — `web/lib/viet-lai/types.ts`

```typescript
// ─── Viết lại đoạn văn ───────────────────────────────────────────

export type RewriteStyle =
  | 'standard'        // Tiêu chuẩn - giữ nguyên nghĩa
  | 'creative'        // Sáng tạo hơn
  | 'structured'      // Dễ đọc hơn (có bullet/structure)
  | 'shorten'         // Rút ngắn
  | 'expand'          // Mở rộng, dài hơn
  | 'funny'           // Thêm cảm xúc vui vẻ
  | 'friendly'        // Thân thiện hơn
  | 'casual'          // Thân mật hơn
  | 'professional'    // Chuyên nghiệp hơn
  | 'rewrite_struct'  // Rewriter - Change sentence structure
  | 'rewrite_persp'   // Rewriter - Switch perspective or subject
  | 'rewrite_kw'      // Rewriter - Add more keywords
  | 'emoji';          // Thêm emoji vào văn bản

export interface ParagraphRewriteConfig {
  originalText: string;
  style:        RewriteStyle;
  language:     string;
  model:        string;     // gemini-flash | gpt-4o | grok | claude
}

// ─── Viết lại bài viết ───────────────────────────────────────────

export type RewriteMethod =
  | 'keep_headings'   // Rewrite nội dung, giữ Heading (H2, H3, H4)
  | 'rewrite_all'     // Rewrite cả nội dung lẫn heading
  | 'deep_rewrite';   // Rewrite Deep — tránh trùng lặp 100%

export interface ArticleRewriteConfig {
  // Nội dung gốc
  originalHtml:   string;   // HTML full bài gốc (từ textarea hoặc URL fetch)
  originalTitle:  string;   // Tiêu đề bài gốc (extract từ h1 hoặc user nhập)

  // SEO
  keyword:        string;   // Từ khóa chính (optional — SEO mode)
  seoMode:        boolean;  // Bật/tắt tối ưu SEO

  // Rewrite options
  method:         RewriteMethod;
  style:          RewriteStyle;
  language:       string;

  // Post-processing
  mainKeywordUrl:   string;   // Link gắn vào từ khóa chính (optional)
  additionalLinks:  Array<{ keyword: string; url: string }>;  // Links phụ
  appendContent:    string;   // Nội dung thêm vào cuối bài
  autoBold:         'none' | 'keyword' | 'headings' | 'both';

  // AI
  model: string;

  // Brand (optional)
  brandConfig?: Record<string, unknown>;
}

// Section đã parse từ HTML gốc
export interface ArticleSection {
  headingLevel:  'h1' | 'h2' | 'h3' | 'h4' | null;
  headingText:   string;   // Text thuần (đã strip tags)
  headingHtml:   string;   // HTML gốc của heading (bao gồm attributes)
  bodyHtml:      string;   // HTML body phía dưới heading này
}

// Response từ /api/viet-lai/start
export interface ArticleRewriteStartResponse {
  articleId:  string;
  runId:      string;
  sections:   ArticleSection[];  // Parse trước để FE hiển thị preview
  wordCount:  number;            // Số từ bài gốc
}

// SSE event cuối cùng (type: 'done')
export interface ArticleRewriteResult {
  runId:           string;
  html:            string;
  title:           string;
  metaDescription: string;
  wordCount:       number;
  keywordDensity:  number;
  humanness:       import('@/lib/tinh-gon/types').TinhGonHumannessResult;
  originalWordCount: number;
}
```

---

## 3. Options — `web/lib/viet-lai/options.ts`

```typescript
import type { RewriteMethod, RewriteStyle } from './types';

export const REWRITE_STYLES: Array<{
  value:   RewriteStyle;
  label:   string;
  note:    string;
  emoji:   string;
}> = [
  { value: 'standard',       label: 'Tiêu chuẩn',          emoji: '📝', note: 'Giữ nguyên ngữ nghĩa, đổi cách diễn đạt.' },
  { value: 'creative',       label: 'Creative',             emoji: '✨', note: 'Sáng tạo hơn — ẩn dụ, so sánh, góc nhìn mới.' },
  { value: 'structured',     label: 'Structured',           emoji: '📋', note: 'Dễ đọc hơn — có thể thêm bullet, tiêu đề phụ.' },
  { value: 'shorten',        label: 'Rút ngắn',             emoji: '✂️', note: 'Rút gọn — giữ ý chính, bỏ dư thừa.' },
  { value: 'expand',         label: 'Mở rộng',              emoji: '📖', note: 'Dài hơn — thêm ví dụ, số liệu, chi tiết.' },
  { value: 'funny',          label: 'Funny',                emoji: '😄', note: 'Thêm cảm xúc vui vẻ, hài hước nhẹ nhàng.' },
  { value: 'friendly',       label: 'Friendly',             emoji: '🤝', note: 'Thân thiện, ấm áp, gần gũi hơn.' },
  { value: 'casual',         label: 'Casual',               emoji: '💬', note: 'Thân mật, thoải mái như nói chuyện.' },
  { value: 'professional',   label: 'Professional',         emoji: '👔', note: 'Chuyên nghiệp — chính xác, súc tích.' },
  { value: 'rewrite_struct', label: 'Đổi cấu trúc câu',    emoji: '🔄', note: 'Giữ ý, thay đổi cấu trúc ngữ pháp.' },
  { value: 'rewrite_persp',  label: 'Đổi góc nhìn',        emoji: '🔁', note: 'Chuyển chủ thể hoặc quan điểm diễn đạt.' },
  { value: 'rewrite_kw',     label: 'Thêm từ khóa',        emoji: '🔍', note: 'Tích hợp thêm từ khóa tự nhiên vào bài.' },
  { value: 'emoji',          label: 'Thêm Emoji',           emoji: '🎉', note: 'Chèn emoji phù hợp vào văn bản.' },
];

export const REWRITE_METHODS: Array<{
  value: RewriteMethod;
  label: string;
  note:  string;
  badge?: string;
}> = [
  {
    value: 'keep_headings',
    label: 'Rewrite nội dung - Giữ Heading',
    note:  'AI chỉ viết lại phần body (đoạn văn). H2, H3, H4 giữ nguyên.',
    badge: 'Nhanh',
  },
  {
    value: 'rewrite_all',
    label: 'Rewrite cả nội dung và heading',
    note:  'AI viết lại toàn bộ — cả heading lẫn body. Bài mới nhất.',
  },
  {
    value: 'deep_rewrite',
    label: 'Rewrite Deep - Tránh trùng lặp 100%',
    note:  'Rewrite từng đoạn độc lập với lệnh tối đa hoá unique. Chậm hơn.',
    badge: 'Unique',
  },
];

export const REWRITE_LANGUAGES = [
  { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
  { value: 'English',    label: '🇬🇧 English' },
  { value: 'Portuguese', label: '🇵🇹 Português' },
  // Danh sách đầy đủ 80+ ngôn ngữ — giống aiktp.com
] as const;

// Dùng lại AI_MODELS từ lib/tinh-gon/options.ts
```

---

## 4. HTML Parser — `web/lib/viet-lai/html-parser.ts`

Tách HTML bài gốc thành các section theo heading, phục vụ prompt building.

```typescript
import type { ArticleSection } from './types';

/**
 * Tách HTML thành mảng ArticleSection theo heading H1/H2/H3/H4.
 * Mỗi section = 1 heading + body HTML phía dưới nó (đến heading tiếp theo).
 *
 * Fallback: nếu không tìm thấy heading nào → trả 1 section với toàn bộ HTML.
 */
export function extractSectionsByHeading(html: string): ArticleSection[] {
  // Normalize: bỏ khoảng trắng thừa giữa tags
  const normalized = html.replace(/>\s+</g, '><').trim();

  // Tìm tất cả heading positions
  const headingRegex = /<(h[1-4])([^>]*)>([\s\S]*?)<\/h[1-4]>/gi;
  const matches: Array<{
    index:       number;
    endIndex:    number;
    level:       'h1' | 'h2' | 'h3' | 'h4';
    fullHtml:    string;
    innerHtml:   string;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(normalized)) !== null) {
    const level = match[1].toLowerCase() as 'h1' | 'h2' | 'h3' | 'h4';
    matches.push({
      index:     match.index,
      endIndex:  match.index + match[0].length,
      level,
      fullHtml:  match[0],
      innerHtml: match[3],
    });
  }

  // Fallback: bài không có heading
  if (matches.length === 0) {
    return [{
      headingLevel: null,
      headingText:  '',
      headingHtml:  '',
      bodyHtml:     normalized,
    }];
  }

  const sections: ArticleSection[] = [];

  // Content trước heading đầu tiên (nếu có)
  const beforeFirst = normalized.slice(0, matches[0].index).trim();
  if (beforeFirst) {
    sections.push({
      headingLevel: null,
      headingText:  '',
      headingHtml:  '',
      bodyHtml:     beforeFirst,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = matches[i + 1]?.index ?? normalized.length;
    const bodyHtml = normalized.slice(current.endIndex, nextIndex).trim();

    // ⚠️ Strip inline tags khỏi heading text (BUG #3 fix)
    const headingText = current.innerHtml.replace(/<[^>]+>/g, '').trim();

    sections.push({
      headingLevel: current.level,
      headingText,
      headingHtml:  current.fullHtml,
      bodyHtml,
    });
  }

  return sections;
}

/**
 * Lấy tiêu đề bài (H1 đầu tiên) từ HTML.
 * Trả về empty string nếu không tìm thấy.
 */
export function extractArticleTitle(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

/**
 * Đếm số từ trong HTML (strip tags trước).
 */
export function countHtmlWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(Boolean).length;
}
```

---

## 5. Post-process — `web/lib/viet-lai/post-process.ts`

Xử lý bài sau khi AI viết xong: inject link, auto-bold, append content.

```typescript
/**
 * Inject <a href> vào từ khóa chính (chỉ lần xuất hiện đầu tiên).
 *
 * ⚠️ BUG #4 fix: Dùng Set để track từ đã inject — tránh duplicate links.
 */
export function injectMainKeywordLink(
  html: string,
  keyword: string,
  url: string,
): string {
  if (!keyword.trim() || !url.trim()) return html;

  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?<![">])\\b(${escaped})\\b`, 'i');

  // Chỉ thay lần đầu tiên ngoài thẻ HTML
  return html.replace(regex, (_, match) =>
    `<a href="${url}" title="${keyword}">${match}</a>`
  );
}

/**
 * Inject links cho nhiều từ khóa phụ.
 * Mỗi từ khóa chỉ inject lần đầu tiên.
 */
export function injectAdditionalLinks(
  html:    string,
  linkMap: Array<{ keyword: string; url: string }>,
): string {
  const injected = new Set<string>();
  let result = html;

  for (const { keyword, url } of linkMap) {
    if (!keyword.trim() || !url.trim() || injected.has(keyword.toLowerCase())) continue;

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![">])\\b(${escaped})\\b`, 'i');
    const replaced = result.replace(regex, (_, match) =>
      `<a href="${url}" title="${keyword}">${match}</a>`
    );

    if (replaced !== result) {
      injected.add(keyword.toLowerCase());
      result = replaced;
    }
  }

  return result;
}

/**
 * Auto-bold keywords và/hoặc headings (thêm <strong>).
 * mode: 'none' | 'keyword' | 'headings' | 'both'
 */
export function autoBoldContent(
  html:     string,
  keyword:  string,
  mode:     'none' | 'keyword' | 'headings' | 'both',
): string {
  if (mode === 'none') return html;

  let result = html;

  if (mode === 'keyword' || mode === 'both') {
    if (keyword.trim()) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Bold lần đầu tiên keyword xuất hiện trong body (không phải trong heading)
      // Thực hiện qua 2 pass: tạm thay heading bằng placeholder
      result = boldFirstOccurrenceOutsideHeadings(result, keyword);
    }
  }

  if (mode === 'headings' || mode === 'both') {
    // Wrap nội dung heading trong <strong> nếu chưa có
    result = result.replace(
      /<(h[2-4])([^>]*)>((?!<strong>)[\s\S]*?)<\/(h[2-4])>/gi,
      (_, tag, attrs, content, closeTag) => {
        const alreadyBold = /<strong>/i.test(content);
        return alreadyBold
          ? `<${tag}${attrs}>${content}</${closeTag}>`
          : `<${tag}${attrs}><strong>${content}</strong></${closeTag}>`;
      }
    );
  }

  return result;
}

function boldFirstOccurrenceOutsideHeadings(html: string, keyword: string): string {
  // Tách heading và non-heading, chỉ bold trong non-heading
  let found = false;
  return html.replace(
    /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)|([^<>]+)/gi,
    (match, headingBlock, textBlock) => {
      if (headingBlock) return headingBlock; // giữ nguyên heading
      if (found || !textBlock) return match;

      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escaped})\\b`, 'i');
      if (regex.test(textBlock)) {
        found = true;
        return textBlock.replace(regex, '<strong>$1</strong>');
      }
      return match;
    }
  );
}

/**
 * Thêm nội dung vào cuối bài (trước </article> nếu có, hoặc append thẳng).
 */
export function appendContentToArticle(
  html:          string,
  appendContent: string,
): string {
  if (!appendContent.trim()) return html;

  const appendHtml = `\n<div class="article-append">${appendContent}</div>`;

  if (html.includes('</article>')) {
    return html.replace('</article>', `${appendHtml}\n</article>`);
  }
  return html + appendHtml;
}

/**
 * Strip markdown syntax (dùng cho paragraph rewriter output).
 * AI đôi khi trả **bold** hoặc *italic* dù yêu cầu plain text.
 *
 * ⚠️ BUG #5 fix: Gọi trước khi enqueue chunk trong paragraph/route.ts
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')       // *italic* → italic
    .replace(/^#{1,6}\s+/gm, '')       // # Heading → Heading
    .replace(/`(.+?)`/g, '$1');        // `code` → code
}
```

---

## 6. API: `/api/viet-lai/paragraph/route.ts`

SSE stream dùng cho **Viết lại đoạn văn**. Không tạo Article, không requireAuth.

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { stripMarkdown } from '@/lib/viet-lai/post-process';

export const runtime = 'nodejs';

const STYLE_INSTRUCTIONS: Record<string, string> = {
  standard:       'Viết lại giữ nguyên ngữ nghĩa, đổi cách diễn đạt. Không thêm, không bớt ý.',
  creative:       'Viết lại sáng tạo hơn — dùng ẩn dụ, so sánh, góc nhìn mới. Giữ ý chính.',
  structured:     'Viết lại dễ đọc hơn — có thể thêm bullet points hoặc tiêu đề phụ nhỏ.',
  shorten:        'Rút gọn lại — giữ ý quan trọng, bỏ phần dư thừa. Output ngắn hơn 30-40%.',
  expand:         'Mở rộng — thêm ví dụ, số liệu, giải thích chi tiết. Output dài hơn 50-80%.',
  funny:          'Thêm sắc thái vui vẻ, hài hước nhẹ nhàng. Vẫn giữ thông điệp gốc.',
  friendly:       'Viết lại thân thiện, ấm áp. Dùng "bạn", câu hỏi thân mật.',
  casual:         'Viết lại thoải mái, thân mật như nói chuyện. Tránh từ học thuật.',
  professional:   'Viết lại chuyên nghiệp — chính xác, súc tích, không dư thừa cảm xúc.',
  rewrite_struct: 'Giữ nguyên ý nghĩa, thay đổi hoàn toàn cấu trúc ngữ pháp của từng câu.',
  rewrite_persp:  'Chuyển góc nhìn hoặc chủ thể (VD: chủ động → bị động, hoặc ngược lại).',
  rewrite_kw:     'Tích hợp các từ khóa từ văn bản gốc tự nhiên vào bài mới nhiều hơn.',
  emoji:          'Chèn emoji phù hợp vào văn bản ở những chỗ tự nhiên. Không lạm dụng.',
};

const paragraphSchema = z.object({
  originalText: z.string().min(1).max(50000),
  style:        z.string().default('standard'),
  language:     z.string().default('Vietnamese'),
  model:        z.string().default('gemini-flash'),
});

function buildParagraphPrompt(
  originalText: string,
  style:        string,
  language:     string,
): string {
  const styleInstruction = STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.standard;

  return `
Bạn là AI chuyên viết lại văn bản.

## Yêu cầu
- Ngôn ngữ đầu ra: ${language}
- Phong cách: ${styleInstruction}

## Văn bản gốc
${originalText}

## Quy tắc output
- Chỉ trả phần văn bản đã viết lại.
- Không giải thích, không nhận xét, không thêm tiêu đề.
- Giữ đúng ngôn ngữ đầu ra yêu cầu.
- Không dùng markdown formatting (**, *, #) — trả plain text.
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = paragraphSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Dữ liệu không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { originalText, style, language, model: modelId } = parsed.data;
    const prompt = buildParagraphPrompt(originalText, style, language);
    const model  = buildTinhGonModel(modelId);

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: object) =>
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          let rawOutput = '';

          try {
            const aiStream = await model.generateContentStream(prompt);
            for await (const chunk of aiStream) {
              const text = chunk.text();
              if (!text) continue;
              // ⚠️ BUG #5 fix: strip markdown trước khi enqueue
              const clean = stripMarkdown(text);
              rawOutput += clean;
              enqueue({ type: 'chunk', text: clean });
            }
          } catch {
            const result = await model.generateContent(prompt);
            rawOutput = stripMarkdown(result.response.text());
            enqueue({ type: 'chunk', text: rawOutput });
          }

          enqueue({
            type:      'done',
            wordCount: rawOutput.split(/\s+/).filter(Boolean).length,
          });
        } catch (error) {
          enqueue({
            type:    'error',
            message: error instanceof Error ? error.message : 'Lỗi AI',
          });
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
```

---

## 7. API: `/api/viet-lai/start/route.ts`

Tạo Article record + parse sections bài gốc.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { extractSectionsByHeading, extractArticleTitle, countHtmlWords } from '@/lib/viet-lai/html-parser';
import type { ArticleRewriteConfig } from '@/lib/viet-lai/types';

export const runtime = 'nodejs';

const startSchema = z.object({
  config: z.object({
    originalHtml:     z.string().min(1),
    originalTitle:    z.string().default(''),
    keyword:          z.string().default(''),
    seoMode:          z.boolean().default(false),
    method:           z.string().default('keep_headings'),
    style:            z.string().default('standard'),
    language:         z.string().default('Vietnamese'),
    mainKeywordUrl:   z.string().default(''),
    additionalLinks:  z.array(z.object({ keyword: z.string(), url: z.string() })).default([]),
    appendContent:    z.string().default(''),
    autoBold:         z.string().default('none'),
    model:            z.string().default('gemini-flash'),
    brandConfig:      z.record(z.unknown()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user     = await requireAuth();
    const rawBody  = await request.json();
    const parsed   = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config } = parsed.data as { config: ArticleRewriteConfig };

    // ⚠️ BUG #6 fix: validate originalHtml không trống
    if (!config.originalHtml.trim()) {
      return NextResponse.json({ error: 'Nội dung gốc không được để trống.' }, { status: 422 });
    }

    // Extract title nếu chưa có
    const originalTitle = config.originalTitle.trim()
      || extractArticleTitle(config.originalHtml)
      || config.keyword
      || 'Bài viết';

    const keyword = config.keyword.trim();
    const runId   = createTinhGonRunId(keyword || originalTitle);

    // Parse sections (dùng để FE preview + stream dùng lại)
    const sections    = extractSectionsByHeading(config.originalHtml);
    const wordCount   = countHtmlWords(config.originalHtml);

    // Tạo Article record
    const article = await prisma.article.create({
      data: {
        userId:           user.userId,
        runId,
        status:           'DRAFT',
        keyword:          keyword || originalTitle,
        language:         config.language,
        contentType:      `viet_lai:${config.method}`,
        targetLength:     wordCount,   // giữ gần với độ dài gốc
        aiProvider:       config.model,
        brandConfig:      (config.brandConfig as never) ?? {},
        selectedTitle:    originalTitle,
        htmlContent:      '',
        competitorUrls:   [],
        secondaryKeywords: [],
        outline: {
          stage:   'config',
          method:  config.method,
          style:   config.style,
          config,
          sections,           // cache sections để stream dùng lại
        },
      },
    });

    return NextResponse.json({
      articleId: article.id,
      runId,
      sections,
      wordCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

---

## 8. API: `/api/viet-lai/stream/route.ts`

SSE stream — AI rewrite bài theo method + post-process.

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
import { extractSectionsByHeading, extractArticleTitle } from '@/lib/viet-lai/html-parser';
import {
  injectMainKeywordLink,
  injectAdditionalLinks,
  autoBoldContent,
  appendContentToArticle,
} from '@/lib/viet-lai/post-process';
import type { ArticleRewriteConfig, ArticleSection } from '@/lib/viet-lai/types';

export const runtime = 'nodejs';

// ─── Prompt Instructions ─────────────────────────────────────────────────────

const STYLE_INSTRUCTIONS: Record<string, string> = {
  standard:       'Viết lại giữ nguyên ngữ nghĩa, thay đổi cách diễn đạt.',
  creative:       'Viết lại sáng tạo — dùng ẩn dụ, so sánh, góc nhìn mới.',
  structured:     'Viết lại dễ đọc — thêm bullet points hoặc sub-heading nếu cần.',
  shorten:        'Rút gọn — giữ ý chính, bỏ phần dư thừa. Output ngắn hơn 30-40%.',
  expand:         'Mở rộng — thêm ví dụ, số liệu, chi tiết. Output dài hơn 50-80%.',
  funny:          'Thêm sắc thái vui vẻ, hài hước nhẹ. Giữ thông điệp gốc.',
  friendly:       'Thân thiện, ấm áp. Xưng "bạn", dùng câu mời gọi.',
  casual:         'Thoải mái, thân mật như nói chuyện hàng ngày.',
  professional:   'Chuyên nghiệp — chính xác, súc tích, không cảm xúc thừa.',
  rewrite_struct: 'Giữ ý nghĩa, thay đổi hoàn toàn cấu trúc ngữ pháp.',
  rewrite_persp:  'Chuyển góc nhìn / chủ thể (chủ động ↔ bị động, hoặc "tôi" → "chúng ta").',
  rewrite_kw:     'Tích hợp thêm từ khóa liên quan tự nhiên vào bài.',
  emoji:          'Chèn emoji phù hợp vào văn bản ở những chỗ tự nhiên.',
};

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildRewritePrompt(
  config:      ArticleRewriteConfig,
  sections:    ArticleSection[],
  brandPrompt: string,
  forbidden:   string,
): string {
  const styleInstruction = STYLE_INSTRUCTIONS[config.style] ?? STYLE_INSTRUCTIONS.standard;
  const seoInstruction   = config.seoMode && config.keyword
    ? `- Tối ưu SEO: tích hợp từ khóa "${config.keyword}" tự nhiên vào bài.`
    : '';

  // Build section text tuỳ method
  let sectionsText: string;

  if (config.method === 'keep_headings') {
    // Giữ heading gốc, chỉ rewrite body
    sectionsText = sections.map((s) => {
      const headingLine = s.headingHtml ? `${s.headingHtml} [GIỮ NGUYÊN HEADING NÀY]` : '';
      return [headingLine, s.bodyHtml].filter(Boolean).join('\n');
    }).join('\n\n');

  } else if (config.method === 'rewrite_all') {
    // Rewrite toàn bộ kể cả heading
    sectionsText = sections.map((s) => [s.headingHtml, s.bodyHtml].filter(Boolean).join('\n')).join('\n\n');

  } else {
    // deep_rewrite: thêm instruction tối đa hoá unique mỗi đoạn
    sectionsText = sections.map((s, i) => {
      const headingLine = s.headingHtml ? `${s.headingHtml}` : '';
      return `[SECTION ${i + 1} — viết lại hoàn toàn mới, tránh trùng lặp tối đa]\n${headingLine}\n${s.bodyHtml}`;
    }).join('\n\n---\n\n');
  }

  return `
Bạn là AI chuyên viết lại bài viết chất lượng cao.

${brandPrompt}

## Thông tin viết lại
- Ngôn ngữ đầu ra: ${config.language}
- Phong cách: ${styleInstruction}
${seoInstruction}
- Từ bị cấm: ${forbidden || 'Không có'}

## Phương pháp: ${config.method}
${config.method === 'keep_headings' ? '→ Giữ nguyên các heading có tag [GIỮ NGUYÊN HEADING NÀY]. Chỉ viết lại phần body.' : ''}
${config.method === 'rewrite_all' ? '→ Viết lại toàn bộ, kể cả heading. Tạo bài mới hoàn toàn.' : ''}
${config.method === 'deep_rewrite' ? '→ Viết lại từng section hoàn toàn độc lập. Tối đa hoá unique — không lặp lại cụm từ gốc.' : ''}

## Nội dung gốc cần viết lại

${sectionsText}

## Quy tắc output
- Trả HTML hoàn chỉnh trong 1 thẻ <article>.
- Bắt đầu bằng <h1> là tiêu đề bài.
${config.method === 'keep_headings' ? '- Giữ nguyên text và level của các heading được đánh dấu [GIỮ NGUYÊN].' : ''}
- Không thêm CSS, JavaScript, markdown hay lời giải thích.
- Chỉ trả HTML.
`.trim();
}

// ─── SSE Helper ───────────────────────────────────────────────────────────────

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const streamSchema = z.object({
  articleId: z.string(),
  runId:     z.string(),
  config:    z.object({
    originalHtml:     z.string(),
    originalTitle:    z.string().default(''),
    keyword:          z.string().default(''),
    seoMode:          z.boolean().default(false),
    method:           z.string().default('keep_headings'),
    style:            z.string().default('standard'),
    language:         z.string().default('Vietnamese'),
    mainKeywordUrl:   z.string().default(''),
    additionalLinks:  z.array(z.object({ keyword: z.string(), url: z.string() })).default([]),
    appendContent:    z.string().default(''),
    autoBold:         z.string().default('none'),
    model:            z.string().default('gemini-flash'),
    brandConfig:      z.record(z.unknown()).optional(),
  }),
  // sections được truyền từ FE (đã parse ở /start, cache sessionStorage)
  sections: z.array(z.object({
    headingLevel: z.string().nullable(),
    headingText:  z.string(),
    headingHtml:  z.string(),
    bodyHtml:     z.string(),
  })).optional(),
});

// ─── Route ───────────────────────────────────────────────────────────────────

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

    const { articleId, runId, config, sections: sectionsPassed } = parsed.data as {
      articleId: string;
      runId:     string;
      config:    ArticleRewriteConfig;
      sections?: ArticleSection[];
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

    // Dùng sections đã parse (từ FE) hoặc parse lại từ DB
    const sections: ArticleSection[] = sectionsPassed?.length
      ? sectionsPassed
      : extractSectionsByHeading(config.originalHtml);

    const brandPrompt = await buildBrandPrompt(config.brandConfig);
    const forbidden   = mergeForbiddenWords(
      (config.brandConfig?.forbiddenExtra as string[] | undefined)
    ).join(', ');
    const prompt      = buildRewritePrompt(config, sections, brandPrompt, forbidden);
    const model       = buildTinhGonModel(config.model);

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);

        try {
          send({ type: 'step', step: 'rewrite', label: 'AI đang viết lại bài...' });

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

          send({ type: 'step_done', step: 'rewrite' });
          send({ type: 'step', step: 'postprocess', label: 'Xử lý hậu kỳ...' });

          // Post-process
          let html = rawHtml;

          if (config.mainKeywordUrl && config.keyword) {
            html = injectMainKeywordLink(html, config.keyword, config.mainKeywordUrl);
          }
          if (config.additionalLinks.length > 0) {
            html = injectAdditionalLinks(html, config.additionalLinks);
          }
          if (config.autoBold !== 'none') {
            html = autoBoldContent(html, config.keyword, config.autoBold as 'keyword' | 'headings' | 'both');
          }
          if (config.appendContent) {
            html = appendContentToArticle(html, config.appendContent);
          }

          // ⚠️ BUG #1 fix: truyền originalTitle (fallback) vào arg 2
          const originalTitle = config.originalTitle || config.keyword || 'Bài viết';
          html = sanitizeHtmlArticle(html, originalTitle);

          send({ type: 'step_done', step: 'postprocess' });
          send({ type: 'step', step: 'analyze', label: 'Phân tích chất lượng...' });

          // ⚠️ BUG #2 fix: extract h1 trước khi buildMetaDescription
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
            : originalTitle;

          const wordCount      = countWords(html);
          const keywordDensity = config.keyword
            ? computeKeywordDensity(html, config.keyword)
            : 0;
          const humanness      = analyzeHumanness(
            html,
            (config.brandConfig?.forbiddenExtra as string[] | undefined),
          );
          const metaDescription = buildMetaDescription(title, config.keyword || title);

          // Update DB
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
                stage:   'generate',
                method:  config.method,
                style:   config.style,
                config,
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
              originalWordCount: countHtmlWords(config.originalHtml),
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

// Import countHtmlWords (export lại từ html-parser để stream dùng)
import { countHtmlWords } from '@/lib/viet-lai/html-parser';
```

---

## 9. Tool Page — `web/app/viet-lai-doan-van/page.tsx`

Layout 2 cột: trái (input + controls), phải (output + copy). **Không có DB, không redirect.**

```tsx
'use client';

import { useRef, useState } from 'react';
import { AI_MODELS } from '@/lib/tinh-gon/options';
import { REWRITE_LANGUAGES, REWRITE_STYLES } from '@/lib/viet-lai/options';
import type { ParagraphRewriteConfig } from '@/lib/viet-lai/types';

const DEFAULT_CONFIG: ParagraphRewriteConfig = {
  originalText: '',
  style:        'standard',
  language:     'Vietnamese',
  model:        'gemini-flash',
};

export default function VietLaiDoanVanPage() {
  const [config, setConfig]       = useState<ParagraphRewriteConfig>(DEFAULT_CONFIG);
  const [output, setOutput]       = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const abortRef                  = useRef<AbortController | null>(null);

  const inputWordCount = config.originalText.trim()
    ? config.originalText.trim().split(/\s+/).length
    : 0;

  async function handleRewrite() {
    const text = config.originalText.trim();
    if (!text) { setError('Vui lòng nhập nội dung cần viết lại.'); return; }

    // Huỷ request trước nếu đang chạy
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError('');
    setOutput('');
    setWordCount(0);

    try {
      const response = await fetch('/api/viet-lai/paragraph', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
        signal:  abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Lỗi kết nối đến AI');
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

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
              type:      string;
              text?:     string;
              wordCount?: number;
              message?:  string;
            };

            if (event.type === 'chunk' && event.text) {
              setOutput((prev) => prev + event.text);
            } else if (event.type === 'done') {
              setWordCount(event.wordCount ?? 0);
            } else if (event.type === 'error') {
              setError(event.message ?? 'Lỗi AI');
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (output) void navigator.clipboard.writeText(output);
  }

  function handleClear() {
    setConfig((prev) => ({ ...prev, originalText: '' }));
    setOutput('');
    setWordCount(0);
    setError('');
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab nav — dùng chung 4 tab viết lại */}
      <div className="flex border-b border-gray-200 bg-white">
        {[
          { label: 'Viết lại đoạn văn', href: '/viet-lai-doan-van', active: true },
          { label: 'Viết lại bài viết',  href: '/viet-lai-bai-viet',  active: false },
          { label: 'Viết lại tin tức',   href: '/viet-lai-tin-tuc',   active: false },
          { label: 'Viết lại URL',        href: '/viet-lai-url',        active: false },
        ].map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab.active
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Main: 2 columns */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Input + Controls */}
        <div className="flex-1 flex flex-col border-r border-gray-200 p-4 overflow-y-auto">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              {/* File upload button */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <span>📎</span>
                <span>Upload</span>
                <input
                  type="file"
                  accept=".txt,.md,.html"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      setConfig((prev) => ({ ...prev, originalText: String(evt.target?.result ?? '') }));
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
            <span className="text-xs text-gray-400">{inputWordCount} từ</span>
          </div>

          {/* Textarea */}
          <textarea
            value={config.originalText}
            onChange={(e) => setConfig((prev) => ({ ...prev, originalText: e.target.value }))}
            placeholder="Gõ hoặc dán nội dung cần viết lại vào đây..."
            className="flex-1 w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
          />

          {/* Controls */}
          <div className="mt-4 space-y-4">
            {/* AI Model */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Model AI</label>
              <div className="grid grid-cols-2 gap-2">
                {AI_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setConfig((prev) => ({ ...prev, model: m.id }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-colors ${
                      config.model === m.id ? m.color : m.inactive
                    }`}
                  >
                    <span className="text-sm">{m.icon}</span>
                    <div className="text-left">
                      <p className="text-xs font-semibold">{m.label}</p>
                      <p className="text-[10px] opacity-70">{m.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Ngôn ngữ</label>
              <select
                value={config.language}
                onChange={(e) => setConfig((prev) => ({ ...prev, language: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REWRITE_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* Style */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Phong cách viết</label>
              <div className="grid grid-cols-1 gap-1">
                {REWRITE_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setConfig((prev) => ({ ...prev, style: s.value }))}
                    title={s.note}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors text-xs ${
                      config.style === s.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => void handleRewrite()}
              disabled={loading || !config.originalText.trim()}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳ Đang viết lại...' : '🔄 Do Rewrite'}
            </button>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex-1 flex flex-col p-4 bg-gray-50 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-600">Kết quả</span>
            <div className="flex items-center gap-2">
              {wordCount > 0 && (
                <span className="text-xs text-gray-400">số từ: {wordCount}</span>
              )}
              <button
                onClick={handleCopy}
                disabled={!output}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Output area */}
          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[200px]">
            {loading && !output && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>AI đang viết lại...</span>
              </div>
            )}
            {output || (!loading && (
              <p className="text-gray-400 italic">
                Kết quả sẽ hiển thị ở đây sau khi bấm "Do Rewrite".
              </p>
            ))}
          </div>

          {/* Streaming hint */}
          {output && loading && (
            <p className="text-xs text-blue-500 mt-2 animate-pulse">Đang stream...</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 10. Config Page — `web/app/viet-lai-bai-viet/page.tsx`

Form cấu hình với nhiều tùy chọn nâng cao. Kết thúc bằng redirect sang `/generate`.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AI_MODELS } from '@/lib/tinh-gon/options';
import { REWRITE_LANGUAGES, REWRITE_METHODS, REWRITE_STYLES } from '@/lib/viet-lai/options';
import type { ArticleRewriteConfig, ArticleRewriteStartResponse } from '@/lib/viet-lai/types';

const SS_KEY = 'vl_config';    // sessionStorage prefix: vl_

const DEFAULT_CONFIG: ArticleRewriteConfig = {
  originalHtml:    '',
  originalTitle:   '',
  keyword:         '',
  seoMode:         false,
  method:          'keep_headings',
  style:           'standard',
  language:        'Vietnamese',
  mainKeywordUrl:  '',
  additionalLinks: [],
  appendContent:   '',
  autoBold:        'none',
  model:           'gemini-flash',
};

export default function VietLaiBaiVietPage() {
  const router = useRouter();
  const [config, setConfig]           = useState<ArticleRewriteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Additional links management
  const [linkKeyword, setLinkKeyword] = useState('');
  const [linkUrl, setLinkUrl]         = useState('');

  useEffect(() => {
    document.title = 'Viết lại bài viết - Content Agent';
    const stored = sessionStorage.getItem(SS_KEY);
    if (stored) {
      try { setConfig(JSON.parse(stored) as ArticleRewriteConfig); } catch { /* ignore */ }
    }
  }, []);

  function addAdditionalLink() {
    if (!linkKeyword.trim() || !linkUrl.trim()) return;
    setConfig((prev) => ({
      ...prev,
      additionalLinks: [...prev.additionalLinks, { keyword: linkKeyword.trim(), url: linkUrl.trim() }],
    }));
    setLinkKeyword('');
    setLinkUrl('');
  }

  function removeAdditionalLink(index: number) {
    setConfig((prev) => ({
      ...prev,
      additionalLinks: prev.additionalLinks.filter((_, i) => i !== index),
    }));
  }

  async function handleNext() {
    // ⚠️ BUG #6 fix: validate originalHtml
    if (!config.originalHtml.trim()) {
      setError('Vui lòng nhập nội dung bài viết gốc.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/viet-lai/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ config }),
      });

      const data = await response.json() as ArticleRewriteStartResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Lỗi khởi tạo');

      // Lưu vào sessionStorage
      sessionStorage.setItem(SS_KEY,              JSON.stringify(config));
      sessionStorage.setItem('vl_article_id',     data.articleId);
      sessionStorage.setItem('vl_run_id',          data.runId);
      sessionStorage.setItem('vl_sections',        JSON.stringify(data.sections));
      sessionStorage.setItem('vl_original_wc',     String(data.wordCount));
      sessionStorage.removeItem('vl_result');

      router.push('/viet-lai-bai-viet/generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto">

        {/* Tab nav */}
        {/* ... (giống tab nav ở viet-lai-doan-van) ... */}

        {/* Header + Progress */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Viết lại bài viết</h1>
          <div className="flex items-center gap-2 mt-3">
            {['Cấu hình', 'Viết lại & Chỉnh sửa'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 flex-1 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <span className={`text-xs whitespace-nowrap ${i === 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {i + 1}. {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Mode toggle */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Chế độ SEO</p>
            <p className="text-xs text-gray-400 mt-0.5">Bật để tối ưu từ khóa trong bài viết lại</p>
          </div>
          <button
            onClick={() => setConfig((prev) => ({ ...prev, seoMode: !prev.seoMode }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${config.seoMode ? 'bg-blue-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.seoMode ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        {/* Keyword (hiện khi SEO mode bật) */}
        {config.seoMode && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Từ khóa chính (SEO)
            </label>
            <input
              type="text"
              value={config.keyword}
              onChange={(e) => setConfig((prev) => ({ ...prev, keyword: e.target.value }))}
              placeholder="VD: giường sắt giá rẻ"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Nội dung gốc */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nội dung bài viết gốc <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Dán HTML hoặc plain text. Hỗ trợ tối đa ~10.000 từ.
          </p>
          <textarea
            value={config.originalHtml}
            onChange={(e) => setConfig((prev) => ({ ...prev, originalHtml: e.target.value }))}
            placeholder="Dán nội dung bài viết gốc vào đây..."
            rows={10}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          {config.originalHtml && (
            <p className="text-xs text-gray-400 mt-2">
              ~{config.originalHtml.trim().split(/\s+/).length} từ
            </p>
          )}
        </div>

        {/* Language */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Ngôn ngữ đầu ra</label>
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

        {/* Rewrite style */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Giọng văn & Ngữ điệu</label>
          <div className="grid grid-cols-2 gap-2">
            {REWRITE_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setConfig((prev) => ({ ...prev, style: s.value }))}
                title={s.note}
                className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-colors ${
                  config.style === s.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                <span>{s.emoji}</span>
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rewrite method */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Phương pháp viết</label>
          <div className="space-y-2">
            {REWRITE_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setConfig((prev) => ({ ...prev, method: m.value }))}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors relative ${
                  config.method === m.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 ${config.method === m.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                <div>
                  <p className={`text-sm font-medium ${config.method === m.value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {m.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.note}</p>
                </div>
                {m.badge && (
                  <span className="absolute top-2 right-2 text-[9px] bg-blue-500 text-white rounded-full px-1.5 py-0.5">
                    {m.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options (collapsible) */}
        <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700"
          >
            <span>⚙️ Tùy chọn nâng cao</span>
            <span className="text-gray-400">{showAdvanced ? '▲' : '▼'}</span>
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 space-y-5 border-t border-gray-100">

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
                  <input
                    type="text"
                    value={linkKeyword}
                    onChange={(e) => setLinkKeyword(e.target.value)}
                    placeholder="Từ khóa"
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={addAdditionalLink}
                    className="px-3 py-1.5 bg-gray-100 text-xs rounded-lg hover:bg-gray-200"
                  >
                    + Thêm
                  </button>
                </div>
                {config.additionalLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5 mb-1">
                    <span className="flex-1 text-gray-700 truncate">{link.keyword}</span>
                    <span className="text-gray-400 truncate">→ {link.url}</span>
                    <button onClick={() => removeAdditionalLink(i)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                  </div>
                ))}
              </div>

              {/* Append content */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Thêm nội dung sau vào cuối bài
                </label>
                <textarea
                  value={config.appendContent}
                  onChange={(e) => setConfig((prev) => ({ ...prev, appendContent: e.target.value }))}
                  placeholder="HTML hoặc text thêm vào cuối bài (VD: CTA, thông tin liên hệ)..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
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
                    <button
                      key={opt.value}
                      onClick={() => setConfig((prev) => ({ ...prev, autoBold: opt.value as ArticleRewriteConfig['autoBold'] }))}
                      className={`py-2 text-xs rounded-lg border-2 transition-colors ${
                        config.autoBold === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
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
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => void handleNext()}
          disabled={loading || !config.originalHtml.trim()}
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

## 11. Generate Page — `web/app/viet-lai-bai-viet/generate/page.tsx`

Skeleton — bootstrap từ sessionStorage, stream SSE, sau đó render AI Editor với **split screen** (bài gốc vs bài mới).

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArticleEditor }    from '@/components/editor/ArticleEditor';
import { SeoPanel }         from '@/components/editor/SeoPanel';
import { AiAssistPanel }    from '@/components/editor/AiAssistPanel';
import { PublishPanel }     from '@/components/editor/PublishPanel';
import { ExportMenu }       from '@/components/editor/ExportMenu';
import type { ArticleRewriteConfig, ArticleRewriteResult, ArticleSection } from '@/lib/viet-lai/types';

type SaveStatus = 'saved' | 'dirty' | 'saving';

export default function VietLaiBaiVietGeneratePage() {
  const router = useRouter();

  // Config & IDs
  const [config, setConfig]       = useState<ArticleRewriteConfig | null>(null);
  const [articleId, setArticleId] = useState('');
  const [runId, setRunId]         = useState('');
  const [sections, setSections]   = useState<ArticleSection[]>([]);
  const [originalWc, setOriginalWc] = useState(0);

  // Generate state
  const [html, setHtml]           = useState('');
  const [title, setTitle]         = useState('');
  const [metaDesc, setMetaDesc]   = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [humanness, setHumanness] = useState<{ score: number; decision: string } | null>(null);
  const [steps, setSteps]         = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError]         = useState('');

  // UI State
  const [saveStatus, setSaveStatus]       = useState<SaveStatus>('saved');
  const [showSplit, setShowSplit]         = useState(false);   // split screen: original vs new
  const [showPublish, setShowPublish]     = useState(false);
  const [activePanel, setActivePanel]     = useState<'seo' | 'ai' | 'media'>('seo');
  const saveDirtyTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didGenerate                       = useRef(false);

  useEffect(() => {
    const storedConfig     = sessionStorage.getItem('vl_config');
    const storedArticleId  = sessionStorage.getItem('vl_article_id');
    const storedRunId      = sessionStorage.getItem('vl_run_id');
    const storedSections   = sessionStorage.getItem('vl_sections');
    const storedOriginalWc = sessionStorage.getItem('vl_original_wc');
    const storedResult     = sessionStorage.getItem('vl_result');

    if (!storedConfig || !storedArticleId || !storedRunId) {
      router.replace('/viet-lai-bai-viet');
      return;
    }

    try {
      const parsedConfig = JSON.parse(storedConfig) as ArticleRewriteConfig;
      setConfig(parsedConfig);
      setArticleId(storedArticleId);
      setRunId(storedRunId);
      if (storedSections)   setSections(JSON.parse(storedSections) as ArticleSection[]);
      if (storedOriginalWc) setOriginalWc(Number(storedOriginalWc));

      // Resume nếu đã có result
      if (storedResult) {
        const result = JSON.parse(storedResult) as ArticleRewriteResult;
        setHtml(result.html);
        setTitle(result.title);
        setMetaDesc(result.metaDescription);
        setWordCount(result.wordCount);
        if (result.humanness) setHumanness(result.humanness);
        return;
      }

      if (!didGenerate.current) {
        didGenerate.current = true;
        void startStream(parsedConfig, storedArticleId, storedRunId);
      }
    } catch {
      router.replace('/viet-lai-bai-viet');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startStream(cfg: ArticleRewriteConfig, artId: string, rId: string) {
    setStreaming(true);
    setError('');

    try {
      const response = await fetch('/api/viet-lai/stream', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          articleId: artId,
          runId:     rId,
          config:    cfg,
          sections,  // truyền sections đã parse để tránh parse lại
        }),
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
              type:     string;
              step?:    string;
              label?:   string;
              text?:    string;
              data?:    ArticleRewriteResult;
              message?: string;
            };

            if (event.type === 'step' && event.label) {
              setSteps((prev) => [...prev, event.label!]);
            } else if (event.type === 'chunk' && event.text) {
              accumulated += event.text;
              setHtml(accumulated);
            } else if (event.type === 'done' && event.data) {
              const r = event.data;
              setHtml(r.html);
              setTitle(r.title);
              setMetaDesc(r.metaDescription);
              setWordCount(r.wordCount);
              if (r.humanness) setHumanness(r.humanness);
              setOriginalWc(r.originalWordCount);
              sessionStorage.setItem('vl_result', JSON.stringify(r));
            } else if (event.type === 'error') {
              setError(event.message ?? 'Lỗi AI');
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi stream');
    } finally {
      setStreaming(false);
    }
  }

  // Auto-save với debounce 2s
  function markDirty() {
    setSaveStatus('dirty');
    if (saveDirtyTimer.current) clearTimeout(saveDirtyTimer.current);
    saveDirtyTimer.current = setTimeout(() => void autoSave(), 2000);
  }

  async function autoSave() {
    if (!articleId || !html) return;
    setSaveStatus('saving');
    try {
      await fetch(`/api/articles/${articleId}/save`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ html, title, metaDescription: metaDesc }),
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('dirty');
    }
  }

  if (!config) return null;

  const keyword = config.keyword || '';

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/viet-lai-bai-viet')} className="text-sm text-gray-500 hover:text-gray-700">
            ← Quay lại
          </button>
          <h1 className="text-sm font-semibold text-gray-800">
            {title || 'Viết lại bài viết'}
          </h1>
          {/* Save badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            saveStatus === 'saved'  ? 'bg-green-100 text-green-700' :
            saveStatus === 'saving' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {saveStatus === 'saved' ? '✓ Đã lưu' : saveStatus === 'saving' ? 'Đang lưu...' : 'Chưa lưu'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Split screen toggle */}
          <button
            onClick={() => setShowSplit((v) => !v)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              showSplit ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            ⚡ So sánh
          </button>
          <ExportMenu html={html} title={title} articleId={articleId} />
          <button
            onClick={() => setShowPublish(true)}
            disabled={!html}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      {/* Loading steps */}
      {streaming && (
        <div className="flex-shrink-0 px-4 py-3 bg-blue-50 border-b border-blue-100">
          {steps.map((step, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 mr-4 text-xs text-blue-700">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              {step}
            </span>
          ))}
          {streaming && <span className="text-xs text-blue-500 animate-pulse">Đang xử lý...</span>}
        </div>
      )}

      {error && (
        <div className="flex-shrink-0 px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor column (split: original | new, or single new) */}
        <div className="flex flex-1 overflow-hidden">

          {/* Original (split screen) */}
          {showSplit && (
            <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <p className="text-xs font-semibold text-gray-500">Bài gốc ({originalWc} từ)</p>
              </div>
              <div
                className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: config.originalHtml }}
              />
            </div>
          )}

          {/* New article editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">
                Bài mới ({wordCount} từ)
                {wordCount > 0 && originalWc > 0 && (
                  <span className={`ml-2 ${wordCount >= originalWc * 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>
                    ({Math.round(wordCount / originalWc * 100)}% so với gốc)
                  </span>
                )}
              </p>
              {humanness && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  humanness.score >= 76 ? 'bg-green-100 text-green-700' :
                  humanness.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  Humanness: {humanness.score}/100
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ArticleEditor
                html={html}
                onChange={(newHtml) => { setHtml(newHtml); markDirty(); }}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 flex flex-col overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            {(['seo', 'ai', 'media'] as const).map((panel) => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activePanel === panel
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {panel === 'seo' ? '📊 SEO' : panel === 'ai' ? '🤖 AI' : '🖼️ Media'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activePanel === 'seo' && (
              <SeoPanel
                html={html}
                keyword={keyword}
                title={title}
                metaDescription={metaDesc}
                onMetaDescChange={setMetaDesc}
                onTitleChange={setTitle}
              />
            )}
            {activePanel === 'ai' && (
              <AiAssistPanel
                html={html}
                keyword={keyword}
                articleId={articleId}
                onApply={(newHtml) => { setHtml(newHtml); markDirty(); }}
              />
            )}
            {activePanel === 'media' && (
              <div className="p-4">
                {/* Media search panel — từ AI-EDITOR-IMPLEMENTATION.md */}
                <p className="text-xs text-gray-500">Tính năng tìm ảnh/video — xem AI-EDITOR-IMPLEMENTATION.md</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publish slide-over */}
      {showPublish && (
        <PublishPanel
          articleId={articleId}
          html={html}
          title={title}
          onClose={() => setShowPublish(false)}
        />
      )}
    </div>
  );
}
```

---

## 12. Sidebar — thêm vào `web/components/Sidebar.tsx`

```typescript
// Thêm vào navGroups, trong section "Viết lại":
{
  label: 'Viết Lại',
  items: [
    { href: '/viet-lai-doan-van', icon: '🔄', label: 'Viết lại đoạn văn' },
    { href: '/viet-lai-bai-viet', icon: '📝', label: 'Viết lại bài viết' },
    // Future:
    // { href: '/viet-lai-tin-tuc', icon: '📰', label: 'Viết lại tin tức' },
    // { href: '/viet-lai-url',      icon: '🔗', label: 'Viết lại từ URL'   },
  ],
},
```

---

## 13. sessionStorage Keys

| Key | Giá trị | Ghi chú |
|-----|---------|---------|
| `vl_config` | `ArticleRewriteConfig` JSON | Config từ Step 1 |
| `vl_article_id` | string | Article ID trong DB |
| `vl_run_id` | string | Run ID |
| `vl_sections` | `ArticleSection[]` JSON | Sections đã parse từ bài gốc |
| `vl_original_wc` | string (number) | Số từ bài gốc (hiển thị UI) |
| `vl_result` | `ArticleRewriteResult` JSON | Cache kết quả sau khi done |

> Prefix `vl_` — Viết Lại. Không trùng với `vtt_` (tin tức), `vdb_` (dàn bài), `vtl_` (toplist), `tg_` (tinh gọn).

---

## 14. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `lib/viet-lai/types.ts` | Định nghĩa types |
| 2 | `lib/viet-lai/options.ts` | Constants (styles, methods) |
| 3 | `lib/viet-lai/html-parser.ts` | extractSectionsByHeading |
| 4 | `lib/viet-lai/post-process.ts` | inject links, bold, append |
| 5 | `api/viet-lai/paragraph/route.ts` | Simple paragraph SSE |
| 6 | `app/viet-lai-doan-van/page.tsx` | Tool 2 cột — test trực tiếp |
| 7 | `api/viet-lai/start/route.ts` | Tạo Article + parse |
| 8 | `api/viet-lai/stream/route.ts` | Full article SSE |
| 9 | `app/viet-lai-bai-viet/page.tsx` | Config form |
| 10 | `app/viet-lai-bai-viet/generate/page.tsx` | Generate + Editor |
| 11 | `components/Sidebar.tsx` | Thêm nav entries |
| 12 | Verify split screen + post-process | Kiểm tra link inject, bold, append |

---

## 15. QA Checklist

### Viết lại đoạn văn

- [ ] Textarea nhận paste text + HTML (strip HTML khi đếm từ)
- [ ] File upload .txt / .md đọc được
- [ ] Stream hiển thị real-time vào right panel
- [ ] Markdown bị strip (`**bold**` → `bold`) trong output
- [ ] Copy button hoạt động sau khi done
- [ ] Clear xoá cả input lẫn output
- [ ] Huỷ request cũ khi bấm Rewrite lần hai (AbortController)
- [ ] Word count hiển thị đúng bên input và output
- [ ] 13 style options có thể chọn và thay đổi prompt

### Viết lại bài viết

- [ ] Validate: không cho tiếp theo khi originalHtml trống
- [ ] SEO Mode toggle hiện/ẩn keyword input
- [ ] Advanced options collapse/expand mượt
- [ ] Additional links: thêm / xoá từng entry
- [ ] `extractSectionsByHeading()` — bài có heading vs không có heading đều xử lý được
- [ ] Method `keep_headings`: heading trong output giữ nguyên text gốc
- [ ] Method `rewrite_all`: cả heading lẫn body đều bị rewrite
- [ ] Method `deep_rewrite`: output có marker từng section, unique tối đa
- [ ] Link inject: không inject cùng keyword hai lần
- [ ] Auto-bold: chỉ bold lần đầu tiên, không bold trong heading
- [ ] Append content: xuất hiện cuối bài
- [ ] Split screen: bài gốc và bài mới scroll độc lập
- [ ] Tỉ lệ từ so với gốc hiển thị màu (xanh ≥80%, vàng <80%)
- [ ] Humanness badge hiển thị màu theo score (xanh ≥76, vàng 60-75, đỏ <60)
- [ ] Auto-save debounce 2s sau khi edit
- [ ] Resume: reload trang vẫn hiện kết quả (từ `vl_result`)
- [ ] Publish panel hoạt động từ bài viết lại

---

## 16. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|---------|
| Output có `**bold**` markdown | AI viết markdown dù yêu cầu plain text | Thêm `stripMarkdown()` trong paragraph/route.ts |
| Heading bị rewrite dù chọn `keep_headings` | AI không tuân theo tag `[GIỮ NGUYÊN]` | Thêm vào prompt: "TUYỆT ĐỐI không thay đổi heading có tag này" |
| Link inject nhân đôi | Không track từ đã inject | Dùng `Set<string>` trong `injectAdditionalLinks()` |
| `extractSectionsByHeading()` trả `[]` | Bài gốc không có heading | Fallback: trả 1 section với toàn bộ HTML |
| `buildMetaDescription` nhận HTML thay vì title | Truyền nhầm arg | Extract `<h1>` trước, truyền `title` vào arg 1 |
| Split screen không scroll đồng bộ | Không cần đồng bộ — aiktp để scroll độc lập | Không fix |
| Bài gốc render `<script>` | User paste HTML độc hại | `sanitizeHtmlArticle()` đã xử lý — chạy qua đó trước khi render |
| `countHtmlWords` import lỗi | Import circular giữa html-parser và stream | Export `countHtmlWords` từ `html-parser.ts`, import trực tiếp |
