# UNIFIED-GENERATE-PAGE.md
## Chuẩn hóa tất cả Generate/Editor pages — Layout & Tabs đồng nhất

> Viết ngày 2026-05-28 · Reference: `/viet-tin-tuc/generate`
> Áp dụng cho: tất cả trang `*/generate` và trang editor cuối cùng của từng flow

---

## 1. TỔNG QUAN

Tất cả generate pages phải dùng **cùng một layout**, chỉ khác nhau ở dữ liệu đầu vào và các tab conditional (Nguồn, Hình ảnh).

### Mục tiêu
- User học một lần, dùng được mọi page
- Code có thể share components tối đa
- Dễ maintain & mở rộng tính năng sau này

---

## 2. LAYOUT CHUẨN

```
┌─────────────────────────────────────────────────────┐
│  HEADER: [Title] [Keyword] [Save] [Export] [Stop]   │
├────────────────────────────┬────────────────────────┤
│                            │  TAB BAR (5 tabs)       │
│   RICH EDITOR (flex-1)     ├────────────────────────┤
│   - Toolbar đầy đủ         │                        │
│   - bg-gray-100 outer      │  TAB CONTENT           │
│   - bg-white card inner    │  (overflow-y-auto)     │
│   - AiFloatingToolbar      │                        │
│                            │                        │
└────────────────────────────┴────────────────────────┘
```

### Kích thước
- **Editor** (`<main>`): `flex-1 min-w-0`, padding `p-6`, bg `gray-100`
- **Side panel** (`<aside>`): fixed width `w-[420px]` hoặc `w-[34rem]`, border-left
- **Header**: `border-b border-gray-200 bg-white px-5 py-3`

### Editor component
Dùng **`RichArticleEditor`** (`@/components/editor/RichArticleEditor`) — KHÔNG dùng `ArticleEditor` (toolbar thiếu tính năng).

Props của `RichArticleEditor`:
```typescript
<RichArticleEditor
  html={displayedHtml}
  streaming={loading}          // disable edit khi đang generate
  wordCount={wordCount}        // hiển thị ở toolbar
  keyword={config.keyword}     // dùng cho imgAlt default
  articleTitle={editTitle}     // dùng cho export Word filename
  onChange={handleEditorChange}
  onSave={() => void saveDraft()}
  onNewArticle={handleRestart} // hiện nút "Bài mới" nếu có
/>
```

---

## 3. CÁC TAB CHUẨN (5 tabs)

```typescript
type GenerateTab = 'seo' | 'ai' | 'quality' | 'sources' | 'images';
```

### Tab layout pattern
```tsx
<div className="flex border-b border-gray-200 flex-shrink-0">
  {TABS.map((tab) => (
    <button
      key={tab.key}
      onClick={() => setSideTab(tab.key)}
      className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
        sideTab === tab.key
          ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

---

### TAB 1 — SEO

**Label:** `SEO`

**Nội dung (theo thứ tự từ trên xuống):**

#### 1a. SEO Score Bar
```
SEO Score ──────────────── 79%
████████████░░░░ Cần cải thiện
```
- Màu: green ≥80, amber 60–79, red <60

#### 1b. Keyword Density Bar
```
Keyword Density ────────── 1.15%
████████░░░░░░ Target: 1–1.5% · Đạt chuẩn
```
- Dùng `<KeywordDensityBar density={...} />`

#### 1c. Trạng thái draft
Card nhỏ hiện metadata bài viết:
```
Trạng thái draft               DB linked
Keyword: xu hướng nội thất 2026
Model: gpt-5.4
Cấu trúc: auto
Giọng văn: formal
Nguồn tin: 7
──────────────────────────────────
Meta description:
[textarea 4 rows, editable]
```

#### 1d. SERP Preview (collapsible)
- Header clickable toggle `▼ / ▲`
- URL slug (editable, copy button)
- Preview card: blue title + green URL + meta snippet
- Khi title/slug/meta có thay đổi → highlight `bg-yellow-50 border-yellow-300`

#### 1e. SEO Kiểm tra (3 nhóm collapsible)

Mỗi nhóm có badge `✓ All Good` (green) hoặc `N Lỗi` (orange):

**Nhóm: SEO Cơ bản**
| # | Check | Fix button |
|---|-------|-----------|
| 0 | Từ khóa chính có trong SEO title | 🔧 Thêm từ khóa vào tiêu đề |
| 1 | Từ khóa chính trong Meta Description | 🔧 Chèn từ khóa vào meta |
| 2 | Từ khóa chính xuất hiện trong URL slug | 🔧 Tạo slug chuẩn |
| 3 | Từ khóa trong 10% đầu nội dung | — |
| 4 | Từ khóa chính xuất hiện trong nội dung | — |
| 5 | Độ dài nội dung >= 400 từ | — |

**Nhóm: Nâng cao**
| # | Check | Fix button |
|---|-------|-----------|
| 6 | Mật độ từ khóa đạt 1-1.5% | ⚡ AI Fix — Tăng mật độ từ khóa |
| 7 | URL slug <= 75 ký tự | 🔧 Rút gọn slug |
| 8 | Có >= 1 internal link | 🔧 Fix — Chèn internal link (expand form) |
| 9 | Có >= 1 external link | 🔧 Fix — Chèn external link (expand form) |
| 10 | Từ khóa trong alt text ảnh | 🔧 Fix — Tự động thêm alt text |
| 11 | Có từ 2 nguồn tin trở lên | — |
| ... | Thêm H1, H2, cấu trúc heading, FAQ, TOC | — |

**Nhóm: Tiêu đề thu hút**
| # | Check | Fix button |
|---|-------|-----------|
| 12 | Từ khóa ở 1/3 đầu tiêu đề | 🔧 Đưa từ khóa lên đầu tiêu đề |
| 13 | Tiêu đề chứa số (năm/thông số...) | 🔧 Thêm năm [currentYear] |
| 14 | Tiêu đề SEO 50-70 ký tự | — |

#### 1f. Humanness Score
```
Humanness Score                94/100
████████████████████░░░░
  21           24
  Ngôn ngữ    Cấu trúc
  tự nhiên    bài
  24           25
  E-E-A-T     Engagement
```
- Dùng `<HumannessPanel score={...} decision={...} issues={...} forbiddenFound={...} stale={recheckPending} />`

#### 1g. Internal links gợi ý
- Hiện danh sách bài liên quan từ DB (fetch `/api/articles/related`)
- Nếu trống: "Chưa có gợi ý internal link phù hợp"

#### 1h. Nút restart
```
🔄 Viết lại từ đầu
```
- Xóa session storage → redirect về trang input

---

### TAB 2 — Kiểm tra AI

**Label:** `🔍 KIỂM TRA AI`

> **Thứ tự render đúng (theo ảnh thực tế):** SEO nhanh → AI Edit → AICheckPanel

#### 2a. SEO nhanh (mini card) — render ĐẦU TIÊN
```
SEO nhanh
Mật độ từ khóa: 0.49%  (orange — Cần thêm từ khóa)
Độ dài: 3,477 từ        (green)
Keyword Density ████░░░░░░ 0.49%
Target: 1–1.5% · Cần thêm từ khóa
```
- Tính real-time từ `editorHtml`
- Không cần gọi API

#### 2b. AI Edit theo vùng chọn — render THỨ HAI

**Khi CHƯA chọn đoạn văn:**
```
AI Edit theo vùng chọn
Bôi đen đoạn văn ngay trong editor bên trái
rồi chọn lệnh AI Edit.
[10 buttons grid 2 cols - disabled]
```
- Hiện đủ 10 nút nhưng bị disabled (không click được)

**Khi ĐÃ chọn đoạn văn:**
```
ĐOẠN ĐÃ CHỌN
┌──────────────────────────────────┐
│ Cách chọn mua bàn inox tròn...   │
└──────────────────────────────────┘
⚡ Gemini 2.0 Flash ▸

[Giải thích]    [Đặt tiêu đề]
[Tạo outline]   [Rút ngắn]
[Viết lại]      [Thành danh sách]
[Ưu & Nhược]    [Viết mở bài]
[Viết kết bài]  [Tạo FAQ]
Yêu cầu khác: [input] [Gửi]
```
- Cùng 10 nút, được enable khi có selection

Commands đầy đủ:
```typescript
const AI_EDIT_COMMANDS = [
  { value: 'shorten',       label: 'Rút ngắn',          icon: '✂️' },
  { value: 'expand',        label: 'Mở rộng',            icon: '📝' },
  { value: 'humanize',      label: 'Tự nhiên hơn',       icon: '✨' },
  { value: 'more_spec',     label: 'Thêm chi tiết',      icon: '🔍' },
  { value: 'stronger_cta',  label: 'CTA mạnh hơn',       icon: '🚀' },
  { value: 'rewrite',       label: 'Viết lại đoạn',      icon: '🔄' },
  { value: 'explain',       label: 'Giải thích',         icon: '💬' },
  { value: 'set_title',     label: 'Đặt tiêu đề',        icon: '📌' },
  { value: 'outline',       label: 'Tạo outline',        icon: '📋' },
  { value: 'to_list',       label: 'Thành danh sách',    icon: '📍' },
  { value: 'pros_cons',     label: 'Ưu & Nhược điểm',    icon: '⚖️' },
  { value: 'write_intro',   label: 'Viết mở bài',        icon: '🏁' },
  { value: 'write_outro',   label: 'Viết kết bài',       icon: '🏴' },
  { value: 'create_faq',    label: 'Tạo FAQ',            icon: '❓' },
  { value: 'custom',        label: 'Yêu cầu khác',       icon: '✏️' }, // free text input
];
// Hiển thị 10 nút trong grid (không hiện shorten/expand/humanize/more_spec/stronger_cta/rewrite riêng)
// 10 nút: explain, set_title, outline, shorten, rewrite, to_list, pros_cons, write_intro, write_outro, create_faq
```

#### 2c. Kiểm tra giọng AI (AICheckPanel) — render CUỐI
```
🔍 Kiểm tra giọng AI

Phân tích từng câu — xác định đoạn nào Google
có thể nhận diện là nội dung AI.

Google dùng perplexity và burstiness để detect AI.
Câu quá mượt, đều nhau, dùng transition words sẽ
bị đánh dấu.

Chọn AI chấm điểm (nên khác model đã viết bài)
⚡ Gemini 2.0 Flash ▸

[🔍 Phân tích bài viết]
```
- Dùng `<AICheckPanel html={...} onApplyFix={...} storageKey={...} getSentenceTargets={...} />`

---

### TAB 3 — QC Chất lượng

**Label:** `QC CHẤT LƯỢNG`

#### 3a. Humanness Score card (nếu chưa có ở SEO tab — tránh duplicate)
- Chỉ show nếu tab SEO không có HumannessPanel

#### 3b. Quality checks
```
Paragraphs        Không có đoạn quá dài    ✓
Visual breaks     Có danh sách/bảng        ✓
Word count        1,066                     —
```
- Dùng `<GenerateQualityPanel ... />`
- issues từ stream result

#### 3c. Forbidden words found
- Danh sách từ bị cấm xuất hiện trong bài
- Mỗi từ có nút "Fix — Xóa/thay"

---

### TAB 4 — Nguồn

**Label:** `NGUỒN (N)` — N = số nguồn

**Conditional:** Chỉ hiển thị tab này với pages có nguồn tin (viet-tin-tuc, viet-theo-nguon, viet-tu-google-search, ...). Pages không có nguồn → ẩn tab này.

**Nội dung:**
```
[Source card 1]                     #1
Xu hướng nội thất năm 2026 – Tầm nhìn mới...
Báo điện tử Tiền Phong • Mon, 16 Feb 2026
Xu hướng nội thất năm 2026 – Tầm nhìn mới...
Mở nguồn →

[Source card 2] ...
```

```tsx
sources.map((source, index) => (
  <a key={source.link} href={source.link} target="_blank" rel="noreferrer"
     className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-semibold text-gray-800">{source.title}</p>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">#{index + 1}</span>
    </div>
    <p className="text-xs text-gray-500 mt-1">{source.source} • {source.pubDate}</p>
    {source.snippet && <p className="text-xs text-gray-600 mt-2">{source.snippet}</p>}
    <p className="text-xs text-blue-600 mt-3">Mở nguồn →</p>
  </a>
))
```

---

### TAB 5 — Hình ảnh

**Label:** `HÌNH ẢNH`

**Phase 1 (hiện tại):** Placeholder
```
🖼️
Thư viện hình ảnh
[Coming soon message]
```

**Phase 2 (tương lai):** Image library
- Hiển thị ảnh đã gen (từ image-gen.md step 3b trong pipeline)
- Click → insert vào editor
- Upload ảnh mới
- ALT text editor

---

## 4. INVENTORY — TẤT CẢ GENERATE PAGES

### Pages hiện tại & trạng thái

| Route | Editor | Tabs hiện có | Cần migration |
|-------|--------|-------------|---------------|
| `/viet-tin-tuc/generate` | Rich (inline) | SEO ✅ \| AI ✅ \| Nguồn ✅ | Thêm: QC, Hình ảnh |
| `/viet-tinh-gon/generate` | Rich (inline) | SEO ✅ \| AI ✅ \| Sản phẩm ❌ | Đổi tab 3 → QC, thêm Nguồn†, Hình ảnh |
| `/viet-danh-gia-san-pham/generate` | Rich (inline) | SEO ✅ \| AI ✅ \| Sản phẩm ❌ | Đổi tab 3 → QC, thêm Nguồn†, Hình ảnh |
| `/viet-bai-thong-minh/step4` | **ArticleEditor** ❌ | SEO ✅ \| Quality ✅ \| Links ✅ \| Publish ✅ | Đổi sang RichArticleEditor, chuẩn hóa tabs |
| `/viet-theo-tu-khoa/generate` | **ArticleEditor** ❌ | SEO ✅ \| Quality \| Links \| Publish | Đổi sang RichArticleEditor, chuẩn hóa tabs |
| `/viet-tu-google-search/generate` | **ArticleEditor** ❌ | Chưa audit | Audit + migrate |
| `/viet-lai-tin-tuc/generate` | **ArticleEditor** ❌ | Chưa audit | Audit + migrate |
| `/viet-lai-url/generate` | **ArticleEditor** ❌ | Chưa audit | Audit + migrate |
| `/viet-lai-bai-viet/generate` | **ArticleEditor** ❌ | Chưa audit | Audit + migrate |
| `/viet-tu-facebook/generate` | Chưa audit | Chưa audit | Audit + migrate |
| `/viet-toplist/generate` | Chưa audit | Chưa audit | Audit + migrate |
| `/viet-theo-nguon/generate` | Chưa audit | Chưa audit | Audit + migrate |
| `/viet-theo-dan-bai/generate` | Chưa audit | Chưa audit | Audit + migrate |

† Tab Nguồn hiện lên nếu page có dữ liệu nguồn; ẩn nếu không có.

---

## 5. KIẾN TRÚC SHARED COMPONENTS

### Hiện có (`web/components/`)

```
web/components/
├── editor/
│   ├── RichArticleEditor.tsx      ← Editor chuẩn (DÙNG CÁI NÀY)
│   ├── ArticleEditor.tsx          ← Cũ, toolbar thiếu — sẽ bị deprecated
│   ├── EditorToolbar.tsx          ← Basic toolbar (dùng bởi ArticleEditor)
│   ├── AiFloatingToolbar.tsx      ← Floating toolbar khi select text
│   ├── SerpPreview.tsx            ← SERP Preview card
│   └── ExportMenu.tsx             ← Export Word/HTML menu
├── generate/
│   ├── GeneratePanelTabs.tsx      ← Tab bar (cần update cho 5 tabs mới)
│   ├── QualityPanel.tsx           ← Tab QC content
│   ├── LinksPanel.tsx             ← Tab Links content
│   └── PublishPanel.tsx           ← Publish/save actions
└── tinh-gon/
    ├── HumannessPanel.tsx         ← Humanness Score card
    ├── KeywordDensityBar.tsx      ← Keyword density progress bar
    └── InternalLinkSuggest.tsx    ← Internal link suggestions
```

### Cần tạo mới

```
web/components/generate/
├── SeoTab.tsx           ← Toàn bộ nội dung Tab SEO (extract từ viet-tin-tuc)
├── AiTab.tsx            ← Toàn bộ nội dung Tab AI (AI Edit + AICheck + SEO nhanh)
├── SourcesTab.tsx       ← Danh sách nguồn tin
└── ImagesTab.tsx        ← Thư viện hình ảnh (placeholder → real)
```

### `GeneratePanelTabs` — cần update

Hiện tại chỉ support `['seo', 'quality', 'links', 'publish']`. Cần thêm tab type mới:

```typescript
// web/lib/shared/generate-tabs.ts — cập nhật
export const GENERATE_TABS = ['seo', 'ai', 'quality', 'sources', 'images'] as const;
export type GenerateTab = typeof GENERATE_TABS[number];

export const TAB_LABELS: Record<GenerateTab, string> = {
  seo: 'SEO',
  ai: '🔍 KIỂM TRA AI',
  quality: 'QC CHẤT LƯỢNG',
  sources: 'NGUỒN',
  images: 'HÌNH ẢNH',
};
```

---

## 6. THỨ TỰ MIGRATION (ưu tiên)

### P0 — Làm ngay (blocking UX)
1. **`/viet-tin-tuc/generate`** ✅ **DONE (2026-05-28)** — đã thêm tab `quality` (CHẤT LƯỢNG) + tab `images` (HÌNH ẢNH), đạt chuẩn 5 tabs
2. **`/viet-bai-thong-minh/step4`** — ⚠️ Partially done: sidebar link ✅, fix buttons ✅, strings ✅ — còn thiếu: RichArticleEditor, tab AI, tab Hình ảnh

### P1 — Tuần này
3. **`/viet-theo-tu-khoa/generate`** — đổi editor + 5 tabs
4. **`/viet-tinh-gon/generate`** — chuẩn hóa tab (SEO đã tốt, thêm QC, Sources†, Images)
5. **`/viet-danh-gia-san-pham/generate`** — chuẩn hóa tab

### P2 — Tuần sau
6. `/viet-tu-google-search/generate`
7. `/viet-lai-tin-tuc/generate`
8. `/viet-lai-url/generate`
9. `/viet-lai-bai-viet/generate`

### P3 — Backlog
10. `/viet-tu-facebook/generate`
11. `/viet-toplist/generate`
12. `/viet-theo-nguon/generate`
13. `/viet-theo-dan-bai/generate`

---

## 7. PATTERN CODE MẪU — Page chuẩn

```tsx
'use client';

// Layout chuẩn cho tất cả generate pages

export default function GeneratePage() {
  const [sideTab, setSideTab] = useState<GenerateTab>('seo');
  const [editorHtml, setEditorHtml] = useState('');

  const TABS: Array<{ key: GenerateTab; label: string }> = [
    { key: 'seo', label: 'SEO' },
    { key: 'ai', label: '🔍 KIỂM TRA AI' },
    { key: 'quality', label: 'QC CHẤT LƯỢNG' },
    // Conditional tabs:
    ...(hasSources ? [{ key: 'sources' as const, label: `NGUỒN (${sources.length})` }] : []),
    { key: 'images', label: 'HÌNH ẢNH' },
  ];

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-gray-50">
      {/* MAIN — Editor */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3">
          <div>
            <h1 className="text-lg font-black text-gray-950">Page Title</h1>
            <p className="text-sm text-gray-500">{keyword}</p>
          </div>
          <div className="flex items-center gap-2">
            {articleId && <ExportMenu articleId={articleId} html={editorHtml} title={editTitle} />}
            {streaming && <button onClick={abort}>Dừng</button>}
            <button onClick={handleRestart}>Bắt đầu lại</button>
          </div>
        </header>

        {/* Editor area */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <RichArticleEditor
            html={editorHtml}
            streaming={loading}
            wordCount={wordCount}
            keyword={keyword}
            articleTitle={editTitle}
            onChange={setEditorHtml}
            onSave={() => void saveDraft()}
          />
        </div>
      </main>

      {/* ASIDE — Side panel */}
      <aside className="flex w-[420px] shrink-0 flex-col border-l border-gray-200 bg-white">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setSideTab(tab.key)}
              className={`flex-1 py-2.5 text-xs font-semibold ${
                sideTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {sideTab === 'seo' && <SeoTab ... />}
          {sideTab === 'ai' && <AiTab ... />}
          {sideTab === 'quality' && <QualityTab ... />}
          {sideTab === 'sources' && <SourcesTab sources={sources} />}
          {sideTab === 'images' && <ImagesTab />}
        </div>
      </aside>

      {/* AiFloatingToolbar (fixed position, always mounted) */}
      <AiFloatingToolbar
        visible={toolbarVisible && !loading}
        x={toolbarX} y={toolbarY}
        disabled={loading}
        onCommand={handleToolbarCommand}
      />
    </div>
  );
}
```

---

## 8. ENCODING RULES

Tất cả UI strings phải có dấu tiếng Việt đầy đủ. KHÔNG viết:
- ❌ `'Viet Bai Thong Minh'` → ✅ `'Viết Bài Thông Minh'`
- ❌ `'Dung'` → ✅ `'Dừng'`
- ❌ `'Bat dau lai'` → ✅ `'Bắt đầu lại'`
- ❌ `'Khong co doan qua dai'` → ✅ `'Không có đoạn quá dài'`

File encoding: UTF-8 BOM-free. Xem `FIX-ENCODING-MOJIBAKE.md` để fix các file hiện tại.

---

## 9. CHECKLIST AUDIT CHO MỖI PAGE

Khi audit/migrate một page, check:

```
EDITOR
[ ] Dùng RichArticleEditor (không phải ArticleEditor)
[ ] streaming prop disable edit khi đang generate
[ ] onChange → setEditorHtml → state sync đúng
[ ] AiFloatingToolbar hoạt động (selection → command → DOM update)

TABS
[ ] Có đủ 5 tabs (hoặc ít nhất SEO + AI + QC)
[ ] Tab Nguồn: hiện khi có sources, ẩn khi không có
[ ] Tab Hình ảnh: placeholder hoặc thật

TAB SEO
[ ] SEO Score bar
[ ] Keyword Density bar
[ ] SERP Preview (editable title/slug/meta)
[ ] 3 nhóm checks với fix buttons
[ ] HumannessPanel
[ ] Internal links gợi ý
[ ] Nút "Viết lại từ đầu"

TAB AI
[ ] AI Edit commands (≥6 lệnh, lý tưởng 14 lệnh)
[ ] Show selected text khi có selection
[ ] SEO nhanh (density + word count real-time)
[ ] AICheckPanel (Kiểm tra giọng AI)

TAB QC
[ ] GenerateQualityPanel (issues từ stream result)
[ ] Paragraph length check
[ ] Visual breaks check
[ ] Forbidden words

HEADER
[ ] Title/keyword đúng dấu
[ ] ExportMenu
[ ] Nút Dừng (khi streaming)
[ ] Nút Bắt đầu lại

ENCODING
[ ] Tất cả strings có dấu tiếng Việt
[ ] npx tsc --noEmit pass
```

---

## 10. GHI CHÚ ĐẶC BIỆT PER PAGE

### `/viet-tin-tuc/generate` ✅ CHUẨN (reference page)
- **2026-05-28:** Đã đạt 5 tabs chuẩn — `seo | ai | quality | sources | images`
- Tab `quality`: HumannessPanel + readability table + forbidden words + issues list (IIFE pattern)
- Tab `images`: placeholder card "Thư viện hình ảnh — đang phát triển"
- Tab `sources`: hiện `sources.length` dynamic trong label
- `AiFloatingToolbar` đã hoạt động
- **Dùng làm reference** cho tất cả pages còn lại

### `/viet-tinh-gon/generate` & `/viet-danh-gia-san-pham/generate`
- Tab 3 hiện là "SẢN PHẨM" → đổi thành "QC CHẤT LƯỢNG" + thêm tabs còn lại
- Đã có rich editor → chỉ cần chuẩn hóa tabs

### `/viet-bai-thong-minh/step4` ⚠️ PARTIAL
- Flow nhiều bước (step1 → step2 → step3 → **step4**)
- step4 = generate page cuối cùng → apply full layout
- **2026-05-28:** Sidebar link ✅, SEO fix buttons ✅, Vietnamese strings ✅
- **Còn lại:** RichArticleEditor migration, tab AI (tách từ Quality), tab Hình ảnh
- Xem `VIET-BAI-THONG-MINH-IMPLEMENTATION.md` Section 12 — Roadmap chi tiết

### `/viet-lai-*`
- Nhóm "Viết lại" không có nguồn tin → ẩn tab Nguồn
- Có thể không có semantic analysis → ẩn semantic score

---

*Document này là source of truth cho tất cả generate page migrations.*
*Cập nhật khi có thêm tính năng mới vào layout chuẩn.*
