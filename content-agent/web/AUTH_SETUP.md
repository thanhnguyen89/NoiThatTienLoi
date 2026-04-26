# Content Agent - Auth Setup Complete

## Đã thêm thành công

### Backend (server.js)
- Auth middleware với session management
- Cookie-based authentication (HttpOnly)
- API routes: /api/auth/login, /api/auth/logout, /api/auth/me
- Bảo vệ tất cả API endpoints

### Frontend
- Trang login.html với form đăng nhập
- Auth guard trong app.js
- authFetch() wrapper tự động thêm Authorization header
- User info hiển thị trong sidebar
- Nút logout
- Auto redirect về /login.html khi 401

### Styles
- Login page design matching admin style
- User info card trong sidebar
- Logout button hover effects

## Cách sử dụng

### 1. Chạy server
cd content-agent/web
npm start

### 2. Truy cập
http://localhost:3000

### 3. Đăng nhập
Username: admin
Password: admin123

### 4. Session
- Thời gian: 8 giờ
- Lưu trong: Memory + localStorage
- Cookie: HttpOnly, SameSite=Lax

## Thêm user mới

Sửa server.js, thêm vào ADMIN_USERS array.

