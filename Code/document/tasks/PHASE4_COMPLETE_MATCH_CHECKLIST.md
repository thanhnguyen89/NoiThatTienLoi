# 📋 Checklist: Chỉnh News Form Giống Hoàn Toàn News-Category Form

## 🎯 Mục Tiêu
Chỉnh trang `admin/news/new` cho giống **HOÀN TOÀN** `admin/news-categories/new`

## ❌ Những Gì Còn Thiếu

### 1. **Tab SEO Website**
- [ ] Character counter cho Meta Title (60/60)
- [ ] Character counter cho Meta Description (160/160)
- [ ] Google Search Result Preview Card (với breadcrumb, title, description, meta info)
- [ ] SingleImageUploader cho OG Image
- [ ] ImageCardGrid component cho Website images
- [ ] Horizontal line (`<hr />`) giữa SEO fields và OG fields

### 2. **Tab Facebook**
- [ ] **Emoji Picker** - 30+ emoji buttons:
  - Nhà & Nội thất: 🏠 🏡 🛋️ 🪑 🛏️ 🚪 🪟 💡
  - Chất lượng: ✨ 🌟 💎 ⭐ 💯 ✅
  - Xu hướng: 🔥 👍 👌 ❤️ 😍
  - Giá & Ưu đãi: 💰 🎁 ⚡
  - Dịch vụ: 🚚 📦 🔨 🔧
  - Thiết kế: 🎨 🏘️
- [ ] **Keywords** với scrollable container (maxHeight: 120px, overflow-y: auto)
- [ ] **Hashtags** với scrollable container
- [ ] **Location Picker** với:
  - Input field + Map button + Dropdown button
  - Dropdown menu với 10+ địa điểm mẫu
  - Icon bi-geo-alt, bi-map
- [ ] **SingleImageUploader** cho Facebook Image
- [ ] **Copy to Clipboard Button** (btn-success, full width)
- [ ] **ImageCardGrid** component cho Facebook images

### 3. **Tab TikTok**
- [ ] Emoji Picker (giống Facebook)
- [ ] Keywords với scrollable container
- [ ] Hashtags với scrollable container
- [ ] Location Picker với dropdown
- [ ] SingleImageUploader
- [ ] Copy to Clipboard Button
- [ ] ImageCardGrid component

### 4. **Tab YouTube**
- [ ] Emoji Picker (giống Facebook)
- [ ] Tags với scrollable container
- [ ] Hashtags với scrollable container
- [ ] Location Picker với dropdown
- [ ] SingleImageUploader
- [ ] Copy to Clipboard Button
- [ ] ImageCardGrid component

## 📝 Chi Tiết Cần Implement

### A. Character Counter
```tsx
<input maxLength={60} />
<small className="text-muted">{webSeo.metaTitle.length}/60</small>
```

### B. Google Search Preview Card
```tsx
<div className="card mt-3" style={{ background: '#fff', border: '1px solid #dfe1e5', maxWidth: 600 }}>
  <div className="card-header py-2">
    <i className="bi bi-google text-primary me-1"></i>
    <span className="fw-semibold">Xem trước kết quả Google</span>
  </div>
  <div className="card-body p-3">
    {/* Breadcrumb, Title, Description, Meta info */}
  </div>
</div>
```

### C. Emoji Picker (30+ emojis)
```tsx
<div className="mt-2">
  <small className="text-muted d-block mb-1">Thêm emoji nhanh:</small>
  <div className="d-flex gap-2 flex-wrap">
    <button onClick={() => setFbSeo(p => ({ ...p, description: p.description + ' 🏠' }))}>
      🏠 Nhà
    </button>
    {/* ... 30+ buttons */}
  </div>
</div>
```

### D. Scrollable Keywords/Hashtags Container
```tsx
<div style={{ 
  maxHeight: '120px', 
  overflowY: 'auto', 
  padding: '6px', 
  border: '1px solid #dee2e6', 
  borderRadius: '4px', 
  fontSize: '11px' 
}}>
  {/* Buttons */}
</div>
```

### E. Location Picker với Dropdown
```tsx
<div className="input-group input-group-sm mb-2">
  <input placeholder="VD: Nội Thất Minh Quân - TPHCM" />
  <button onClick={() => openMapModal('fb')}>
    <i className="bi bi-map"></i>
  </button>
  <button className="dropdown-toggle" data-bs-toggle="dropdown">
    <i className="bi bi-geo-alt"></i>
  </button>
  <ul className="dropdown-menu dropdown-menu-end">
    {/* 10+ địa điểm mẫu */}
  </ul>
</div>
```

### F. Copy to Clipboard Button
```tsx
<button className="btn btn-success btn-sm w-100" 
  onClick={() => {
    const content = `${fbSeo.title}\n\n${fbSeo.description}\n\n${fbSeo.hashtags}`;
    navigator.clipboard.writeText(content);
    alert('✅ Đã copy nội dung!');
  }}>
  <i className="bi bi-clipboard-check me-1"></i>
  Copy nội dung để đăng Facebook
</button>
```

### G. ImageCardGrid Component
```tsx
<ImageCardGrid
  images={fbImages}
  platform="FACEBOOK"
  platformLabel="Facebook"
  uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho Facebook."
  onImagesChange={setFbImages}
/>
```

## 🎨 Styling Details

### Button Sizes
- Emoji buttons: `btn btn-sm btn-outline-secondary`
- Keywords buttons: `btn btn-sm btn-outline-info` với `fontSize: '10px', padding: '2px 6px'`
- Hashtags buttons: `btn btn-sm btn-outline-primary` với `fontSize: '10px', padding: '2px 6px'`

### Colors
- Badge: `background: '#eff6ff', color: '#1d4ed8'`
- Google preview card: `border: '1px solid #dfe1e5'`
- Scrollable container: `border: '1px solid #dee2e6'`

## 📦 Components Cần Import
```tsx
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { LocationPickerModal } from '@/admin/components/LocationPickerModal';
import { ImageManagerModal } from '@/admin/components/ImageManagerModal';
```

## 🔧 State Cần Thêm
```tsx
// Images per platform
const [webImages, setWebImages] = useState<ImageItem[]>([]);
const [fbImages, setFbImages] = useState<ImageItem[]>([]);
const [ttImages, setTtImages] = useState<ImageItem[]>([]);
const [ytImages, setYtImages] = useState<ImageItem[]>([]);

// Location modal
const [showMapModal, setShowMapModal] = useState(false);
const [currentLocationField, setCurrentLocationField] = useState<'fb' | 'tt' | 'yt' | null>(null);

// Add location to SEO states
const [fbSeo, setFbSeo] = useState({
  // ... existing fields
  location: '',
});
```

## 📋 Priority Order

### High Priority (Must Have):
1. ✅ Character counters (Meta Title, Meta Description)
2. ✅ Emoji Picker (30+ emojis)
3. ✅ Location Picker với dropdown
4. ✅ Copy to Clipboard button
5. ✅ Scrollable Keywords/Hashtags containers

### Medium Priority (Nice to Have):
6. ⚠️ Google Search Preview Card
7. ⚠️ ImageCardGrid component
8. ⚠️ SingleImageUploader cho OG/Platform images

### Low Priority (Optional):
9. ⚪ LocationPickerModal (map integration)
10. ⚪ ImageManagerModal (gallery management)

---

**Next Steps**: Implement từng feature theo priority order
