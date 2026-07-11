# FIX-VIET-BAI-THONG-MINH-STEP4.md
## Danh sách bug & hướng dẫn fix — `/viet-bai-thong-minh/step4`

> Audit ngày 2026-05-28 · 3 vấn đề · 2 mức độ
> Thứ tự fix: P1 trước → P2 sau

---

## MỤC LỤC

| # | Vấn đề | File | Mức |
|---|--------|------|-----|
| 1 | `/viet-bai-thong-minh` thiếu hoàn toàn trong Sidebar nav | `web/components/Sidebar.tsx` | P1 |
| 2 | `SeoTab` không có fix buttons — chỉ hiện pass/fail tĩnh | `web/app/viet-bai-thong-minh/step4/page.tsx` | P1 |
| 3 | Toàn bộ UI strings viết không có dấu tiếng Việt | `web/app/viet-bai-thong-minh/step4/page.tsx` | P2 |

---

## FIX 1 — Thêm `/viet-bai-thong-minh` vào Sidebar (P1)

**File:** `web/components/Sidebar.tsx`
**Vấn đề:** Trang `/viet-bai-thong-minh` (Viết Bài Thông Minh) không có link nào trong nav — user không thể truy cập từ sidebar.

```typescript
// ❌ TRƯỚC — chỉ có 2 items đầu trong group "Viết Bài"
{ label: 'Viết Bài', href: '/' },
{ label: 'Viết Theo Từ Khóa', href: '/viet-theo-tu-khoa', matchPrefixes: ['/viet-theo-tu-khoa'] },
{ label: 'Viết Hàng Loạt', href: '/viet-hang-loat' },
```

```typescript
// ✅ SAU — thêm Viết Bài Thông Minh vào sau Viết Theo Từ Khóa
{ label: 'Viết Bài', href: '/' },
{ label: 'Viết Theo Từ Khóa', href: '/viet-theo-tu-khoa', matchPrefixes: ['/viet-theo-tu-khoa'] },
{
  label: 'Viết Bài Thông Minh',
  href: '/viet-bai-thong-minh',
  matchPrefixes: ['/viet-bai-thong-minh'],
},
{ label: 'Viết Hàng Loạt', href: '/viet-hang-loat' },
```

---

## FIX 2 — Thêm SEO fix buttons vào `SeoTab` (P1)

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`
**Vấn đề:** `SeoTab` hiện tại chỉ render danh sách check pass/fail tĩnh, không có nút fix. Tất cả các generate pages khác (viet-danh-gia-san-pham, viet-tinh-gon...) đều có fix buttons cho `fixTitle`, `fixMeta`, `fixSlug`, `fixTitleToStart`, `fixTitleNumber`.

### Bước 1: Thêm props vào `SeoTab` interface

```typescript
// ❌ TRƯỚC — SeoTab interface không có onFix
function SeoTab({
  html,
  keyword,
  secondaryKeywords,
  title,
  metaDescription,
  slug,
  minWordCount,
  onMetaChange,
}: {
  html: string;
  keyword: string;
  secondaryKeywords: string[];
  title: string;
  metaDescription: string;
  slug: string;
  minWordCount: number;
  onMetaChange: (field: 'title' | 'description', value: string) => void;
}) {
```

```typescript
// ✅ SAU — thêm optional fix callbacks
function SeoTab({
  html,
  keyword,
  secondaryKeywords,
  title,
  metaDescription,
  slug,
  minWordCount,
  onMetaChange,
  onFixTitle,
  onFixMeta,
  onFixSlug,
  onFixTitleToStart,
  onFixTitleNumber,
}: {
  html: string;
  keyword: string;
  secondaryKeywords: string[];
  title: string;
  metaDescription: string;
  slug: string;
  minWordCount: number;
  onMetaChange: (field: 'title' | 'description', value: string) => void;
  onFixTitle?: () => void;
  onFixMeta?: () => void;
  onFixSlug?: () => void;
  onFixTitleToStart?: () => void;
  onFixTitleNumber?: () => void;
}) {
```

### Bước 2: Thêm fix buttons vào vòng lặp renders checks

```typescript
// ❌ TRƯỚC — chỉ hiện pass/fail không có button
<div className="space-y-2">
  {seo.checks.map((check) => (
    <div key={check.label} className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex items-start gap-2">
        <span className={check.pass ? 'font-black text-green-600' : 'font-black text-red-500'}>
          {check.pass ? 'OK' : 'NO'}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800">{check.label}</p>
          {check.detail && <p className="mt-1 text-xs text-gray-500">{check.detail}</p>}
        </div>
      </div>
    </div>
  ))}
</div>
```

```typescript
// ✅ SAU — thêm fix button map theo index
const FIX_BUTTONS: Record<number, { label: string; onClick?: () => void }> = {
  0: { label: 'Tự sửa tiêu đề', onClick: onFixTitle },
  1: { label: 'Tự sửa meta', onClick: onFixMeta },
  2: { label: 'Tự sửa slug', onClick: onFixSlug },
  12: { label: 'Đưa từ khóa lên đầu', onClick: onFixTitleToStart },
  13: { label: 'Thêm số vào tiêu đề', onClick: onFixTitleNumber },
};

<div className="space-y-2">
  {seo.checks.map((check, index) => {
    const fixBtn = FIX_BUTTONS[index];
    return (
      <div key={check.label} className="rounded-xl border border-gray-100 bg-white p-3">
        <div className="flex items-start gap-2">
          <span className={check.pass ? 'font-black text-green-600' : 'font-black text-red-500'}>
            {check.pass ? 'OK' : 'NO'}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{check.label}</p>
            {check.detail && <p className="mt-1 text-xs text-gray-500">{check.detail}</p>}
            {!check.pass && fixBtn?.onClick && (
              <button
                type="button"
                onClick={fixBtn.onClick}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {fixBtn.label}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  })}
</div>
```

### Bước 3: Định nghĩa fix functions trong `VietBaiThongMinhStep4` component

Thêm 5 hàm fix vào component (sau `handleSaveDraft`):

```typescript
function fixTitle() {
  if (!step1?.keyword || !panelTitle) return;
  const kw = step1.keyword.trim();
  if (panelTitle.toLowerCase().includes(kw.toLowerCase())) return;
  const fixed = `${kw} - ${panelTitle}`;
  setTitle(fixed);
  setSlug(slugify(fixed));
}

function fixMeta() {
  if (!step1?.keyword || !displayedHtml) return;
  const words = stripHtml(displayedHtml).split(/\s+/).filter(Boolean).slice(0, 30).join(' ');
  setMetaDescription(`${step1.keyword}: ${words}...`.slice(0, 160));
}

function fixSlug() {
  if (!panelTitle) return;
  setSlug(slugify(panelTitle));
}

function fixTitleToStart() {
  if (!step1?.keyword || !panelTitle) return;
  const kw = step1.keyword.trim();
  if (panelTitle.toLowerCase().startsWith(kw.toLowerCase())) return;
  const fixed = `${kw} - ${panelTitle}`;
  setTitle(fixed);
  setSlug(slugify(fixed));
}

function fixTitleNumber() {
  if (!panelTitle) return;
  const hasNumber = /\d/.test(panelTitle);
  if (hasNumber) return;
  const fixed = `${panelTitle} - Top 10`;
  setTitle(fixed);
  setSlug(slugify(fixed));
}
```

### Bước 4: Truyền fix handlers vào `SeoTab` trong JSX

```typescript
// ❌ TRƯỚC
<SeoTab
  html={displayedHtml}
  keyword={step1.keyword}
  secondaryKeywords={secondaryKeywords}
  title={panelTitle}
  metaDescription={panelMeta}
  slug={panelSlug}
  minWordCount={minWordCount}
  onMetaChange={handleMetaChange}
/>
```

```typescript
// ✅ SAU
<SeoTab
  html={displayedHtml}
  keyword={step1.keyword}
  secondaryKeywords={secondaryKeywords}
  title={panelTitle}
  metaDescription={panelMeta}
  slug={panelSlug}
  minWordCount={minWordCount}
  onMetaChange={handleMetaChange}
  onFixTitle={fixTitle}
  onFixMeta={fixMeta}
  onFixSlug={fixSlug}
  onFixTitleToStart={fixTitleToStart}
  onFixTitleNumber={fixTitleNumber}
/>
```

---

## FIX 3 — Sửa toàn bộ strings thiếu dấu tiếng Việt (P2)

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`

Danh sách tất cả strings cần sửa (dùng Find & Replace):

| Tìm | Thay bằng |
|-----|-----------|
| `'Viet Bai Thong Minh'` | `'Viết Bài Thông Minh'` |
| `'Dung'` *(button text)* | `'Dừng'` |
| `'Bat dau lai'` | `'Bắt đầu lại'` |
| `'Dang xu ly...'` | `'Đang xử lý...'` |
| `'doan van dai can cat ngan.'` | `'đoạn văn dài cần cắt ngắn.'` |
| `'Khong co doan qua dai'` | `'Không có đoạn quá dài'` |
| `'doan tren 90 tu'` | `'đoạn trên 90 từ'` |
| `'Co danh sach/bang'` | `'Có danh sách/bảng'` |
| `'Nen them ul/ol/table'` | `'Nên thêm ul/ol/table'` |
| `'Khong co semantic keyword.'` | `'Không có semantic keyword.'` |
| `'Dang tim bai lien quan...'` | `'Đang tìm bài liên quan...'` |
| `'Bai da co link. Kiem tra anchor text truoc khi publish.'` | `'Bài đã có link. Kiểm tra anchor text trước khi publish.'` |
| `'Khong tim thay bai lien quan de chen internal link.'` | `'Không tìm thấy bài liên quan để chèn internal link.'` |
| `'Da ap dung goi y AI Check vao bai viet.'` | `'Đã áp dụng gợi ý AI Check vào bài viết.'` |
| `'Khong the goi AI assist.'` | `'Không thể gọi AI assist.'` |
| `'Khong tim thay vung editor de ap dung.'` | `'Không tìm thấy vùng editor để áp dụng.'` |
| `'AI khong tra ve noi dung.'` | `'AI không trả về nội dung.'` |
| `'AI da cap nhat doan van dang chon.'` | `'AI đã cập nhật đoạn văn đang chọn.'` |
| `'Khong the xu ly AI inline.'` | `'Không thể xử lý AI inline.'` |
| `'Da copy HTML.'` | `'Đã copy HTML.'` |
| `'Khong the luu draft.'` | `'Không thể lưu draft.'` |
| `'Cho stream hoan tat de tao articleId truoc khi publish.'` | `'Chờ stream hoàn tất để tạo articleId trước khi publish.'` |

> **Lưu ý:** Cẩn thận khi replace `'Dung'` — chỉ thay ở button text "Dừng" (abort button), không phải các biến khác.

---

## CHECKLIST XÁC NHẬN

- [ ] **Fix 1:** Sidebar có link `Viết Bài Thông Minh` → `/viet-bai-thong-minh`, active khi ở bất kỳ route `/viet-bai-thong-minh/*`
- [ ] **Fix 2:** SEO tab hiện fix buttons (`Tự sửa tiêu đề`, `Tự sửa meta`, `Tự sửa slug`, `Đưa từ khóa lên đầu`, `Thêm số vào tiêu đề`) khi check fail
- [ ] **Fix 2:** Click fix button → title/meta/slug cập nhật đúng, không crash
- [ ] **Fix 3:** Header hiện `Viết Bài Thông Minh` (có dấu)
- [ ] **Fix 3:** Button dừng stream hiện `Dừng`, nút restart hiện `Bắt đầu lại`
- [ ] **Fix 3:** Quality tab, Links tab — tất cả labels hiện tiếng Việt có dấu
- [ ] `npx tsc --noEmit` pass sau khi sửa

---

## GHI CHÚ — So sánh step4 vs generate pages khác

**Những gì step4 đã đúng:**
- Layout chuẩn: editor trái + side panel phải 420px (✅)
- `GeneratePanelTabs` với 4 tabs: SEO, Chất lượng, Internal Links, Đăng bài (✅)
- `ArticleEditor` đúng component shared (✅)
- `AICheckPanel` trong Quality tab (✅)
- `AiFloatingToolbar` cho inline selection edit (✅)
- `GeneratePublishPanel` / `GenerateQualityPanel` / `GenerateLinksPanel` dùng shared components (✅)
- `useGenerateStream` hook (✅)
- `computeSeoChecks` 21 checks (✅)
- `SerpPreview` với `onChange` wired đúng (✅)

**Những gì step4 còn thiếu (3 bugs trên):**
- ❌ Sidebar link
- ❌ SEO fix buttons
- ❌ Strings tiếng Việt đúng dấu
