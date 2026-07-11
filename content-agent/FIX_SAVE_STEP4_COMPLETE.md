# Fix Save Step4 - Hoàn tất

## Vấn đề
- Nút Save không lưu đầy đủ thông tin
- Các fix trong tab "Nâng cao" không được lưu lại
- Slug và SEO checks không được persist khi reload

## Các thay đổi đã thực hiện

### 1. Sửa field name không đúng
**File: `web/app/viet-bai-thong-minh/step4/page.tsx`**

- ✅ Đổi `title` → `selectedTitle` khi gửi request save (dòng ~295)
- ✅ Đổi `article.title` → `article.selectedTitle` khi load từ DB (dòng ~364)
- ✅ Thêm fallback `|| ''` để tránh undefined

### 2. Lưu manuallyFixed vào database
**File: `web/app/viet-bai-thong-minh/step4/page.tsx`**

```typescript
// Trước:
seoChecks: computedSeoChecks,

// Sau:
seoChecks: {
  checks: computedSeoChecks,
  manuallyFixed: Array.from(manuallyFixed), // Lưu các fix đã làm thủ công
},
```

### 3. Restore manuallyFixed khi load
**File: `web/app/viet-bai-thong-minh/step4/page.tsx`**

```typescript
// Restore manuallyFixed from seoChecks
if (article.seoChecks && typeof article.seoChecks === 'object') {
  const seoChecksData = article.seoChecks as { checks?: unknown; manuallyFixed?: number[] };
  if (Array.isArray(seoChecksData.manuallyFixed)) {
    setManuallyFixed(new Set(seoChecksData.manuallyFixed));
  }
}
```

### 4. Các field được lưu khi Save
Khi bấm nút Save, các thông tin sau được lưu vào database:

- ✅ `selectedTitle` - Tiêu đề bài viết
- ✅ `htmlContent` - Nội dung HTML (bao gồm internal/external links đã chèn)
- ✅ `metaDescription` - Meta description
- ✅ `slug` - URL slug
- ✅ `wordCount` - Số từ
- ✅ `seoScore` - Điểm SEO (computed)
- ✅ `seoChecks` - Chi tiết các SEO checks + manuallyFixed
- ✅ `humannessScore` - Điểm humanness
- ✅ `scoreBreakdown` - Chi tiết điểm AI
- ✅ `secondaryKeywords` - Từ khóa phụ
- ✅ `createVersion: true` - Tạo version mới mỗi lần save

## Tab "Nâng cao" - Các fix được lưu

### 1. Internal Links
- Khi chèn internal link → được thêm vào `htmlContent`
- Index fix được lưu vào `manuallyFixed` (index 8)

### 2. External Links
- Khi chèn external link → được thêm vào `htmlContent`
- Index fix được lưu vào `manuallyFixed` (index 9)

### 3. Mật độ từ khóa
- Khi fix density → nội dung được cập nhật trong `htmlContent`
- Index fix được lưu vào `manuallyFixed` (index 6)

### 4. URL/Slug
- Slug được lưu vào field `slug`
- Tự động restore khi load lại

### 5. Alt text cho ảnh
- Khi thêm alt text → được cập nhật trong `htmlContent`
- Index fix được lưu vào `manuallyFixed` (index 10)

### 6. Từ khóa phụ
- Được lưu vào field `secondaryKeywords`
- Tự động restore khi load lại

## Kết quả
✅ Tất cả các thay đổi trong tab "Nâng cao" đều được lưu lại
✅ Slug và SEO checks được persist
✅ Khi reload trang, tất cả các fix đã làm vẫn còn (hiển thị checkmark xanh)
✅ Version mới được tạo mỗi lần save để có thể rollback

## Test
1. Vào step4, làm các fix trong tab "Nâng cao"
2. Bấm Save
3. Reload trang
4. Kiểm tra: các fix vẫn còn, checkmark xanh vẫn hiển thị
