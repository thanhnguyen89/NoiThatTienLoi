# FIX-VIET-BAI-THONG-MINH.md
## Danh sách bug & hướng dẫn fix — `/viet-bai-thong-minh`

> Audit ngày 2026-05-27 · 12 vấn đề · 4 mức độ
> Thứ tự fix: P1 trước (ảnh hưởng output AI) → P2 → P3

---

## MỤC LỤC

| # | Vấn đề | File | Mức |
|---|--------|------|-----|
| 1 | Prompt không dấu tiếng Việt | `lib/viet-bai-thong-minh/server.ts` | P1 |
| 2 | Thiếu SEO_PROMPT_RULES 23 rules | `lib/viet-bai-thong-minh/server.ts` | P1 |
| 3 | Thiếu SNIPPET_RULES_BY_TONE | `lib/viet-bai-thong-minh/server.ts` | P1 |
| 4 | computeSeoChecks chỉ 14/21 checks | `lib/shared/seo-checks.ts` | P1 |
| 5 | AICheckPanel chưa render ở Step 4 | `app/viet-bai-thong-minh/step4/page.tsx` | P2 |
| 6 | AiFloatingToolbar chưa render ở Step 4 | `app/viet-bai-thong-minh/step4/page.tsx` | P2 |
| 7 | InternalLinkSuggest chỉ là text tĩnh | `app/viet-bai-thong-minh/step4/page.tsx` | P2 |
| 8 | AI Suggest hardcode local, không gọi API | `app/viet-bai-thong-minh/page.tsx` | P2 |
| 9 | competitorInsights là hardcode string | `app/api/vbt/analyze/route.ts` | P2 |
| 10 | Target Length dùng input number thay vì chips | `app/viet-bai-thong-minh/step3/page.tsx` | P3 |
| 11 | RPP không có progress bar | `app/viet-bai-thong-minh/step2/page.tsx` | P3 |
| 12 | Publish tab thiếu Schema + OG Preview | `components/generate/PublishPanel.tsx` | P3 |

---

## FIX 1 — Prompt tiếng Việt có dấu

**File:** `web/lib/viet-bai-thong-minh/server.ts`

Sửa 3 hàm: `buildAnalyzePrompt()`, `buildTitlesPrompt()`, `buildVbtWritingPrompt()`

### 1a. `buildAnalyzePrompt()` — dòng ~193–232

```typescript
// ❌ TRƯỚC
function buildAnalyzePrompt(...) {
  return `
Ban la Semantic SEO Analyst. Phan tich keyword va tra ve JSON strict.

INPUT:
- Keyword chinh: ${input.keyword}
- Keyword phu: ${input.secondaryKeywordsRaw || 'khong co'}
- Loai noi dung user chon: ${input.contentType}
- Topical map role: ${input.topicalMapRole}
- Data source: ${input.dataSourceMode}
- Ngon ngu: ${input.language}
${input.dataSourceText ? `- Manual data:\n${input.dataSourceText.slice(0, 4000)}` : ''}

${competitorData ? `DU LIEU DOI THU:\n${competitorData}` : ''}
${googleData ? `DU LIEU GOOGLE:\n${googleData}` : ''}

YEU CAU:
- Xac dinh macro context.
- Xac dinh search intent: informational, navigational, commercial, transactional.
- Liet ke 3-5 reader pain points, moi item co relevance high/medium/low.
- Liet ke 4-8 attribute map, moi item co importance must/should/nice_to_have.
- De xuat 8-12 semantic keywords.
- Goi y content type phu hop: blog_seo, how_to, listicle, comparison, review, pillar, local_seo.
- Uoc tinh word count phu hop.
- Neu co du lieu doi thu, tom tat insight ngan gon.

OUTPUT JSON: { ... }
`.trim();
}

// ✅ SAU
function buildAnalyzePrompt(...) {
  return `
Bạn là Semantic SEO Analyst. Phân tích keyword và trả về JSON strict.

INPUT:
- Keyword chính: ${input.keyword}
- Keyword phụ: ${input.secondaryKeywordsRaw || 'không có'}
- Loại nội dung user chọn: ${input.contentType}
- Topical map role: ${input.topicalMapRole}
- Data source: ${input.dataSourceMode}
- Ngôn ngữ: ${input.language}
${input.dataSourceText ? `- Nội dung thủ công:\n${input.dataSourceText.slice(0, 4000)}` : ''}

${competitorData ? `DỮ LIỆU ĐỐI THỦ:\n${competitorData}` : ''}
${googleData ? `DỮ LIỆU GOOGLE:\n${googleData}` : ''}

YÊU CẦU:
- Xác định macro context (chủ đề tổng quát của keyword).
- Xác định search intent: informational, navigational, commercial, transactional.
- Liệt kê 3–5 reader pain points, mỗi item có relevance: high/medium/low.
- Liệt kê 4–8 attribute map (thuộc tính người đọc cần biết), mỗi item có importance: must/should/nice_to_have.
- Đề xuất 8–12 semantic keywords liên quan.
- Gợi ý content type phù hợp nhất: blog_seo, how_to, listicle, comparison, review, pillar, local_seo.
- Ước tính word count phù hợp (số nguyên).
- Nếu có dữ liệu đối thủ, tóm tắt insight ngắn gọn trong 2–3 câu.

OUTPUT JSON: { ... }
`.trim();
}
```

### 1b. `buildTitlesPrompt()` — dòng ~234–259

```typescript
// ❌ TRƯỚC
function buildTitlesPrompt(...) {
  return `
Tao 5 SEO title options cho bai viet.

Keyword: ${params.keyword}
Keyword phu: ${params.secondaryKeywords.join(', ') || 'khong co'}
Loai noi dung: ${params.contentType}
Ngon ngu: ${params.language}
Intent: ${params.semantic?.searchIntent || 'unknown'}
Semantic keywords: ${params.semantic?.semanticKeywords.join(', ') || 'khong co'}

Rule:
- Moi title 50-60 ky tu neu co the.
- Keyword o 1/3 dau title.
- Co so lieu/nam/thong so neu phu hop.
- Khong clickbait.

Tra ve JSON array string[], khong giai thich.
`.trim();
}

// ✅ SAU
function buildTitlesPrompt(...) {
  return `
Tạo 5 SEO title options cho bài viết.

Keyword chính: ${params.keyword}
Keyword phụ: ${params.secondaryKeywords.join(', ') || 'không có'}
Loại nội dung: ${params.contentType}
Ngôn ngữ: ${params.language}
Search Intent: ${params.semantic?.searchIntent || 'unknown'}
Semantic keywords: ${params.semantic?.semanticKeywords.join(', ') || 'không có'}

Quy tắc:
- Mỗi title 50–60 ký tự nếu có thể, không được vượt 70 ký tự.
- Keyword chính xuất hiện ở 1/3 đầu title.
- Có số liệu, năm, hoặc thông số cụ thể nếu phù hợp.
- Không clickbait, không hứa hẹn cường điệu.
- Mỗi title phải khác nhau về cấu trúc (không lặp pattern).

Trả về JSON array string[], không giải thích thêm.
`.trim();
}
```

### 1c. `buildVbtWritingPrompt()` — dòng ~327–396

```typescript
// ❌ TRƯỚC — dòng đầu
`Ban la SEO Writer. Viet bai HTML hoan chinh, huu ich, tu nhien.`

// ✅ SAU — dòng đầu
`Bạn là SEO Writer chuyên nghiệp. Viết bài HTML hoàn chỉnh, hữu ích, tự nhiên — không lộ dấu vết AI.`

// Toàn bộ các chuỗi label trong hàm này cũng sửa tương tự:
// "Do dai muc tieu khoang"    → "Độ dài mục tiêu khoảng"
// "Keyword chinh xuat hien"   → "Keyword chính xuất hiện"
// "Khong co semantic analysis"→ "Không có semantic analysis"
// "Dan y:"                    → "Dàn ý:"
// "Du lieu bo sung:"          → "Dữ liệu bổ sung:"
// "Chi tra ve HTML"           → "Chỉ trả về HTML"
// "khong giai thich"          → "không giải thích"
```

---

## FIX 2 — SEO_PROMPT_RULES 23 rules

**File:** Tạo mới `web/lib/shared/prompt-rules.ts` rồi import vào `server.ts`

### Bước 1: Tạo file shared

```typescript
// web/lib/shared/prompt-rules.ts

export const SEO_PROMPT_RULES = `
## QUY TẮC VIẾT BÀI SEO (bắt buộc tuân thủ)

1. CHỈ trả về HTML thuần — không có markdown, không có backtick, không có giải thích.
2. Bắt đầu bằng <h1> chứa keyword chính. Chỉ có đúng 1 thẻ <h1> trong toàn bài.
3. Keyword chính xuất hiện tự nhiên ở 100 từ đầu tiên.
4. Mật độ keyword chính: 1.0–1.5% (tính trên tổng số từ).
5. Có ít nhất 2 thẻ <h2>. Cấu trúc heading đúng thứ bậc: h2 → h3, không bỏ bậc.
6. Mỗi đoạn văn 40–80 từ. Không có đoạn quá 120 từ.
7. Có ít nhất 1 thẻ <a href> trỏ ra nguồn uy tín bên ngoài (Wikipedia, gov, .edu...).
8. Từ khóa phụ và semantic keywords xuất hiện tự nhiên trong body — không nhồi nhét.
9. Không dùng bullet list quá 5 items liên tiếp mà không có đoạn văn xen kẽ.
10. Có thẻ <strong> cho ít nhất 3–5 cụm từ quan trọng trong bài.
11. Tất cả thẻ <img> phải có alt text chứa keyword hoặc mô tả nội dung ảnh.
12. Không dùng các từ: "quan trọng", "hiệu quả", "tuy nhiên", "bên cạnh đó", "vô cùng", "siêu phẩm", "số 1", "đẳng cấp", "hoàn hảo", "không chỉ … mà còn".
13. Kết bài bằng đoạn văn tổng kết 50–80 từ — không dùng heading "Kết luận".
14. Nếu content type là how_to: dùng <ol> cho từng bước, mỗi bước có <strong> tên bước.
15. Nếu content type là listicle: mỗi item là <h3> + đoạn mô tả 30–60 từ.
16. Nếu content type là comparison: có bảng <table> so sánh ít nhất 3 tiêu chí.
17. Nếu bài dài ≥ 1500 từ: thêm TOC (Table of Contents) dưới <h1>, dạng <nav> với <a href="#id">.
18. Nếu có FAQ trong dàn ý: dùng format <div class="faq-item"><h3 class="faq-q">...</h3><p class="faq-a">...</p></div>.
19. Không tạo nội dung sai sự thật. Nếu không biết số liệu cụ thể, dùng cụm mô tả thay vì bịa số.
20. E-E-A-T: thể hiện kinh nghiệm thực tế — dùng ví dụ cụ thể, số liệu thực, tình huống thật.
21. Không mở bài bằng: "Trong cuộc sống hiện đại", "Ngày nay", "Bạn có biết rằng", "Trong bài viết này".
22. URL nội bộ: nếu config có keywordLinks, chèn đúng vị trí tự nhiên trong bài.
23. Không wrap toàn bộ output trong <html><body> — chỉ trả về fragment HTML bắt đầu từ <h1>.
`.trim();

export const SNIPPET_RULES_BY_TONE: Record<string, string> = {
  how_to: `
## TỐI ƯU FEATURED SNIPPET — HOW TO
- Câu đầu tiên sau <h1> phải trả lời trực tiếp câu hỏi trong 1–2 câu (paragraph snippet).
- Dùng <ol> với mỗi bước bắt đầu bằng động từ hành động.
- Mỗi bước ≤ 40 từ — Google cắt snippet tại ~300 ký tự.
- H2 đầu tiên nên là "Cách [keyword] từng bước" hoặc "[Keyword]: Hướng dẫn chi tiết".
`.trim(),

  listicle: `
## TỐI ƯU FEATURED SNIPPET — LISTICLE
- Câu đầu sau <h1>: "[Số] [keyword] tốt nhất gồm: [list 3–5 tên ngắn]" — Google dùng làm snippet.
- Dùng <ol> hoặc <ul> cho danh sách, mỗi item 1 dòng tên + 1 câu mô tả.
- Đặt list chính ở top bài, trước khi giải thích chi tiết.
`.trim(),

  comparison: `
## TỐI ƯU FEATURED SNIPPET — COMPARISON
- Đặt bảng <table> ở đầu bài (sau intro ngắn 30–50 từ).
- Hàng đầu bảng: tên các phương án. Cột đầu: tiêu chí so sánh.
- Câu kết luận ngay sau bảng: "[A] phù hợp khi… [B] phù hợp khi…" — 1–2 câu.
`.trim(),

  review: `
## TỐI ƯU FEATURED SNIPPET — REVIEW
- Câu đầu: kết luận ngắn (tốt/trung bình/không nên) + lý do chính.
- Có thẻ rating schema nếu có thể: <span itemprop="ratingValue">4.5</span>/5.
- Ưu/nhược điểm dạng <ul> với icon ✓ / ✗ trong text.
`.trim(),

  blog_seo: '',
  pillar: '',
  local_seo: '',
};
```

### Bước 2: Import và inject vào `server.ts`

```typescript
// Thêm vào đầu file server.ts
import { SEO_PROMPT_RULES, SNIPPET_RULES_BY_TONE } from '@/lib/shared/prompt-rules';

// Trong buildVbtWritingPrompt(), thêm vào prompt:
function buildVbtWritingPrompt(config: VbtStep3Config & { semantic?: SemanticAnalysis }): string {
  const snippetRule = SNIPPET_RULES_BY_TONE[config.contentType] ?? '';

  return `
Bạn là SEO Writer chuyên nghiệp. Viết bài HTML hoàn chỉnh, hữu ích, tự nhiên.

${SEO_PROMPT_RULES}

${snippetRule ? `${snippetRule}\n` : ''}
[... phần còn lại của prompt giữ nguyên, chỉ sửa tiếng Việt có dấu ...]
`.trim();
}
```

---

## FIX 3 — computeSeoChecks 21 checks

**File:** `web/lib/shared/seo-checks.ts`

Thêm 7 checks vào cuối mảng `checks` (sau check index 13):

```typescript
// Thêm vào cuối mảng checks trong computeSeoChecks():

// ⚠️ LƯU Ý: Trong computeSeoChecks(), HTML được truy cập qua input.html (không phải html),
// title qua input.title, metaDescription qua input.metaDescription.
// Các check mới dưới đây đã dùng đúng tên biến.
// Ngoài ra: KHÔNG thêm field id vào object — interface SeoCheck không có field này.

// Check 15 — H1 duy nhất
{
  group: 'advanced' as const,
  label: 'Chỉ có 1 thẻ <h1> trong bài',
  pass: (input.html.match(/<h1[\s>]/gi) ?? []).length === 1,
  fixable: false,
},

// Check 16 — H2 count
{
  group: 'advanced' as const,
  label: 'Có ít nhất 2 thẻ <h2>',
  pass: (input.html.match(/<h2[\s>]/gi) ?? []).length >= 2,
  fixable: false,
  detail: `${(input.html.match(/<h2[\s>]/gi) ?? []).length} H2 tìm thấy`,
},

// Check 17 — Heading hierarchy (không có H3 trước H2)
{
  group: 'advanced' as const,
  label: 'Cấu trúc heading đúng thứ bậc (H2 trước H3)',
  pass: (() => {
    const headings = [...input.html.matchAll(/<(h[1-6])[\s>]/gi)].map((m) => parseInt(m[1][1]));
    let maxSeen = 1;
    for (const level of headings) {
      if (level > maxSeen + 1) return false;
      maxSeen = Math.max(maxSeen, level);
    }
    return true;
  })(),
  fixable: false,
},

// Check 18 — Title length
{
  group: 'title' as const,
  label: 'Tiêu đề SEO 50–70 ký tự',
  pass: input.title.length >= 50 && input.title.length <= 70,
  fixable: true,
  detail: `${input.title.length} ký tự`,
},

// Check 19 — Meta description length
{
  group: 'advanced' as const,
  label: 'Meta description 120–160 ký tự',
  pass: input.metaDescription.length >= 120 && input.metaDescription.length <= 160,
  fixable: true,
  detail: `${input.metaDescription.length} ký tự`,
},

// Check 20 — FAQ presence (cho bài ≥ 1000 từ)
{
  group: 'advanced' as const,
  label: 'Có section FAQ (bài ≥ 1000 từ)',
  pass: (() => {
    if (input.wordCount < 1000) return true;
    return input.html.toLowerCase().includes('faq') ||
           input.html.toLowerCase().includes('câu hỏi thường gặp') ||
           input.html.includes('class="faq');
  })(),
  fixable: false,
},

// Check 21 — TOC presence (cho bài ≥ 1500 từ)
{
  group: 'advanced' as const,
  label: 'Có mục lục TOC (bài ≥ 1500 từ)',
  pass: (() => {
    if (input.wordCount < 1500) return true;
    return input.html.includes('<nav') || input.html.toLowerCase().includes('mục lục');
  })(),
  fixable: false,
},

// Check 22 — Không có từ cấm AI (đặt là check cuối, thay variantCheck hiện tại
// hoặc thêm sau — tùy cấu trúc mảng, miễn tổng = 21)
{
  group: 'advanced' as const,
  label: 'Không có từ cấm (vô cùng, siêu phẩm, quan trọng...)',
  pass: (() => {
    const FORBIDDEN = ['vô cùng', 'cực kỳ', 'tuyệt vời', 'siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo', 'tuy nhiên', 'bên cạnh đó', 'không chỉ'];
    const text = input.html.replace(/<[^>]+>/g, ' ').toLowerCase();
    return !FORBIDDEN.some((w) => text.includes(w));
  })(),
  fixable: false,
},
```

> **Lưu ý:** Hàm `computeSeoChecks` hiện nhận `SeoCheckInput` với đủ fields `title`, `metaDescription`, `html`, `wordCount` — không cần thêm params mới. Cũng cần cập nhật `SEO_WEIGHTS` array nếu có (thêm weight cho 7 checks mới, giá trị đề xuất: 3–4 điểm/check).

---

## FIX 4 — AICheckPanel trong Step 4

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`

### Bước 1: Thêm import

```typescript
// Thêm vào import section (dòng ~1–27)
import AICheckPanel from '@/app/components/AICheckPanel';
```

### Bước 2: Thêm vào QualityTab component

```typescript
// Tìm component QualityTab trong step4/page.tsx
// Thêm <AICheckPanel> SAU <HumannessPanel> (hoặc sau <SemanticScoreCard>)

function QualityTab({ html, humannessScore, decision, issues, forbiddenFound, summaryItems, articleId }: QualityTabProps) {
  const handleApplyFix = useCallback((original: string, replacement: string) => {
    // trigger editor apply — implement theo pattern ArticleEditor
    console.warn('AICheckPanel fix:', original, '→', replacement);
  }, []);

  return (
    <div className="space-y-4 p-4">
      <GenerateQualityPanel
        humannessScore={humannessScore}
        decision={decision}
        issues={issues}
        forbiddenFound={forbiddenFound}
        summaryItems={summaryItems}
      />

      {/* Semantic Score */}
      <SemanticScoreCard ... />

      {/* AI Check — thêm mới */}
      {html && (
        <AICheckPanel
          html={html}
          storageKey="vbt_ai_check"
          onApplyFix={handleApplyFix}
        />
      )}
    </div>
  );
}
```

---

## FIX 5 — AiFloatingToolbar trong Step 4

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`

### Bước 1: Thêm import

```typescript
import AiFloatingToolbar from '@/components/editor/AiFloatingToolbar';
import type { AiAssistCommand } from '@/components/editor/AiAssistPanel';
```

### Bước 2: Thêm state

```typescript
// Thêm state vào component chính
const [toolbarVisible, setToolbarVisible]   = useState(false);
const [toolbarX,       setToolbarX]         = useState(0);
const [toolbarY,       setToolbarY]         = useState(0);
const [selectedText,   setSelectedText]     = useState('');
```

### Bước 3: Handler selection trong editor

```typescript
const handleEditorSelect = useCallback(() => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    setToolbarVisible(false);
    return;
  }
  const text = sel.toString().trim();
  if (text.length < 10) { setToolbarVisible(false); return; }
  const range = sel.getRangeAt(0);
  const rect  = range.getBoundingClientRect();
  setSelectedText(text);
  setToolbarX(rect.left + rect.width / 2);
  setToolbarY(rect.top - 48);
  setToolbarVisible(true);
}, []);

const handleToolbarCommand = useCallback(async (command: AiAssistCommand) => {
  if (!selectedText) return;
  setToolbarVisible(false);
  // Gọi API ai-assist hoặc xử lý inline
  // Tùy implementation của AiAssistPanel trong dự án
}, [selectedText]);
```

### Bước 4: Render

```typescript
// Trong JSX, wrap editor section + render toolbar
<div onMouseUp={handleEditorSelect} onKeyUp={handleEditorSelect}>
  <ArticleEditor html={displayedHtml} streaming={loading} onChange={...} />
</div>

<AiFloatingToolbar
  visible={toolbarVisible && !loading}
  x={toolbarX}
  y={toolbarY}
  onCommand={handleToolbarCommand}
/>
```

---

## FIX 6 — InternalLinkSuggest thực (gọi API DB)

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx` + tạo mới API route

### Bước 1: Tạo API route

```typescript
// Tạo file: web/app/api/vbt/internal-links/route.ts

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { keywords, currentArticleId } = await request.json() as {
    keywords: string[];
    currentArticleId?: string;
  };

  if (!keywords?.length) {
    return NextResponse.json({ links: [] });
  }

  // Tìm bài viết liên quan theo keyword trong title/meta
  const articles = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: currentArticleId ?? '' },
      OR: keywords.flatMap((kw) => [
        { title:           { contains: kw, mode: 'insensitive' } },
        { metaDescription: { contains: kw, mode: 'insensitive' } },
        { keyword:         { contains: kw, mode: 'insensitive' } },
      ]),
    },
    select: { id: true, title: true, slug: true, keyword: true },
    take: 8,
    orderBy: { publishedAt: 'desc' },
  });

  return NextResponse.json({
    links: articles.map((a) => ({
      id:      a.id,
      title:   a.title,
      slug:    a.slug,
      keyword: a.keyword,
      url:     `/${a.slug}`,
    })),
  });
}
```

### Bước 2: Cập nhật LinksTab / LinksPanel trong step4

```typescript
// Trong step4/page.tsx hoặc component LinksPanel
// Thêm state và fetch

const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);
const [loadingLinks,  setLoadingLinks]  = useState(false);

// Fetch khi có semantic keywords
useEffect(() => {
  if (!semanticKeywords?.length || !articleId) return;
  setLoadingLinks(true);
  fetch('/api/vbt/internal-links', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ keywords: semanticKeywords, currentArticleId: articleId }),
  })
    .then((res) => res.json())
    .then((data) => setInternalLinks(data.links ?? []))
    .finally(() => setLoadingLinks(false));
}, [semanticKeywords, articleId]);

// Render trong LinksTab
{loadingLinks ? (
  <div className="text-sm text-gray-400">Đang tìm bài liên quan...</div>
) : internalLinks.length === 0 ? (
  <div className="text-sm text-gray-400">Không tìm thấy bài liên quan.</div>
) : (
  <ul className="space-y-2">
    {internalLinks.map((link) => (
      <li key={link.id} className="flex items-start justify-between gap-2 text-sm border rounded-lg p-2">
        <div>
          <p className="font-medium text-gray-800">{link.title}</p>
          <p className="text-xs text-gray-400">{link.url}</p>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(link.url)}
          className="text-xs text-blue-600 hover:underline flex-shrink-0"
        >
          Copy link
        </button>
      </li>
    ))}
  </ul>
)}
```

---

## FIX 7 — AI Suggest gọi API thực (Step 1)

**File:** `web/app/viet-bai-thong-minh/page.tsx` + tạo mới API route

### Bước 1: Tạo API route

```typescript
// Tạo file: web/app/api/vbt/suggest-keywords/route.ts

import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { NextResponse } from 'next/server';

export const maxDuration = 15;

export async function POST(request: Request) {
  const { keyword, contentType, language } = await request.json() as {
    keyword:     string;
    contentType: string;
    language:    string;
  };

  if (!keyword?.trim()) return NextResponse.json({ suggestions: [] });

  const model  = buildTinhGonModel('gemini-flash');
  const prompt = `
Gợi ý 8 keyword phụ (secondary keywords) cho bài viết SEO.

Keyword chính: ${keyword}
Loại nội dung: ${contentType}
Ngôn ngữ: ${language}

Yêu cầu:
- Keyword phụ phải liên quan trực tiếp đến keyword chính.
- Ưu tiên long-tail keywords (3–5 từ).
- Bao gồm: câu hỏi thường gặp, so sánh, cách chọn, giá cả, đánh giá.
- Không lặp lại keyword chính.

Trả về JSON array string[], ví dụ: ["keyword a", "keyword b", ...]
Không giải thích thêm.
`.trim();

  try {
    const result      = await model.generateContent(prompt);
    const raw         = result.response.text().trim();
    const match       = raw.match(/\[[\s\S]*\]/);
    const suggestions = match ? (JSON.parse(match[0]) as string[]) : [];
    return NextResponse.json({ suggestions: suggestions.slice(0, 8) });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
```

### Bước 2: Cập nhật `handleSuggestKeywords` trong Step 1

```typescript
// ❌ TRƯỚC — dòng 107–117
function handleSuggestKeywords() {
  setSuggestingKw(true);
  const base        = keyword.trim();
  const suggestions = base
    ? [`${base} la gi`, `cach chon ${base}`, `${base} gia bao nhieu`, `kinh nghiem ${base}`]
    : [];
  const existing = secondaryKeywordsRaw.split(',').map((item) => item.trim()).filter(Boolean);
  const merged   = Array.from(new Set([...existing, ...suggestions]));
  setSecondaryKeywordsRaw(merged.join(', '));
  window.setTimeout(() => setSuggestingKw(false), 250);
}

// ✅ SAU
async function handleSuggestKeywords() {
  if (!keyword.trim()) return;
  setSuggestingKw(true);
  try {
    const res  = await fetch('/api/vbt/suggest-keywords', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ keyword: keyword.trim(), contentType, language }),
    });
    const data = await res.json() as { suggestions: string[] };
    const existing = secondaryKeywordsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const merged   = Array.from(new Set([...existing, ...data.suggestions]));
    setSecondaryKeywordsRaw(merged.join(', '));
  } catch {
    // fallback im lặng
  } finally {
    setSuggestingKw(false);
  }
}
```

---

## FIX 8 — competitorInsights là AI summary thực ✅ ĐÃ FIX SAU REFACTOR

**File:** `web/app/api/vbt/analyze/route.ts`

> **Trạng thái:** Bug này đã được fix trong lần refactor P2. Kiểm tra xác nhận:
> - `buildAnalyzePrompt()` đã có `"competitorInsights": "string"` trong OUTPUT JSON schema.
> - `parseSemanticResponse()` đã đọc `record.competitorInsights` thay vì hardcode.
> - **Bỏ qua fix này, chuyển sang Fix 9.**

~~Vấn đề: `competitorInsights` hiện trả về hardcode string "Da doc N URL doi thu: url1, url2".~~

### Bước 1: Thêm field vào prompt

```typescript
// Trong buildAnalyzePrompt() — phần OUTPUT JSON schema
// Thêm field competitorInsights vào schema JSON yêu cầu AI trả về:

OUTPUT JSON:
{
  "macroContext":      "string — chủ đề tổng quát",
  "searchIntent":     "informational | navigational | commercial | transactional",
  "intentExplanation":"string — giải thích ngắn",
  "rppMap":           [{ "pain": "string", "relevance": "high|medium|low" }],
  "attributeMap":     [{ "attr": "string", "importance": "must|should|nice_to_have" }],
  "semanticKeywords": ["string"],
  "suggestedContentType": "string",
  "estimatedWordCount": 1200,
  "competitorInsights": "string — 2-3 câu tóm tắt điểm mạnh/yếu đối thủ, hoặc empty string nếu không có dữ liệu"
}
```

### Bước 2: Cập nhật `analyze/route.ts`

```typescript
// ❌ TRƯỚC — dòng ~36–38
const competitorInsights = competitorItems.length
  ? `Da doc ${competitorItems.length} URL doi thu: ${competitorItems.map((item) => item.url).join(', ')}`
  : '';

// ✅ SAU — lấy từ AI response thay vì hardcode
// Trong parseSemanticResponse() hoặc sau khi parse JSON từ AI:
const parsed = JSON.parse(aiJsonResponse); // kết quả từ model.generateContent(prompt)
const competitorInsights = parsed.competitorInsights ?? '';
// Không còn hardcode string — dùng giá trị AI đã phân tích
```

---

## FIX 9 — Target Length chip buttons (Step 3)

**File:** `web/app/viet-bai-thong-minh/step3/page.tsx` — dòng ~428–443

```tsx
// ❌ TRƯỚC
<input
  type="number" min={600} max={5000} step={100}
  value={targetLength}
  onChange={(event) => setTargetLength(Number(event.target.value))}
  className="..."
/>

// ✅ SAU
const TARGET_LENGTH_OPTIONS = [
  { value: 600,  label: '600',  note: 'Tin tức / ngắn' },
  { value: 1000, label: '1000', note: 'Blog cơ bản' },
  { value: 1500, label: '1500', note: 'Chuẩn SEO' },
  { value: 2500, label: '2500', note: 'Pillar / chuyên sâu' },
  { value: 4000, label: '4000', note: 'Mega guide' },
] as const;

<div className="flex flex-wrap gap-2">
  {TARGET_LENGTH_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      type="button"
      onClick={() => setTargetLength(opt.value)}
      title={opt.note}
      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
        targetLength === opt.value
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
      }`}
    >
      {opt.label} từ
    </button>
  ))}
</div>
{semantic?.estimatedWordCount && (
  <p className="mt-1 text-xs text-gray-400">
    AI gợi ý: ~{semantic.estimatedWordCount.toLocaleString()} từ
  </p>
)}
```

---

## FIX 10 — RPP progress bar (Step 2)

**File:** `web/app/viet-bai-thong-minh/step2/page.tsx` — dòng ~113–133

```tsx
// ❌ TRƯỚC — badge text đơn giản
{semantic.rppMap.map((item) => (
  <div key={item.pain} className="...">
    <p>{item.pain}</p>
    <span className={`badge ${item.relevance === 'high' ? 'bg-red-100 text-red-700' : '...'}`}>
      {item.relevance}
    </span>
  </div>
))}

// ✅ SAU — có progress bar
const RPP_BAR_MAP: Record<string, { pct: number; color: string; label: string }> = {
  high:   { pct: 100, color: 'bg-red-500',    label: 'Cao' },
  medium: { pct: 60,  color: 'bg-amber-400',  label: 'Trung bình' },
  low:    { pct: 30,  color: 'bg-gray-300',   label: 'Thấp' },
};

{semantic.rppMap.map((item) => {
  const bar = RPP_BAR_MAP[item.relevance] ?? RPP_BAR_MAP.low;
  return (
    <div key={item.pain} className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{item.pain}</span>
        <span className="text-xs font-medium text-gray-500">{bar.label}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${bar.color}`}
          style={{ width: `${bar.pct}%` }}
        />
      </div>
    </div>
  );
})}
```

---

## FIX 11 — Schema + OG Preview trong Publish tab

**File:** `web/components/generate/PublishPanel.tsx`

Thêm 2 section collapsible ở cuối panel, trước nút Publish:

```tsx
// Thêm vào phần cuối JSX của PublishPanel, trước submit button

{/* Article JSON-LD Schema */}
<details className="border border-gray-200 rounded-lg overflow-hidden">
  <summary className="px-4 py-2.5 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
    Schema JSON-LD (Article)
  </summary>
  <div className="px-4 pb-3">
    <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto max-h-48 text-gray-500">
      {JSON.stringify({
        "@context":    "https://schema.org",
        "@type":       "Article",
        "headline":    title,
        "description": metaDescription,
        "url":         `https://noithatminhquan.vn/${slug}`,
        "author": {
          "@type": "Organization",
          "name":  "Nội Thất Minh Quân"
        },
        "publisher": {
          "@type": "Organization",
          "name":  "Nội Thất Minh Quân",
          "logo": {
            "@type": "ImageObject",
            "url":   "https://noithatminhquan.vn/logo.png"
          }
        }
      }, null, 2)}
    </pre>
    <button
      type="button"
      onClick={() => {
        const schema = JSON.stringify({ /* same object */ }, null, 2);
        void navigator.clipboard.writeText(schema);
      }}
      className="mt-2 text-xs text-blue-600 hover:underline"
    >
      Copy JSON-LD
    </button>
  </div>
</details>

{/* Open Graph Preview */}
<details className="border border-gray-200 rounded-lg overflow-hidden">
  <summary className="px-4 py-2.5 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
    Open Graph Preview
  </summary>
  <div className="px-4 pb-3">
    {/* OG Card mockup */}
    <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
      <div className="bg-gray-100 h-24 flex items-center justify-center text-gray-400 text-xs">
        OG Image (1200×630)
      </div>
      <div className="p-3 bg-white">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">noithatminhquan.vn</p>
        <p className="font-medium text-gray-900 line-clamp-2">{title}</p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{metaDescription}</p>
      </div>
    </div>
    {/* OG meta tags */}
    <pre className="mt-2 text-xs bg-gray-50 rounded p-2 overflow-auto text-gray-400">
{`<meta property="og:title"       content="${title}" />
<meta property="og:description" content="${metaDescription}" />
<meta property="og:url"         content="https://noithatminhquan.vn/${slug}" />
<meta property="og:type"        content="article" />`}
    </pre>
  </div>
</details>
```

---

## CHECKLIST SAU KHI FIX

```
P1 — Ảnh hưởng output AI:
□ Fix 1: Prompt có dấu — 3 hàm trong server.ts
□ Fix 2: SEO_PROMPT_RULES inject — tạo lib/shared/prompt-rules.ts + import server.ts
□ Fix 3: SNIPPET_RULES_BY_TONE inject — dùng từ file trên
□ Fix 4: computeSeoChecks — thêm 7 checks mới vào seo-checks.ts

P2 — Tính năng UI:
□ Fix 5: AICheckPanel — import + render trong QualityTab của step4
□ Fix 6: AiFloatingToolbar — import + state + handler + render trong step4
□ Fix 7: InternalLinkSuggest — tạo /api/vbt/internal-links + cập nhật LinksTab
□ Fix 8: AI Suggest API — tạo /api/vbt/suggest-keywords + cập nhật handleSuggestKeywords
☑ Fix 9: competitorInsights — ĐÃ FIX trong refactor P2, bỏ qua

P3 — UI nhỏ:
□ Fix 10: Target Length chips — thay input number bằng 5 button chips trong step3
□ Fix 11: RPP progress bar — thay badge text bằng progress bar trong step2
□ Fix 12: Schema + OG — thêm 2 <details> section vào PublishPanel

Sau khi fix xong, chạy:
□ Test Step 1 → Step 2 (verify prompt có dấu, semantic analysis đúng)
□ Test generate bài — verify SEO rules được inject, word count đúng
□ Test Tab Chất lượng — verify AICheckPanel xuất hiện
□ Test Tab SEO — verify 21 checks hiển thị đầy đủ
□ Test Tab Internal Links — verify danh sách bài liên quan từ DB
```
