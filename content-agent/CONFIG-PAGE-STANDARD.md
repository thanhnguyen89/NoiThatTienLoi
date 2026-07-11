# CONFIG-PAGE-STANDARD.md
## Bộ quy tắc chuẩn hóa Config Page cho tất cả tính năng viết bài

> Rule này áp dụng sau khi phân tích aiktp.com vs local.  
> Mục tiêu: bắt kịp điểm mạnh của aiktp + giữ điểm độc quyền của local.

---

## Câu trả lời cho câu hỏi "có nên cùng 1 rule không?"

**Không hoàn toàn đồng nhất — chia thành 2 nhóm:**

### Nhóm A — "Viết Bài Chính" (yêu cầu full feature set)
Bao gồm tất cả page tạo ra article dài (lưu DB, có Editor, có Publish):

| Page | Route |
|------|-------|
| Viết Tinh Gọn | `/viet-tinh-gon` |
| Viết Tin Tức | `/viet-tin-tuc` |
| Viết Theo Nguồn | `/viet-theo-nguon` |
| Viết Theo Dàn Bài | `/viet-theo-dan-bai` |
| Viết Toplist | `/viet-toplist` |
| Viết Đánh Giá Sản Phẩm | `/viet-danh-gia-san-pham` |
| Viết Bài Thông Minh | `/viet-bai-thong-minh` |
| Viết Lại Bài Viết | `/viet-lai-bai-viet` |
| Viết Lại URL | `/viet-lai-url` |
| Viết Lại Tin Tức | `/viet-lai-tin-tuc` |
| Viết Hàng Loạt | `/viet-hang-loat` |

**→ Phải có đủ Block A + B + C + D (xem bên dưới)**

### Nhóm B — "Công Cụ Nhanh" (stateless, không lưu DB)
Page cho output nhanh, không cần full pipeline:

| Page | Route |
|------|-------|
| Viết Lại Đoạn Văn | `/viet-lai-doan-van` |
| Tạo Facebook Post | `/facebook-post` |
| Tạo Facebook Comment | `/facebook-comment` |

**→ Chỉ cần Block A (core) + block riêng của từng tool**

---

## Kiến trúc 4 Block — Nhóm A

```
┌──────────────────────────────────────────────────────────┐
│  BLOCK A — CORE (bắt buộc, không thể bỏ)                │
│  Keyword · Language · AI Model · Brand Config            │
├──────────────────────────────────────────────────────────┤
│  BLOCK B — CONTENT SHAPING (bắt buộc cho Nhóm A)        │
│  Target Length · Tone/Giọng văn · Image Option           │
├──────────────────────────────────────────────────────────┤
│  BLOCK C — SEO ADVANCED (collapsible, Nhóm A)           │
│  Main Link · Additional Links · Append · Auto-Bold       │
├──────────────────────────────────────────────────────────┤
│  BLOCK D — PAGE-SPECIFIC (khác nhau từng page)           │
│  Structure · Outline Type · Data Source · URL Input...   │
└──────────────────────────────────────────────────────────┘
```

**Thứ tự render trong form (cố định, không được đảo):**
1. Block D — page-specific input đầu (keyword chính + input đặc thù)
2. Block A — Language + Model + Brand
3. Block B — Length + Tone + Image
4. Block C — SEO Advanced (collapsed mặc định)
5. Submit button

---

## Block A — Core (đồng nhất 100% giữa các page)

### A1. Keyword Input
```tsx
<textarea
  value={keyword}
  onChange={(e) => setKeyword(e.target.value)}
  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNext(); } }}
  placeholder="..."
  rows={2}
  className="w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

### A2. Language — PHẢI dùng SUPPORTED_LANGUAGES từ shared

```typescript
// lib/shared/options.ts — dùng cho TẤT CẢ page
export const SUPPORTED_LANGUAGES = [
  { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
  { value: 'English',    label: '🇬🇧 English' },
  { value: 'Japanese',   label: '🇯🇵 日本語' },
  { value: 'Korean',     label: '🇰🇷 한국어' },
  { value: 'Thai',       label: '🇹🇭 ภาษาไทย' },
  { value: 'Indonesian', label: '🇮🇩 Bahasa Indonesia' },
  { value: 'Chinese',    label: '🇨🇳 中文' },
  { value: 'German',     label: '🇩🇪 Deutsch' },
  { value: 'French',     label: '🇫🇷 Français' },
  { value: 'Spanish',    label: '🇪🇸 Español' },
  { value: 'Portuguese', label: '🇵🇹 Português' },
  { value: 'Arabic',     label: '🇸🇦 العربية' },
  { value: 'Hindi',      label: '🇮🇳 हिन्दी' },
  { value: 'Russian',    label: '🇷🇺 Русский' },
  { value: 'Italian',    label: '🇮🇹 Italiano' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['value'];
```

**⚠️ Lỗi hiện tại:** `viet-tin-tuc` chỉ có 6 ngôn ngữ hardcode. Phải đổi sang import `SUPPORTED_LANGUAGES`.

### A3. AI Model — đã đúng, dùng `<ModelPicker />`

```tsx
// Đã implement đúng — không thay đổi
<ModelPicker value={model} onChange={setModel} size="md" label="" />
```

ModelPicker tự load từ `/api/ai-models?activeOnly=true` → user thêm model mới qua `/cau-hinh/ai-models` mà không cần sửa code.

### A4. Brand Config — PHẢI extract thành component

**Vấn đề hiện tại:** Brand config section đang copy-paste ~250 dòng TSX vào mỗi page (viet-tin-tuc, viet-theo-nguon, viet-tinh-gon, v.v.). Khi sửa 1 field → phải sửa 10 nơi.

**Rule bắt buộc:** Extract ra `components/BrandSection.tsx`:

```tsx
// components/BrandSection.tsx
interface BrandSectionProps {
  value: BrandSectionState;
  onChange: (next: BrandSectionState) => void;
  lsKey: string;           // localStorage key riêng từng page: 'vtt_brand_info', 'vtn_brand_info'...
  defaultBrandName?: string; // Hiển thị fallback: 'Nội Thất Minh Quân'
}

export interface BrandSectionState {
  shopName: string;
  industry: string;
  brandPronouns: string;
  brandAudience: string;
  brandToneNotes: string;
  phone: string;
  address: string;
  brandForbidden: string;
  ctaStandard: string;
  mainProducts: string;
  selectedProfileId: string;
}

export function buildBrandConfig(s: BrandSectionState): TinhGonBrandConfig { ... }
```

Dùng trong mỗi page:
```tsx
<BrandSection
  value={brand}
  onChange={setBrand}
  lsKey="vtt_brand_info"
  defaultBrandName="Nội Thất Minh Quân"
/>
```

---

## Block B — Content Shaping (Nhóm A)

### B1. Target Length — dùng TARGET_LENGTHS từ shared

```typescript
// lib/shared/options.ts
export const TARGET_LENGTHS = [
  { value: 600,  label: '~600 từ',   badge: 'Ngắn',     note: 'Mô tả sản phẩm, tin tức' },
  { value: 1200, label: '~1,200 từ', badge: 'Chuẩn SEO', note: '' },
  { value: 2000, label: '~2,000 từ', badge: 'Phổ biến',  note: '' },
  { value: 3000, label: '~3,000 từ', badge: '',          note: 'Bài chuyên sâu' },
  { value: 5000, label: '~5,000 từ', badge: 'Dài',       note: 'Pillar content' },
] as const;
```

**⚠️ Bổ sung:** Option 5,000 từ hiện chưa có — aiktp có (Extended). Thêm vào.

### B2. Tone/Giọng văn — dùng WRITING_TONES từ shared

Hiện tại mỗi page có tone set riêng (news-tones, tinh-gon không có tone...). Chuẩn hóa thành 1 shared set:

```typescript
// lib/shared/options.ts
export const WRITING_TONES = [
  { value: 'seo_basic',     label: 'SEO Cơ bản',    note: 'Tập trung keyword, phù hợp dạng câu hỏi' },
  { value: 'seo_focus',     label: 'SEO Focus',      note: 'Tối ưu ranking, dày thông số' },
  { value: 'seo_extended',  label: 'SEO Mở rộng',    note: 'Giải thích + ví dụ + so sánh' },
  { value: 'how_to',        label: 'Hướng dẫn',      note: 'Dạng Step 1 → 2 → 3' },
  { value: 'listicle',      label: 'Danh sách',      note: 'Top N, liệt kê, không dài dòng' },
  { value: 'review',        label: 'Đánh giá',       note: 'Ưu nhược điểm, có kết luận' },
  { value: 'comparison',    label: 'So sánh',        note: 'A vs B, có bảng' },
  { value: 'story',         label: 'Kể chuyện',      note: 'Narrative, tường thuật, có cảm xúc' },
  { value: 'technical',     label: 'Kỹ thuật',       note: 'Thông số, số liệu, chính xác cao' },
  { value: 'friendly',      label: 'Thân thiện',     note: 'Gần gũi, tránh dấu vết AI' },
  { value: 'formal',        label: 'Trang trọng',    note: 'Báo chí, thông cáo, doanh nghiệp' },
] as const;
```

**Lưu ý:** Một số page có tone riêng theo nghiệp vụ (news-writer có 9 news-specific tones) → giữ nguyên page-specific tone cho những page đó, WRITING_TONES dùng cho các page chưa có tone.

### B3. Image Option — dùng IMAGE_OPTIONS từ shared

```typescript
// lib/shared/options.ts
export const IMAGE_OPTIONS = [
  { value: 'none',        label: 'Không dùng ảnh', icon: '🚫', note: 'Bài chỉ có text' },
  { value: 'yandex',      label: 'Ảnh Yandex',     icon: '🔍', note: 'Tìm ảnh thực từ Yandex Search' },
  { value: 'ai_generated',label: 'AI Tạo ảnh',     icon: '🎨', note: 'Flux/DALL-E tạo ảnh theo nội dung' },
  { value: 'shutterstock', label: 'Shutterstock',   icon: '📷', note: 'Ảnh stock có bản quyền' },
] as const;

export type ImageOption = typeof IMAGE_OPTIONS[number]['value'];
```

**⚠️ Bổ sung lớn:** Hiện chỉ có viet-theo-nguon và viet-lai-url có Image Option. Tất cả page Nhóm A phải thêm block này.

Render dạng 4 cards horizontal (cùng UI với viet-theo-nguon):
```tsx
<div className="grid grid-cols-4 gap-2">
  {IMAGE_OPTIONS.map((opt) => (
    <button key={opt.value} type="button" onClick={() => setImageOption(opt.value)}
      className={`p-3 rounded-xl border-2 text-center text-xs ... `}>
      <span className="text-xl block mb-1">{opt.icon}</span>
      <span className="font-semibold">{opt.label}</span>
      <span className="text-gray-400 block mt-0.5">{opt.note}</span>
    </button>
  ))}
</div>
```

---

## Block C — SEO Advanced (collapsible, collapsed mặc định)

Đây là block quan trọng nhất cần đồng nhất. Hiện tại chỉ có viet-theo-nguon và một số page viết lại. Phải thêm vào TẤT CẢ page Nhóm A.

```tsx
// Pattern chuẩn — collapsed mặc định
<div className="border border-gray-200 rounded-xl overflow-hidden">
  <button type="button" onClick={() => setShowSeo(!showSeo)}
    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
    <span className="flex items-center gap-2">
      🔗 Tùy chọn SEO nâng cao
      {(seoMainLink || seoKeywordLinks || footerContent || boldKeyword || boldHeading) && (
        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Đã cấu hình</span>
      )}
    </span>
    <span className={`text-gray-400 transition-transform ${showSeo ? 'rotate-180' : ''}`}>▾</span>
  </button>

  {showSeo && (
    <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50 space-y-3">

      {/* C1: Main keyword link */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Gắn link vào từ khóa chính
          <span className="ml-1 text-gray-400 font-normal">(chỉ lần đầu xuất hiện)</span>
        </label>
        <input type="url" value={seoMainLink} onChange={(e) => setSeoMainLink(e.target.value)}
          placeholder="https://noithatminhquan.vn/giuong-sat"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white ..." />
      </div>

      {/* C2: Additional keyword links */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Thêm link nếu nội dung có các từ khóa
          <span className="ml-1 text-gray-400 font-normal">(mỗi dòng: từ khóa | URL)</span>
        </label>
        <textarea value={seoKeywordLinks} onChange={(e) => setSeoKeywordLinks(e.target.value)}
          placeholder={"tủ quần áo | https://noithatminhquan.vn/tu\nbàn ghế | https://noithatminhquan.vn/ban-ghe"}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono bg-white resize-none ..." />
      </div>

      {/* C3: Auto-bold */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tự động in đậm</label>
        <div className="flex gap-2">
          {AUTO_BOLD_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setAutoBold(opt.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${autoBold === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* C4: Append footer content */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Thêm nội dung vào cuối bài
          <span className="ml-1 text-gray-400 font-normal">(HTML hoặc plain text)</span>
        </label>
        <textarea value={footerContent} onChange={(e) => setFooterContent(e.target.value)}
          placeholder="Ví dụ: <!-- Call to action HTML --> hoặc CTA text..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-white resize-none ..." />
      </div>

    </div>
  )}
</div>
```

```typescript
// lib/shared/options.ts
export const AUTO_BOLD_OPTIONS = [
  { value: 'none',     label: 'Không' },
  { value: 'keyword',  label: 'Từ khóa chính' },
  { value: 'headings', label: 'Heading (H2, H3)' },
  { value: 'both',     label: 'Cả hai' },
] as const;
```

---

## Block D — Page-Specific (mỗi page tự định nghĩa)

Không có rule cứng — tùy vào đặc thù của từng tính năng. Ví dụ:

| Page | Block D riêng |
|------|--------------|
| viet-tinh-gon | Secondary keywords + Outline mode (No/Manual/AI) + Outline type (6 loại) |
| viet-tin-tuc | Structure (9 loại) + Giọng văn tin tức (9 loại) |
| viet-theo-nguon | URL inputs (2–5 link) + Manual content |
| viet-theo-dan-bai | Outline textarea nhập tay |
| viet-toplist | N số items + So sánh hay liệt kê |
| viet-bai-thong-minh | Content type (7 loại) + Topical Map + Competitor URLs |
| viet-lai-bai-viet | Method (keep_headings/rewrite_all/deep_rewrite) |
| viet-lai-url | URL crawl step + 18 Idea Expander chips |

---

## Shared file cần tạo

Tất cả constants dùng chung phải ở `lib/shared/options.ts`. Không được define lại ở từng page:

```typescript
// web/lib/shared/options.ts

export { SUPPORTED_LANGUAGES }   // 15 ngôn ngữ
export { TARGET_LENGTHS }        // 5 mức: 600/1200/2000/3000/5000 từ
export { WRITING_TONES }         // 11 tones
export { IMAGE_OPTIONS }         // 4 options: none/yandex/ai_generated/shutterstock
export { AUTO_BOLD_OPTIONS }     // 4 options: none/keyword/headings/both
```

Tạo component dùng chung:
```
web/components/BrandSection.tsx     ← Extract từ viet-tin-tuc/page.tsx
web/components/SeoAdvancedBlock.tsx ← Extract từ viet-theo-nguon/page.tsx
```

---

## Điểm local KHÔNG nên copy theo aiktp

Dù aiktp có, nhưng local đã làm tốt hơn → **giữ nguyên, không thay thế**:

| Tính năng | Local | aiktp | Quyết định |
|-----------|-------|-------|------------|
| Brand profile system | ✅ Đầy đủ (10 fields, DB, profile picker) | ❌ Không có | Giữ nguyên — local tốt hơn |
| Humanness Score | ✅ 0–100, PUBLISH/REVIEW/REWRITE | ❌ Không có | Giữ nguyên — local tốt hơn |
| Semantic SEO (RPP, AM, IG) | ✅ 21 tiêu chí | ❌ Không có | Giữ nguyên — local tốt hơn |
| Topical Map (Hub/Spoke) | ✅ Viet-bai-thong-minh | ❌ Không có | Giữ nguyên — local tốt hơn |
| Competitor URL crawl | ✅ Viet-bai-thong-minh | ❌ Không có | Giữ nguyên — local tốt hơn |

---

## Roadmap bổ sung — Theo mức độ ưu tiên

### 🔴 Ưu tiên cao — làm ngay (ảnh hưởng tất cả page)

| Task | Tại sao | Effort |
|------|---------|--------|
| Tạo `lib/shared/options.ts` | Nền tảng cho mọi cải tiến khác | S |
| Extract `BrandSection.tsx` | Hiện đang dupe 250 dòng × 10 page | M |
| Extract `SeoAdvancedBlock.tsx` | Hiện chỉ có 2 page có block này | M |
| Thêm Image Option vào 8 page thiếu | Aiktp có ở tất cả page | M |
| Chuẩn hóa Language sang 15 ngôn ngữ | viet-tin-tuc chỉ có 6 | S |
| Thêm length option 5000 từ | Aiktp có Extended | S |

### 🟡 Ưu tiên trung bình — sprint tới

| Task | Tại sao | Effort |
|------|---------|--------|
| Thêm SeoAdvancedBlock vào các page thiếu | Aiktp có ở tất cả page | M |
| Outline editable sau khi AI tạo | Aiktp cho edit inline — local chỉ confirm | L |
| Chuẩn hóa WRITING_TONES cho page chưa có tone | Aiktp có 16 tones | M |
| Thêm Secondary Keywords editable | Aiktp cho sửa trước khi outline | M |

### 🟢 Ưu tiên thấp — backlog

| Task | Tại sao | Effort |
|------|---------|--------|
| Google + Bing Index tự động sau publish | Aiktp có Bước 11 | L |
| Multi-platform publish (Shopify, Haratan...) | Aiktp có 6 platform | XL |
| Per-website AI customization | Site-level knowledge injection | L |
| Scheduled post (hẹn giờ đăng bài) | Aiktp có tính năng này | L |

---

## Checklist khi tạo page mới

Trước khi merge một config page mới, phải tự check:

- [ ] Import `SUPPORTED_LANGUAGES` từ `lib/shared/options.ts` (không hardcode)
- [ ] Import `TARGET_LENGTHS` từ `lib/shared/options.ts`
- [ ] Import `IMAGE_OPTIONS` từ `lib/shared/options.ts`
- [ ] Import `AUTO_BOLD_OPTIONS` từ `lib/shared/options.ts`
- [ ] Dùng `<ModelPicker />` — không tạo model selector riêng
- [ ] Dùng `<BrandSection />` — không copy-paste brand logic
- [ ] Dùng `<SeoAdvancedBlock />` — không tự viết lại
- [ ] Thứ tự block: Block D → Block A → Block B → Block C → Submit
- [ ] sessionStorage prefix theo bảng trong `IMPLEMENTATION-GUIDE-STANDARD.md`
- [ ] `BrandSection` có `lsKey` riêng (ví dụ `vtt_brand_info`)

---

## Tóm tắt — Trả lời câu hỏi ban đầu

> "Tất cả các page có nên cùng 1 rule giống nhau hoàn toàn trên mọi page?"

**Không — nhưng theo đúng cấu trúc sau:**

```
Nhóm A (Viết Bài Chính):
  ✅ Block A — giống nhau 100% (shared components)
  ✅ Block B — giống nhau 100% (shared options)
  ✅ Block C — giống nhau 100% (shared component)
  ⚙️  Block D — khác nhau (nghiệp vụ riêng mỗi page)

Nhóm B (Công Cụ Nhanh):
  ✅ Block A minimal — ModelPicker + Language
  ⚙️  Block riêng — input đặc thù của tool
  ❌ Không cần Block B, C
```

Điểm mấu chốt: **giống nhau ở infrastructure (component, options), khác nhau ở nghiệp vụ.**
