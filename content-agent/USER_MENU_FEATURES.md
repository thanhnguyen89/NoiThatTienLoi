# User Menu Features - Tính Năng Menu Người Dùng

## ✅ Đã Hoàn Thành

### 1. **Profile Page** (`/profile`)
Quản lý thông tin cá nhân

**Tính năng:**
- ✅ Hiển thị avatar, tên, email, role
- ✅ Chỉnh sửa họ tên
- ✅ Đổi mật khẩu (với xác thực mật khẩu cũ)
- ✅ Hiển thị stats (bài viết, credits, hoạt động)
- ✅ Edit mode với nút Save/Cancel
- ✅ Validation form
- ✅ Log activity khi update

**API:**
- `POST /api/profile/update` - Cập nhật profile

### 2. **Activity Log Page** (`/activity`)
Theo dõi hoạt động trong hệ thống

**Tính năng:**
- ✅ Hiển thị danh sách activity logs
- ✅ Filter theo action (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW)
- ✅ Phân trang (20 items/page)
- ✅ Hiển thị: action, description, IP address, timestamp
- ✅ Icon và màu sắc theo loại action
- ✅ Format ngày giờ theo locale VN

**API:**
- `GET /api/activity` - Lấy danh sách logs

### 3. **Support Center Page** (`/support-center`)
Trung tâm hỗ trợ với FAQ

**Tính năng:**
- ✅ 10 câu hỏi thường gặp (FAQ)
- ✅ Phân loại theo category (Viết Bài, SEO, Quản Lý, AI Models, Tài Khoản)
- ✅ Tìm kiếm FAQ
- ✅ Filter theo category
- ✅ Expand/collapse câu trả lời
- ✅ Contact support (Email, Telegram)
- ✅ UI đẹp với gradient header

### 4. **User Dropdown Menu** (Header)
Menu dropdown cho user

**Tính năng:**
- ✅ Click avatar để mở/đóng menu
- ✅ Click outside để đóng
- ✅ Hiển thị user info (tên, email)
- ✅ Menu items:
  - 👤 Hồ sơ → `/profile`
  - 🤖 AI Models → `/cau-hinh/ai-models`
  - 🔍 AI Check Config → `/cau-hinh/ai-check`
  - 📊 Log Activity → `/activity`
  - 💬 Trung tâm hỗ trợ → `/support-center`
- ✅ Logout button (màu đỏ)
- ✅ Loading state khi logout
- ✅ Clear cookie + localStorage khi logout

## File Structure

```
web/
├── app/
│   ├── profile/
│   │   └── page.tsx                    # Profile page
│   ├── activity/
│   │   └── page.tsx                    # Activity log page
│   ├── support-center/
│   │   └── page.tsx                    # Support center page
│   └── api/
│       ├── profile/
│       │   └── update/
│       │       └── route.ts            # Profile update API
│       └── activity/
│           └── route.ts                # Activity logs API
└── components/
    └── Header.tsx                      # Updated with dropdown menu
```

## Database Schema

### ActivityLog Model (Already exists)
```prisma
model ActivityLog {
  id          String   @id @default(uuid())
  userId      String?
  username    String?
  action      String   // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW
  resource    String?  // profile, articles, ai-models, etc.
  resourceId  String?
  description String?
  ipAddress   String?
  userAgent   String?
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

## Usage

### 1. Profile Page
```
http://localhost:3000/profile
```
- View profile info
- Click "Chỉnh Sửa" to edit
- Update full name
- Change password (optional)
- Click "Lưu Thay Đổi"

### 2. Activity Log
```
http://localhost:3000/activity
```
- View all activities
- Filter by action type
- Paginate through logs
- See IP address and timestamp

### 3. Support Center
```
http://localhost:3000/support-center
```
- Search FAQ
- Filter by category
- Click question to expand answer
- Contact support via Email/Telegram

### 4. User Menu
- Click avatar in header
- Select menu item
- Click "Đăng xuất" to logout

## Activity Log Actions

| Action | Icon | Color | Description |
|--------|------|-------|-------------|
| LOGIN | 🔐 | Green | User logged in |
| LOGOUT | 🚪 | Gray | User logged out |
| CREATE | ➕ | Blue | Created new item |
| UPDATE | ✏️ | Yellow | Updated item |
| DELETE | 🗑️ | Red | Deleted item |
| VIEW | 👁️ | Purple | Viewed item |
| EXPORT | 📥 | Indigo | Exported data |
| IMPORT | 📤 | Pink | Imported data |

## FAQ Categories

1. **Viết Bài** - Hướng dẫn viết bài với AI
2. **SEO** - Tối ưu SEO score
3. **Quản Lý** - Quản lý bài viết
4. **AI Models** - Cấu hình AI models
5. **Tài Khoản** - Quản lý tài khoản

## Security

### Profile Update
- ✅ Require authentication
- ✅ Validate current password before changing
- ✅ Hash new password with bcrypt
- ✅ Log activity after update

### Activity Logs
- ✅ Only show user's own logs
- ✅ Cannot view other users' logs
- ✅ Require authentication

### Logout
- ✅ Clear localStorage
- ✅ Clear cookie
- ✅ Call logout API
- ✅ Redirect to login page

## Testing

### Test Profile Update
1. Login
2. Go to `/profile`
3. Click "Chỉnh Sửa"
4. Change full name
5. Enter current password
6. Enter new password
7. Click "Lưu Thay Đổi"
8. Verify success message
9. Logout and login with new password

### Test Activity Log
1. Login
2. Do some actions (create article, update profile, etc.)
3. Go to `/activity`
4. Verify logs are displayed
5. Test filter by action
6. Test pagination

### Test Support Center
1. Go to `/support-center`
2. Search for "AI"
3. Filter by "Viết Bài"
4. Click a question to expand
5. Click "Gửi Email" or "Telegram"

### Test User Menu
1. Click avatar in header
2. Verify dropdown opens
3. Click outside to close
4. Click each menu item
5. Click "Đăng xuất"
6. Verify redirect to login

## Next Steps (Optional)

### 1. Profile Avatar Upload
Allow users to upload custom avatar:
```typescript
// Add to profile page
<input type="file" accept="image/*" onChange={handleAvatarUpload} />
```

### 2. Activity Log Export
Export logs to CSV/Excel:
```typescript
function exportLogs() {
  const csv = logs.map(log => `${log.action},${log.description},${log.createdAt}`).join('\n');
  downloadCSV(csv, 'activity-logs.csv');
}
```

### 3. Support Tickets
Create support ticket system:
```typescript
// New page: /support-center/tickets
// Allow users to create and track support tickets
```

### 4. Notifications
Add notification system:
```typescript
// Show notifications in header
// Notify when article is published, etc.
```

## Summary

✅ **3 new pages** created (Profile, Activity, Support Center)
✅ **2 new APIs** created (Profile Update, Activity Logs)
✅ **1 dropdown menu** with 5 menu items
✅ **Full authentication** and authorization
✅ **Activity logging** for all actions
✅ **Professional UI** with icons and colors

Tất cả tính năng menu đã hoàn thành! 🎉
