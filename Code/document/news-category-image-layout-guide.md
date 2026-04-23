# News Category - Image Layout Guide

## 🎨 Layout mong muốn (giống /admin/categories/new)

### Tab "Thông tin cơ bản":
```
┌─────────────────────────────────────────────────────────────┐
│ [Các field khác: title, slug, summary, content...]         │
│                                                             │
│ ┌─────────────┬─────────────┬─────────────┐              │
│ │ Hình ảnh    │ Icon        │ Banner      │              │
│ │ [Upload]    │ [Upload]    │ [Upload]    │              │
│ │ [Chọn ảnh]  │ [Chọn ảnh]  │ [Chọn ảnh]  │              │
│ │ [NO IMAGE]  │ [NO IMAGE]  │ [NO IMAGE]  │              │
│ └─────────────┴─────────────┴─────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Tab "SEO Website" (và các tab SEO khác):
```
┌─────────────────────────────────────────────────────────────┐
│ [Các field SEO: Meta Title, Description, Keywords...]      │
│                                                             │
│ Hình ảnh Website                                           │
│ [Chọn ảnh]                                                 │
│ Chưa có ảnh. Nhấn "Chọn ảnh" để thêm.                     │
│                                                             │
│ ┌─────────────┬─────────────┬─────────────┐              │
│ │ Hình ảnh    │ Icon        │ Banner      │              │
│ │ [Upload]    │ [Upload]    │ [Upload]    │              │
│ │ [Chọn ảnh]  │ [Chọn ảnh]  │ [Chọn ảnh]  │              │
│ │ [NO IMAGE]  │ [NO IMAGE]  │ [NO IMAGE]  │              │
│ └─────────────┴─────────────┴─────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Đã implement:

1. ✅ Tab "Thông tin cơ bản" có 3 ô: imageUrl, icon, banner (từ form state)
2. ✅ Mỗi tab SEO có:
   - "Hình ảnh Website/Facebook/TikTok/YouTube" - chọn nhiều ảnh
   - 3 ô riêng: Hình ảnh, Icon, Banner

## 🔧 Cần điều chỉnh:

### 1. Tab "Thông tin cơ bản":
- ✅ Đã có 3 ô riêng biệt
- ✅ Layout 3 cột ngang hàng
- ✅ Mỗi ô có Upload + Chọn ảnh
- ✅ Hiển thị "NO IMAGE" khi chưa có ảnh

### 2. Tab SEO (Website, Facebook, TikTok, YouTube):
- ✅ "Hình ảnh [Platform]" - chỉ có nút "Chọn ảnh" (không có Upload)
- ✅ Text "Chưa có ảnh. Nhấn 'Chọn ảnh' để thêm."
- ✅ 3 ô riêng: Hình ảnh, Icon, Banner (layout 3 cột)
- ✅ Mỗi ô có Upload + Chọn ảnh
- ✅ Hiển thị "NO IMAGE"

## 📝 Code structure:

### State:
```typescript
// Tab cơ bản
const [form, setForm] = useState({
  imageUrl: '',
  icon: '',
  banner: '',
  // ... other fields
});

// Tab SEO Website
const [webSeo, setWebSeo] = useState({
  // ... SEO fields
  banner: '', // Banner riêng cho website
});
const [webImages, setWebImages] = useState<ImageItem[]>([]); // Nhiều ảnh

// Tương tự cho fbSeo, ttSeo, ytSeo
```

### Layout HTML:
```html
<!-- Hình ảnh Website (chọn nhiều) -->
<div class="mb-3">
  <label>Hình ảnh Website</label>
  <button>Chọn ảnh</button>
  <div>Chưa có ảnh. Nhấn "Chọn ảnh" để thêm.</div>
</div>

<!-- 3 ô riêng (row 3 columns) -->
<div class="row g-3 mb-3">
  <div class="col-4">
    <label>Hình ảnh</label>
    <button>Upload</button>
    <button>Chọn ảnh</button>
    <div>NO IMAGE</div>
  </div>
  <div class="col-4">
    <label>Icon</label>
    <button>Upload</button>
    <button>Chọn ảnh</button>
    <div>NO IMAGE</div>
  </div>
  <div class="col-4">
    <label>Banner</label>
    <button>Upload</button>
    <button>Chọn ảnh</button>
    <div>NO IMAGE</div>
  </div>
</div>
```

## 🎯 Kết quả mong đợi:

✅ Giao diện giống hệt `/admin/categories/new`
✅ Tab cơ bản: 3 ô ngang hàng
✅ Tab SEO: Hình ảnh nhiều + 3 ô riêng
✅ Placeholder "NO IMAGE" khi chưa có ảnh
✅ Nút Upload + Chọn ảnh cho mỗi ô đơn
✅ Chỉ nút "Chọn ảnh" cho phần nhiều ảnh

## 📸 Reference:
- `/admin/categories/new` - Tab "Thông tin cơ bản"
- Ảnh tham khảo đã gửi
