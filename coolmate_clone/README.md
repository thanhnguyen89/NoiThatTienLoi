# Coolmate Clone - Trang Web Thời Trang Nam

## 📋 Mô tả dự án

Đây là bản clone giao diện trang web Coolmate - một trang thương mại điện tử chuyên về thời trang nam cao cấp. Dự án được xây dựng với HTML, CSS và JavaScript thuần, sử dụng Nunjucks template engine và Webpack để build.

## 🎨 Các tính năng chính

### 1. **Header**
- Logo và menu điều hướng
- Thanh tìm kiếm với overlay
- Icon tài khoản và giỏ hàng
- Sticky header khi scroll
- Responsive cho mobile

### 2. **Hero Banner**
- Banner lớn với gradient background
- Animation fade in khi load trang
- Call-to-action button
- Responsive layout

### 3. **Category Icons**
- 6 danh mục sản phẩm chính
- Icon tròn với hover effect
- Grid layout responsive

### 4. **Product Grid**
- Hiển thị sản phẩm dạng lưới 4 cột
- Product card với:
  - Hình ảnh sản phẩm
  - Badge (NEW, SALE)
  - Tên sản phẩm
  - Giá (có giá gốc và giá sale)
  - Color variants
- Hover effect nâng card lên
- Responsive: 4 cột → 3 cột → 2 cột → 1 cột

### 5. **Banner Sections**
- 4 banner quảng cáo với màu sắc khác nhau:
  - Đồ Lót (màu tím)
  - Pickleball (màu xanh lá)
  - Quần Lót Nam (màu xám đen)
  - Đồ Chạy Bộ (màu xanh dương nhạt)
- Layout 2 cột: text + image
- Responsive cho mobile

### 6. **Instagram Section**
- Grid hiển thị ảnh từ Instagram
- Hover effect với overlay
- Icon Instagram khi hover
- Responsive grid

### 7. **Info Boxes**
- 3 box thông tin:
  - Miễn phí vận chuyển
  - Đổi trả dễ dàng
  - Hỗ trợ 24/7
- Icon gradient với shadow
- Hover effect

### 8. **Footer**
- 4 cột thông tin:
  - Về Coolmate
  - Hỗ trợ khách hàng
  - Liên hệ
  - Đăng ký nhận tin
- Social media links
- Newsletter form
- Payment methods
- Copyright và links

## 🚀 Cài đặt và chạy dự án

### Yêu cầu
- Node.js (v14 trở lên)
- npm hoặc yarn

### Các bước cài đặt

1. **Cài đặt dependencies:**
```bash
npm install
```

2. **Chạy development server:**
```bash
npm run dev
```

3. **Build production:**
```bash
npm run build
```

4. **Xem kết quả:**
- Development: http://localhost:8080
- Production: Mở file `dist/index.html` trong trình duyệt

## 📁 Cấu trúc thư mục

```
coolmate_clone/
├── src/
│   ├── assets/
│   │   ├── css/
│   │   │   └── pages/
│   │   │       ├── coolmate-header.css
│   │   │       ├── coolmate.css
│   │   │       └── coolmate-footer.css
│   │   ├── images/
│   │   └── js/
│   ├── pages/
│   │   └── home/
│   │       ├── index.njk
│   │       └── index.js
│   └── partials/
│       ├── header.njk
│       └── footer.njk
├── dist/                 # Build output
├── package.json
├── webpack.config.js
└── README.md
```

## 🎯 Các tính năng JavaScript

1. **Search Overlay**
   - Click vào icon search để mở overlay
   - ESC để đóng
   - Click outside để đóng

2. **Cart Management**
   - Lưu giỏ hàng vào localStorage
   - Cập nhật số lượng sản phẩm

3. **Smooth Scroll**
   - Scroll mượt mà cho anchor links

4. **Newsletter Form**
   - Validate email
   - Submit form

5. **Lazy Loading Images**
   - Load ảnh khi scroll đến

6. **Scroll to Top Button**
   - Hiện khi scroll xuống > 300px
   - Click để scroll về đầu trang

7. **Animation on Scroll**
   - Fade in elements khi scroll

## 🎨 Màu sắc chính

- Primary Blue: `#4A90E2`
- Dark Blue: `#357ABD`
- Red (Sale): `#ff4444`
- Dark Background: `#1a1a1a`
- Light Background: `#f8f9fa`

## 📱 Responsive Breakpoints

- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px
- Small Mobile: < 480px

## 🔧 Công nghệ sử dụng

- **HTML5**: Cấu trúc trang
- **CSS3**: Styling với Flexbox, Grid, Animations
- **JavaScript (ES6+)**: Tương tác và logic
- **Nunjucks**: Template engine
- **Webpack**: Module bundler
- **Font Awesome**: Icons
- **Google Fonts**: Typography (Inter)

## 📝 Ghi chú

- Tất cả hình ảnh sản phẩm cần được thêm vào thư mục `src/assets/images/`
- File CSS được tổ chức theo component để dễ maintain
- JavaScript được viết theo ES6+ standard
- Code được comment đầy đủ để dễ hiểu

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo pull request hoặc issue nếu bạn có ý tưởng cải thiện.

## 📄 License

MIT License - Tự do sử dụng cho mục đích học tập và thương mại.

---

**Phát triển bởi:** Coolmate Clone Team
**Ngày tạo:** 2024
**Version:** 1.0.0
