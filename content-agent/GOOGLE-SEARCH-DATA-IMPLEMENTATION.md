# GOOGLE-SEARCH-DATA-IMPLEMENTATION.md
# Tích hợp "Dữ liệu cho AI" — Google Search Real-time Data Layer

> **Mục tiêu:** Thêm tính năng "Sử dụng dữ liệu từ Google Search & AI" vào tất cả feature viết bài.
> AI sẽ nhận dữ liệu thực từ SERP trước khi viết → nội dung chính xác, up-to-date, ít hallucination.

---

## 1. Tổng quan kiến trúc

```
User chọn "Google Search & AI"
        ↓
[UI Page] gửi dataSource: 'google_search' lên API
        ↓
[API Route] gọi fetchGoogleSearchData(keyword)
        ↓
[lib/google-search/search.ts]
  → Google Custom Search API → top 5 URLs
  → Crawl từng URL lấy nội dung
  → Extract + clean text
        ↓
buildDataBlock(results) → inject vào Writer prompt
        ↓
AI viết bài dựa trên dữ liệu thực
```

### File structure cần tạo mới

```
web/lib/google-search/
├── types.ts          ← interface SearchResult, GoogleSearchConfig
├── search.ts         ← fetchGoogleSearchData() — gọi Google API + crawl
├── extract.ts        ← extractTextFromHtml() — clean HTML → plain text
└── prompt-inject.ts  ← buildDataBlock() — format data → inject vào prompt
```

### File cần chỉnh sửa

```
web/app/api/pipeline/keyword-write/route.ts   ← thêm Google Search step
web/app/api/pipeline/write-stream/route.ts    ← thêm Google Search step (viet-bai-thong-minh đang dùng route này)
web/app/api/tinh-gon/stream/route.ts          ← thêm Google Search step (nếu bật cho viết tinh gọn)
web/app/viet-theo-tu-khoa/page.tsx            ← thêm "Dữ liệu cho AI" dropdown
web/app/viet-bai-thong-minh/step3/page.tsx    ← thêm option "Google Search & AI" vào bước chọn dữ liệu
web/app/viet-tinh-gon/page.tsx                ← thêm "Dữ liệu cho AI" dropdown (nếu muốn áp dụng cho tinh gọn)
web/.env.local                                ← thêm GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX
```

---

## 2. Environment Variables

Thêm vào `web/.env.local`:

```env
# Google Custom Search API
# Tạo tại: https://console.developers.google.com/
# Bật API: "Custom Search API"
GOOGLE_SEARCH_API_KEY=your_api_key_here

# Search Engine ID
# Tạo tại: https://programmablesearchengine.google.com/
# Chọn "Search the entire web"
GOOGLE_SEARCH_CX=your_cx_here
```

**Quota miễn phí:** 100 queries/ngày. Nếu cần thêm: $5/1000 queries.

**Cách lấy API Key + CX nhanh:**
1. Vào https://console.cloud.google.com → tạo project mới
2. Enable "Custom Search API"
3. Tạo API Key tại Credentials
4. Vào https://programmablesearchengine.google.com → tạo engine → lấy CX (Search engine ID)

---

## 3. `lib/google-search/types.ts` — Tạo mới

```typescript
// web/lib/google-search/types.ts

export interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  extractedText?: string;  // text crawl được từ URL
}

export interface GoogleSearchData {
  keyword: string;
  totalResults: string;
  items: GoogleSearchItem[];
  fetchedAt: string;
}

export type DataSourceMode = 'ai_only' | 'google_search';
```

---

## 4. `lib/google-search/extract.ts` — Tạo mới

Hàm extract text từ HTML (tái sử dụng logic đã có trong `keyword-write/route.ts`):

```typescript
// web/lib/google-search/extract.ts

/**
 * Extract plain text từ HTML string.
 * Bỏ script, style, nav, footer, header, aside.
 * Giữ tối đa maxLength ký tự.
 */
export function extractTextFromHtml(html: string, maxLength = 2500): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, maxLength);
}

/**
 * Crawl 1 URL và trả về plain text.
 * Timeout 8s, trả '' nếu lỗi.
 */
export async function crawlUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return '';
    const html = await res.text();
    return extractTextFromHtml(html);
  } catch {
    return '';
  }
}
```

---

## 5. `lib/google-search/search.ts` — Tạo mới

```typescript
// web/lib/google-search/search.ts

import { GoogleSearchData, GoogleSearchItem } from './types';
import { crawlUrl } from './extract';

/**
 * Gọi Google Custom Search API, crawl top URLs, trả về GoogleSearchData.
 *
 * @param keyword  Từ khóa cần search
 * @param options  num: số kết quả (mặc định 5), crawl: có crawl URL không
 */
export async function fetchGoogleSearchData(
  keyword: string,
  options: { num?: number; crawl?: boolean; language?: string } = {}
): Promise<GoogleSearchData | null> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx     = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    console.warn('[google-search] GOOGLE_SEARCH_API_KEY hoặc GOOGLE_SEARCH_CX chưa cấu hình — skip');
    return null;
  }

  const num      = Math.min(options.num ?? 5, 10);
  const doCrawl  = options.crawl !== false; // default: true
  const langCode = options.language === 'Vietnamese' ? 'vi' : 'en';

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: keyword,
      num: String(num),
      lr: `lang_${langCode}`,
      gl: langCode === 'vi' ? 'vn' : 'us',
    });

    const apiUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    console.log(`[google-search] Searching: "${keyword}" lang=${langCode}`);

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });

    if (res.status === 429) {
      console.warn('[google-search] Quota exceeded (429) — skip Google Search');
      return null;
    }
    if (!res.ok) {
      console.error(`[google-search] API error ${res.status}`);
      return null;
    }

    const json = await res.json() as {
      searchInformation?: { totalResults?: string };
      items?: Array<{ title?: string; link?: string; snippet?: string }>;
    };

    const rawItems = json.items ?? [];
    console.log(`[google-search] Got ${rawItems.length} results`);

    // Build items — crawl song song nếu doCrawl
    const items: GoogleSearchItem[] = await Promise.all(
      rawItems.slice(0, num).map(async (item): Promise<GoogleSearchItem> => {
        const link = item.link ?? '';
        const extractedText = doCrawl && link ? await crawlUrl(link) : undefined;
        return {
          title:         item.title    ?? '',
          link,
          snippet:       item.snippet  ?? '',
          extractedText: extractedText || undefined,
        };
      })
    );

    return {
      keyword,
      totalResults: json.searchInformation?.totalResults ?? '0',
      items,
      fetchedAt: new Date().toISOString(),
    };

  } catch (err) {
    console.error('[google-search] Fetch error:', err);
    return null;
  }
}
```

---

## 6. `lib/google-search/prompt-inject.ts` — Tạo mới

```typescript
// web/lib/google-search/prompt-inject.ts

import { GoogleSearchData } from './types';

/**
 * Chuyển GoogleSearchData → text block inject vào Writer prompt.
 *
 * AI sẽ đọc block này trước khi viết bài.
 * Format rõ ràng: tiêu đề, snippet, nội dung crawl được.
 */
export function buildDataBlock(data: GoogleSearchData): string {
  if (!data.items.length) return '';

  const lines: string[] = [
    `## DỮ LIỆU THỰC TẾ TỪ GOOGLE (${data.items.length} kết quả top đầu)`,
    `Keyword: "${data.keyword}"`,
    `Tổng kết quả: ${Number(data.totalResults).toLocaleString()}`,
    '',
    '⚠️ Hãy dùng dữ liệu này làm nền tảng thực tế. KHÔNG bịa thêm thông tin.',
    '⚠️ Viết bài MỚI hoàn toàn — KHÔNG sao chép. Học cấu trúc, không copy nội dung.',
    '',
  ];

  data.items.forEach((item, i) => {
    lines.push(`### [${i + 1}] ${item.title}`);
    lines.push(`URL: ${item.link}`);
    lines.push(`Tóm tắt: ${item.snippet}`);
    if (item.extractedText && item.extractedText.length > 100) {
      lines.push(`Nội dung:`);
      lines.push(item.extractedText.slice(0, 1500)); // tối đa 1500 ký tự/URL
    }
    lines.push('');
  });

  lines.push('---');
  lines.push('Dựa vào dữ liệu trên để viết bài chính xác, thực tế, vượt trội hơn các bài đang rank.');

  return lines.join('\n');
}
```

---

## 7. Sửa `api/pipeline/keyword-write/route.ts`

### 7.1 Thêm import ở đầu file

```typescript
// Thêm sau các import hiện có
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import type { DataSourceMode } from '@/lib/google-search/types';
```

### 7.2 Sửa interface WriteRequest — thêm field

```typescript
interface WriteRequest {
  keyword: string;
  outline: string;
  outlineMode: 'none' | 'custom' | 'ai';
  targetLength: number;
  tone: string;
  aiModel: string;
  competitorUrls?: string[];
  language: string;
  seoOptions: SeoOptions;
  brandConfig?: BrandConfig;
  dataSource?: DataSourceMode;  // ← THÊM DÒNG NÀY
}
```

### 7.3 Sửa hàm `runWriter` — thêm param googleDataBlock

```typescript
// Tìm dòng:
async function runWriter(
  model: any,
  body: WriteRequest,
  brandPrompt: string,
  competitorAnalysis: string = ''
): Promise<string> {

// Sửa thành:
async function runWriter(
  model: any,
  body: WriteRequest,
  brandPrompt: string,
  competitorAnalysis: string = '',
  googleDataBlock: string = ''     // ← THÊM PARAM
): Promise<string> {
```

Trong body hàm `runWriter`, tìm dòng tạo `competitorSection`:

```typescript
  const competitorSection = competitorAnalysis
    ? `\n## Phân tích đối thủ (dùng để viết vượt trội hơn):\n${competitorAnalysis}\n\n⚠️ Bài viết MỚI phải: bao phủ content gap, bổ sung điểm đối thủ thiếu, giữ cấu trúc tương tự nhưng chi tiết hơn.`
    : '';
```

Thêm ngay sau đó:

```typescript
  // Thêm sau competitorSection:
  const googleSection = googleDataBlock
    ? `\n${googleDataBlock}\n`
    : '';
```

Tìm dòng build `prompt`:

```typescript
  const prompt = `Bạn là Writer Agent chuyên viết bài SEO.

${brandPrompt}
${competitorSection}
## Nhiệm vụ:
```

Sửa thành:

```typescript
  const prompt = `Bạn là Writer Agent chuyên viết bài SEO.

${brandPrompt}
${googleSection}
${competitorSection}
## Nhiệm vụ:
```

### 7.4 Sửa Route Handler — thêm Google Search step

Tìm đoạn trong `export async function POST`:

```typescript
    // Bước 0: Phân tích đối thủ (nếu có URL)
    let competitorAnalysis = '';
    if (body.competitorUrls?.length) {
      // ... code hiện có
    }

    // Bước 1: Writer
    console.log('[keyword-write] Writer...');
    const rawHtml = await runWriter(model, body, brandPrompt, competitorAnalysis);
```

Sửa thành:

```typescript
    // Bước 0a: Fetch Google Search data (nếu user chọn)
    let googleDataBlock = '';
    if (body.dataSource === 'google_search') {
      console.log('[keyword-write] Fetching Google Search data...');
      const googleData = await fetchGoogleSearchData(keyword.trim(), {
        num: 5,
        crawl: true,
        language: body.language,
      });
      if (googleData) {
        googleDataBlock = buildDataBlock(googleData);
        console.log(`[keyword-write] Google data ready — ${googleData.items.length} results`);
      } else {
        console.warn('[keyword-write] Google Search unavailable — fallback to AI only');
      }
    }

    // Bước 0b: Phân tích đối thủ (nếu có URL)
    let competitorAnalysis = '';
    if (body.competitorUrls?.length) {
      console.log(`[keyword-write] Analyzing ${body.competitorUrls.length} competitor URLs...`);
      competitorAnalysis = await analyzeCompetitors(model, keyword.trim(), body.competitorUrls);
      if (competitorAnalysis) {
        console.log('[keyword-write] Competitor analysis done ✓');
      } else {
        console.log('[keyword-write] Competitor analysis returned empty (URLs may be blocked)');
      }
    }

    // Bước 1: Writer
    console.log('[keyword-write] Writer...');
    const rawHtml = await runWriter(model, body, brandPrompt, competitorAnalysis, googleDataBlock);
```

---

## 8. Sửa `api/pipeline/write-stream/route.ts` (Viết bài thông minh)

> `viet-bai-thong-minh/step3` hiện gọi `write-stream`. Nếu codebase của bạn còn route `write/route.ts` cho flow cũ, hãy áp dụng cùng logic vào route đó để đồng bộ.

### 8.1 Thêm import

```typescript
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import type { DataSourceMode } from '@/lib/google-search/types';
```

### 8.2 Thêm field vào request body interface

Tìm interface request của `write-stream/route.ts` (tên có thể khác nhau tùy file), thêm:

```typescript
dataSource?: DataSourceMode;
```

### 8.3 Thêm Google Search step trước khi gọi Writer

Trong route handler, trước bước Writer:

```typescript
    // Google Search data (nếu user chọn)
    let googleDataBlock = '';
    if (body.dataSource === 'google_search') {
      const googleData = await fetchGoogleSearchData(body.keyword?.trim(), {
        num: 5,
        crawl: true,
        language: body.language,
      });
      if (googleData) {
        googleDataBlock = buildDataBlock(googleData);
      }
    }
```

### 8.4 Inject googleDataBlock vào Writer prompt

Tìm chỗ build Writer prompt trong `write-stream/route.ts`, thêm:

```typescript
${googleDataBlock ? `\n${googleDataBlock}\n` : ''}
```

---

## 9. Sửa `app/viet-theo-tu-khoa/page.tsx` — Thêm UI dropdown

### 9.1 Thêm state

```typescript
// Thêm vào nhóm Form state (dòng ~60–84 hiện tại)
const [dataSource, setDataSource] = useState<'ai_only' | 'google_search'>('ai_only');
```

### 9.2 Thêm dropdown UI

Tìm section render form trong JSX. Thêm ngay **sau phần chọn ngôn ngữ** và **trước phần dàn ý**:

```tsx
{/* Dữ liệu cho AI */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Dữ liệu cho AI
  </label>
  <select
    value={dataSource}
    onChange={(e) => setDataSource(e.target.value as 'ai_only' | 'google_search')}
    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
    <option value="ai_only">Chỉ dùng AI (nhanh, miễn phí)</option>
    <option value="google_search">🔍 Sử dụng dữ liệu Google Search & AI (chính xác hơn)</option>
  </select>
  {dataSource === 'google_search' && (
    <p className="mt-1.5 text-xs text-blue-600">
      AI sẽ đọc top 5 kết quả Google thực tế trước khi viết — chậm hơn ~5–10s nhưng nội dung sát thực tế hơn.
    </p>
  )}
</div>
```

### 9.3 Gửi dataSource lên API

Tìm hàm `handleWrite()`, tại phần `body: JSON.stringify({...})`, thêm:

```typescript
          dataSource,            // ← THÊM DÒNG NÀY
```

Ví dụ sau khi thêm:

```typescript
        body: JSON.stringify({
          keyword: keyword.trim(),
          outline,
          outlineMode,
          targetLength: targetLength === 'Short' ? 1500 : targetLength === 'Long' ? 3000 : 2000,
          tone,
          aiModel,
          language: LANG_VALUES[language] ?? 'Vietnamese',
          imageOption,
          dataSource,            // ← THÊM
          competitorUrls: competitorUrls.trim().split('\n').map((u) => u.trim()).filter(Boolean),
          seoOptions: { link: seoLink.trim(), keywordLinks: seoKeywordLinks.trim(), boldKeyword, boldHeading },
          brandConfig: brandName.trim() ? { ... } : undefined,
        }),
```

---

## 10. Sửa `app/viet-bai-thong-minh/step3/page.tsx` — Thêm option `google_search`

> Repo hiện tại đã có `dataSource` ở **Step 3** với các mode: `ai_only | from_url | manual_input`. Vì vậy không nên tạo state mới ở Step 1 nữa, mà chỉ cần **mở rộng union hiện có** và thêm 1 card option mới.

### 10.1 Mở rộng type `DataSource`

```typescript
type DataSource = 'ai_only' | 'from_url' | 'manual_input' | 'google_search';
```

### 10.2 Thêm option UI vào danh sách `DATA_SOURCES`

Thêm 1 option mới bên cạnh `from_url` và `manual_input`:

```typescript
{
  id: 'google_search',
  icon: '🔍',
  label: 'Google Search & AI',
  desc: 'AI đọc top kết quả Google thực tế trước khi viết — phù hợp khi cần dữ liệu mới và ít hallucination hơn.',
  badge: 'Chính xác hơn',
}
```

### 10.3 Không cần sessionStorage riêng

`step3/page.tsx` đã giữ `dataSource` ngay trong state local và gửi trực tiếp vào:

```typescript
fetch('/api/pipeline/write-stream', {
  body: JSON.stringify({
    ...payload,
    dataSource,
  }),
});
```

### 10.4 Sửa route nhận dữ liệu

Trong `write-stream/route.ts`, mở rộng union hiện có:

```typescript
dataSource?: 'ai_only' | 'from_url' | 'manual_input' | 'google_search';
```

Rồi thêm branch:

```typescript
let googleDataBlock = '';
if (body.dataSource === 'google_search') {
  const googleData = await fetchGoogleSearchData(body.step1.keyword, {
    num: 5,
    crawl: true,
    language: body.step1.language,
  });
  if (googleData) {
    googleDataBlock = buildDataBlock(googleData);
  }
}
```

Và inject `googleDataBlock` vào Writer prompt giống section 8.

---

## 10b. Áp dụng cho Viết Tinh Gọn (`viet-tinh-gon`)

> `viet-tinh-gon` hiện có flow `start -> outline -> stream` và đã lưu draft vào `Article`. Nếu muốn dùng Google Search cho tinh gọn, nên đặt dropdown ở **Step 1 config page**, lưu vào `tg_config`, rồi route `start/stream` đọc lại.

### 10b.1 Thêm vào `TinhGonConfig`

```typescript
type TinhGonDataSource = 'ai_only' | 'google_search';

interface TinhGonConfig {
  keyword: string;
  outlineType: string;
  language: string;
  model: string;
  targetLength: number;
  secondaryKeywords: string[];
  notes: string;
  dataSource?: TinhGonDataSource;
}
```

### 10b.2 UI ở `web/app/viet-tinh-gon/page.tsx`

Thêm dropdown giống `viet-theo-tu-khoa`, ngay sau phần `Ngôn ngữ`:

```tsx
<select
  value={config.dataSource ?? 'ai_only'}
  onChange={(e) => setConfig((prev) => ({ ...prev, dataSource: e.target.value as 'ai_only' | 'google_search' }))}
>
  <option value="ai_only">Chỉ dùng AI</option>
  <option value="google_search">Google Search & AI</option>
</select>
```

### 10b.3 Route `start/stream`

- `start/route.ts`: không bắt buộc fetch Google ngay nếu chỉ cần tạo draft + outline.
- `stream/route.ts`: trước khi build prompt, nếu `config.dataSource === 'google_search'` thì gọi:

```typescript
const googleData = await fetchGoogleSearchData(config.keyword, {
  num: 5,
  crawl: true,
  language: config.language,
});
const googleDataBlock = googleData ? buildDataBlock(googleData) : '';
```

Sau đó inject vào prompt:

```typescript
${googleDataBlock ? `\n${googleDataBlock}\n` : ''}
```

### 10b.4 Lợi ích cho tinh gọn

- bài ngắn nhưng có dữ liệu thực hơn
- giảm hallucination khi viết dạng review / compare / buying_guide
- giữ được góc SEO mà không cần tăng độ dài bài

---

## 11. Áp dụng cho Viết Tin Tức (`viet-tin-tuc/stream/route.ts`)

> Tin tức đã dùng Google News RSS. Nên thêm Google Search như tùy chọn **bổ sung** (không thay thế RSS).

### 11.1 Import

```typescript
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
```

### 11.2 Thêm vào config type

```typescript
// Trong NewsConfig hoặc interface body
dataSource?: 'ai_only' | 'google_search' | 'rss_only';
```

### 11.3 Logic trong stream

```typescript
// Sau khi fetch RSS sources
let googleDataBlock = '';
if (config.dataSource === 'google_search') {
  const googleData = await fetchGoogleSearchData(config.keyword, {
    num: 3,       // Tin tức chỉ cần 3 kết quả (đã có RSS rồi)
    crawl: false, // Không cần crawl — snippet đủ dùng cho tin tức
    language: config.language,
  });
  if (googleData) {
    googleDataBlock = buildDataBlock(googleData);
  }
}
```

### 11.4 Inject vào prompt

```typescript
// Trong Writer prompt của tin tức, thêm:
${googleDataBlock ? `\n${googleDataBlock}\n` : ''}
```

---

## 12. Viết Toplist (`viet-toplist`) — Bắt buộc dùng Google Search

> Toplist content như "Top 8 sách hay nhất" cần data thực — AI không thể bịa.
> **Default dataSource = 'google_search'** cho Toplist.

### 12.1 Trong config page Toplist

```typescript
// State mặc định khác các feature khác
const [dataSource, setDataSource] = useState<'ai_only' | 'google_search'>('google_search');
```

### 12.2 UI có label cảnh báo

```tsx
{dataSource === 'ai_only' && (
  <div className="mt-1.5 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
    ⚠️ Không khuyến khích cho Toplist — AI có thể bịa tên sản phẩm/tác giả sai.
    Nên dùng "Google Search & AI" để đảm bảo chính xác.
  </div>
)}
```

---

## 13. Xử lý Fallback & Lỗi

### Nguyên tắc: Google Search lỗi → không báo lỗi user → tự fallback về AI only

Đã xử lý trong `search.ts`: nếu API không khả dụng → return `null` → `googleDataBlock = ''` → prompt không có data block → AI viết bình thường.

### Các trường hợp lỗi cần xử lý trong `search.ts`

| Lỗi | Xử lý |
|-----|-------|
| API key thiếu | `console.warn` + return `null` |
| 429 Quota exceeded | `console.warn` + return `null` |
| 404/5xx từ Google API | `console.error` + return `null` |
| Timeout 10s | catch + return `null` |
| URL crawl lỗi | `crawlUrl` catch + return `''` (riêng URL đó) |

---

## 14. Thời gian xử lý ước tính

| Mode | Thời gian thêm | Ghi chú |
|------|---------------|---------|
| `ai_only` | 0s | Không đổi |
| `google_search` (crawl=false) | +1–2s | Chỉ lấy snippet |
| `google_search` (crawl=true, 5 URLs) | +5–12s | Crawl song song |
| `google_search` (crawl=true) + timeout | +8s max | AbortSignal.timeout(8000) per URL |

**Khuyến nghị:**
- Blog, Toplist → `crawl: true` (cần nội dung đầy đủ)
- Tin tức → `crawl: false` (snippet đủ, cần nhanh)
- Facebook → không cần Google Search

### Hiển thị loading step cho user

Với các route dùng SSE (stream), emit event trước khi fetch:

```typescript
// Emit step progress để UI biết đang fetch
yield sseEvent('step', { step: 'google_search', label: '🔍 Đang lấy dữ liệu từ Google...' });

const googleData = await fetchGoogleSearchData(keyword, { num: 5, crawl: true });

yield sseEvent('step_done', { step: 'google_search',
  label: googleData ? `✅ Google: ${googleData.items.length} kết quả` : '⚠️ Google không khả dụng — dùng AI only'
});
```

Với các route dùng JSON response thông thường (keyword-write, write), không cần emit — thời gian thêm user vẫn chờ bình thường.

---

## 15. Thứ tự implement

| # | Việc cần làm | File |
|---|-------------|------|
| 1 | Cấu hình Google API key + CX | `.env.local` |
| 2 | Tạo `lib/google-search/types.ts` | Mới |
| 3 | Tạo `lib/google-search/extract.ts` | Mới |
| 4 | Tạo `lib/google-search/search.ts` | Mới |
| 5 | Tạo `lib/google-search/prompt-inject.ts` | Mới |
| 6 | Sửa `keyword-write/route.ts` | Section 7 |
| 7 | Sửa `viet-theo-tu-khoa/page.tsx` | Section 9 |
| 8 | Test với keyword thực — verify log `[google-search]` | — |
| 9 | Sửa `write-stream/route.ts` | Section 8 |
| 10 | Sửa `viet-bai-thong-minh/step3/page.tsx` | Section 10 |
| 11 | Áp dụng vào `viet-tinh-gon` | Section 10b |
| 12 | Áp dụng vào `viet-tin-tuc` | Section 11 |
| 13 | Áp dụng vào Toplist (khi build) | Section 12 |

---

## 16. Test checklist

- [ ] `GOOGLE_SEARCH_API_KEY` và `GOOGLE_SEARCH_CX` đã thêm vào `.env.local`
- [ ] `lib/google-search/` đã tạo đủ 4 files
- [ ] Log `[google-search] Got N results` xuất hiện trong console khi chọn "Google Search & AI"
- [ ] Log `[google-search] GOOGLE_SEARCH_API_KEY ... chưa cấu hình` khi thiếu key (fallback hoạt động)
- [ ] Chọn "Chỉ dùng AI" → prompt không có block `DỮ LIỆU THỰC TẾ TỪ GOOGLE`
- [ ] Chọn "Google Search & AI" → prompt có block data, bài viết có thông tin cụ thể hơn
- [ ] Khi Google API hết quota (429) → bài vẫn được tạo bình thường (không báo lỗi user)
- [ ] Dropdown "Dữ liệu cho AI" xuất hiện đúng vị trí trên form
- [ ] `viet-bai-thong-minh/step3` gửi được `dataSource = 'google_search'` vào `write-stream`
- [ ] Nếu áp dụng cho `viet-tinh-gon`, `tg_config` giữ được `dataSource` qua các step
- [ ] Toplist config: default là "Google Search & AI", có cảnh báo khi chọn "Chỉ dùng AI"

---

## 17. Ghi chú kỹ thuật

**Tại sao không dùng DuckDuckGo thay Google?**
DuckDuckGo Instant Answer API trả về rất ít kết quả và thường không có nội dung đầy đủ. Google Custom Search cho 10 kết quả có title + snippet + URL chuẩn, crawl được.

**Tại sao crawl URL thay vì chỉ dùng snippet?**
Snippet Google giới hạn ~160 ký tự — đủ cho context tổng quát nhưng không đủ để AI viết bài chi tiết. Crawl URL lấy được 1500–2500 ký tự nội dung thực sự.

**Import path `@/lib/google-search/...` có hoạt động không?**
Có — project đã có `@/` alias trỏ đến `web/` (xem `tsconfig.json`). Cùng pattern với `@/lib/tinh-gon/...` đang dùng.

**Rate limiting khi crawl nhiều URL song song?**
`Promise.all` crawl 5 URLs song song — mỗi URL timeout 8s. Tổng thời gian chờ tối đa = 8s (không phải 5×8=40s). Thực tế thường 3–5s.

**Có nên cache kết quả Google Search?**
V1: không cần cache. V2 nếu cần: cache theo `keyword + language` với TTL 1 giờ trong Redis/memory.
