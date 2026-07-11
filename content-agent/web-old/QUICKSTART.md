# Quick Start Guide

## 🚀 5 phút để bắt đầu

### 1. Cài đặt (1 phút)

```bash
cd NoiThatTienLoi/content-agent/web
npm install
```

### 2. Cấu hình (30 giây)

File `.env` đã có sẵn với config mặc định:
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
GEMINI_API_KEY=AIzaSyD9xmk6Y9GUDVIsg2aB47904wid6MX_5dU
PORT=3000
```

### 3. Chạy server (10 giây)

```bash
npm start
```

Hoặc development mode với auto-reload:
```bash
npm run dev
```

### 4. Đăng nhập (30 giây)

1. Mở trình duyệt: http://localhost:3000
2. Nhập:
   - Username: `admin`
   - Password: `admin123`
3. Click "Đăng nhập"

### 5. Tạo content đầu tiên (2 phút)

1. Nhập từ khóa: `giường sắt đơn ống tròn`
2. Click "🚀 Chạy Pipeline"
3. Đợi ~60 giây
4. Xem kết quả!

## 📋 Checklist

- [x] Node.js installed (v18+)
- [x] npm installed
- [x] Port 3000 available
- [x] Internet connection (for Gemini API)

## 🎯 Kết quả mong đợi

Sau khi pipeline chạy xong, bạn sẽ thấy:

✅ **Final Report:**
- Số từ: ~2,180
- SEO Score: 87/100
- Humanness Score: 82/100
- Decision: PUBLISH
- Thời gian: ~60s

✅ **Article Preview:**
- Bài viết HTML hoàn chỉnh
- 7 sections với H2/H3
- Tables so sánh
- Tone: Chân thật - Chuyên nghiệp - Gần gũi

## 🐛 Gặp vấn đề?

### Port 3000 bị chiếm
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Hoặc đổi port trong .env
PORT=3001
```

### Gemini API lỗi
- Hệ thống tự động fallback sang mock data
- Check quota tại: https://aistudio.google.com/

### Login không hoạt động
```javascript
// F12 → Console
localStorage.clear()
// Refresh page
```

## 📚 Đọc thêm

- [README.md](./README.md) - Chi tiết setup
- [USAGE.md](./USAGE.md) - Hướng dẫn đầy đủ
- [CHANGELOG.md](./CHANGELOG.md) - Version history

## 💡 Tips

- Dùng từ khóa dài 2-5 từ
- Chọn sản phẩm nếu viết bài cụ thể
- Humanness score ≥76 mới publish
- Xem chi tiết từng step bằng cách click vào header

## 🎉 Xong!

Bây giờ bạn đã sẵn sàng tạo content tự động với Content Agent!

---

**Next steps:**
1. Thử với keyword khác
2. Xem Context & Data để hiểu brand
3. Đọc USAGE.md để biết thêm features
