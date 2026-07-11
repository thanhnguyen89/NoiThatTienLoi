# VIET-TOPLIST-IMPLEMENTATION.md
## Hướng dẫn code — Viết Toplist theo từ khóa

> Phân tích từ: https://aiktp.com/vi/write-step-1-toplist  
> Chuẩn: `PAGE-STANDARD.md` · `DEV-PAGE-ROUTING-NOTE.md` · `DEV-CODING-ORDER.md`  
> **Nhóm A — P1** (2 route: Config → Generate)  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API

---

## 0. Tổng quan — Nhóm A, P1

| Mục | Giá trị |
|-----|---------|
| Nhóm | **A** — Viết Bài Chính (tạo Article, lưu DB, có Editor + Publish WP) |
| Pattern | **P1** — 2 route chuẩn |
| Config route | `/viet-toplist` |
| Generate route | `/viet-toplist/generate` |
| sessionStorage | `vtl_config` + `vtl_brand_info` |
| contentType | `viet_toplist:top{N}` |
| API endpoints | `suggest-keywords` · `start` · `stream` |

### Điểm đặc thù của Toplist (khác các P1 khác)

| # | Điểm | Ghi chú |
|---|------|---------|
| 1 | **AI viết N "mini-review" lồng trong 1 bài** | Prompt phải cực rõ về cấu trúc lặp lại |
| 2 | **Top N selector** 5–15 | `targetLength` tính động: `N × wordsPerItem + 300` |
| 3 | **Khối 4 thay thế** | Không dùng outline 3-mode chuẩn — thay bằng: Top N + Cấu trúc item + Estimate |
| 4 | **Secondary keywords** comma-separated | AI dùng để đặt tên item |
| 5 | **Image injection** là post-process sau generate | Không block AI stream |
| 6 | **Cannibalization check** onBlur keyword | Debounce 800ms — chuẩn P1 |
| 7 | **`<BrandSection />`** | lsKey = `vtl_brand_info` |

---

## 1. So sánh aiktp vs Local

| # | Điểm | aiktp | Local |
|---|------|-------|-------|
| 1 | Transport | WebSocket | **SSE** (ReadableStream + controller.enqueue) |
| 2 | 8 Khối Config | Không theo chuẩn | **Có — đầy đủ 8 khối** |
| 3 | Model selector | Dropdown riêng | **`<ModelPicker />` component** |
| 4 | Brand config | Không | **`<BrandSection lsKey="vtl_brand_info" />`** |
| 5 | SEO Advanced | Inline options | **`<SeoAdvancedBlock />`** (collapsed) |
| 6 | Language | 70+ | **SUPPORTED_LANGUAGES từ lib/shared** |
| 7 | Top N | 5–15 | **5–15** |
| 8 | Structure | 5 presets | **5 presets** |
| 9 | Tone | 5 presets | **5 presets** |
| 10 | Data source | Google + AI only | **Google + AI only** |
| 11 | Image options | 4 loại | **IMAGE_OPTIONS từ lib/shared** |
| 12 | Secondary KWs | Có + gợi ý | **Có + AI gợi ý** |
| 13 | Auto bold | Có (SeoAdvanced) | **Có — trong SeoAdvancedBlock** |
| 14 | Cannibalization | Không | **Có — debounce 800ms** |
| 15 | Lưu DB | Có | **Có — Article model** |

---

## 2. Kiến trúc file

### Route structure (P1)

```
/viet-toplist           ← Config page (8 khối + Submit)
/viet-toplist/generate  ← Generate page (Editor + 4 tabs)
```

### Cấu trúc file

```
web/
├── app/
│   ├── viet-toplist/
│   │   ├── page.tsx                      ← Config: 8 khối + Submit
│   │   └── generate/
│   │       └── page.tsx                  ← Generate: Editor + 4 tabs
│   └── api/
│       └── viet-toplist/
│           ├── suggest-keywords/
│           │   └── route.ts              ← AI gợi ý từ khoá phụ
│           ├── start/
│           │   └── route.ts              ← Tạo Article + optional SERP fetch
│           └── stream/
│               └── route.ts              ← SSE stream AI
└── lib/
    └── viet-toplist/
        ├── types.ts
        ├── options.ts                    ← TOPLIST_STRUCTURES, TOPLIST_TONES, computeToplistTargetLength
        └── image-injector.ts             ← Yandex image post-process
```

### Shared components — PHẢI dùng, không tự viết

| Component | Khối | Import |
|-----------|------|--------|
| `<ModelPicker />` | Khối 6 | `@/components/ModelPicker` |
| `<BrandSection lsKey="vtl_brand_info" />` | Khối 7 | `@/components/BrandSection` |
| `<SeoAdvancedBlock />` | Khối 8 | `@/components/SeoAdvancedBlock` |

### Shared lib — tái sử dụng, không tạo mới

| File | Dùng để |
|------|---------|
| `lib/shared/options.ts` | `SUPPORTED_LANGUAGES`, `IMAGE_OPTIONS` |
| `lib/shared/seo-checks.ts` | `computeSeoChecks()` — 21 checks trong generate page |
| `lib/shared/generate-tabs.ts` | `GENERATE_TABS`, `AI_EDIT_COMMANDS` |
| `hooks/useGenerateStream.ts` | SSE hook trong generate page |
| `lib/tinh-gon/model.ts` | `buildTinhGonModel()` |
| `lib/tinh-gon/humanness.ts` | `analyzeHumanness()` |
| `lib/tinh-gon/text.ts` | `countWords()`, `computeKeywordDensity()`, `sanitizeHtmlArticle()` |
| `lib/tinh-gon/forbidden.ts` | `buildForbiddenList()` |
| `lib/google-search/search.ts` | `fetchGoogleSearchData()` |
| `lib/google-search/prompt-inject.ts` | `buildDataBlock()` |
| `app/api/pipeline/_context.ts` | `buildBrandPrompt()` |

---

## 3. Types — `web/lib/viet-toplist/types.ts`

```typescript
import type { TinhGonBrandConfig, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

export type ToplistTopN = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/**
 * Cấu trúc mỗi item trong toplist.
 * intro_features_pros_cons là default phổ biến nhất.
 */
export type ToplistStructure =
  | 'auto'
  | 'intro_features'
  | 'intro_features_pros_cons'
  | 'intro_features_faq'
  | 'intro_features_pros_cons_faq';

export type ToplistTone =
  | 'formal_seo'
  | 'expert_seo'
  | 'friendly_ai_bypass'
  | 'humorous_ai_bypass'
  | 'technical_seo';

export type ToplistDataSource = 'google_search' | 'ai_only';

export interface ToplistConfig {
  // Khối 1
  keyword:           string;
  secondaryKeywords: string[];
  dataSource:        ToplistDataSource;
  // Khối 2 (Image) — dùng giá trị từ IMAGE_OPTIONS trong lib/shared
  imageOption:       'none' | 'yandex' | 'ai_generated' | 'shutterstock';
  // Khối 3
  language:          string;
  // Khối 4 (Toplist override)
  topN:              ToplistTopN;
  structure:         ToplistStructure;
  // Khối 5
  tone:              ToplistTone;
  // Khối 6
  modelId:           string;
  // Brand (Khối 7) — lưu riêng vào vtl_brand_info qua BrandSection
  // SEO Advanced (Khối 8) — lưu riêng qua SeoAdvancedBlock
}

export interface ToplistStartResponse {
  articleId: string;
  runId:     string;
  serpData?: string;
}

export interface ToplistStreamResult {
  runId:           string;
  html:            string;
  title:           string;
  metaDescription: string;
  wordCount:       number;
  keywordDensity:  number;
  humanness:       TinhGonHumannessResult;
  imagesInjected:  number;
}

export interface SuggestKeywordsResponse {
  keywords: string[];
}
```

---

## 4. Options — `web/lib/viet-toplist/options.ts`

```typescript
import type { ToplistStructure, ToplistTone, ToplistTopN } from './types';

export const TOPLIST_TOP_N_OPTIONS: ToplistTopN[] = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const TOPLIST_STRUCTURES: Array<{
  value:        ToplistStructure;
  label:        string;
  note:         string;
  wordsPerItem: number;
}> = [
  {
    value:        'auto',
    label:        'AI tự quyết định',
    note:         'AI chọn cấu trúc phù hợp với từng item.',
    wordsPerItem: 350,
  },
  {
    value:        'intro_features',
    label:        'Giới thiệu + Tính năng',
    note:         'Ngắn gọn — phù hợp Top 10+ khi không muốn bài quá dài.',
    wordsPerItem: 200,
  },
  {
    value:        'intro_features_pros_cons',
    label:        'Giới thiệu + Tính năng + Ưu/Nhược + Trải nghiệm',
    note:         'Cấu trúc chuẩn — dùng nhiều nhất.',
    wordsPerItem: 350,
  },
  {
    value:        'intro_features_faq',
    label:        'Giới thiệu + Tính năng + FAQ cuối bài',
    note:         'Thêm FAQ cuối bài — tốt cho SEO long-tail.',
    wordsPerItem: 260,
  },
  {
    value:        'intro_features_pros_cons_faq',
    label:        'Full: Giới thiệu + Tính năng + Ưu/Nhược + Trải nghiệm + FAQ',
    note:         'Đầy đủ nhất — phù hợp Top 5–7, bài chất lượng cao.',
    wordsPerItem: 450,
  },
];

export const TOPLIST_TONES: Array<{
  value: ToplistTone;
  label: string;
  note:  string;
}> = [
  { value: 'formal_seo',         label: 'Trang trọng · Nhã nhặn · SEO',   note: 'Nghiêm túc, có chiều sâu. Tối ưu ranking.' },
  { value: 'expert_seo',         label: 'Chuyên gia · Sâu sắc · SEO',     note: 'Phân tích kỹ, có số liệu, E-E-A-T cao.' },
  { value: 'friendly_ai_bypass', label: 'Thân thiện · Vui vẻ · Vượt AI',  note: 'Đọc tự nhiên, khó nhận diện bởi AI detector.' },
  { value: 'humorous_ai_bypass', label: 'Vui vẻ · Hài hước · Vượt AI',   note: 'Châm biếm nhẹ, cuốn hút, vượt kiểm tra AI.' },
  { value: 'technical_seo',      label: 'Kỹ thuật · Chính xác · SEO',     note: 'Thông số cụ thể, phù hợp nội dung kỹ thuật.' },
];

/** Tính target length dựa trên Top N và cấu trúc */
export function computeToplistTargetLength(
  topN:      ToplistTopN,
  structure: ToplistStructure,
): number {
  const info = TOPLIST_STRUCTURES.find((s) => s.value === structure);
  return topN * (info?.wordsPerItem ?? 350) + 300;  // +300: intro + outro
}
```

---

## 5. Image Injector — `web/lib/viet-toplist/image-injector.ts`

Post-process HTML sau khi AI generate: inject ảnh cho từng item.

```typescript
/** Trích xuất tên từng item từ HTML — mỗi item là <h2> đánh số: "1. Tên Item" */
export function extractToplistItemNames(html: string): string[] {
  const names: string[] = [];
  const regex = /<h2[^>]*>\s*\d+\.\s*([\s\S]*?)<\/h2>/gi;
  for (const match of html.matchAll(regex)) {
    const name = match[1].replace(/<[^>]+>/g, '').trim();
    if (name) names.push(name);
  }
  return names;
}

/** Fetch ảnh từ Yandex Image Search. Trả null nếu lỗi/timeout. */
export async function fetchYandexImage(query: string): Promise<string | null> {
  try {
    const q   = encodeURIComponent(query);
    const url = `https://yandex.com/images/search?text=${q}&itype=photo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m    = html.match(/"url"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    if (m) return m[1].replace(/\\u002F/g, '/');
    const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    return og?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Inject ảnh Yandex vào HTML: chèn <figure><img> sau mỗi <h2> item đánh số.
 * Song song với stagger 200ms để tránh rate limit.
 */
export async function injectYandexImages(
  html:    string,
  keyword: string,
): Promise<{ html: string; injectedCount: number }> {
  const itemNames = extractToplistItemNames(html);
  if (itemNames.length === 0) return { html, injectedCount: 0 };

  const imageUrls = await Promise.all(
    itemNames.map(async (name, i) => {
      await new Promise((r) => setTimeout(r, i * 200));
      return fetchYandexImage(`${keyword} ${name}`);
    }),
  );

  let injectedCount = 0;
  let result        = html;

  for (let i = itemNames.length - 1; i >= 0; i--) {
    const imgUrl = imageUrls[i];
    if (!imgUrl) continue;
    const escaped = itemNames[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const h2Re    = new RegExp(`(<h2[^>]*>\\s*${i + 1}\\.\\s*${escaped}[\\s\\S]*?<\\/h2>)`, 'i');
    const imgTag  = `<figure style="margin:0 0 16px 0"><img src="${imgUrl}" alt="${itemNames[i]}" loading="lazy" style="width:100%;max-width:640px;height:auto;border-radius:8px" /></figure>`;
    result        = result.replace(h2Re, `$1\n${imgTag}`);
    injectedCount++;
  }
  return { html: result, injectedCount };
}
```

> **Lưu ý:** Yandex đôi khi trả captcha. Luôn fallback về `null` — không block flow chính.

---

## 6. API: Suggest Keywords — `/api/viet-toplist/suggest-keywords/route.ts`

Không requireAuth — public endpoint (giống `suggest-keywords` của tinh-gon).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export const runtime = 'nodejs';

const schema = z.object({
  keyword:  z.string().min(1).max(200),
  topN:     z.number().min(5).max(15).default(10),
  language: z.string().default('Vietnamese'),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }
    const { keyword, topN, language } = parsed.data;
    const model  = buildTinhGonModel('gemini-flash');
    const prompt = `
Gợi ý ${topN} từ khoá phụ cho bài Toplist với từ khoá chính: "${keyword}"
Ngôn ngữ: ${language}

Mỗi từ khoá phụ là tên 1 item xuất hiện trong danh sách Top ${topN}.
Ví dụ nếu keyword là "giường sắt giá rẻ":
  → giường sắt 1m2 khung hộp, giường sắt 1m4 chân cao, giường sắt 2 tầng trẻ em...

Yêu cầu:
- Trả đúng ${topN} gợi ý
- Mỗi gợi ý trên 1 dòng, KHÔNG đánh số
- Cụ thể, phân biệt rõ, không trùng lặp
- Phù hợp search intent người mua
- Chỉ trả danh sách, không giải thích
`.trim();

    const result   = await model.generateContent(prompt);
    const keywords = result.response.text().trim()
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, topN);

    return NextResponse.json({ keywords });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

---

## 7. API: Start — `/api/viet-toplist/start/route.ts`

Tạo Article + optional SERP fetch sớm để tránh delay ở generate page.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import { createTinhGonRunId } from '@/lib/tinh-gon/persistence';
import { computeToplistTargetLength } from '@/lib/viet-toplist/options';

export const runtime = 'nodejs';

const schema = z.object({
  config: z.object({
    keyword:           z.string().min(1),
    secondaryKeywords: z.array(z.string()).default([]),
    topN:              z.number().min(5).max(15).default(10),
    structure:         z.string().default('intro_features_pros_cons'),
    tone:              z.string().default('formal_seo'),
    dataSource:        z.enum(['google_search', 'ai_only']).default('ai_only'),
    imageOption:       z.string().default('none'),
    language:          z.string().default('Vietnamese'),
    modelId:           z.string().default('gemini-flash'),
  }),
  brandConfig: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user   = await requireAuth();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { config, brandConfig } = parsed.data;
    const runId        = createTinhGonRunId(config.keyword);
    const targetLength = computeToplistTargetLength(config.topN as never, config.structure as never);

    // Fetch SERP sớm (non-blocking nếu lỗi)
    let serpData: string | undefined;
    if (config.dataSource === 'google_search') {
      try {
        const gData = await fetchGoogleSearchData(config.keyword, { num: 5, crawl: true, language: config.language });
        if (gData) serpData = buildDataBlock(gData);
      } catch { /* non-blocking */ }
    }

    const article = await prisma.article.create({
      data: {
        userId:            user.userId,
        runId,
        status:            'DRAFT',
        keyword:           config.keyword,
        language:          config.language,
        contentType:       `viet_toplist:top${config.topN}`,
        targetLength,
        aiProvider:        config.modelId,
        brandConfig:       (brandConfig ?? {}) as never,
        selectedTitle:     config.keyword,
        htmlContent:       '',
        competitorUrls:    [],
        secondaryKeywords: config.secondaryKeywords,
        outline: {
          flow:      'viet_toplist',
          stage:     'config',
          topN:      config.topN,
          structure: config.structure,
          tone:      config.tone,
          config,
          serpData:  serpData ?? null,
        },
      },
    });

    return NextResponse.json({
      articleId: article.id,
      runId,
      ...(serpData ? { serpData } : {}),
    });
  } catch (err) {
    const msg    = err instanceof Error ? err.message : 'Lỗi server';
    const status = msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
```

---

## 8. API: Stream — `/api/viet-toplist/stream/route.ts`

SSE stream — phần phức tạp nhất. Prompt guide AI viết đúng N items theo cấu trúc lặp lại.

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import { buildForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildMetaDescription, computeKeywordDensity, countWords, sanitizeHtmlArticle } from '@/lib/tinh-gon/text';
import { computeToplistTargetLength } from '@/lib/viet-toplist/options';
import { injectYandexImages } from '@/lib/viet-toplist/image-injector';

export const runtime = 'nodejs';

// ─── Structure instructions ──────────────────────────────────────────────────

const STRUCTURE_TEMPLATES: Record<string, string> = {
  auto: `Mỗi item theo cấu trúc AI tự quyết — nhưng phải nhất quán cho tất cả N items.`,

  intro_features: `
Mỗi item gồm đúng 2 phần:
  [H3] Giới thiệu ngắn — 2–3 câu về sản phẩm, điểm nổi bật chính.
  [H3] Tính năng đặc biệt — liệt kê 3–5 tính năng quan trọng nhất.`.trim(),

  intro_features_pros_cons: `
Mỗi item gồm đúng 4 phần:
  [H3] Giới thiệu — 2–3 câu tổng quan.
  [H3] Tính năng nổi bật — 3–5 tính năng chi tiết, có số liệu cụ thể.
  [H3] Ưu điểm & Nhược điểm — bullet list: 3 ưu, 2 nhược.
  [H3] Trải nghiệm thực tế — 2–3 câu nhận xét từ góc nhìn người dùng.`.trim(),

  intro_features_faq: `
Mỗi item gồm đúng 2 phần:
  [H3] Giới thiệu ngắn — 2–3 câu.
  [H3] Tính năng đặc biệt — 3–5 tính năng.
Sau tất cả N items, thêm:
  [H2] Câu hỏi thường gặp (FAQ) — 4–6 câu, mỗi câu trả lời 2–3 câu.`.trim(),

  intro_features_pros_cons_faq: `
Mỗi item gồm đúng 4 phần:
  [H3] Giới thiệu — 2–3 câu.
  [H3] Tính năng nổi bật — 3–5 tính năng có số liệu.
  [H3] Ưu điểm & Nhược điểm — 3 ưu, 2 nhược dạng bullet.
  [H3] Trải nghiệm thực tế — 2–3 câu.
Sau tất cả N items, thêm:
  [H2] Câu hỏi thường gặp (FAQ) — 4–6 câu, mỗi câu 2–3 câu trả lời.`.trim(),
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal_seo:         'Giọng trang trọng, nhã nhặn. Keyword xuất hiện tự nhiên đầu bài và mỗi item.',
  expert_seo:         'Giọng chuyên gia — có quan điểm, số liệu thực, phân tích sâu. E-E-A-T cao.',
  friendly_ai_bypass: 'Giọng thân thiện, ấm áp. Câu ngắn xen câu dài. Khó detect bởi AI checker.',
  humorous_ai_bypass: 'Giọng vui vẻ, hài hước nhẹ. Đọc cuốn. Vượt kiểm tra AI detector.',
  technical_seo:      'Giọng kỹ thuật — thông số cụ thể (mm, kg, giá), không tính từ rỗng.',
};

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildToplistPrompt(
  config:        { keyword: string; secondaryKeywords: string[]; topN: number; structure: string; tone: string; language: string },
  brandPrompt:   string,
  forbiddenList: string[],
  serpDataBlock: string,
): string {
  const structureInstruction = STRUCTURE_TEMPLATES[config.structure] ?? STRUCTURE_TEMPLATES.intro_features_pros_cons;
  const toneInstruction      = TONE_INSTRUCTIONS[config.tone]        ?? TONE_INSTRUCTIONS.formal_seo;
  const targetLength         = computeToplistTargetLength(config.topN as never, config.structure as never);
  const forbidden            = forbiddenList.join(', ');

  const itemHints = config.secondaryKeywords.length > 0
    ? `Gợi ý tên ${config.topN} item:\n${config.secondaryKeywords.slice(0, config.topN).map((kw, i) => `  ${i + 1}. ${kw}`).join('\n')}`
    : `AI tự đặt tên ${config.topN} item phù hợp nhất với keyword.`;

  return `
Bạn là Writer Agent chuyên viết bài Toplist SEO chất lượng cao.

${brandPrompt}

${serpDataBlock ? `${serpDataBlock}\n\n---\n` : ''}

## Thông tin bài viết
- Từ khoá chính: ${config.keyword}
- Ngôn ngữ: ${config.language}
- Số item: ${config.topN}
- Độ dài mục tiêu: ~${targetLength} từ

## ${itemHints}

## Cấu trúc bài (BẮT BUỘC)

### Mở bài
- H1: tiêu đề hấp dẫn, có keyword, có số (VD: "Top ${config.topN} [keyword] Tốt Nhất 2025")
- Đoạn mở bài: 3–5 câu tổng quan.

### ${config.topN} Items
Đánh số 1 đến ${config.topN}. Mỗi item:
- [H2] Số. Tên Item (VD: "1. Giường Sắt 1m2 MQ-01 — Tốt Nhất Cho Phòng Nhỏ")
${structureInstruction}

### Kết bài
3–4 câu tóm tắt tiêu chí chọn + CTA cụ thể.

## Tone: ${toneInstruction}

## Quy tắc output
- Chỉ trả HTML trong 1 thẻ <article>.
- Không thêm CSS, JS, markdown, lời giải thích ngoài thẻ <article>.
- KHÔNG dùng: ${forbidden}
- PHẢI viết đúng ${config.topN} items — không hơn, không kém.
- Phân bổ từ đều — mỗi item ít nhất ${Math.floor(targetLength / config.topN)} từ.
- Số liệu cụ thể (mm, kg, giá) thay tính từ chung chung.
`.trim();
}

// ─── SSE helper ──────────────────────────────────────────────────────────────

function sseEvent(ctrl: ReadableStreamDefaultController, data: object) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const streamSchema = z.object({
  articleId: z.string(),
  runId:     z.string(),
  config: z.object({
    keyword:           z.string().min(1),
    secondaryKeywords: z.array(z.string()).default([]),
    topN:              z.number().min(5).max(15),
    structure:         z.string(),
    tone:              z.string(),
    dataSource:        z.string(),
    imageOption:       z.string(),
    language:          z.string(),
    modelId:           z.string(),
  }),
  brandConfig: z.record(z.unknown()).optional(),
  serpData:    z.string().optional(),
});

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user   = await requireAuth();
    const parsed = streamSchema.safeParse(await request.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload không hợp lệ' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { articleId, runId, config, brandConfig, serpData: cachedSerpData } = parsed.data;

    const article = await prisma.article.findFirst({
      where: { id: articleId, runId, userId: user.userId, deletedAt: null },
    });
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => sseEvent(controller, data);
        try {
          // Forbidden words
          const dbForbidden = await prisma.aIConfig.findFirst({
            where: { type: 'FORBIDDEN_WORDS', isActive: true }, orderBy: { updatedAt: 'desc' },
          }).catch(() => null);
          const forbiddenList = buildForbiddenList(dbForbidden?.items ?? [], brandConfig?.forbiddenExtra as string);

          // SERP data
          let serpDataBlock = cachedSerpData ?? '';
          if (!serpDataBlock && config.dataSource === 'google_search') {
            send({ type: 'step', step: 'serp', label: '🔍 Đang lấy dữ liệu từ Google...' });
            try {
              const gData = await fetchGoogleSearchData(config.keyword, { num: 5, crawl: true, language: config.language });
              if (gData) {
                serpDataBlock = buildDataBlock(gData);
                send({ type: 'step_done', step: 'serp', label: `✅ Google: ${gData.items.length} kết quả` });
              }
            } catch {
              send({ type: 'step_done', step: 'serp', label: '⚠️ Không lấy được Google data — dùng AI only' });
            }
          }

          const brandPrompt = await buildBrandPrompt(brandConfig as never);
          const prompt      = buildToplistPrompt(config as never, brandPrompt, forbiddenList, serpDataBlock);
          const model       = buildTinhGonModel(config.modelId);

          send({ type: 'step', step: 'writing', label: `✍️ AI đang viết Top ${config.topN} ${config.keyword}...` });

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
            rawHtml      = result.response.text();
            send({ type: 'chunk', text: rawHtml });
          }

          send({ type: 'step_done', step: 'writing' });

          // Image injection
          let html = sanitizeHtmlArticle(rawHtml, config.keyword);
          let imagesInjected = 0;

          if (config.imageOption === 'yandex') {
            send({ type: 'step', step: 'images', label: '🖼️ Đang tìm ảnh từ Yandex...' });
            try {
              const injected = await injectYandexImages(html, config.keyword);
              html           = injected.html;
              imagesInjected = injected.injectedCount;
              send({ type: 'step_done', step: 'images', label: `✅ ${imagesInjected}/${config.topN} ảnh` });
            } catch {
              send({ type: 'step_done', step: 'images', label: '⚠️ Không inject được ảnh — tiếp tục' });
            }
          }

          send({ type: 'step', step: 'scoring', label: '📊 Đang chấm điểm...' });

          const titleMatch     = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title          = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : config.keyword;
          const wordCount      = countWords(html);
          const keywordDensity = computeKeywordDensity(html, config.keyword);
          const humanness      = analyzeHumanness(html, forbiddenList);
          const metaDesc       = buildMetaDescription(title, config.keyword);

          await prisma.article.update({
            where: { id: articleId },
            data: {
              selectedTitle:  title,
              htmlContent:    html,
              metaDescription: metaDesc,
              wordCount,
              status:         'WRITTEN',
              aiDecision:     humanness.decision,
              humannessScore: humanness.score,
              seoChecks:      { keywordDensity } as never,
              scoreBreakdown: { humanness, keywordDensity } as never,
              outline: {
                flow: 'viet_toplist', stage: 'generate',
                topN: config.topN, structure: config.structure, tone: config.tone, imagesInjected, config,
              },
            },
          });

          send({ type: 'step_done', step: 'scoring' });
          send({ type: 'done', data: { runId, html, title, metaDescription: metaDesc, wordCount, keywordDensity, humanness, imagesInjected } });

        } catch (err) {
          await prisma.article.update({ where: { id: articleId }, data: { status: 'DRAFT' } }).catch(() => null);
          send({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi stream' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
    });
  } catch (err) {
    const msg    = err instanceof Error ? err.message : 'Lỗi server';
    const status = msg === 'Unauthorized' ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });
  }
}
```

---

## 9. Config Page — `web/app/viet-toplist/page.tsx`

### 8 Khối Config — thứ tự bắt buộc

```
Khối 1 — Keyword chính + Secondary KWs (comma-sep) + AI Suggest + Data Source
Khối 2 — Image Option      ← IMAGE_OPTIONS từ lib/shared/options.ts
Khối 3 — Language          ← SUPPORTED_LANGUAGES từ lib/shared/options.ts
Khối 4 — Toplist Override:
          Top N selector (5–15) + Cấu trúc item (5 presets) + Estimated word count
Khối 5 — Tone              ← TOPLIST_TONES
Khối 6 — AI Model          ← <ModelPicker />
Khối 7 — Brand Config      ← <BrandSection lsKey="vtl_brand_info" />
Khối 8 — SEO Advanced      ← <SeoAdvancedBlock />
─────────────────────────────
Submit Button
```

> **Khối 4 của Toplist là override đặc thù** — không dùng outline 3-mode chuẩn.  
> Thay bằng: Top N selector + Structure preset + Word count estimate.

### State & sessionStorage

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES, IMAGE_OPTIONS } from '@/lib/shared/options';
import { TOPLIST_STRUCTURES, TOPLIST_TONES, TOPLIST_TOP_N_OPTIONS, computeToplistTargetLength } from '@/lib/viet-toplist/options';
import ModelPicker from '@/components/ModelPicker';
import BrandSection from '@/components/BrandSection';
import SeoAdvancedBlock from '@/components/SeoAdvancedBlock';
import type { ToplistConfig, ToplistTopN } from '@/lib/viet-toplist/types';

const DEFAULT_CONFIG: ToplistConfig = {
  keyword:           '',
  secondaryKeywords: [],
  dataSource:        'ai_only',
  imageOption:       'none',
  language:          'Vietnamese',
  topN:              10,
  structure:         'intro_features_pros_cons',
  tone:              'formal_seo',
  modelId:           '',
};

export default function VietToplistPage() {
  const router = useRouter();
  const [config, setConfig]             = useState<ToplistConfig>(DEFAULT_CONFIG);
  const [kwInput, setKwInput]           = useState('');
  const [loading, setLoading]           = useState(false);
  const [suggestLoading, setSuggest]    = useState(false);
  const [error, setError]               = useState('');
  const [cannibalizeWarning, setCannibal] = useState('');
  const cannibalTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('vtl_config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ToplistConfig;
        setConfig(parsed);
        setKwInput(parsed.secondaryKeywords.join(', '));
      } catch { /* ignore */ }
    }
  }, []);

  const update = (p: Partial<ToplistConfig>) => setConfig((prev) => ({ ...prev, ...p }));

  // Cannibalization check — onBlur keyword, debounce 800ms
  const handleKeywordBlur = useCallback(() => {
    const kw = config.keyword.trim();
    if (!kw) return;
    clearTimeout(cannibalTimer.current);
    cannibalTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/articles/check-cannibalization?keyword=${encodeURIComponent(kw)}`);
        const data = await res.json() as { cannibalizing: boolean; matchedTitle?: string };
        if (data.cannibalizing) {
          setCannibal(`⚠️ Từ khoá này đã có bài: "${data.matchedTitle}"`);
        } else {
          setCannibal('');
        }
      } catch { /* non-blocking */ }
    }, 800);
  }, [config.keyword]);

  function parseSecondaryKWs(raw: string): string[] {
    return raw.split(',').map((k) => k.trim()).filter(Boolean);
  }

  const estimatedWords = computeToplistTargetLength(config.topN, config.structure);
```

### Khối 1 — Keyword + Secondary KW + Data Source

```tsx
  {/* ═══ KHỐI 1: KEYWORD ═══════════════════════════════════════════ */}
  <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
    <h2 className="text-sm font-bold text-gray-800 mb-4">
      1. Từ khóa
    </h2>

    {/* Keyword chính */}
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      Từ khóa chính <span className="text-red-500">*</span>
    </label>
    <input
      value={config.keyword}
      onChange={(e) => update({ keyword: e.target.value })}
      onBlur={handleKeywordBlur}
      placeholder="VD: giường sắt giá rẻ, tủ quần áo 3 cánh..."
      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 mb-1"
    />
    {cannibalizeWarning && (
      <p className="text-xs text-amber-600 mb-3">{cannibalizeWarning}</p>
    )}

    {/* Secondary KW + AI Suggest */}
    <div className="flex justify-between items-center mt-4 mb-1.5">
      <label className="text-xs font-semibold text-gray-700">
        Từ khoá phụ / Tên items gợi ý
      </label>
      <button
        onClick={() => void handleSuggestKeywords()}
        disabled={suggestLoading || !config.keyword.trim()}
        className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
      >
        {suggestLoading ? '⟳ Đang gợi ý...' : '✨ AI gợi ý'}
      </button>
    </div>
    <textarea
      value={kwInput}
      onChange={(e) => {
        setKwInput(e.target.value);
        update({ secondaryKeywords: parseSecondaryKWs(e.target.value) });
      }}
      rows={3}
      placeholder="giường sắt 1m2, giường sắt 1m4, giường sắt 2 tầng..."
      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-y focus:ring-2 focus:ring-blue-500"
    />
    <p className="text-xs text-gray-400 mt-1">
      Phân cách bằng dấu phẩy. Để trống → AI tự đặt tên {config.topN} items.
    </p>

    {/* Data Source */}
    <div className="mt-4">
      <label className="block text-xs font-semibold text-gray-700 mb-2">Nguồn dữ liệu</label>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 'google_search', label: '🔍 Google + AI', note: 'Dữ liệu thực tế từ SERP. Tốn 1 Google quota.' },
          { value: 'ai_only',       label: '🤖 Chỉ AI',      note: 'Nhanh hơn, không cần Google key.' },
        ].map((opt) => (
          <button key={opt.value} onClick={() => update({ dataSource: opt.value as never })}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${config.dataSource === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
            <div className="text-sm font-semibold text-gray-800">{opt.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{opt.note}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
```

### Khối 2 — Image Option

```tsx
  {/* ═══ KHỐI 2: ẢNH ═══════════════════════════════════════════════ */}
  <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
    <h2 className="text-sm font-bold text-gray-800 mb-4">2. Ảnh cho bài viết</h2>
    <div className="grid grid-cols-2 gap-2">
      {IMAGE_OPTIONS.map((opt) => (
        <button key={opt.value} onClick={() => update({ imageOption: opt.value as never })}
          className={`p-3 rounded-lg border-2 text-left flex items-center gap-2 transition-colors ${config.imageOption === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
          <span className="text-lg">{opt.icon}</span>
          <span className="text-sm font-medium text-gray-700">{opt.label}</span>
        </button>
      ))}
    </div>
    {config.imageOption === 'shutterstock' && (
      <p className="text-xs text-amber-600 mt-2">⚠️ Yêu cầu SHUTTERSTOCK_API_KEY</p>
    )}
  </div>
```

### Khối 3 — Language

```tsx
  {/* ═══ KHỐI 3: NGÔN NGỮ ══════════════════════════════════════════ */}
  <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
    <h2 className="text-sm font-bold text-gray-800 mb-4">3. Ngôn ngữ</h2>
    <select
      value={config.language}
      onChange={(e) => update({ language: e.target.value })}
      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l.value} value={l.value}>{l.label}</option>
      ))}
    </select>
  </div>
```

### Khối 4 — Toplist Override (Top N + Structure + Estimate)

```tsx
  {/* ═══ KHỐI 4: TOPLIST CONFIG ════════════════════════════════════ */}
  <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
    <h2 className="text-sm font-bold text-gray-800 mb-4">4. Cấu hình Toplist</h2>

    {/* Top N */}
    <label className="block text-xs font-semibold text-gray-700 mb-2">Số lượng item</label>
    <div className="flex flex-wrap gap-2 mb-4">
      {TOPLIST_TOP_N_OPTIONS.map((n) => (
        <button key={n} onClick={() => update({ topN: n as ToplistTopN })}
          className={`w-12 h-10 text-sm rounded-lg border-2 font-medium transition-colors ${config.topN === n ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
          {n}
        </button>
      ))}
    </div>

    {/* Structure presets */}
    <label className="block text-xs font-semibold text-gray-700 mb-2">Cấu trúc mỗi item</label>
    <div className="space-y-2 mb-4">
      {TOPLIST_STRUCTURES.map((s) => (
        <button key={s.value} onClick={() => update({ structure: s.value })}
          className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${config.structure === s.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-800">{s.label}</span>
            <span className="text-xs text-gray-400">~{s.wordsPerItem} từ/item</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{s.note}</div>
        </button>
      ))}
    </div>

    {/* Estimated word count */}
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
      📊 Ước tính: <strong>~{estimatedWords.toLocaleString()} từ</strong>
      {' '}({config.topN} items × ~{TOPLIST_STRUCTURES.find(s => s.value === config.structure)?.wordsPerItem ?? 350} từ + mở/kết)
    </div>
  </div>
```

### Khối 5 — Tone

```tsx
  {/* ═══ KHỐI 5: TONE ═══════════════════════════════════════════════ */}
  <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
    <h2 className="text-sm font-bold text-gray-800 mb-4">5. Giọng văn & Ngữ điệu</h2>
    <div className="space-y-2">
      {TOPLIST_TONES.map((tone) => (
        <button key={tone.value} onClick={() => update({ tone: tone.value })}
          className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${config.tone === tone.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
          <div className="text-sm font-semibold text-gray-800">{tone.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{tone.note}</div>
        </button>
      ))}
    </div>
  </div>
```

### Khối 6, 7, 8 — Shared Components

```tsx
  {/* ═══ KHỐI 6: AI MODEL ═══════════════════════════════════════════ */}
  <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
    <h2 className="text-sm font-bold text-gray-800 mb-4">6. Model AI</h2>
    <ModelPicker
      value={config.modelId}
      onChange={(id) => update({ modelId: id })}
    />
    <p className="text-xs text-amber-600 mt-2">
      ⚠️ Toplist dài (~{estimatedWords.toLocaleString()} từ) — cần model context window lớn.
      Gemini Flash đủ cho Top 5–10.
    </p>
  </div>

  {/* ═══ KHỐI 7: BRAND ══════════════════════════════════════════════ */}
  <BrandSection lsKey="vtl_brand_info" />

  {/* ═══ KHỐI 8: SEO ADVANCED (collapsed) ══════════════════════════ */}
  <SeoAdvancedBlock />
```

### Submit handler

```typescript
  async function handleNext() {
    const keyword = config.keyword.trim();
    if (!keyword) { setError('Vui lòng nhập từ khóa chính.'); return; }
    setLoading(true);
    setError('');

    try {
      // Read brand từ BrandSection (lưu riêng vào vtl_brand_info)
      const brandConfig = (() => {
        try { return JSON.parse(sessionStorage.getItem('vtl_brand_info') ?? '{}'); }
        catch { return {}; }
      })();

      const finalConfig: ToplistConfig = {
        ...config,
        keyword,
        secondaryKeywords: parseSecondaryKWs(kwInput),
      };

      const res  = await fetch('/api/viet-toplist/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ config: finalConfig, brandConfig }),
      });
      const data = await res.json() as { articleId?: string; runId?: string; serpData?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Không thể bắt đầu');

      sessionStorage.setItem('vtl_config',     JSON.stringify(finalConfig));
      sessionStorage.setItem('vtl_article_id', data.articleId!);
      sessionStorage.setItem('vtl_run_id',     data.runId!);
      if (data.serpData) sessionStorage.setItem('vtl_serp_data', data.serpData);
      else sessionStorage.removeItem('vtl_serp_data');
      sessionStorage.removeItem('vtl_result');

      router.push('/viet-toplist/generate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  // ─── Suggest keywords handler ────────────────────────────────────────────
  async function handleSuggestKeywords() {
    if (!config.keyword.trim()) { setError('Nhập từ khoá chính trước.'); return; }
    setSuggest(true);
    setError('');
    try {
      const res  = await fetch('/api/viet-toplist/suggest-keywords', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keyword: config.keyword, topN: config.topN, language: config.language }),
      });
      const data = await res.json() as { keywords?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Lỗi gợi ý');
      if (data.keywords) {
        const joined = data.keywords.join(', ');
        setKwInput(joined);
        update({ secondaryKeywords: data.keywords });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi');
    } finally {
      setSuggest(false);
    }
  }
```

### Submit Button

```tsx
  {error && (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {error}
    </div>
  )}

  <button onClick={() => void handleNext()} disabled={loading || !config.keyword.trim()}
    className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
    {loading
      ? <><span className="animate-spin">⟳</span> Đang khởi tạo...</>
      : `✍️ Viết Top ${config.topN} ${config.keyword || '...'} →`}
  </button>
```

---

## 10. Generate Page — `web/app/viet-toplist/generate/page.tsx`

Tái dùng **pattern chuẩn** từ `viet-tinh-gon/generate/page.tsx`. Các điểm thay đổi:

| Thay | Từ (tinh-gon) | Thành (toplist) |
|------|---------------|-----------------|
| sessionStorage prefix | `tg_` | `vtl_` |
| Stream endpoint | `/api/viet-tinh-gon/stream` | `/api/viet-toplist/stream` |
| Config type | `TinhGonConfig` | `ToplistConfig` |
| Back link | `/viet-tinh-gon` | `/viet-toplist` |
| Page title | `'Viết Tinh Gọn'` | `'Viết Toplist'` |
| Extra payload field | — | `serpData: sessionStorage.getItem('vtl_serp_data') ?? undefined` |

### Payload gửi lên stream

```typescript
const payload = {
  articleId:   sessionStorage.getItem('vtl_article_id'),
  runId:       sessionStorage.getItem('vtl_run_id'),
  config:      JSON.parse(sessionStorage.getItem('vtl_config') ?? '{}') as ToplistConfig,
  brandConfig: JSON.parse(sessionStorage.getItem('vtl_brand_info') ?? '{}'),
  // Cache SERP từ start route — tránh gọi Google 2 lần
  serpData:    sessionStorage.getItem('vtl_serp_data') ?? undefined,
};
```

### SSE Loading Steps UI (thứ tự)

```
1. "🔍 Đang lấy dữ liệu từ Google..."   (chỉ khi dataSource = google_search)
2. "✍️ AI đang viết Top N keyword..."
3. "🖼️ Đang tìm ảnh từ Yandex..."       (chỉ khi imageOption = yandex)
4. "📊 Đang chấm điểm..."
```

### Image count badge (sau khi generate xong)

```tsx
{result?.imagesInjected > 0 && (
  <div className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
    🖼️ {result.imagesInjected} ảnh đã chèn
  </div>
)}
```

---

## 11. Sidebar — `web/components/Sidebar.tsx`

```typescript
// Nhóm "Viết Bài", thêm sau "Viết Theo Dàn Bài":
{ label: 'Viết Toplist', href: '/viet-toplist', icon: '📋' },
```

---

## 12. Thứ tự implement

| Bước | File | Test quan trọng |
|------|------|-----------------|
| 1 | `lib/viet-toplist/types.ts` | — |
| 2 | `lib/viet-toplist/options.ts` | `computeToplistTargetLength(10, 'intro_features_pros_cons')` = 3.800 ✓ |
| 3 | `lib/viet-toplist/image-injector.ts` | Test `extractToplistItemNames` với HTML mẫu |
| 4 | `api/viet-toplist/suggest-keywords/route.ts` | Postman: keyword + topN → N gợi ý |
| 5 | `api/viet-toplist/start/route.ts` | Postman: tạo article, contentType = `viet_toplist:top10` |
| 6 | `api/viet-toplist/stream/route.ts` | **Test Top 5 trước, rồi Top 10** |
| 7 | `app/viet-toplist/page.tsx` | 8 khối đúng thứ tự, estimate cập nhật real-time |
| 8 | `app/viet-toplist/generate/page.tsx` | Thêm serpData + image badge |
| 9 | `components/Sidebar.tsx` | Thêm link |
| 10 | E2E: Top 5 → 10 → 15 với 5 structures | — |

---

## 13. QA Checklist

### Config page — 8 khối
- [ ] Khối 1: keyword input, cannibalization check onBlur (debounce 800ms)
- [ ] Khối 1: secondary KW textarea, AI Suggest button
- [ ] Khối 1: Data source 2 options
- [ ] Khối 2: IMAGE_OPTIONS 4 cards (từ lib/shared)
- [ ] Khối 3: SUPPORTED_LANGUAGES dropdown
- [ ] Khối 4: Top N buttons 5–15, structure preset, word count estimate
- [ ] Khối 4: estimate cập nhật khi đổi topN hoặc structure
- [ ] Khối 5: TOPLIST_TONES 5 options
- [ ] Khối 6: `<ModelPicker />` render đúng
- [ ] Khối 7: `<BrandSection lsKey="vtl_brand_info" />` render đúng
- [ ] Khối 8: `<SeoAdvancedBlock />` collapsed mặc định
- [ ] Submit: lưu `vtl_config` + forward `vtl_brand_info` → redirect `/viet-toplist/generate`

### API: suggest-keywords
- [ ] Trả đúng topN gợi ý
- [ ] Không requireAuth

### API: start
- [ ] `contentType = 'viet_toplist:top{N}'`
- [ ] `secondaryKeywords` lưu vào DB
- [ ] `dataSource = google_search` → `serpData` trong response

### API: stream
- [ ] Prompt có đúng `topN` + secondaryKeywords
- [ ] SERP cache từ sessionStorage không fetch lại Google
- [ ] `imageOption = yandex` → inject trước khi score
- [ ] Yandex fail → continue, không crash
- [ ] Humanness + SEO score lưu DB

### Generate page
- [ ] `serpData` truyền từ sessionStorage lên stream payload
- [ ] Image badge hiện khi `imagesInjected > 0`
- [ ] 4 tabs (SEO / Chất lượng / Internal Links / Đăng bài) hoạt động

---

## 14. Bugs thường gặp

| # | Lỗi | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | AI viết N±1 items | Prompt không đủ cứng | Thêm: "PHẢI viết đúng ${topN} items — không hơn, không kém" |
| 2 | AI không viết đủ cho Top 15 full | Context window nhỏ | Giới hạn: Top 15 → chỉ cho phép `intro_features` hoặc `auto` |
| 3 | Yandex inject sai vị trí | Item name có regex special chars | `escapedName` regex escape — đã xử lý |
| 4 | SERP fetch 2 lần | FE không pass `serpData` | Kiểm tra `sessionStorage.getItem('vtl_serp_data')` trong generate |
| 5 | Cannibalization check fire khi page load | `onBlur` trigger sai | Chỉ fire khi keyword thay đổi (đã xử lý bằng `useCallback`) |
| 6 | Estimate không cập nhật | `estimatedWords` dùng stale state | Tính trực tiếp: `computeToplistTargetLength(config.topN, config.structure)` trong render |
| 7 | `extractToplistItemNames` → mảng rỗng | AI đánh số không theo pattern "1. Tên" | Fallback: match `<h2>` không đánh số, thêm số thứ tự về sau |
| 8 | `brandConfig` không truyền lên stream | Đọc từ `vtl_config` thay vì `vtl_brand_info` | Đọc riêng từ `sessionStorage.getItem('vtl_brand_info')` |
