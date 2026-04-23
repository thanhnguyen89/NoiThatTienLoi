# News Category - Final Image Layout

## 🎯 Mục tiêu: Giống hệt `/admin/categories/new`

### ✅ Layout cuối cùng cho MỖI TAB SEO:

```
┌──────────────────────────────────────────────────────────────────┐
│ SEO [Platform] (Website/Facebook/TikTok/YouTube)                 │
├──────────────────────────────────────────────────────────────────┤
│ [Các field SEO: Title, Description, Keywords, Hashtags...]      │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Hình ảnh [Platform]                                        │ │
│ │ [Chọn ảnh]                                                 │ │
│ │ Chưa có ảnh. Nhấn "Chọn ảnh" để thêm.                     │ │
│ │ (hoặc hiển thị grid thumbnails nếu đã chọn)               │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│ │ Ảnh đại diện │ Icon         │ Banner       │ Thứ tự       │ │
│ │ [Upload]     │ [Upload]     │ [Upload]     │ [0]          │ │
│ │ [Chọn ảnh]   │ [Chọn ảnh]   │ [Chọn ảnh]   │              │ │
│ │ [NO IMAGE]   │ [NO IMAGE]   │ [NO IMAGE]   │              │ │
│ └──────────────┴──────────────┴──────────────┴──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## 📋 Chi tiết từng phần:

### 1. **Hình ảnh [Platform]** (Phần trên - chọn nhiều)
- **Chức năng**: Upload/chọn nhiều ảnh (max 10)
- **UI**: 
  - Nút "Chọn ảnh" (không có Upload)
  - Text: "Chưa có ảnh. Nhấn 'Chọn ảnh' để thêm."
  - Grid thumbnails 100x100px khi đã chọn
  - Badge số thứ tự (#1, #2, #3...)
  - Nút xóa (×) mỗi ảnh

### 2. **4 cột ngang hàng** (Phần dưới):

#### **Cột 1: Ảnh đại diện** (col-3)
- **State**: `fbSeo.image` (hoặc ttSeo.image, ytSeo.image)
- **Nút**: Upload + Chọn ảnh
- **Preview**: 100x100px hoặc "NO IMAGE"
- **Nút xóa**: × (góc trên phải)

#### **Cột 2: Icon** (col-3)
- **State**: `fbSeo.icon`
- **Nút**: Upload + Chọn ảnh
- **Preview**: 100x100px hoặc "NO IMAGE"
- **Nút xóa**: ×

#### **Cột 3: Banner** (col-3)
- **State**: `fbSeo.banner`
- **Nút**: Upload + Chọn ảnh
- **Preview**: 100x100px hoặc "NO IMAGE"
- **Nút xóa**: ×

#### **Cột 4: Thứ tự** (col-3)
- **Input**: Number input
- **Placeholder**: "0"
- **Min**: 0

## 💾 State Structure:

```typescript
// Facebook SEO
const [fbSeo, setFbSeo] = useState({
  title: '',
  description: '',
  keywords: '',
  hashtags: '',
  image: '',        // ← Ảnh đại diện
  icon: '',         // ← Icon
  banner: '',       // ← Banner
  linkPosted: '',
});
const [fbImages, setFbImages] = useState<ImageItem[]>([]); // ← Nhiều ảnh

// Tương tự cho ttSeo, ytSeo, webSeo
```

## 🎨 HTML Structure:

```html
<!-- Hình ảnh nhiều -->
<div class="mb-3">
  <MultipleImageUploader
    value={fbImages}
    onChange={setFbImages}
    label="Hình ảnh"
    maxImages={10}
  />
</div>

<!-- 4 cột -->
<div class="row g-3 mb-3">
  <!-- Ảnh đại diện -->
  <div class="col-3">
    <label>Ảnh đại diện</label>
    <button>Upload</button>
    <button>Chọn ảnh</button>
    {fbSeo.image ? <img /> : <div>NO IMAGE</div>}
  </div>

  <!-- Icon -->
  <div class="col-3">
    <label>Icon</label>
    <button>Upload</button>
    <button>Chọn ảnh</button>
    {fbSeo.icon ? <img /> : <div>NO IMAGE</div>}
  </div>

  <!-- Banner -->
  <div class="col-3">
    <label>Banner</label>
    <button>Upload</button>
    <button>Chọn ảnh</button>
    {fbSeo.banner ? <img /> : <div>NO IMAGE</div>}
  </div>

  <!-- Thứ tự -->
  <div class="col-3">
    <label>Thứ tự</label>
    <input type="number" min="0" value="0" />
  </div>
</div>
```

## ✅ Checklist Implementation:

### Tab "Thông tin cơ bản":
- [x] 3 ô: imageUrl, icon, banner (từ form state)
- [x] Layout 3 cột (col-4 mỗi cột)
- [x] Upload + Chọn ảnh
- [x] NO IMAGE placeholder

### Tab "SEO Website":
- [x] Hình ảnh Website (nhiều ảnh)
- [x] 4 cột: Ảnh đại diện, Icon, Banner, Thứ tự
- [x] Upload + Chọn ảnh cho mỗi ô đơn
- [x] NO IMAGE placeholder

### Tab "SEO Facebook":
- [x] Hình ảnh Facebook (nhiều ảnh)
- [x] 4 cột: Ảnh đại diện, Icon, Banner, Thứ tự
- [x] Upload + Chọn ảnh
- [x] NO IMAGE placeholder

### Tab "SEO TikTok":
- [x] Hình ảnh TikTok (nhiều ảnh)
- [x] 4 cột: Ảnh đại diện, Icon, Banner, Thứ tự
- [x] Upload + Chọn ảnh
- [x] NO IMAGE placeholder

### Tab "SEO YouTube":
- [x] Hình ảnh YouTube (nhiều ảnh)
- [x] 4 cột: Ảnh đại diện, Icon, Banner, Thứ tự
- [x] Upload + Chọn ảnh
- [x] NO IMAGE placeholder

## 🔧 Files cần cập nhật:

1. ✅ `NewsCategoryForm.tsx` - Component chính
2. ✅ `MultipleImageUploader.tsx` - Component upload nhiều ảnh
3. ✅ `upload/route.ts` - API upload
4. ✅ State cho mỗi platform (webSeo, fbSeo, ttSeo, ytSeo)

## 🎯 Kết quả:

Giao diện **giống hệt** `/admin/categories/new` với:
- ✅ Hình ảnh nhiều (chọn ảnh)
- ✅ Ảnh đại diện (upload + chọn)
- ✅ Icon (upload + chọn)
- ✅ Banner (upload + chọn)
- ✅ Thứ tự (number input)
- ✅ Layout 4 cột ngang hàng
- ✅ NO IMAGE placeholder
- ✅ Preview thumbnails
- ✅ Nút xóa (×)

---

**Status**: ✅ HOÀN THÀNH
**Version**: 3.0.0
**Date**: 2026-04-21
