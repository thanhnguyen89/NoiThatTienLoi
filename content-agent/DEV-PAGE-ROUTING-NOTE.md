# DEV-PAGE-ROUTING-NOTE.md
## Ghi chú Routing & Config Pattern cho Dev

> Đọc file này trước khi code bất kỳ page nào.  
> Chi tiết đầy đủ: `PAGE-STANDARD.md`

---

## Nguyên tắc cốt lõi

```
8 KHỐI CONFIG = LUÔN áp dụng cho mọi page Nhóm A
SỐ BƯỚC/ROUTE = quyết định riêng theo độ phức tạp
→ Hai thứ này ĐỘC LẬP nhau
```

---

## 3 Nhóm trang

### Nhóm A — Viết Bài Chính
- Tạo Article, lưu DB, có Editor + Publish WordPress
- **BẮT BUỘC** dùng 8 khối config chuẩn
- Có generate page (Editor + 4 tabs: SEO / Chất lượng / Internal Links / Đăng bài)

### Nhóm B — Công Cụ Nhanh
- Stateless, không lưu DB
- UI tối giản: input → output cùng trang
- Không cần 8 khối

### Nhóm C — Công Cụ Social Brand
- Lưu DB nhưng không phải Article
- Không có Article Editor / không publish WordPress
- Config rút gọn: Topic + Style + Model + Brand (4 khối)

---

## 4 Routing Pattern (chỉ Nhóm A)

### P1 — 2 Route chuẩn ← phần lớn các page dùng cái này

```
/[feature]           ← Config page (8 khối + Submit)
/[feature]/generate  ← Generate page (Editor + 4 tabs)
```

Data truyền qua: `sessionStorage` key riêng mỗi page.

### P2 — 4 Bước Wizard ← chỉ dùng cho Viết Bài Thông Minh

```
/viet-bai-thong-minh         ← Step 1: Keyword + Sources + Content Type
/viet-bai-thong-minh/step2   ← Step 2: Review Semantic Analysis
/viet-bai-thong-minh/step3   ← Step 3: Titles + Outline + 8 khối config còn lại
/viet-bai-thong-minh/step4   ← Step 4: Generate + Editor + Publish
```

Dùng khi: cần user **review kết quả AI trung gian** (semantic analysis, outline) trước khi generate.

### P3 — Queue Bulk ← chỉ dùng cho Viết Hàng Loạt

```
/viet-hang-loat              ← Config page (8 khối + danh sách keywords)
/viet-hang-loat/queue        ← Queue management (tiến độ từng bài)
/viet-hang-loat/[id]         ← Xem/edit từng bài đã generate
```

Dùng khi: nhiều bài chạy **tuần tự hàng đợi**, không chờ user.

### P4 — 1 Route (hiếm dùng)

```
/[feature]           ← Config + Generate trong 1 trang (không redirect)
```

Dùng khi: output nhỏ, không cần full Editor — chưa có page nào dùng hiện tại.

---

## Danh sách tất cả page + Pattern

### Nhóm A

| Page | Config | Generate | Pattern | Spec file |
|------|--------|----------|---------|-----------|
| Viết Tinh Gọn | `/viet-tinh-gon` | `/viet-tinh-gon/generate` | **P1** | ✅ |
| Viết Tin Tức | `/viet-tin-tuc` | `/viet-tin-tuc/generate` | **P1** | ✅ |
| Viết Theo Nguồn | `/viet-theo-nguon` | `/viet-theo-nguon/generate` | **P1** | ✅ |
| Viết Theo Dàn Bài | `/viet-theo-dan-bai` | `/viet-theo-dan-bai/generate` | **P1** | ✅ |
| Viết Toplist | `/viet-toplist` | `/viet-toplist/generate` | **P1** | ✅ |
| Viết Đánh Giá SP | `/viet-danh-gia-san-pham` | `/viet-danh-gia-san-pham/generate` | **P1** | ✅ |
| Viết Lại Bài Viết | `/viet-lai-bai-viet` | `/viet-lai-bai-viet/generate` | **P1** | ✅ |
| Viết Lại URL | `/viet-lai-url` | `/viet-lai-url/generate` | **P1** | ✅ |
| Viết Lại Tin Tức | `/viet-lai-tin-tuc` | `/viet-lai-tin-tuc/generate` | **P1** | ⏳ |
| Viết Từ Google Search | `/viet-tu-google-search` | `/viet-tu-google-search/generate` | **P1** | ✅ |
| Viết Bài Thông Minh | `/viet-bai-thong-minh` | `→ step2 → step3 → step4` | **P2** | ✅ |
| Viết Hàng Loạt — Smart AI | `/viet-hang-loat` | `/viet-hang-loat/queue` | **P3** | ✅ |
| Viết Hàng Loạt — Từ Khóa | `/viet-hang-loat-tu-khoa` | `/viet-hang-loat-tu-khoa/queue` | **P3** | ✅ |
| Viết Hàng Loạt — Tinh Gọn | `/viet-hang-loat-tinh-gon` | `/viet-hang-loat-tinh-gon/queue` | **P3** | ✅ |
| Viết Hàng Loạt — Google Search | `/viet-hang-loat-google-search` | `/viet-hang-loat-google-search/queue` | **P3** | ✅ |
| Viết Hàng Loạt — Theo Nguồn | `/viet-hang-loat-theo-nguon` | `/viet-hang-loat-theo-nguon/queue` | **P3** | ✅ |
| Viết Hàng Loạt — Theo Dàn Bài | `/viet-hang-loat-theo-dan-bai` | `/viet-hang-loat-theo-dan-bai/queue` | **P3** | ✅ |

### Nhóm B

| Page | Route | Spec file |
|------|-------|-----------|
| Viết Lại Đoạn Văn | `/viet-lai-doan-van` | ✅ |
| TikTok Caption nhanh | `/tiktok-post` | ✅ |
| Tạo Facebook Post nhanh | `/facebook-post` | ✅ |
| Tạo Facebook Comment nhanh | `/facebook-comment` | ✅ |
| Tạo Tiêu Đề Sản Phẩm | `/tao-tieu-de-san-pham` | ✅ |
| Tạo Tên Sản Phẩm | `/tao-ten-san-pham` | ✅ |
| Giới Thiệu Sản Phẩm | `/gioi-thieu-san-pham` | ✅ |
| Đánh Giá Sản Phẩm (nhanh) | `/danh-gia-san-pham-nhanh` | ✅ |
| FAQ Sản Phẩm | `/faq-san-pham` | ✅ |

### Nhóm C

| Page | Route Tool | Route Quản lý | Spec file |
|------|-----------|--------------|-----------|
| Viết Bài TikTok (brand) | `/viet-bai-tiktok` | `/quan-ly-bai-tiktok` | ✅ |
| Viết Bài Facebook (brand) | `/viet-bai-facebook` | `/quan-ly-bai-facebook` | ✅ |
| Viết Comment Facebook (brand) | `/viet-tu-facebook-comment` | `/quan-ly-facebook-comment` | ✅ |

---

## 8 Khối Config Chuẩn (Nhóm A)

Thứ tự bắt buộc — không đảo, không bỏ (trừ ngoại lệ ghi rõ):

```
Khối 1 — Keyword          Keyword chính + keyword phụ + AI Suggest
Khối 2 — Image Option     4 loại: Không ảnh / Yandex / AI tạo / Shutterstock
Khối 3 — Language         SUPPORTED_LANGUAGES từ lib/shared/options.ts
Khối 4 — Outline + Length 3 mode: Không dàn ý / Dàn ý bạn / AI tạo dàn ý
Khối 5 — Tone             WRITING_TONES hoặc tone riêng của page
Khối 6 — AI Model         <ModelPicker /> — bắt buộc dùng component này
Khối 7 — Brand Config     <BrandSection lsKey="[prefix]_brand_info" />
Khối 8 — SEO Advanced     <SeoAdvancedBlock /> — mặc định collapsed
──────────────────────────
Submit Button
```

### Ngoại lệ khối

| Page | Thay đổi |
|------|---------|
| `viet-tin-tuc` | Ẩn Khối 2 + Ẩn Khối 4 (thay bằng Length standalone) |
| `viet-theo-dan-bai` | Ẩn Khối 4 (outline là input chính ở Khối 1) |
| `viet-toplist` | **Khối 4 override**: thay 3-mode outline bằng Top N selector + Cấu trúc item (5 presets) + Estimated word count |
| `viet-bai-thong-minh` | Chia 8 khối sang 2 step: Step1 = Khối 1/3/5/6/7; Step3 = Khối 2/4/8 |
| `viet-hang-loat` | Khối 1 mở rộng: keywords textarea thay keyword đơn; thêm Duplicate mode + Data source + Content type |
| `viet-hang-loat-tu-khoa` | Khối 1 mở rộng: keywords textarea + Duplicate mode + Title mode + Outline mode (no/ai only); **Khối 4 ẩn** |
| `viet-hang-loat-tinh-gon` | Khối 1 mở rộng: keywords textarea + Duplicate mode + Title mode + Outline Type (11 loại); **Khối 4 override** = Target Length (800/1000/1200/1500); **Khối 5 ẩn** |
| `viet-hang-loat-google-search` | Khối 1 mở rộng: keywords textarea (tối đa 30) + Duplicate mode + Search Result Count (3/5/10) + Crawl Mode (auto/search_only/no_crawl) + Freshness date toggle; **Khối 4 chỉ no/ai** (không có user_outline) |
| `viet-hang-loat-theo-nguon` | Khối 1 mở rộng: keywords textarea (tối đa 50) + Duplicate mode + Title mode + Article Structure + URL inputs (2–5) + crawl button + sources preview; **Khối 4 chỉ no/ai + OutlineAIType** (không có user_outline); **Khối 8 mở rộng** thêm SEO options từ viet-theo-nguon |
| `viet-hang-loat-theo-dan-bai` | Khối 1 mở rộng: keywords textarea (pipe format `postTitle \| keyword`, tối đa 50) + Duplicate mode + Title mode + Shared outline block (AI Suggest / From URL / Manual); **Khối 4 ẩn** (outline là input chính ở Khối 1); **Khối 5 override** = Writing Method (balance/detail) + DanBaiTone (seo_focus/confident/friendly) + Target Length |

### Khối 1 — thêm gì tùy page

Mỗi page có thể thêm input riêng vào Khối 1 (ngay sau keyword, trước secondary kw):

| Page | Thêm gì vào Khối 1 |
|------|-------------------|
| `viet-theo-nguon` | URL inputs (2–5 link crawl) + Manual content paste |
| `viet-theo-dan-bai` | Outline textarea `[h2]...[h3]` format |
| `viet-toplist` | Secondary KWs (comma-sep) + AI Suggest + Data source (Google / AI only) |
| `viet-bai-thong-minh` | Content Type (7 loại) + Topical Map role + Competitor URLs |
| `viet-hang-loat` | Keywords textarea (1 dòng = 1 bài, tối đa 50) + Duplicate mode (allow/reject) + Data source (AI only / Google+AI) + Content Type (7 loại) |
| `viet-hang-loat-tu-khoa` | Keywords textarea (1 dòng = 1 bài, có thể kèm KW phụ cách ",", tối đa 50) + Duplicate mode + Title mode (keyword_as_title / ai_title) + Outline mode (no/ai) + Objective + Size |
| `viet-hang-loat-tinh-gon` | Keywords textarea (1 dòng = 1 bài, tối đa 50) + Duplicate mode + Title mode + Outline Type (11 loại từ viet-tinh-gon) |
| `viet-lai-bai-viet` | Method (keep_headings / rewrite_all / deep_rewrite) |
| `viet-lai-url` | URL crawl input |
| `viet-lai-tin-tuc` | URL nguồn tin |
| `viet-tin-tuc` | Structure (9 loại tin tức) |
| `viet-tu-google-search` | Crawl Mode + Số nguồn (3/5/10) + Freshness date toggle |
| `viet-hang-loat-google-search` | Keywords textarea (1 dòng = 1 bài, tối đa 30) + Duplicate mode + Search Result Count (3/5/10) + Crawl Mode (auto/search_only/no_crawl) + Freshness date toggle |
| `viet-hang-loat-theo-nguon` | Keywords textarea (1 dòng = 1 bài, tối đa 50) + Duplicate mode + Title mode + Article Structure (10 loại từ viet-theo-nguon) + URL inputs (2–5 link crawl) + "Thu Thập" button + Sources preview |
| `viet-hang-loat-theo-dan-bai` | Keywords textarea (pipe format `postTitle \| keyword`, 1 dòng = 1 bài, tối đa 50; nếu không có `\|` thì dùng dòng là keyword) + Duplicate mode + Title mode + Shared outline block (3 tab: AI Suggest / From URL / Manual) |

---

## Generate Page Chuẩn (Nhóm A, P1)

Layout 2 cột:

```
┌──────────────────────────────┬─────────────────────┐
│  Article Editor (~65%)       │  Panel Tabs (~35%)   │
│                              │  SEO / Chất lượng    │
│  Streaming loading steps UI  │  Internal Links      │
│  → contenteditable khi done  │  Đăng bài            │
│  AI Floating Toolbar (hover) │                      │
└──────────────────────────────┴─────────────────────┘
```

- Dùng `useGenerateStream(endpoint)` hook — không tự viết SSE loop
- Dùng `computeSeoChecks()` từ `lib/shared/seo-checks` — không tự define
- Data truyền vào: đọc từ `sessionStorage` key của page

---

## sessionStorage Keys theo page

| Page | Key |
|------|-----|
| viet-tinh-gon | `tg_config` + `tg_brand_info` |
| viet-tin-tuc | `vtt_config` + `vtt_brand_info` |
| viet-theo-nguon | `vtn_config` + `vtn_brand_info` |
| viet-theo-dan-bai | `vdb_config` + `vdb_brand_info` |
| viet-toplist | `vtl_config` + `vtl_brand_info` |
| viet-danh-gia-san-pham | `vdg_config` + `vdg_brand_info` |
| viet-lai-bai-viet | `vl_config` + `vl_brand_info` |
| viet-lai-url | `vlu_config` + `vlu_brand_info` |
| viet-lai-tin-tuc | `vltt_config` + `vltt_brand_info` |
| viet-tu-google-search | `vtgs_config` + `vtgs_brand_info` |
| viet-bai-thong-minh | `vbt_step1` + `vbt_semantic` + `vbt_step3` + `vbt_brand_info` |
| viet-hang-loat | `vhl_config` + `vhl_brand_info` |
| viet-hang-loat-tu-khoa | `vhltk_config` + `vhltk_jobId` + `vhltk_brand_info` |
| viet-hang-loat-tinh-gon | `vhltg_config` + `vhltg_jobId` + `vhltg_brand_info` |
| viet-hang-loat-google-search | `vhlgs_config` + `vhlgs_jobId` + `vhlgs_brand_info` |
| viet-hang-loat-theo-nguon | `vhltn_config` + `vhltn_jobId` + `vhltn_sources_summary` |
| viet-hang-loat-theo-dan-bai | `vhldb_config` + `vhldb_jobId` |
| tiktok-post | `tkp_config` |
| viet-bai-tiktok | `vtk_config` + `vtk_brand_info` |
| viet-bai-facebook | `vbf_config` + `vbf_brand_info` |
| viet-tu-facebook-comment | `vtfc_config` + `vtfc_brand_info` |

---

## Checklist nhanh trước khi code 1 page Nhóm A

```
CONFIG PAGE:
□ Khối 1: keyword textarea + secondary kw + AI Suggest chip
□ Khối 1 additions: xem bảng page-specific ở trên
□ Khối 2: IMAGE_OPTIONS 4 card (ẩn nếu page trong ngoại lệ)
□ Khối 3: SUPPORTED_LANGUAGES dropdown
□ Khối 4: 3 mode radio + TARGET_LENGTHS (ẩn/biến tướng theo ngoại lệ)
□ Khối 5: tone grid có title tooltip
□ Khối 6: <ModelPicker />
□ Khối 7: <BrandSection lsKey="[prefix]_brand_info" />
□ Khối 8: <SeoAdvancedBlock /> collapsed
□ Submit → sessionStorage save → redirect generate
□ Cannibalization check (onBlur keyword, debounce 800ms)

GENERATE PAGE:
□ Đọc sessionStorage → redirect nếu null
□ useGenerateStream(endpoint) hook
□ Loading Steps UI khi streaming
□ 4 tabs: SEO / Chất lượng / Internal Links / Đăng bài
□ computeSeoChecks() 21 checks
□ HumannessPanel + AICheckPanel trong tab Chất lượng
□ InternalLinkSuggest trong tab Internal Links
□ AiFloatingToolbar khi click paragraph
□ Publish tab: Title / Meta / Slug / SERP Preview / WebsiteSelector
□ Publish: Sitemap ping + Bing IndexNow tự động sau publish

API STREAM ROUTE:
□ buildWritingPrompt() inject SEO_PROMPT_RULES 23 rules
□ SNIPPET_RULES_BY_TONE theo tone
□ Brand block từ config.brand
□ Save Article record vào DB sau khi stream xong
□ computeSeoChecks() → lưu seoScore vào Article
```

---

## Spec files đã có

### Chuẩn chung
| File | Covers |
|------|--------|
| `PAGE-STANDARD.md` | Toàn bộ chuẩn — đọc đầu tiên |
| `DEV-CODING-ORDER.md` | Thứ tự code 9 giai đoạn |
| `AI-EDITOR-IMPLEMENTATION.md` | Generate page editor |

### Nhóm A — Viết Bài Chính
| File | Page | Pattern |
|------|------|---------|
| `VIET-BAI-THONG-MINH-IMPLEMENTATION.md` | Viết Bài Thông Minh | P2 Wizard 4 bước |
| `VIET-HANG-LOAT-THONG-MINH-IMPLEMENTATION.md` | Viết Hàng Loạt — Smart AI | P3 Queue Bulk, reuse vbt prompts |
| `VIET-HANG-LOAT-TU-KHOA-IMPLEMENTATION.md` | Viết Hàng Loạt — Từ Khóa | P3 Queue Bulk, reuse viet-theo-tu-khoa logic |
| `VIET-HANG-LOAT-TINH-GON-IMPLEMENTATION.md` | Viết Hàng Loạt — Tinh Gọn | P3 Queue Bulk, reuse viet-tinh-gon outline + writer |
| `VIET-HANG-LOAT-GOOGLE-SEARCH-IMPLEMENTATION.md` | Viết Hàng Loạt — Google Search | P3 Queue Bulk, reuse viet-tu-google-search search+crawl pipeline |
| `VIET-HANG-LOAT-THEO-NGUON-IMPLEMENTATION.md` | Viết Hàng Loạt — Theo Nguồn | P3 Queue Bulk, crawl 1 lần tại enqueue, reuse viet-theo-nguon writing + outline |
| `VIET-HANG-LOAT-THEO-DAN-BAI-IMPLEMENTATION.md` | Viết Hàng Loạt — Theo Dàn Bài | P3 Queue Bulk, shared outline template, pipe-format keywords, reuse viet-theo-dan-bai outline-parser + writer |
| `VIET-TU-GOOGLE-SEARCH-IMPLEMENTATION.md` | Viết Từ Google Search | P1, search+crawl pipeline |
| `VIET-THEO-DAN-BAI-IMPLEMENTATION.md` | Viết Theo Dàn Bài | P1, outline input |
| `VIET-TOPLIST-IMPLEMENTATION.md` | Viết Toplist | P1, toplist |
| `VIET-LAI-IMPLEMENTATION.md` | Viết Lại Bài Viết | P1, rewrite |
| `VIET-LAI-URL-IMPLEMENTATION.md` | Viết Lại URL | P1, crawl URL |

### Nhóm B — Công Cụ Nhanh
| File | Page | Route |
|------|------|-------|
| `TIKTOK-POST-GENERATOR-IMPLEMENTATION.md` | TikTok Caption nhanh | `/tiktok-post` |
| `FACEBOOK-POST-GENERATOR-IMPLEMENTATION.md` | Tạo Facebook Post nhanh | `/facebook-post` |
| `FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md` | Tạo Facebook Comment nhanh | `/facebook-comment` |
| `ECOMMERCE-TAO-TIEU-DE-SAN-PHAM-IMPLEMENTATION.md` | Tạo Tiêu Đề Sản Phẩm | `/tao-tieu-de-san-pham` |
| `ECOMMERCE-TAO-TEN-SAN-PHAM-IMPLEMENTATION.md` | Tạo Tên Sản Phẩm | `/tao-ten-san-pham` |
| `ECOMMERCE-GIOI-THIEU-SAN-PHAM-IMPLEMENTATION.md` | Giới Thiệu Sản Phẩm | `/gioi-thieu-san-pham` |
| `ECOMMERCE-DANH-GIA-SAN-PHAM-IMPLEMENTATION.md` | Đánh Giá Sản Phẩm (nhanh) | `/danh-gia-san-pham-nhanh` |
| `ECOMMERCE-FAQ-SAN-PHAM-IMPLEMENTATION.md` | FAQ Sản Phẩm | `/faq-san-pham` |

### Nhóm C — Công Cụ Social Brand
| File | Page | Routes |
|------|------|--------|
| `VIET-BAI-TIKTOK-IMPLEMENTATION.md` | Viết Bài TikTok | `/viet-bai-tiktok` + `/quan-ly-bai-tiktok` |
| `VIET-TU-FACEBOOK-IMPLEMENTATION.md` | Viết Bài Facebook | `/viet-bai-facebook` + `/quan-ly-bai-facebook` |
| `VIET-TU-FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md` | Viết Comment Facebook | `/viet-tu-facebook-comment` + `/quan-ly-facebook-comment` |
