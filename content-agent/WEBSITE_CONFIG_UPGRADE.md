# Nâng Cấp Hệ Thống Quản Lý Website

## 📋 Tổng Quan

Hệ thống quản lý website đã được nâng cấp toàn diện để hỗ trợ nhiều nền tảng và thông tin doanh nghiệp chi tiết hơn.

## 🎯 Các Tính Năng Mới

### 1. **Hỗ Trợ Đa Nền Tảng**

Không chỉ WordPress, giờ đây hỗ trợ:
- ✅ **WordPress** - REST API với Application Password
- ✅ **Shopify** - Admin API với API Key/Secret
- ✅ **Wix** - REST API
- ✅ **Custom API** - API tùy chỉnh của bạn
- ✅ **Static Site** - Website tĩnh (chỉ lưu thông tin)

### 2. **Thông Tin Doanh Nghiệp**

Thêm các trường mới:
- 🏢 **Tên công ty** - Ví dụ: "HASAKI VIỆT NAM"
- 📞 **Hotline** - Số điện thoại hỗ trợ chính
- ⚠️ **Hotline khiếu nại** - Số điện thoại khiếu nại
- 📍 **Số chi nhánh** - Ví dụ: 323 chi nhánh
- 🗺️ **Link danh sách chi nhánh** - URL trang danh sách chi nhánh
- 💬 **Thông tin hỗ trợ** - Thông tin bổ sung (ví dụ: "Nhấn phím 1 cho Mỹ phẩm...")

### 3. **Xác Thực Linh Hoạt**

Hỗ trợ nhiều phương thức xác thực:
- **Basic Auth**: Username + Password (WordPress)
- **API Auth**: API Key + API Secret (Shopify, Custom)
- **Flexible**: Cả hai phương thức (Custom API)
- **None**: Không cần xác thực (Static Site)

### 4. **UI/UX Cải Tiến**

- 🎨 **Platform Icons** - Icon riêng cho từng nền tảng
- 📊 **Platform Summary** - Thống kê số lượng kết nối theo nền tảng
- 🔒 **Collapsible Sections** - Thu gọn thông tin doanh nghiệp
- 🧪 **Test Connection** - Kiểm tra kết nối trước khi lưu
- 🎯 **Auto-fill API URL** - Tự động điền API URL dựa trên platform

### 5. **Code Architecture**

Refactor code để dễ maintain:
```
cau-hinh-website/
├── page.tsx                    # Main page (refactored)
├── types.ts                    # TypeScript types & constants
├── components/
│   ├── WebsiteModal.tsx       # Modal form component
│   └── WebsiteCard.tsx        # Website card display
└── hooks/
    └── useWebsiteConfig.ts    # Custom hook for state management
```

## 🗄️ Database Schema

### Các Trường Mới Trong `WebsiteConfig`

```prisma
model WebsiteConfig {
  // ... existing fields ...
  
  // Thông tin doanh nghiệp (mới)
  companyName       String?  @db.VarChar(300)
  hotline           String?  @db.VarChar(100)
  hotlineComplaint  String?  @db.VarChar(100)
  branchCount       Int?
  branchListUrl     String?  @db.VarChar(500)
  supportInfo       String?  @db.Text
  
  // API Configuration (mở rộng)
  apiKey      String?  @db.VarChar(500)
  apiSecret   String?  @db.VarChar(500)
  
  // ... rest of fields ...
}
```

### Migration

Migration đã được tạo và apply:
```
20260513042021_add_company_info_to_website_config
```

## 📝 Ví Dụ Sử Dụng

### Thêm Website Hasaki

```typescript
{
  name: "Hasaki Vietnam - Main Site",
  url: "https://www.hasaki.vn",
  platform: "wordpress",
  
  // Thông tin doanh nghiệp
  companyName: "HASAKI VIỆT NAM",
  hotline: "1800 6324",
  hotlineComplaint: "1800 6310",
  branchCount: 323,
  branchListUrl: "https://hotro.hasaki.vn/he-thong-cua-hang.html",
  supportInfo: "Nhấn Phím 1 cho Mỹ phẩm, Phím 2 cho Clinic",
  
  // API Config
  apiUrl: "https://www.hasaki.vn/wp-json/wp/v2",
  username: "admin",
  appPassword: "xxxx xxxx xxxx xxxx",
  
  // Defaults
  defaultStatus: "draft",
  isActive: true,
  isDefault: true
}
```

### Thêm Shopify Store

```typescript
{
  name: "My Shopify Store",
  url: "https://mystore.myshopify.com",
  platform: "shopify",
  
  // API Config
  apiUrl: "https://mystore.myshopify.com/admin/api/2024-01/graphql.json",
  apiKey: "your-api-key",
  apiSecret: "your-api-secret",
  
  isActive: true
}
```

## 🔧 API Changes

### GET `/api/website-configs`

Response bây giờ bao gồm:
```typescript
{
  success: true,
  data: [{
    id: "...",
    name: "...",
    // ... all fields ...
    hasPassword: boolean,    // NEW
    hasApiKey: boolean,      // NEW
    hasApiSecret: boolean,   // NEW
  }]
}
```

### POST `/api/website-configs`

Request body hỗ trợ thêm:
```typescript
{
  // ... existing fields ...
  companyName?: string,
  hotline?: string,
  hotlineComplaint?: string,
  branchCount?: number,
  branchListUrl?: string,
  supportInfo?: string,
  apiKey?: string,
  apiSecret?: string,
}
```

## 🎨 UI Components

### WebsiteCard

Hiển thị đầy đủ thông tin:
- Platform icon và label
- Company info (tên, chi nhánh, hotline)
- Branch list link
- Support info
- Technical details (API, auth status)

### WebsiteModal

Form với:
- Platform selection (5 options)
- Basic info (name, URL)
- Collapsible company info section
- Dynamic auth fields (based on platform)
- Test connection button
- Default settings
- Status toggles

## 🚀 Performance Improvements

1. **Component Splitting** - Tách thành nhiều component nhỏ
2. **Custom Hooks** - Logic tách riêng, dễ test
3. **Type Safety** - TypeScript types đầy đủ
4. **Code Reusability** - Giảm code duplication

## 📚 Next Steps

### Đề Xuất Cải Tiến Tiếp Theo

1. **React Query / SWR** - Cache và auto-refetch
2. **Zod Validation** - Schema validation
3. **Lazy Loading** - Load data theo tab
4. **Search & Filter** - Tìm kiếm và lọc website
5. **Bulk Actions** - Xóa/cập nhật nhiều cùng lúc
6. **Export/Import** - Xuất/nhập cấu hình
7. **Accessibility** - ARIA labels, keyboard shortcuts
8. **Toast Library** - Dùng react-hot-toast hoặc sonner

## 🐛 Known Issues

- Toast chỉ hiển thị 1 message tại 1 thời điểm
- Không có pagination (nếu có nhiều websites)
- Test connection không cache kết quả

## 📖 Documentation

- File cũ được backup tại: `page.old.tsx`
- Types và constants: `types.ts`
- Custom hook: `hooks/useWebsiteConfig.ts`
- Components: `components/WebsiteModal.tsx`, `components/WebsiteCard.tsx`

## ✅ Testing Checklist

- [ ] Thêm website WordPress mới
- [ ] Thêm website Shopify mới
- [ ] Thêm website Custom API
- [ ] Thêm website Static
- [ ] Sửa website có sẵn
- [ ] Xóa website
- [ ] Test connection WordPress
- [ ] Test connection Shopify
- [ ] Set website làm default
- [ ] Tắt/bật website
- [ ] Điền đầy đủ thông tin doanh nghiệp
- [ ] Auto-fill API URL
- [ ] Collapsible company info section

---

**Ngày cập nhật**: 13/05/2026  
**Version**: 2.0.0  
**Tác giả**: Kiro AI Assistant
