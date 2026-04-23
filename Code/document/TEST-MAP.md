# 🧪 Test Bản đồ OpenStreetMap

## Cách test nhanh

### 1. Chạy dev server
```bash
cd NoiThatTienLoi/Code
npm run dev
```

### 2. Mở trang admin
```
http://localhost:3000/admin/news-categories/new
```
hoặc
```
http://localhost:3000/admin/news-categories/[id]/edit
```

### 3. Chuyển sang tab Facebook/TikTok/YouTube

### 4. Tìm phần "Vị trí (Location)"

### 5. Click nút 🗺️ (màu xanh)

### 6. Modal mở ra với bản đồ thực!

---

## ✅ Những gì bạn sẽ thấy

### Bản đồ OpenStreetMap
- Bản đồ thực với tiles từ OpenStreetMap
- Zoom controls (+/-) ở góc trái
- Attribution ở góc phải dưới

### Có thể làm gì:
1. **Click trên bản đồ** → Marker xuất hiện → Popup hiển thị địa chỉ
2. **Click vào danh sách** → Bản đồ zoom đến vị trí đó
3. **Scroll wheel** → Zoom in/out
4. **Drag** → Pan bản đồ
5. **Tìm kiếm** → Lọc danh sách vị trí

---

## 🎯 Test cases

### Test 1: Click trên bản đồ
1. Click vào bất kỳ đâu trên bản đồ
2. ✅ Marker xuất hiện
3. ✅ Popup hiển thị địa chỉ
4. ✅ selectedLocation được cập nhật
5. Click "Chọn vị trí này"
6. ✅ Địa chỉ điền vào input

### Test 2: Chọn từ danh sách
1. Scroll danh sách vị trí
2. Click "Nội Thất Minh Quân - TP. Hồ Chí Minh"
3. ✅ Vị trí được highlight (màu xanh)
4. ✅ Bản đồ zoom đến vị trí đó
5. ✅ Marker xuất hiện
6. Click "Chọn vị trí này"
7. ✅ Vị trí điền vào input

### Test 3: Tìm kiếm
1. Gõ "hồ chí minh" vào ô tìm kiếm
2. ✅ Danh sách lọc chỉ hiển thị vị trí có "hồ chí minh"
3. Click vào một vị trí
4. ✅ Bản đồ zoom đến vị trí đó

### Test 4: Zoom & Pan
1. Scroll wheel lên/xuống
2. ✅ Bản đồ zoom in/out
3. Click và drag bản đồ
4. ✅ Bản đồ di chuyển

---

## 🐛 Nếu có lỗi

### Bản đồ không hiển thị
**Kiểm tra:**
1. Console có lỗi không?
2. Network tab có load tiles không?
3. Leaflet CSS đã load chưa?

**Giải pháp:**
- Refresh trang (Ctrl+R)
- Clear cache (Ctrl+Shift+R)
- Kiểm tra internet connection

### Marker không hiển thị
**Kiểm tra:**
1. Console có lỗi về icon không?
2. CDN có load được không?

**Giải pháp:**
- Đã fix sẵn trong code
- Nếu vẫn lỗi, check network tab

### Geocoding không hoạt động
**Kiểm tra:**
1. Network tab có request đến Nominatim không?
2. Response có lỗi không?

**Giải pháp:**
- Nominatim có rate limit 1 req/s
- Đợi 1 giây rồi click lại

---

## 📸 Screenshot mong đợi

### Modal với bản đồ
```
┌─────────────────────────────────────────────┐
│ 🗺️ Chọn vị trí từ bản đồ              [X]  │
├─────────────────────────────────────────────┤
│ 🔍 [Tìm kiếm vị trí...]                    │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │  [+]                                    │ │
│ │  [-]                                    │ │
│ │                                         │ │
│ │         🗺️ OpenStreetMap                │ │
│ │                                         │ │
│ │              📍                         │ │
│ │         ┌─────────────┐                 │ │
│ │         │ Vị trí đã   │                 │ │
│ │         │ chọn: ...   │                 │ │
│ │         └─────────────┘                 │ │
│ │                                         │ │
│ │  © OpenStreetMap                        │ │
│ └─────────────────────────────────────────┘ │
│ ℹ️ Click trên bản đồ để chọn vị trí        │
│                                             │
│ 🏢 Nội Thất Minh Quân                      │
│ ☑ Nội Thất Minh Quân - TP.HCM (active)    │
│ ☐ Xưởng - Quận 12                          │
│ ...                                         │
│                                             │
│              [Hủy]  [✓ Chọn vị trí này]    │
└─────────────────────────────────────────────┘
```

---

## ✅ Kết quả mong đợi

Sau khi test xong:
- ✅ Bản đồ hiển thị đầy đủ
- ✅ Click trên map hoạt động
- ✅ Marker xuất hiện đúng vị trí
- ✅ Popup hiển thị địa chỉ
- ✅ Chọn từ danh sách zoom đến đúng vị trí
- ✅ Địa chỉ điền vào input sau khi chọn
- ✅ Không có lỗi trong console

---

**Nếu tất cả đều OK → Bản đồ hoạt động hoàn hảo! 🎉**
