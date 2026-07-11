# DEV-CODING-ORDER.md
## Thứ tự code — Đọc trước khi bắt đầu

> Làm theo đúng thứ tự này. Không nhảy cóc.  
> Mỗi giai đoạn phụ thuộc vào giai đoạn trước.

---

## Giai đoạn 0 — Database (làm 1 lần, không sửa lại)

```
prisma/schema.prisma
```

Đảm bảo có đủ các model sau trước khi code bất kỳ thứ gì:

| Model | Dùng cho |
|-------|---------|
| `Article` | Mọi page Nhóm A — thêm field: `sourceType`, `meta Json?` |
| `BrandProfile` | Khối 7 Brand — thêm: `latitude`, `longitude`, `openingHours`, `priceRange` |
| `FacebookPost` | `/viet-bai-facebook` |
| `FacebookCommentBrand` | `/viet-tu-facebook-comment` |
| `Website` | WebsiteSelector trong Publish tab |
| `AiModel` | ModelPicker |

```bash
npx prisma migrate dev --name init-all
npx prisma db seed
```

---

## Giai đoạn 1 — Shared Foundation (làm 1 lần, mọi page phụ thuộc)

Không có giai đoạn này thì không code được giai đoạn 2 trở đi.

```
web/lib/shared/
├── options.ts          ← SUPPORTED_LANGUAGES, TARGET_LENGTHS, IMAGE_OPTIONS,
│                          WRITING_TONES, AUTO_BOLD_OPTIONS
├── seo-checks.ts       ← computeSeoChecks() — 21 checks
└── generate-tabs.ts    ← GENERATE_TABS, AI_EDIT_COMMANDS

web/hooks/
└── useGenerateStream.ts ← SSE hook dùng chung

web/lib/tinh-gon/
└── model.ts            ← buildTinhGonModel(modelId) — nếu chưa có
```

**Test:** import thử `computeSeoChecks` và `useGenerateStream` vào 1 file, chạy được là OK.

---

## Giai đoạn 2 — Shared Components (làm 1 lần, mọi page dùng)

```
web/components/
├── ModelPicker.tsx         ← Khối 6 — load từ /api/ai-models
├── BrandSection.tsx        ← Khối 7 — 10 fields + DB profile picker
├── SeoAdvancedBlock.tsx    ← Khối 8 — collapsed, badge "Đã cấu hình"
└── generate/
    ├── GeneratePanelTabs.tsx  ← Tab bar 4 tabs cố định
    ├── SeoPanel.tsx           ← Tab SEO: score bar + density + 21 checks
    ├── QualityPanel.tsx       ← Tab Chất lượng: Humanness + AICheck
    ├── LinksPanel.tsx         ← Tab Internal Links
    └── PublishPanel.tsx       ← Tab Đăng bài: Title/Meta/Slug/SERP/Buttons
```

**Test:** render từng component trong 1 page test `/test-components`, không cần logic thật.

---

## Giai đoạn 3 — API nền (các route dùng chung)

```
web/app/api/
├── ai-models/route.ts                   ← GET list model cho ModelPicker
├── brand-profiles/route.ts              ← CRUD brand profiles cho BrandSection
├── websites/route.ts                    ← GET list website cho WebsiteSelector
├── articles/
│   ├── route.ts                         ← GET list + POST create
│   ├── [id]/route.ts                    ← GET/PUT/DELETE
│   └── check-cannibalization/route.ts   ← GET ?keyword=xxx → {cannibalizing, matchedTitle}
└── index/
    └── submit/route.ts                  ← POST: Sitemap ping + Bing IndexNow
```

**Test mỗi route với Postman trước khi dùng.**

---

## Giai đoạn 4 — Page đầu tiên: Viết Tinh Gọn (P1 mẫu)

> Đây là **trang mẫu chuẩn**. Code xong trang này = hiểu được toàn bộ pattern.  
> Mọi trang P1 còn lại đều copy cấu trúc từ đây.

```
Spec: PAGE-STANDARD.md (đọc Section 1–3 + 7)

web/lib/viet-tinh-gon/
├── types.ts
├── options.ts          ← AI_OUTLINE_OBJECTIVES, AI_OUTLINE_SIZES
└── prompt-builder.ts   ← buildWritingPrompt() với SEO_PROMPT_RULES 23 rules

web/app/
├── viet-tinh-gon/
│   ├── page.tsx        ← Config: 8 khối đầy đủ + Submit
│   └── generate/
│       └── page.tsx    ← Generate: Editor 2 cột + 4 tabs
└── api/viet-tinh-gon/
    ├── suggest-keywords/route.ts
    ├── outline/route.ts
    └── stream/route.ts  ← SSE: outline → write → seo_check → save DB
```

**Checklist khi xong:**
- [ ] 8 khối render đúng thứ tự
- [ ] sessionStorage `tg_config` save/load đúng
- [ ] Stream chunks append vào editor realtime
- [ ] 4 tabs hoạt động đầy đủ
- [ ] Publish → Article lưu DB → Sitemap ping + Bing IndexNow

---

## Giai đoạn 5 — Các trang P1 còn lại (copy pattern từ Viết Tinh Gọn)

Copy cấu trúc Viết Tinh Gọn, chỉ thay đổi phần **đặc thù của từng page**.

### Thứ tự code — từ đơn giản đến phức tạp:

| # | Page | Route | Điểm khác với Viết Tinh Gọn | Spec |
|---|------|-------|------------------------------|------|
| 1 | **Viết Theo Dàn Bài** | `/viet-theo-dan-bai` | Khối 1 có outline textarea; Khối 4 ẩn | `VIET-THEO-DAN-BAI-IMPLEMENTATION.md` |
| 2 | **Viết Theo Nguồn** | `/viet-theo-nguon` | Khối 1 có URL crawl input (2–5 links); stream có crawl step | ✅ có spec |
| 3 | **Viết Toplist** | `/viet-toplist` | Khối 1 có N items + layout; prompt khác | `VIET-TOPLIST-IMPLEMENTATION.md` |
| 4 | **Viết Đánh Giá SP** | `/viet-danh-gia-san-pham` | Khối 1 có tên SP + link; tone review riêng | ✅ có spec |
| 5 | **Viết Lại Bài Viết** | `/viet-lai-bai-viet` | Khối 1 có method selector; input là bài cũ | `VIET-LAI-IMPLEMENTATION.md` |
| 6 | **Viết Lại URL** | `/viet-lai-url` | Khối 1 có URL input; stream có crawl step | `VIET-LAI-URL-IMPLEMENTATION.md` |
| 7 | **Viết Lại Tin Tức** | `/viet-lai-tin-tuc` | Khối 1 có URL nguồn tin; tone báo chí | ⏳ chưa có spec |
| 8 | **Viết Tin Tức** | `/viet-tin-tuc` | Khối 2 + 4 ẩn; tone báo chí; structure 9 loại | ✅ có spec |
| 9 | **Viết Từ Google Search** | `/viet-tu-google-search` | Khối 1 có search config; stream có search+crawl phase | `VIET-TU-GOOGLE-SEARCH-IMPLEMENTATION.md` |

**Cách làm từng trang:**
1. Copy thư mục `viet-tinh-gon/` → đổi tên
2. Thay `tg_` prefix → prefix của page mới (xem bảng sessionStorage trong `DEV-PAGE-ROUTING-NOTE.md`)
3. Cập nhật Khối 1 theo bảng "page-specific additions"
4. Cập nhật `prompt-builder.ts` cho đúng loại nội dung
5. Cập nhật `stream/route.ts` nếu có bước xử lý thêm (crawl, search...)
6. Test flow đầy đủ

---

## Giai đoạn 6 — Nhóm B: Công Cụ Nhanh (Stateless)

Không liên quan đến 8 khối. Làm độc lập, thứ tự tùy.

| # | Page | Route | Spec |
|---|------|-------|------|
| 1 | Viết Lại Đoạn Văn | `/viet-lai-doan-van` | ✅ có spec |
| 2 | Tạo Facebook Post nhanh | `/facebook-post` | `FACEBOOK-POST-GENERATOR-IMPLEMENTATION.md` |
| 3 | Tạo Facebook Comment nhanh | `/facebook-comment` | `FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md` |

---

## Giai đoạn 7 — Nhóm C: Social Brand Tools

Có DB nhưng không phải Article. Không cần generate page chuẩn.

| # | Page | Routes | Spec |
|---|------|--------|------|
| 1 | Viết Bài Facebook (brand) | `/viet-bai-facebook` + `/quan-ly-bai-facebook` | `VIET-TU-FACEBOOK-IMPLEMENTATION.md` |
| 2 | Viết Comment Facebook (brand) | `/viet-tu-facebook-comment` + `/quan-ly-facebook-comment` | `VIET-TU-FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md` |

---

## Giai đoạn 8 — P2: Viết Bài Thông Minh (Wizard 4 bước)

Làm cuối cùng vì phức tạp nhất. Cần giai đoạn 1–3 xong trước.

```
Spec: VIET-BAI-THONG-MINH-IMPLEMENTATION.md

web/app/viet-bai-thong-minh/
├── page.tsx          ← Step 1: Keyword + Sources + ContentType + Khối 3/5/6/7
├── step2/page.tsx    ← Step 2: Review Semantic Analysis (RPP, AM, Intent)
├── step3/page.tsx    ← Step 3: Titles + Outline + Khối 2/4/8
└── step4/page.tsx    ← Step 4: Generate + Editor + Publish (giống generate chuẩn)

web/app/api/vbt/
├── analyze/route.ts   ← Semantic analysis (crawl competitors + Google)
├── titles/route.ts    ← Gợi ý 4–5 tiêu đề
├── outline/route.ts   ← Build outline từ semantic data
├── start/route.ts     ← Tạo Article record
└── stream/route.ts    ← SSE write (7 bước loading)
```

---

## Giai đoạn 9 — P3: Viết Hàng Loạt (Queue)

```
Spec: chưa có — cần viết VIET-HANG-LOAT-IMPLEMENTATION.md trước

web/app/viet-hang-loat/
├── page.tsx           ← Config: 8 khối + textarea nhiều keyword (1 từ khóa/dòng)
└── queue/
    └── page.tsx       ← Queue management: progress từng bài, cancel, retry

web/app/api/viet-hang-loat/
├── enqueue/route.ts   ← POST: thêm vào hàng đợi
├── queue/route.ts     ← GET: lấy trạng thái hàng đợi
└── process/route.ts   ← POST: xử lý 1 bài (gọi từ worker/cron)
```

---

## Tóm tắt thứ tự

```
0  DB Schema + migrate
1  lib/shared/* + hooks/useGenerateStream
2  Components: ModelPicker, BrandSection, SeoAdvancedBlock, generate/*
3  API routes dùng chung (ai-models, brand-profiles, websites, articles, index)
4  Viết Tinh Gọn — PAGE MẪU, code cẩn thận nhất
5  Các trang P1 còn lại (9 trang, copy từ mẫu)
6  Nhóm B: 3 công cụ stateless
7  Nhóm C: 2 công cụ social brand
8  Viết Bài Thông Minh (P2 wizard)
9  Viết Hàng Loạt (P3 queue) ← cần viết spec trước
```

---

## File spec cần đọc trước khi code

| Giai đoạn | Đọc file này |
|-----------|-------------|
| Mọi giai đoạn | `PAGE-STANDARD.md` |
| Trước khi code bất kỳ page nào | `DEV-PAGE-ROUTING-NOTE.md` |
| Giai đoạn 4–5 (trang P1) | `PAGE-STANDARD.md` Section 2–3 + spec file của page đó |
| Giai đoạn 8 | `VIET-BAI-THONG-MINH-IMPLEMENTATION.md` |
| Giai đoạn 6B (Facebook Post) | `FACEBOOK-POST-GENERATOR-IMPLEMENTATION.md` |
| Giai đoạn 6C (Facebook Comment) | `FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md` |
| Giai đoạn 7A (Facebook brand) | `VIET-TU-FACEBOOK-IMPLEMENTATION.md` |
| Giai đoạn 7B (Comment brand) | `VIET-TU-FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md` |
| Giai đoạn 9 | `VIET-HANG-LOAT-IMPLEMENTATION.md` ← chưa có, cần viết |
