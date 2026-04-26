# Hướng dẫn hoàn thành CategoryForm thủ công

## Tình hình hiện tại

✅ **Đã hoàn thành (40%)**:
- Infrastructure setup (imports, states, helper functions, modal)
- File backup đã tạo: `CategoryForm.tsx.backup`

⚠️ **Còn lại (60%)**:
- Thay thế 3 tab SEO (Facebook, TikTok, YouTube)

## Cách thực hiện nhanh nhất

### Bước 1: Mở 2 files trong VS Code

1. File nguồn: `NoiThatTienLoi/Code/src/admin/features/news-category/NewsCategoryForm.tsx`
2. File đích: `NoiThatTienLoi/Code/src/admin/features/category/CategoryForm.tsx`

Tip: Dùng VS Code split view (Ctrl+\\) để xem 2 files cạnh nhau

### Bước 2: Thay thế Tab Facebook

**Trong CategoryForm.tsx**, tìm dòng 686-699:
```tsx
{/* === FACEBOOK === */}
{activeTab === 'seo-fb' && (
  <PlatformSeoCard
    platform="FACEBOOK"
    platformLabel="Facebook"
    badgeLabel="FACEBOOK"
    seo={fbSeo}
    onSeoChange={setFbSeo}
    images={fbImages}
    platformLabel2="Facebook"
    uploadDesc="Cho phép tải lên nhiều ảnh post Facebook theo từng danh mục."
    onImagesChange={setFbImages}
  />
)}
```

**Xóa toàn bộ** và thay bằng code từ **NewsCategoryForm.tsx dòng 822-1240**:
```tsx
{/* === SEO FACEBOOK === */}
{activeTab === 'seo-fb' && (
  <div className="card mb-3">
    <div className="card-header fw-semibold">SEO Facebook</div>
    <div className="card-body">
      <span className="badge mb-3" style={{ background: '#eff6ff', color: '#1d4ed8' }}>FACEBOOK</span>
      
      {/* ... toàn bộ nội dung tab Facebook ... */}
      
    </div>
    
    {/* Hình ảnh Facebook */}
    <ImageCardGrid
      images={fbImages}
      platform="FACEBOOK"
      platformLabel="Facebook"
      uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho Facebook."
      onImagesChange={setFbImages}
    />
  </div>
)}
```

**Lưu ý**: Không cần thay đổi tên biến gì cả! Tất cả đều giống nhau:
- `fbSeo` ✅
- `setFbSeo` ✅
- `handleFbSeo` ✅
- `fbImages` ✅
- `setFbImages` ✅
- `openMapModal` ✅

### Bước 3: Thay thế Tab TikTok

**Trong CategoryForm.tsx**, tìm dòng 701-714:
```tsx
{/* === TIKTOK === */}
{activeTab === 'seo-tt' && (
  <PlatformSeoCard
    platform="TIKTOK"
    ...
  />
)}
```

**Xóa toàn bộ** và thay bằng code từ **NewsCategoryForm.tsx dòng 1249-1640**:
```tsx
{/* === SEO TIKTOK === */}
{activeTab === 'seo-tt' && (
  <div className="card mb-3">
    <div className="card-header fw-semibold">SEO TikTok</div>
    <div className="card-body">
      <span className="badge mb-3" style={{ background: '#f0f0f0', color: '#010101' }}>TIKTOK</span>
      
      {/* ... toàn bộ nội dung tab TikTok ... */}
      
    </div>
    
    {/* Hình ảnh TikTok */}
    <ImageCardGrid
      images={ttImages}
      platform="TIKTOK"
      platformLabel="TikTok"
      uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho TikTok."
      onImagesChange={setTtImages}
    />
  </div>
)}
```

**Lưu ý**: Tên biến giống nhau:
- `ttSeo` ✅
- `setTtSeo` ✅
- `handleTtSeo` ✅
- `ttImages` ✅
- `setTtImages` ✅

### Bước 4: Thay thế Tab YouTube

**Trong CategoryForm.tsx**, tìm dòng 716-729:
```tsx
{/* === YOUTUBE === */}
{activeTab === 'seo-yt' && (
  <PlatformSeoCard
    platform="YOUTUBE"
    ...
  />
)}
```

**Xóa toàn bộ** và thay bằng code từ **NewsCategoryForm.tsx dòng 1642-1900**:
```tsx
{/* === SEO YOUTUBE === */}
{activeTab === 'seo-yt' && (
  <div className="card mb-3">
    <div className="card-header fw-semibold">SEO YouTube</div>
    <div className="card-body">
      <span className="badge mb-3" style={{ background: '#ffeef0', color: '#ff0000' }}>YOUTUBE</span>
      
      {/* ... toàn bộ nội dung tab YouTube ... */}
      
    </div>
    
    {/* Hình ảnh YouTube */}
    <ImageCardGrid
      images={ytImages}
      platform="YOUTUBE"
      platformLabel="YouTube"
      uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho YouTube."
      onImagesChange={setYtImages}
    />
  </div>
)}
```

**Lưu ý**: Tên biến giống nhau:
- `ytSeo` ✅
- `setYtSeo` ✅
- `handleYtSeo` ✅
- `ytImages` ✅
- `setYtImages` ✅

### Bước 5: Xóa component PlatformSeoCard (không dùng nữa)

Sau khi thay thế xong 3 tabs, tìm và **xóa** component `PlatformSeoCard` (dòng ~170-290) vì không còn dùng nữa.

### Bước 6: Kiểm tra lỗi TypeScript

```bash
cd NoiThatTienLoi/Code
npx tsc --noEmit
```

Nếu có lỗi, sửa theo thông báo.

### Bước 7: Test trong browser

1. Chạy dev server: `npm run dev`
2. Mở `/admin/categories/new`
3. Test tất cả 5 tabs
4. Test tất cả copy buttons (15 buttons)
5. Test location picker (map + dropdown)
6. Test emoji buttons
7. Test preview cards

## Dòng code chính xác để copy

### Facebook Tab
- **Nguồn**: NewsCategoryForm.tsx, dòng **822-1240** (418 dòng)
- **Đích**: CategoryForm.tsx, thay thế dòng **686-699**

### TikTok Tab
- **Nguồn**: NewsCategoryForm.tsx, dòng **1249-1640** (391 dòng)
- **Đích**: CategoryForm.tsx, thay thế dòng **701-714**

### YouTube Tab
- **Nguồn**: NewsCategoryForm.tsx, dòng **1642-1900** (258 dòng)
- **Đích**: CategoryForm.tsx, thay thế dòng **716-729**

## Tổng cộng

- **Copy**: ~1067 dòng code
- **Thời gian ước tính**: 15-20 phút
- **Không cần thay đổi tên biến**: Tất cả đều giống nhau!

## Nếu gặp lỗi

1. **Import thiếu**: Đã có đầy đủ imports ở đầu file
2. **State thiếu**: Đã có đầy đủ states
3. **Function thiếu**: Đã có đầy đủ helper functions
4. **Modal thiếu**: Đã có LocationPickerModal ở cuối file

## Khôi phục nếu cần

Nếu có vấn đề, restore từ backup:
```bash
cp NoiThatTienLoi/Code/src/admin/features/category/CategoryForm.tsx.backup NoiThatTienLoi/Code/src/admin/features/category/CategoryForm.tsx
```

## Kết quả mong đợi

Sau khi hoàn thành, trang `/admin/categories/new` sẽ có:
- ✅ 5 tabs: basic, seo-web, seo-fb, seo-tt, seo-yt
- ✅ 28 emoji buttons per tab (FB, TT)
- ✅ 20 sample keywords/hashtags per field
- ✅ Location picker với 9 địa điểm + map button
- ✅ 15 copy buttons (5 per tab)
- ✅ 3 preview cards (Facebook, TikTok, YouTube)
- ✅ Character counters
- ✅ Giống hệt `/admin/news-categories/new`

