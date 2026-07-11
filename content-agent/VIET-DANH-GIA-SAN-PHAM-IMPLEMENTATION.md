# VIET-DANH-GIA-SAN-PHAM-IMPLEMENTATION.md
## Tài liệu hướng dẫn code — Feature: Viết Đánh Giá Sản Phẩm

> Phân tích từ: https://aiktp.com/vi/write-product-review-step-1  
> Ngày: 2026-05-21  
> Stack hiện tại: Next.js 14 App Router · TypeScript · Prisma · Tailwind CSS

---

## 1. Tổng quan feature

**Mục đích:** Cho phép user nhập URL sản phẩm (hoặc thông tin thủ công), hệ thống tự động crawl + viết bài đánh giá SEO theo cấu trúc review chuẩn.

**Điểm khác biệt so với viet-tinh-gon:**

| Điểm | viet-tinh-gon | viet-danh-gia-san-pham |
|------|---------------|----------------------|
| Input chính | Từ khóa | URL sản phẩm hoặc thông tin thủ công |
| Số bước | 3 (config → outline → generate) | 2 (config → generate) |
| Outline | AI tạo dựa theo outlineType | Cấu trúc review cố định (2 mẫu) |
| Dữ liệu bổ sung | Google Search (tuỳ chọn) | Product scraping (chính) |
| Link đặc biệt | Không | Affiliate/buy link — AI chèn 1–2 lần vào bài |
| Writing style | tone via brandConfig | 6 review styles chuyên biệt |

**User flow:**
```
/viet-danh-gia-san-pham          → Config form (Step 1)
  └─ POST /api/danh-gia-san-pham/scrape  (nếu user nhập URL)
  └─ → /viet-danh-gia-san-pham/generate  (Step 2, SSE streaming)
         └─ POST /api/danh-gia-san-pham/stream
```

---

## 2. Cấu trúc thư mục — 11 file mới

```
web/
├── app/
│   ├── viet-danh-gia-san-pham/
│   │   ├── page.tsx                          ← Step 1: Config form
│   │   └── generate/
│   │       └── page.tsx                      ← Step 2: Streaming result
│   └── api/
│       └── danh-gia-san-pham/
│           ├── scrape/
│           │   └── route.ts                  ← Crawl product URL
│           └── stream/
│               └── route.ts                  ← SSE generate
├── lib/
│   └── product-scraper/
│       ├── types.ts                          ← ProductData interface
│       ├── scraper.ts                        ← Crawl + extract product info
│       └── prompt.ts                         ← Build review prompt
└── components/
    └── danh-gia-san-pham/                    ← (optional) nếu form phức tạp
        └── ConfigForm.tsx
```

**File sửa thêm (2 file):**
```
web/components/Sidebar.tsx                    ← Thêm link menu
```
*(Prisma schema KHÔNG cần sửa — dùng lại model `Article` với `contentType = 'product_review'`)*

---

## 3. Types — `web/lib/product-scraper/types.ts`

```typescript
// Dữ liệu sản phẩm sau khi crawl hoặc user nhập tay
export interface ProductData {
  name: string;          // Tên sản phẩm
  info: string;          // Thông tin / mô tả đầy đủ (crawl hoặc nhập tay)
  price?: string;        // Giá (nếu crawl được)
  rating?: string;       // Điểm đánh giá (nếu có)
  imageUrl?: string;     // URL ảnh đại diện (nếu crawl được)
  sourceUrl?: string;    // URL nguồn (để ghi chú trong bài)
  scrapedAt?: string;    // ISO timestamp
}

// Cấu trúc bài review (2 mẫu từ aiktp)
export type ReviewStructure =
  | 'full'       // Thương hiệu - Tính năng - Kinh nghiệm - Ưu/Nhược - Lời khuyên
  | 'focused';   // Tập trung tính năng - Ưu điểm và nhược điểm

// Phong cách viết (6 mẫu từ aiktp)
export type ReviewStyle =
  | 'expert'       // Đánh giá của chuyên gia
  | 'user'         // Người dùng phổ thông đánh giá
  | 'friendly'     // Bài đánh giá thân thiện
  | 'fun'          // Bài đánh giá vui vẻ
  | 'technical'    // Đánh giá nặng tính kỹ thuật
  | 'informational'; // Đánh giá dạng cung cấp thông tin

// Config form (Step 1)
export interface ReviewConfig {
  // Product info
  productUrl?: string;       // URL để crawl (optional nếu nhập tay)
  productName: string;       // Tên sản phẩm
  productInfo: string;       // Thông tin sản phẩm (crawl hoặc nhập tay)
  keyword: string;           // Từ khóa SEO chính
  affiliateLink?: string;    // Link mua hàng / affiliate (optional)

  // Article settings
  reviewStructure: ReviewStructure;
  reviewStyle: ReviewStyle;
  language: string;          // 'Vietnamese' | 'English' | ...
  model: string;             // AI model ID

  // Brand
  brandConfig?: {
    name?: string;
    pronouns?: string;
    audience?: string;
    forbiddenExtra?: string;
    toneNotes?: string;
  };
}

// Response từ /api/danh-gia-san-pham/scrape
export interface ScrapeResponse {
  success: boolean;
  data?: ProductData;
  error?: string;
}

// SSE event types từ /api/danh-gia-san-pham/stream
export interface ReviewStreamEvent {
  type: 'step' | 'step_done' | 'chunk' | 'done' | 'error';
  step?: string;
  label?: string;
  text?: string;
  message?: string;
  data?: {
    runId: string;
    html: string;
    title: string;
    metaDescription: string;
    wordCount: number;
    keywordDensity: number;
    humannessScore: number;
    humannessDecision: 'PUBLISH' | 'REVIEW' | 'REWRITE';
  };
}
```

---

## 4. Zod Schema — validation

Thêm vào `web/lib/product-scraper/types.ts` hoặc tạo `schema.ts` riêng:

```typescript
import { z } from 'zod';

export const brandConfigSchema = z.object({
  name: z.string().trim().optional(),
  pronouns: z.string().trim().optional(),
  audience: z.string().trim().optional(),
  forbiddenExtra: z.string().trim().optional(),
  toneNotes: z.string().trim().optional(),
});

export const reviewConfigSchema = z.object({
  productUrl:      z.string().url().optional().or(z.literal('')),
  productName:     z.string().trim().min(2).max(300),
  productInfo:     z.string().trim().min(10).max(5000),
  keyword:         z.string().trim().min(2).max(200),
  affiliateLink:   z.string().url().optional().or(z.literal('')),
  reviewStructure: z.enum(['full', 'focused']),
  reviewStyle:     z.enum(['expert', 'user', 'friendly', 'fun', 'technical', 'informational']),
  language:        z.string().trim().min(2).max(50).default('Vietnamese'),
  model:           z.string().trim().min(2).max(50).default('gemini-flash'),
  brandConfig:     brandConfigSchema.optional(),
});

export const scrapeRequestSchema = z.object({
  url: z.string().url(),
});

export const streamRequestSchema = z.object({
  articleId: z.string().trim().min(1),
  runId:     z.string().trim().min(4).max(80),
  config:    reviewConfigSchema,
});
```

---

## 5. Product Scraper — `web/lib/product-scraper/scraper.ts`

**Logic:** Crawl URL → extract product name, description, price, rating từ HTML.  
**Pattern:** Tương tự `lib/google-search/extract.ts` đã có sẵn.

```typescript
import type { ProductData } from './types';

// Supported domains: Shopee, Lazada, Amazon, Etsy, Alibaba, WooCommerce
const SUPPORTED_DOMAINS = ['shopee', 'lazada', 'amazon', 'etsy', 'alibaba'];

export function isSupportedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SUPPORTED_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false; // invalid URL → không lỗi, chỉ báo không hỗ trợ
  }
}

/**
 * Crawl URL sản phẩm và trích xuất thông tin.
 * Timeout 12s (dài hơn google search vì trang SP thường nặng hơn).
 */
export async function scrapeProductUrl(url: string): Promise<ProductData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept':          'text/html,application/xhtml+xml',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Không thể truy cập URL (HTTP ${response.status})`);
  }

  const html = await response.text();
  return extractProductData(html, url);
}

function extractProductData(html: string, sourceUrl: string): ProductData {
  // --- Tên sản phẩm ---
  const namePatterns = [
    /<h1[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    /<h1[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/h1>/i,
    /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ];

  let name = '';
  for (const pattern of namePatterns) {
    const match = html.match(pattern);
    if (match) {
      name = stripTags(match[1]).trim().slice(0, 300);
      if (name) break;
    }
  }

  // --- Giá ---
  const priceMatch =
    html.match(/itemprop="price"[^>]*content="([^"]+)"/i) ||
    html.match(/<[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
  const price = priceMatch ? stripTags(priceMatch[1]).trim().slice(0, 50) : undefined;

  // --- Rating ---
  const ratingMatch =
    html.match(/itemprop="ratingValue"[^>]*content="([^"]+)"/i) ||
    html.match(/<[^>]*class="[^"]*rating[^"]*"[^>]*>([\s\S]{0,30})<\/[^>]+>/i);
  const rating = ratingMatch ? stripTags(ratingMatch[1]).trim().slice(0, 20) : undefined;

  // --- Ảnh ---
  const imageMatch =
    html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
    html.match(/itemprop="image"[^>]*content="([^"]+)"/i);
  const imageUrl = imageMatch ? imageMatch[1].trim() : undefined;

  // --- Mô tả sản phẩm (nội dung chính) ---
  const descPatterns = [
    /<div[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*product-detail[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
    /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i,
  ];

  let info = '';
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match) {
      info = stripTags(match[1]).replace(/\s+/g, ' ').trim().slice(0, 3000);
      if (info.length > 100) break; // đủ dài thì dừng
    }
  }

  // Fallback: lấy body text nếu không tìm được description
  if (!info || info.length < 100) {
    info = extractBodyText(html, 2500);
  }

  return {
    name:       name || 'Sản phẩm',
    info:       info || 'Không trích xuất được thông tin sản phẩm.',
    price,
    rating,
    imageUrl,
    sourceUrl,
    scrapedAt:  new Date().toISOString(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBodyText(html: string, maxLength: number): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
```

---

## 6. Prompt Builder — `web/lib/product-scraper/prompt.ts`

```typescript
import type { ReviewConfig } from './types';

// Label human-readable cho từng style
const STYLE_LABELS: Record<string, string> = {
  expert:        'chuyên gia có kinh nghiệm sâu về sản phẩm',
  user:          'người dùng phổ thông đã mua và dùng thực tế',
  friendly:      'người bạn thân thiện đang chia sẻ trải nghiệm',
  fun:           'người viết vui vẻ, hài hước nhưng vẫn cung cấp đủ thông tin',
  technical:     'kỹ sư / chuyên gia kỹ thuật, tập trung thông số và hiệu năng',
  informational: 'biên tập viên cung cấp thông tin khách quan, rõ ràng',
};

// Cấu trúc outline cho từng loại review
const STRUCTURE_OUTLINES: Record<string, string> = {
  full: `
## Cấu trúc bài viết bắt buộc theo thứ tự:
1. **Giới thiệu thương hiệu & sản phẩm** — nguồn gốc, thương hiệu, vị trí trên thị trường
2. **Tính năng nổi bật** — liệt kê và phân tích các tính năng chính bằng số liệu cụ thể
3. **Kinh nghiệm sử dụng thực tế** — cảm nhận khi dùng, ai phù hợp, tình huống dùng
4. **Ưu điểm và nhược điểm** — thẳng thắn, cụ thể, có số liệu
5. **Lời khuyên & kết luận** — nên mua không, phù hợp với ai, CTA cụ thể`.trim(),

  focused: `
## Cấu trúc bài viết bắt buộc theo thứ tự:
1. **Giới thiệu nhanh** — tên sản phẩm, mục đích, đối tượng phù hợp
2. **Tính năng chi tiết** — phân tích từng tính năng với số liệu cụ thể
3. **Ưu điểm** — liệt kê điểm mạnh có bằng chứng
4. **Nhược điểm** — liệt kê điểm yếu thẳng thắn
5. **Kết luận** — có nên mua không và tại sao`.trim(),
};

export function buildReviewPrompt(config: ReviewConfig, brandPrompt: string, forbiddenList: string[]): string {
  const styleLabel   = STYLE_LABELS[config.reviewStyle]  ?? STYLE_LABELS.expert;
  const structureOut = STRUCTURE_OUTLINES[config.reviewStructure] ?? STRUCTURE_OUTLINES.full;
  const forbidden    = forbiddenList.join(', ');

  const affiliateSection = config.affiliateLink
    ? `\n## Link mua hàng\nChèn link này 1–2 lần vào bài ở vị trí tự nhiên: ${config.affiliateLink}\nDùng anchor text gắn liền với keyword hoặc tên sản phẩm, KHÔNG dùng "bấm vào đây".`
    : '';

  return `
Bạn là ${styleLabel}, đang viết bài đánh giá sản phẩm SEO cho website tiếng ${config.language}.

${brandPrompt}

## Thông tin sản phẩm cần đánh giá
- Tên sản phẩm: ${config.productName}
- Từ khóa SEO chính: ${config.keyword}
- Ngôn ngữ: ${config.language}

## Dữ liệu sản phẩm
${config.productInfo}
${affiliateSection}

${structureOut}

## Quy tắc viết
- Chỉ trả về HTML hoàn chỉnh trong một thẻ <article>.
- Có đúng 1 thẻ <h1> (tiêu đề bài viết), các mục dùng <h2>, tiểu mục dùng <h3>.
- Từ khóa "${config.keyword}" xuất hiện tự nhiên trong h1, ít nhất 1 h2, và rải đều trong bài. Density 1.0–1.5%.
- Dùng <ul><li> để liệt kê ưu/nhược điểm — KHÔNG viết dạng đoạn văn dài.
- Số liệu cụ thể (mm, kg, giá tiền, thời gian, %...) thay mọi tính từ mơ hồ.
- Không dùng các từ/cụm: ${forbidden}
- Câu ngắn xen câu dài (nhịp 6–18 từ), không 5 câu liên tiếp cùng độ dài.
- Mở bài KHÔNG bắt đầu bằng "Trong cuộc sống hiện đại..." hay tóm tắt keyword.
- CTA cuối bài: cụ thể, thực tế — KHÔNG dùng "Liên hệ ngay để được tư vấn".
- Không thêm CSS, JavaScript, markdown fence hay lời giải thích ngoài bài.

Chỉ trả HTML.
`.trim();
}
```

---

## 7. API Route — Scrape — `web/app/api/danh-gia-san-pham/scrape/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { scrapeProductUrl } from '@/lib/product-scraper/scraper';
import { scrapeRequestSchema } from '@/lib/product-scraper/types'; // hoặc schema.ts
// import { z } from 'zod'; // nếu tách schema ra file riêng

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const rawBody = await request.json();
    const parsed  = scrapeRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'URL không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { url } = parsed.data;
    console.log(`[product-scraper] Scraping: ${url}`);

    const data = await scrapeProductUrl(url);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể crawl URL';
    console.error('[product-scraper] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
```

---

## 8. API Route — Stream — `web/app/api/danh-gia-san-pham/stream/route.ts`

**Pattern:** Copy từ `tinh-gon/stream/route.ts`, điều chỉnh cho review.

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildReviewPrompt } from '@/lib/product-scraper/prompt';
import { streamRequestSchema } from '@/lib/product-scraper/types'; // hoặc schema.ts
import { countWords, computeKeywordDensity, sanitizeHtmlArticle, buildMetaDescription } from '@/lib/tinh-gon/text';
import { buildPlainTextFromHtml } from '@/lib/tinh-gon/persistence';
import type { ReviewConfig } from '@/lib/product-scraper/types';

export const runtime = 'nodejs';

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function generateHtml({
  prompt,
  modelId,
  onChunk,
}: {
  prompt: string;
  modelId: string;
  onChunk: (chunk: string) => void;
}): Promise<string> {
  const model = buildTinhGonModel(modelId);
  try {
    const stream = await model.generateContentStream(prompt);
    let output = '';
    for await (const chunk of stream) {
      const text = chunk.text();
      if (!text) continue;
      output += text;
      onChunk(text);
    }
    return output;
  } catch {
    // Fallback về non-streaming nếu model không support
    const result = await model.generateContent(prompt);
    const output = result.response.text();
    onChunk(output);
    return output;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user     = await requireAuth();
    const rawBody  = await request.json();
    const parsed   = streamRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload không hợp lệ', issues: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { articleId, runId, config } = parsed.data;

    // Kiểm tra article tồn tại và thuộc về user
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
          // Cập nhật trạng thái WRITING
          await prisma.article.update({
            where: { id: articleId },
            data: { status: 'WRITING', aiProvider: config.model },
          });

          send({ type: 'step', step: 'preparing', label: '📦 Đang chuẩn bị dữ liệu sản phẩm...' });

          // Load từ cấm từ DB (fallback về hardcode nếu DB rỗng)
          const dbForbiddenConfig = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true },
            orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(
            dbForbiddenConfig?.items ?? [],
            config.brandConfig?.forbiddenExtra,
          );

          const brandPrompt = await buildBrandPrompt(config.brandConfig);

          send({ type: 'step_done', step: 'preparing' });
          send({ type: 'step', step: 'writing', label: '✍️ AI đang viết bài đánh giá...' });

          const prompt    = buildReviewPrompt(config, brandPrompt, forbiddenList);
          const rawOutput = await generateHtml({
            prompt,
            modelId: config.model,
            onChunk: (chunk) => send({ type: 'chunk', text: chunk }),
          });

          send({ type: 'step_done', step: 'writing' });
          send({ type: 'step', step: 'scoring', label: '📊 Đang chấm điểm chất lượng...' });

          // Xử lý output
          const html            = sanitizeHtmlArticle(rawOutput, config.productName);
          const plainText       = buildPlainTextFromHtml(html);
          const wordCount       = countWords(html);
          const keywordDensity  = computeKeywordDensity(html, config.keyword);
          const humanness       = analyzeHumanness(html, forbiddenList);
          const metaDescription = buildMetaDescription(config.productName, config.keyword);

          // Lưu vào DB
          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle:     config.productName,
              htmlContent:       html,
              plainText,
              wordCount,
              metaDescription,
              humannessScore:    humanness.score,
              aiDecision:        humanness.decision,
              seoChecks:         { keywordDensity } as any,
              scoreBreakdown:    { humanness, keywordDensity } as any,
              status:            'WRITTEN',
            },
          });

          send({
            type: 'done',
            data: {
              runId,
              html,
              title:             config.productName,
              metaDescription,
              wordCount,
              keywordDensity,
              humannessScore:    humanness.score,
              humannessDecision: humanness.decision,
            },
          });
        } catch (error) {
          await prisma.article.update({
            where: { id: articleId },
            data: { status: 'DRAFT' },
          }).catch(() => null);

          const message = error instanceof Error ? error.message : 'Không thể tạo bài đánh giá';
          send({ type: 'error', message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':    'text/event-stream',
        'Cache-Control':   'no-cache',
        'Connection':      'keep-alive',
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

## 9. Page Step 1 — `web/app/viet-danh-gia-san-pham/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { prisma } from '@/lib/prisma'; // KHÔNG dùng ở client — chỉ gọi qua API
import type { ReviewConfig, ReviewStructure, ReviewStyle, ScrapeResponse } from '@/lib/product-scraper/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const REVIEW_STRUCTURES: Array<{ value: ReviewStructure; label: string; desc: string }> = [
  {
    value: 'full',
    label: 'Đầy đủ',
    desc:  'Thương hiệu – Tính năng – Kinh nghiệm sử dụng – Ưu & Nhược điểm – Lời khuyên',
  },
  {
    value: 'focused',
    label: 'Tập trung',
    desc:  'Tập trung vào tính năng – Ưu điểm và nhược điểm của sản phẩm',
  },
];

const REVIEW_STYLES: Array<{ value: ReviewStyle; icon: string; label: string }> = [
  { value: 'expert',        icon: '🎓', label: 'Chuyên gia' },
  { value: 'user',          icon: '👤', label: 'Người dùng thực' },
  { value: 'friendly',      icon: '😊', label: 'Thân thiện' },
  { value: 'fun',           icon: '😄', label: 'Vui vẻ' },
  { value: 'technical',     icon: '🔧', label: 'Kỹ thuật' },
  { value: 'informational', icon: '📋', label: 'Cung cấp thông tin' },
];

const AI_MODELS = [
  { id: 'gemini-flash', label: 'Gemini Flash', icon: '✨', sub: 'Nhanh · Miễn phí' },
  { id: 'gpt-4o',       label: 'GPT-4o',       icon: '🤖', sub: 'Cần OpenAI key' },
  { id: 'grok',         label: 'Grok',          icon: '⚡', sub: 'Cần xAI key' },
  { id: 'claude',       label: 'Claude',        icon: '🧠', sub: 'Cần Anthropic key' },
];

const DEFAULT_CONFIG: ReviewConfig = {
  productUrl:      '',
  productName:     '',
  productInfo:     '',
  keyword:         '',
  affiliateLink:   '',
  reviewStructure: 'full',
  reviewStyle:     'expert',
  language:        'Vietnamese',
  model:           'gemini-flash',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VietDanhGiaSanPhamPage() {
  const router = useRouter();
  const [config,    setConfig]    = useState<ReviewConfig>(DEFAULT_CONFIG);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [scraping,  setScraping]  = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'manual'>('url');

  useEffect(() => {
    document.title = 'Viết Đánh Giá Sản Phẩm - Content Agent';
  }, []);

  // ── Scrape product URL ──────────────────────────────────────────────────────
  async function handleScrape() {
    if (!config.productUrl?.trim()) return;
    setScraping(true);
    setScrapeMsg('');
    setError('');

    try {
      const res  = await fetch('/api/danh-gia-san-pham/scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: config.productUrl }),
      });
      const data = (await res.json()) as ScrapeResponse;

      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Không thể thu thập thông tin sản phẩm');
      }

      // Fill form với data crawl được
      setConfig((prev) => ({
        ...prev,
        productName: data.data!.name || prev.productName,
        productInfo: data.data!.info || prev.productInfo,
      }));
      setScrapeMsg(`✅ Thu thập thành công: ${data.data.name?.slice(0, 60) || 'sản phẩm'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thu thập');
      setScrapeMsg('');
    } finally {
      setScraping(false);
    }
  }

  // ── Submit → tạo article draft → redirect sang generate ───────────────────
  async function handleNext() {
    const keyword = config.keyword.trim();
    const name    = config.productName.trim();
    const info    = config.productInfo.trim();

    if (!keyword) { setError('Vui lòng nhập từ khóa'); return; }
    if (!name)    { setError('Vui lòng nhập tên sản phẩm'); return; }
    if (!info)    { setError('Vui lòng nhập hoặc thu thập thông tin sản phẩm'); return; }

    setError('');
    setLoading(true);

    try {
      // Tạo article draft trong DB trước, lấy articleId + runId
      const res  = await fetch('/api/danh-gia-san-pham/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ config: { ...config, keyword, productName: name, productInfo: info } }),
      });
      const data = (await res.json()) as { articleId?: string; runId?: string; error?: string };

      if (!res.ok || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể khởi tạo bài viết');
      }

      // Lưu vào sessionStorage để generate page dùng
      sessionStorage.setItem('pr_config',     JSON.stringify({ ...config, keyword, productName: name, productInfo: info }));
      sessionStorage.setItem('pr_article_id', data.articleId);
      sessionStorage.setItem('pr_run_id',     data.runId);
      sessionStorage.removeItem('pr_result');

      router.push('/viet-danh-gia-san-pham/generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi khởi tạo');
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Viết đánh giá sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-1">Nhập URL sản phẩm hoặc thông tin thủ công — AI viết bài review SEO chuẩn</p>
        </div>

        {/* ── Product Input ── */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('url')}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${inputMode === 'url' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              🔗 Link sản phẩm
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${inputMode === 'manual' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              ✏️ Nhập thủ công
            </button>
          </div>

          {inputMode === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                URL sản phẩm
                <span className="text-xs text-gray-400 ml-2">Shopee, Lazada, Amazon, Etsy, Alibaba, WooCommerce...</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={config.productUrl ?? ''}
                  onChange={(e) => setConfig((p) => ({ ...p, productUrl: e.target.value }))}
                  placeholder="https://shopee.vn/product/..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleScrape}
                  disabled={!config.productUrl?.trim() || scraping}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {scraping ? '⏳ Đang thu thập...' : '📥 Thu Thập'}
                </button>
              </div>
              {scrapeMsg && <p className="text-xs text-green-600 mt-1.5">{scrapeMsg}</p>}
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.productName}
              onChange={(e) => setConfig((p) => ({ ...p, productName: e.target.value }))}
              placeholder="Ví dụ: Giường Sắt Hộp Minh Quân 1m6 - Khung 1.4mm"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Product Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Thông tin sản phẩm <span className="text-red-500">*</span>
            </label>
            <textarea
              value={config.productInfo}
              onChange={(e) => setConfig((p) => ({ ...p, productInfo: e.target.value }))}
              placeholder="Dán thông số kỹ thuật, mô tả, tính năng... hoặc bấm Thu Thập từ URL"
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Keyword + Affiliate Link */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Từ khóa SEO <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.keyword}
                onChange={(e) => setConfig((p) => ({ ...p, keyword: e.target.value }))}
                placeholder="Ví dụ: giường sắt hộp 1m6"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Link mua hàng / Affiliate
                <span className="text-xs text-gray-400 ml-1">(tuỳ chọn)</span>
              </label>
              <input
                type="url"
                value={config.affiliateLink ?? ''}
                onChange={(e) => setConfig((p) => ({ ...p, affiliateLink: e.target.value }))}
                placeholder="https://shopee.vn/... — AI sẽ chèn 1–2 lần vào bài"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── Review Structure ── */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Cấu trúc bài review</label>
          <div className="space-y-2">
            {REVIEW_STRUCTURES.map((s) => (
              <button
                key={s.value}
                onClick={() => setConfig((p) => ({ ...p, reviewStructure: s.value }))}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  config.reviewStructure === s.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="text-sm font-medium text-gray-800">{s.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Review Style ── */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Phong cách viết</label>
          <div className="grid grid-cols-3 gap-2">
            {REVIEW_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setConfig((p) => ({ ...p, reviewStyle: s.value }))}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all ${
                  config.reviewStyle === s.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-600'
                }`}
              >
                <span className="text-xl">{s.icon}</span>
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Language + Model ── */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
            <select
              value={config.language}
              onChange={(e) => setConfig((p) => ({ ...p, language: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Vietnamese">🇻🇳 Tiếng Việt</option>
              <option value="English">🇬🇧 English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
            <div className="grid grid-cols-4 gap-2">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setConfig((p) => ({ ...p, model: m.id }))}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all text-center ${
                    config.model === m.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 text-gray-600'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-xs font-semibold">{m.label}</span>
                  <span className="text-xs text-gray-400 leading-tight">{m.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Error + Submit ── */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">Pipeline sẽ viết bài trong khoảng 15–30 giây.</p>
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              {loading ? 'Đang khởi động...' : 'Viết ngay →'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
```

---

## 10. API Route — Start (tạo Article draft) — `web/app/api/danh-gia-san-pham/start/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { reviewConfigSchema } from '@/lib/product-scraper/types';
import { slugify } from '@/lib/tinh-gon/text';

export const runtime = 'nodejs';

function createRunId(keyword: string): string {
  const slug = slugify(keyword).slice(0, 40) || 'review';
  return `${slug}-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const user     = await requireAuth();
    const rawBody  = await request.json();
    const parsed   = reviewConfigSchema.safeParse(rawBody.config);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Config không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const config  = parsed.data;
    const runId   = createRunId(config.keyword);

    const article = await prisma.article.create({
      data: {
        userId:      user.userId,
        runId,
        status:      'DRAFT',
        keyword:     config.keyword,
        language:    config.language,
        contentType: 'product_review',  // ← phân biệt với tinh_gon và keyword_write
        targetLength: 1500,              // review trung bình 1000–1800 từ
        aiProvider:  config.model,
        brandConfig: config.brandConfig as any,
        outline:     JSON.stringify({   // lưu config vào outline field (tái sử dụng schema)
          flow:   'product_review',
          config,
        }),
        selectedTitle: config.productName,
        htmlContent:   '',
        competitorUrls: [],
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

## 11. Page Step 2 — `web/app/viet-danh-gia-san-pham/generate/page.tsx`

**Pattern:** Copy từ `viet-tinh-gon/generate/page.tsx`.  
Chỉ cần điều chỉnh:
1. Load config từ `sessionStorage` keys `pr_config`, `pr_article_id`, `pr_run_id`
2. Gọi `POST /api/danh-gia-san-pham/stream` thay vì `/api/tinh-gon/stream`
3. Hiển thị thêm thông tin sản phẩm (tên, affiliate link) nếu cần

**Skeleton:**

```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReviewConfig, ReviewStreamEvent } from '@/lib/product-scraper/types';

export default function VietDanhGiaSanPhamGeneratePage() {
  const router     = useRouter();
  const [config,     setConfig]     = useState<ReviewConfig | null>(null);
  const [articleId,  setArticleId]  = useState('');
  const [runId,      setRunId]      = useState('');
  const [streaming,  setStreaming]  = useState(false);
  const [htmlBuffer, setHtmlBuffer] = useState('');
  const [result,     setResult]     = useState<ReviewStreamEvent['data'] | null>(null);
  const [error,      setError]      = useState('');
  const [steps,      setSteps]      = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.title = 'Viết Đánh Giá - Content Agent';
    const storedConfig    = sessionStorage.getItem('pr_config');
    const storedArticleId = sessionStorage.getItem('pr_article_id');
    const storedRunId     = sessionStorage.getItem('pr_run_id');

    if (!storedConfig || !storedArticleId || !storedRunId) {
      router.replace('/viet-danh-gia-san-pham');
      return;
    }

    try {
      setConfig(JSON.parse(storedConfig) as ReviewConfig);
      setArticleId(storedArticleId);
      setRunId(storedRunId);
    } catch {
      router.replace('/viet-danh-gia-san-pham');
    }
  }, [router]);

  useEffect(() => {
    if (config && articleId && runId && !streaming && !result) {
      void startStreaming();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, articleId, runId]);

  async function startStreaming() {
    if (!config || !articleId || !runId) return;
    setStreaming(true);
    setHtmlBuffer('');
    setError('');

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/danh-gia-san-pham/stream', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ articleId, runId, config }),
        signal:  abortRef.current.signal,
      });

      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as ReviewStreamEvent;
            if (event.type === 'step')      setSteps((p) => [...p, event.label ?? '']);
            if (event.type === 'chunk')     setHtmlBuffer((p) => p + (event.text ?? ''));
            if (event.type === 'done')      { setResult(event.data ?? null); sessionStorage.setItem('pr_result', JSON.stringify(event.data)); }
            if (event.type === 'error')     setError(event.message ?? 'Lỗi không xác định');
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Lỗi kết nối');
      }
    } finally {
      setStreaming(false);
    }
  }

  // Render: loading spinner → streaming HTML → result panel
  // Tái sử dụng các components từ viet-tinh-gon/generate nếu được
  return (
    <div className="h-full p-6 overflow-y-auto">
      {/* ... implement giống viet-tinh-gon/generate/page.tsx ... */}
      {/* Hiển thị: steps list, streaming HTML preview, result scorecard */}
    </div>
  );
}
```

> **Lưu ý:** Copy toàn bộ phần result display (Humanness score, keyword density, SEO checks, save/publish buttons) từ `viet-tinh-gon/generate/page.tsx` — chỉ đổi sessionStorage keys và API endpoint.

---

## 12. Thêm vào Sidebar — `web/components/Sidebar.tsx`

Thêm vào group `Viết Bài`:

```typescript
// Trong navGroups[0].items (group 'Viết Bài'):
{ label: 'Đánh Giá Sản Phẩm', href: '/viet-danh-gia-san-pham' },
```

---

## 13. Thứ tự implementation — 12 bước

| Bước | File | Ưu tiên |
|------|------|---------|
| 1 | `lib/product-scraper/types.ts` + schema | 🔴 Bắt buộc trước |
| 2 | `lib/product-scraper/scraper.ts` | 🔴 |
| 3 | `lib/product-scraper/prompt.ts` | 🔴 |
| 4 | `app/api/danh-gia-san-pham/start/route.ts` | 🔴 |
| 5 | `app/api/danh-gia-san-pham/scrape/route.ts` | 🔴 |
| 6 | `app/api/danh-gia-san-pham/stream/route.ts` | 🔴 |
| 7 | `app/viet-danh-gia-san-pham/page.tsx` | 🟡 UI step 1 |
| 8 | `app/viet-danh-gia-san-pham/generate/page.tsx` | 🟡 UI step 2 |
| 9 | `components/Sidebar.tsx` | 🟢 Thêm link |
| 10 | Test scrape URL thật (Shopee/Lazada) | 🟡 QA |
| 11 | Test toàn flow end-to-end | 🟡 QA |
| 12 | Test edge case: URL không crawl được → fallback manual | 🟢 |

---

## 14. Reuse pattern — Không viết lại từ đầu

| Cần | Lấy từ | Import path |
|-----|--------|-------------|
| AI model builder | `buildTinhGonModel` | `@/lib/tinh-gon/model` |
| Brand prompt | `buildBrandPrompt` | `@/app/api/pipeline/_context` |
| Forbidden words từ DB | `buildForbiddenList` | `@/lib/tinh-gon/forbidden` |
| Humanness scoring | `analyzeHumanness` | `@/lib/tinh-gon/humanness` |
| HTML sanitize | `sanitizeHtmlArticle` | `@/lib/tinh-gon/text` |
| Word count | `countWords` | `@/lib/tinh-gon/text` |
| Keyword density | `computeKeywordDensity` | `@/lib/tinh-gon/text` |
| Meta description | `buildMetaDescription` | `@/lib/tinh-gon/text` |
| Plain text từ HTML | `buildPlainTextFromHtml` | `@/lib/tinh-gon/persistence` |
| URL crawl base | `crawlUrl` | `@/lib/google-search/extract` |
| DB Article model | `prisma.article` | `@/lib/prisma` |
| SSE pattern | Copy từ | `tinh-gon/stream/route.ts` |
| Generate page UI | Copy/adapt từ | `viet-tinh-gon/generate/page.tsx` |

---

## 15. Xử lý lỗi scraping — quan trọng

Scraping sẽ thất bại với nhiều site (Shopee dùng JS render, Lazada có bot protection...).  
**Chiến lược fallback bắt buộc:**

```
User nhập URL → Thu Thập → 
  ├─ Thành công → fill form tự động, user review lại trước khi submit
  ├─ Thất bại (403/timeout/JS render) → hiển thị error rõ ràng
  │                                    → hướng user sang tab "Nhập thủ công"
  └─ Không hỗ trợ domain → thông báo trước khi crawl
```

**Error messages cụ thể:**
- HTTP 403 → "Trang này không cho phép thu thập tự động. Vui lòng copy thông tin sản phẩm thủ công."
- Timeout > 12s → "Thu thập quá lâu. Vui lòng nhập thông tin thủ công."
- URL không hợp lệ → "URL không hợp lệ, kiểm tra lại định dạng."

---

## 16. Ước tính thời gian generate

| Giai đoạn | Thời gian |
|-----------|-----------|
| Chuẩn bị (DB + brand prompt) | ~0.5s |
| AI viết bài (gemini-flash) | ~8–15s |
| Scoring + lưu DB | ~0.5s |
| **Tổng** | **~10–16s** |

*(Không có Google Search bước này — thông tin sản phẩm đã có từ scrape/manual input)*

---

## 17. Checklist QA trước khi merge

- [ ] Scrape URL Shopee thật → fill đúng form
- [ ] Nhập tay → submit không cần scrape
- [ ] Affiliate link → xuất hiện trong HTML bài viết (1–2 lần, anchor text tự nhiên)
- [ ] Review structure `full` → có đủ 5 mục H2
- [ ] Review structure `focused` → có đủ 4 mục H2
- [ ] Từ cấm từ DB không xuất hiện trong output
- [ ] Humanness score hiển thị đúng sau generate
- [ ] Article lưu vào DB với `contentType = 'product_review'`
- [ ] Scrape URL thất bại → hiển thị error, không crash
- [ ] Reload generate page → redirect về step 1 (không có sessionStorage)
- [ ] Link Sidebar hoạt động

---

## 18. Ghi chú kỹ thuật

**Vì sao 2 bước thay vì 3 (như viet-tinh-gon)?**  
Review sản phẩm có cấu trúc outline cố định (2 mẫu). Không cần bước outline riêng — user chọn cấu trúc ngay ở step 1, AI follow theo.

**`contentType = 'product_review'` trong Article model:**  
Schema Prisma đã có `contentType String` — chỉ cần set giá trị đúng. Dashboard article list có thể filter theo contentType để phân loại bài review riêng.

**Scraping vs Google Search:**  
- Scraping lấy thông tin sản phẩm cụ thể (giá, thông số, ảnh) từ trang bán hàng
- Google Search (trong tinh-gon) lấy context thị trường, đối thủ, SERP
- Hai tính năng bổ trợ nhau, không thay thế nhau

**Affiliate link injection:**  
Để vào prompt: AI sẽ tự chèn 1–2 lần. Không cần xử lý post-processing — chỉ cần instruction rõ trong prompt (đã có trong `buildReviewPrompt`).
