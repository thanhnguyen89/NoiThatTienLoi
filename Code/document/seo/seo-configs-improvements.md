# Đề xuất cải thiện trang quản lý SEO Configs

## 1. Thêm Checkbox "Select All" và Bulk Actions

Giống như trang Products và Categories:
- [ ] Checkbox select all
- [ ] Bulk activate/deactivate
- [ ] Bulk delete
- [ ] Bulk update noindex

## 2. Thêm Preview SEO

Hiển thị preview như Google Search Results:
```
[Title] Nội Thất Tiện Lợi - Chất lượng thật, Giá trị thật
[URL] https://example.com/
[Description] Hệ thống cửa hàng nội thất chính hãng - Chất lượng thật, Giá trị thật
```

## 3. Thêm Open Graph & Twitter Cards

Các trường bổ sung:
- `ogTitle` - Open Graph Title
- `ogDescription` - Open Graph Description  
- `ogImage` - Open Graph Image
- `ogType` - Open Graph Type (website, article, product)
- `twitterCard` - Twitter Card Type (summary, summary_large_image)
- `twitterTitle` - Twitter Title
- `twitterDescription` - Twitter Description
- `twitterImage` - Twitter Image

## 4. Thêm Structured Data (Schema.org)

- `schemaType` - Schema type (Organization, WebSite, Product, Article, etc.)
- `schemaJson` - JSON-LD structured data

## 5. Cải thiện URL Management

- Validation URL format
- Check duplicate URLs
- Auto-generate từ title
- Preview full URL: `https://domain.com{seName}`

## 6. Thêm SEO Score/Checklist

Hiển thị điểm SEO và checklist:
- ✅ Title length (50-60 chars optimal)
- ✅ Description length (150-160 chars optimal)
- ✅ Has canonical URL
- ✅ Has meta keywords
- ⚠️ Image has alt text
- ❌ Missing Open Graph tags

## 7. Thêm Page Type Selector

Dropdown để chọn loại trang:
- Homepage
- Category Page
- Product Page
- Article/Blog Page
- Static Page (About, Contact, etc.)

Mỗi loại có template SEO riêng.

## 8. Thêm Language/Locale Support

Nếu site đa ngôn ngữ:
- `locale` - vi-VN, en-US, etc.
- `alternateUrls` - Alternate language URLs
- `hreflang` tags

## 9. Cải thiện Table Display

Thêm cột:
- **Page Type** - Loại trang
- **Last Modified** - Ngày sửa cuối
- **SEO Score** - Điểm SEO (0-100)
- **Status** - Draft/Published
- **Preview** - Link xem trước

## 10. Thêm Filters

Filter theo:
- Page Type
- Active/Inactive
- Noindex/Index
- SEO Score range
- Last modified date

## 11. Thêm Import/Export

- Export SEO configs to CSV/JSON
- Import from CSV/JSON
- Bulk update via import

## 12. Thêm SEO Templates

Tạo templates cho các loại trang:
```
Template: Product Page
- Title: {productName} - {categoryName} | {siteName}
- Description: Mua {productName} giá tốt tại {siteName}. {productDescription}
- Keywords: {productName}, {categoryName}, {brand}
```

## 13. Thêm Robots.txt Management

Quản lý robots.txt từ admin:
- User-agent rules
- Disallow/Allow paths
- Sitemap URL

## 14. Thêm Sitemap Management

- Auto-generate sitemap.xml
- Priority settings
- Change frequency
- Last modified dates

## 15. Thêm Analytics Integration

Hiển thị metrics từ Google Analytics:
- Page views
- Bounce rate
- Average time on page
- Click-through rate (CTR) from search

## Ưu tiên triển khai:

### Phase 1 (Cần thiết):
1. ✅ Checkbox Select All & Bulk Actions
2. ✅ SEO Preview
3. ✅ Open Graph & Twitter Cards
4. ✅ URL Validation

### Phase 2 (Quan trọng):
5. Structured Data
6. SEO Score/Checklist
7. Page Type Selector
8. Improved Table Display

### Phase 3 (Nâng cao):
9. Language Support
10. Import/Export
11. SEO Templates
12. Robots.txt Management

### Phase 4 (Tích hợp):
13. Sitemap Management
14. Analytics Integration
