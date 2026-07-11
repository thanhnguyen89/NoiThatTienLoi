# Hướng dẫn sử dụng Content Agent

## 1. Đăng nhập

1. Truy cập: http://localhost:3000
2. Nếu chưa đăng nhập, hệ thống tự động redirect đến `/login.html`
3. Nhập thông tin:
   - **Username:** admin
   - **Password:** admin123
4. Click "Đăng nhập"

### Màn hình đăng nhập
- Logo: 🤖 Content Agent
- Form đăng nhập với icon
- Toggle hiển thị/ẩn mật khẩu
- Checkbox "Ghi nhớ đăng nhập"
- Link "Quên mật khẩu?"
- Button "Đăng nhập" với loading state

## 2. Giao diện chính

Sau khi đăng nhập thành công, bạn sẽ thấy:

### Sidebar (bên trái)
- **Logo:** 🤖 Content Agent
- **Menu:**
  - ⚡ Pipeline (tạo content mới)
  - 📋 Lịch sử (xem các bài đã tạo)
  - 🎨 Context & Data (xem brand context)
- **User Info:**
  - Avatar
  - Tên user
  - Role
  - Button đăng xuất 🚪
- **Footer:**
  - Brand: Nội Thất Minh Quân
  - Tagline: Content Agent System

### Main Content (bên phải)
Có 3 views chính:

#### View 1: Pipeline (Tạo Content Mới)
- Input form:
  - Từ khóa chính (required)
  - Sản phẩm (optional dropdown)
  - Loại content (Blog/Facebook/Instagram)
- Button "🚀 Chạy Pipeline"
- Accordion "📋 Pipeline 8 bước — xem chi tiết"
- Pipeline steps (hiển thị khi chạy)
- Final report (sau khi hoàn thành)
- Article preview

#### View 2: Lịch sử
- Danh sách các bài đã tạo
- (Chưa có data - chạy pipeline đầu tiên để bắt đầu)

#### View 3: Context & Data
- Tabs:
  - Brand Guideline
  - Customer Persona
  - Marketing Channels
  - Product Catalog
  - Content SOP
  - Research SOP
  - Performance Data
- Hiển thị nội dung markdown

## 3. Chạy Pipeline

### Bước 1: Nhập từ khóa
Ví dụ: "giường sắt đơn ống tròn"

### Bước 2: Chọn sản phẩm (optional)
Dropdown hiển thị danh sách sản phẩm từ catalog

### Bước 3: Chọn loại content
- Blog / SEO Article (mặc định)
- Caption Facebook
- Caption Instagram

### Bước 4: Click "🚀 Chạy Pipeline"
Button sẽ đổi thành "⏳ Đang chạy pipeline..."

### Bước 5: Theo dõi tiến trình
Pipeline sẽ chạy qua 8 bước:

1. **🔍 Research** (5-10s)
   - Phân tích keyword, intent, đối thủ
   - Output: search intent, target audience, secondary keywords, questions, key points

2. **📝 Outline** (5-10s)
   - Tạo dàn ý H2/H3, meta description
   - Output: title, slug, sections với estimated words

3. **✍️ Content** (15-30s)
   - Viết bài HTML chi tiết theo dàn ý
   - Output: HTML content, word count, keywords used

4. **📊 SEO Optimize** (5-10s)
   - Tối ưu keyword, title, meta, schema
   - Output: SEO score, keyword density, issues fixed

5. **🧑‍💼 QC / Humanize** (10-20s)
   - Xóa dấu vết AI, chấm humanness score
   - Output: humanness score, decision (PUBLISH/REVIEW/REWRITE), changes made

6. **🖼️ Thumbnail** (3-5s)
   - Tạo ảnh đại diện bằng AI
   - Output: image URL, alt text, dimensions

7. **🎨 Section Images** (3-5s)
   - Ảnh minh họa evocative/cinematic
   - Output: array of images cho từng section

8. **🚀 Publish** (1-2s)
   - Hiển thị preview + báo cáo
   - Output: post URL, report summary

**Tổng thời gian:** ~50-90 giây

### Bước 6: Xem kết quả

#### Final Report
Hiển thị các metrics:
- Số từ
- SEO Score /100
- Humanness Score /100
- Decision (PUBLISH/REVIEW/REWRITE)
- Số ảnh
- Thời gian xử lý

#### Article Preview
- Hiển thị HTML content đầy đủ
- Có thể scroll để xem toàn bộ bài
- Format giống như sẽ hiển thị trên website

## 4. Chi tiết từng bước Pipeline

### Step 1: Research
**Mục đích:** Phân tích keyword và xác định chiến lược content

**Output:**
- `search_intent`: informational / navigational / transactional / commercial
- `target_audience`: Mô tả đối tượng đọc bài
- `secondary_keywords`: Danh sách keyword phụ
- `questions_to_answer`: Các câu hỏi cần trả lời
- `key_points`: Điểm chính cần cover
- `recommended_word_count`: Độ dài đề xuất
- `content_gaps`: Những gì đối thủ chưa viết

**Badge:**
- 🤖 Gemini: Dùng Gemini API
- 📦 Mock: Dùng mock data (khi Gemini unavailable)

### Step 2: Outline
**Mục đích:** Tạo dàn ý chi tiết

**Output:**
- `title`: Tiêu đề bài viết đề xuất
- `meta_description`: Meta description cho SEO (150-160 ký tự)
- `slug`: URL slug
- `estimated_total_words`: Ước lượng tổng số từ
- `seo_keywords`: Danh sách SEO keywords cần tích hợp
- `sections`: Array of sections với H2, H3s, key_points, estimated_words

**Cấu trúc sections:**
```
H2.1: Tại sao chọn [keyword] không đơn giản (~300 từ)
H2.2: So sánh chất liệu: Da thật vs Vải vs Da tổng hợp (~500 từ)
  - H3: Da bò full-grain
  - H3: Vải linen cao cấp
  - H3: Da tổng hợp PU
H2.3: Kích thước phù hợp theo diện tích phòng (~400 từ)
...
```

### Step 3: Content
**Mục đích:** Viết bài HTML hoàn chỉnh

**Output:**
- `word_count`: Số từ thực tế
- `html_content`: HTML markup đầy đủ
- `seo_keywords_used`: Keywords đã tích hợp

**Đặc điểm:**
- Viết như người thật, không như robot
- Câu ngắn xen câu dài
- Đoạn văn tối đa 80 từ
- Không dùng 14 banned words
- Tích hợp keyword tự nhiên

### Step 4: SEO Optimize
**Mục đích:** Tối ưu kỹ thuật SEO

**Output:**
- `seo_score`: Điểm SEO /100
- `title_tag`: Title tag tối ưu (50-60 ký tự)
- `meta_description`: Meta description (150-160 ký tự)
- `slug`: URL slug
- `keyword_density`: Mật độ keyword (target: 1.0-1.5%)
- `keyword_in_first_100_words`: Boolean
- `issues_fixed`: Danh sách vấn đề đã sửa
- `issues_remaining`: Vấn đề còn lại (nếu có)
- `optimized_html`: HTML đã tối ưu

**Không làm:**
- KHÔNG viết lại nội dung
- KHÔNG thay đổi giọng văn
- Chỉ tối ưu kỹ thuật

### Step 5: QC / Humanize
**Mục đích:** Xóa dấu vết AI, chấm điểm humanness

**Output:**
- `humanness_score`: Điểm /100
- `score_breakdown`: 
  - `language_natural`: /25
  - `structure`: /25
  - `eeat_signals`: /25
  - `engagement`: /25
- `decision`: PUBLISH (≥76) | REVIEW (60-75) | REWRITE (<60)
- `banned_words_found`: Từ cấm tìm thấy
- `changes_made`: Danh sách thay đổi
- `final_html`: HTML cuối cùng

**14 Banned Words:**
1. quan trọng
2. hiệu quả
3. tuy nhiên
4. bên cạnh đó
5. đáng kể
6. trong thế giới hiện đại
7. không thể phủ nhận
8. toàn diện
9. hy vọng bài viết
10. thông tin hữu ích
11. nổi bật
12. đột phá
13. tối ưu
14. chuyên nghiệp

### Step 6: Thumbnail
**Mục đích:** Tạo ảnh đại diện 1200x630

**Output:**
- `image.url`: URL ảnh
- `image.alt_text`: Alt text cho SEO
- `image.width`: 1200
- `image.height`: 630
- `image.prompt`: Prompt đã dùng để generate
- `notes`: Ghi chú

**Hiện tại:** Mock với placeholder
**Tương lai:** Tích hợp Gemini Imagen / DALL-E / OpenRouter

### Step 7: Section Images
**Mục đích:** Ảnh minh họa evocative/cinematic cho từng section

**Output:**
- `images`: Array of images (tối đa 3)
  - `section_h2`: H2 của section
  - `url`: URL ảnh
  - `alt_text`: Alt text
  - `width`: 800
  - `height`: 450
  - `prompt`: Prompt đã dùng
  - `style`: "evocative/cinematic"

**Lưu ý:**
- KHÔNG phải infographic hay diagram
- Ảnh phải evocative (gợi cảm xúc) hoặc cinematic (điện ảnh)
- Không có text overlay

### Step 8: Publish
**Mục đích:** Hiển thị preview + báo cáo, chờ xác nhận

**Output:**
- `status`: "pending_approval" | "published"
- `post_url`: URL bài viết
- `report`: Object chứa summary
  - `title`: Tiêu đề
  - `slug`: URL slug
  - `meta_description`: Meta description
  - `word_count`: Số từ
  - `seo_score`: Điểm SEO
  - `humanness_score`: Điểm humanness
  - `decision`: PUBLISH/REVIEW/REWRITE
  - `images_count`: Số ảnh
  - `seo_keywords`: Keywords
  - `processing_time_seconds`: Thời gian xử lý

**Quy tắc publish:**
- Humanness score ≥76: Có thể publish
- Humanness score 60-75: Cần review
- Humanness score <60: Cần viết lại

## 5. Xem Context & Data

Click vào tab "🎨 Context & Data" để xem:

### Brand Guideline
- Brand DNA: Chân thật – Chuyên nghiệp – Gần gũi
- Tone of voice
- USPs
- Danh mục sản phẩm

### Customer Persona
- 3 personas chính:
  1. Người mua thực dụng
  2. Chủ kinh doanh nhỏ
  3. Người mua cao cấp

### Marketing Channels
- Website
- Facebook
- Instagram
- TikTok
- Zalo
- Google Ads

### Product Catalog
- 11 nhóm sản phẩm
- Chi tiết từng sản phẩm với giá, size, màu sắc

### Content SOP
- Quy trình viết content
- Template
- Checklist

### Research SOP
- Quy trình research
- Tools
- Checklist

### Performance Data
- Metrics từ các bài trước
- Top performing keywords
- Engagement rates

## 6. Đăng xuất

Click vào button 🚪 ở sidebar để đăng xuất.

Hệ thống sẽ:
1. Xóa session trên server
2. Xóa token trong localStorage
3. Redirect về trang login

## 7. Tips & Tricks

### Chọn từ khóa tốt
- Dài 2-5 từ
- Có search volume
- Phù hợp với sản phẩm
- Ví dụ: "giường sắt đơn giá rẻ", "bàn ghế inox quán ăn"

### Khi nào chọn sản phẩm?
- Chọn khi viết bài về sản phẩm cụ thể
- Bỏ trống khi viết bài tổng quan hoặc so sánh

### Loại content nào?
- **Blog/SEO Article:** Bài dài 1500-2500 từ, SEO-focused
- **Caption Facebook:** Ngắn 100-300 từ, casual tone
- **Caption Instagram:** Ngắn 50-150 từ, hashtags

### Xem chi tiết từng bước
- Click vào header của step để expand/collapse
- Xem output JSON để debug

### Humanness Score thấp?
Nguyên nhân thường gặp:
- Dùng quá nhiều banned words
- Câu văn quá dài, đều nhau
- Thiếu quan điểm riêng
- Quá nhiều bullet points

Giải pháp:
- Chạy lại pipeline với keyword khác
- Hoặc edit manual sau khi export

## 8. Keyboard Shortcuts

- `Enter` trong input "Từ khóa chính" → Chạy pipeline
- `Esc` → Focus vào input từ khóa

## 9. Troubleshooting

### "Chưa đăng nhập"
- Clear localStorage: F12 → Console → `localStorage.clear()`
- Refresh page
- Login lại

### Pipeline bị stuck
- Refresh page
- Check server logs
- Gemini API có thể bị rate limit → sẽ fallback sang mock

### Không thấy brand context
- Check files trong `../context/` có tồn tại không
- Restart server

### Ảnh không hiển thị
- Hiện tại dùng placeholder
- Cần tích hợp image generation API

## 10. Next Steps

Sau khi có bài viết:
1. Review content trong Article Preview
2. Copy HTML
3. Paste vào WordPress/Shopify/Haravan
4. Upload ảnh (thumbnail + section images)
5. Set featured image
6. Publish!

---

**Liên hệ hỗ trợ:** Nội Thất Minh Quân - Content Team
