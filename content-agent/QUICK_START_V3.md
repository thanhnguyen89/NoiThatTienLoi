# 🚀 Quick Start Guide - Website Config V3

## ⚡ Bắt Đầu Nhanh

### 1. Cài Đặt Dependencies (Đã xong)
```bash
✅ npm install @tanstack/react-query @tanstack/react-query-devtools
✅ npm install zod
✅ npm install react-hot-toast
```

### 2. Database Migration (Đã xong)
```bash
✅ npx prisma migrate dev
```

### 3. Start Dev Server
```bash
npm run dev
```

### 4. Truy Cập
```
http://localhost:3000/cau-hinh-website
```

---

## 🎯 Tính Năng Mới

### 1. **Search & Filter**
- Gõ vào ô tìm kiếm để tìm theo tên, URL, công ty
- Click vào platform card để lọc theo nền tảng
- Chọn trạng thái: Tất cả / Đang hoạt động / Đã tắt
- Click "✕ Xóa bộ lọc" để reset

### 2. **Pagination**
- Chọn số item/trang: 5, 10, 20, 50, 100
- Click số trang để chuyển trang
- Click "Trước" / "Sau" để điều hướng

### 3. **Bulk Actions**
- ✅ Check vào checkbox để chọn website
- Click "Chọn tất cả" để chọn hết
- Chọn action: Kích hoạt / Tắt / Xuất / Xóa

### 4. **Export/Import**
- Click "📤 Xuất/Nhập"
- **Xuất**: Chọn JSON/CSV, có/không bao gồm secrets
- **Nhập**: Upload file JSON, chọn có/không ghi đè

### 5. **Keyboard Shortcuts**
| Phím | Chức năng |
|------|-----------|
| `Ctrl+N` | Thêm website |
| `Ctrl+K` | Tìm kiếm |
| `Ctrl+E` | Xuất cấu hình |
| `Ctrl+I` | Nhập cấu hình |
| `Ctrl+R` | Làm mới |
| `Ctrl+A` | Chọn tất cả |
| `ESC` | Đóng / Bỏ chọn |
| `?` | Xem phím tắt |

---

## 📝 Workflow Mẫu

### Thêm Website Hasaki
1. Nhấn `Ctrl+N` hoặc click "Thêm website"
2. Chọn platform: **WordPress**
3. Điền thông tin:
   ```
   Tên: Hasaki Vietnam
   URL: https://www.hasaki.vn
   ```
4. Click "Tự điền" cho API URL
5. Mở rộng "Thông tin doanh nghiệp":
   ```
   Tên công ty: HASAKI VIỆT NAM
   Số chi nhánh: 323
   Hotline: 1800 6324
   Hotline khiếu nại: 1800 6310
   Link chi nhánh: https://hotro.hasaki.vn/he-thong-cua-hang.html
   Thông tin hỗ trợ: Nhấn Phím 1 cho Mỹ phẩm, Phím 2 cho Clinic
   ```
6. Điền auth:
   ```
   Username: admin
   App Password: xxxx xxxx xxxx xxxx
   ```
7. Click "Kiểm tra kết nối" (optional)
8. Check "Kích hoạt" và "Đặt làm mặc định"
9. Click "Thêm website"

### Tìm Kiếm & Lọc
1. Nhấn `Ctrl+K` để focus search
2. Gõ "hasaki" → Tìm thấy website Hasaki
3. Click vào platform card "WordPress" → Lọc chỉ WordPress
4. Chọn "Đang hoạt động" → Lọc chỉ active

### Bulk Export
1. Check vào 3-5 websites
2. Click "↓ Xuất"
3. File JSON tự động download

### Import Backup
1. Click "📤 Xuất/Nhập"
2. Chuyển sang tab "Nhập cấu hình"
3. Upload file JSON đã xuất
4. Check "Ghi đè cấu hình trùng tên" (nếu cần)
5. Click "Nhập X website"

---

## 🐛 Troubleshooting

### Lỗi: "Failed to fetch websites"
- Kiểm tra server đang chạy
- Kiểm tra database connection
- Xem console log

### Lỗi: "Validation failed"
- Kiểm tra required fields
- Kiểm tra URL format
- Xem error message

### React Query Devtools không hiện
- Nhấn `Ctrl+Shift+I` để mở DevTools
- Tìm tab "React Query"
- Hoặc click vào icon ở góc dưới màn hình

### Keyboard shortcuts không hoạt động
- Đảm bảo không đang focus vào input
- Thử refresh trang
- Kiểm tra browser console

---

## 📊 Performance Tips

### Caching
- Data được cache 1 phút
- Không cần refetch liên tục
- Mutations tự động invalidate cache

### Pagination
- Dùng page size nhỏ (10-20) cho performance tốt
- Chỉ load items hiện tại
- Không load toàn bộ data

### Search
- Search chạy client-side (instant)
- Không gọi API khi search
- Dùng memoization

---

## 🎨 UI Tips

### Selection
- Click checkbox để chọn từng item
- Click "Chọn tất cả" để chọn hết trang hiện tại
- ESC để bỏ chọn

### Platform Filter
- Click vào platform card để lọc
- Click lại để bỏ lọc
- Số lượng hiển thị real-time

### Toast Notifications
- Hiện ở góc dưới bên phải
- Tự động đóng sau 3 giây
- Click để đóng sớm

---

## 🔧 Advanced Usage

### Export với Secrets
```typescript
// Trong ImportExportModal
Check "Bao gồm mật khẩu và API keys"
⚠️ Cẩn thận! File sẽ chứa thông tin nhạy cảm
```

### Import với Overwrite
```typescript
// Trong ImportExportModal
Check "Ghi đè cấu hình trùng tên"
→ Cấu hình mới sẽ thay thế cấu hình cũ
```

### Bulk Operations
```typescript
// Select multiple
Check 5 websites

// Bulk activate
Click "✓ Kích hoạt" → Tất cả 5 websites active

// Bulk export
Click "↓ Xuất" → Download JSON với 5 websites
```

---

## 📚 Tài Liệu Liên Quan

- `WEBSITE_CONFIG_UPGRADE.md` - Chi tiết nâng cấp V2
- `ADVANCED_FEATURES_COMPLETE.md` - Chi tiết tính năng V3
- `TEST_CHECKLIST.md` - Checklist test đầy đủ
- `README.md` - Component documentation

---

## ✅ Checklist Bắt Đầu

- [ ] Dependencies đã cài
- [ ] Database đã migrate
- [ ] Server đang chạy
- [ ] Truy cập `/cau-hinh-website`
- [ ] Thêm 1 website test
- [ ] Thử search
- [ ] Thử pagination
- [ ] Thử bulk actions
- [ ] Thử export/import
- [ ] Thử keyboard shortcuts

---

## 🎉 Enjoy!

Bạn đã sẵn sàng sử dụng hệ thống quản lý website V3 với đầy đủ tính năng nâng cao!

**Questions?** Xem documentation hoặc nhấn `?` để xem keyboard shortcuts.

---

**Version**: 3.0.0  
**Last Updated**: 13/05/2026  
**Status**: ✅ Ready to Use
