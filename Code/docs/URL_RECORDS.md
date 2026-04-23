# URL Records - Quản lý URL và Redirect

## Tổng quan

URL Records là hệ thống quản lý URL và redirect cho website. Nó cho phép:
- Theo dõi tất cả các URL trong hệ thống
- Quản lý redirect từ URL cũ sang URL mới
- Xử lý các error codes (301, 302, 404, etc.)
- Liên kết URL với các entity (Product, Category, Page, etc.)

## Cấu trúc Database

### Bảng `url_record`

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Primary key (CUID) |
| `entityId` | BigInt? | ID của entity (nếu có) |
| `entityName` | String? | Tên loại entity (Product, Category, Page, etc.) |
| `slug` | String? | URL slug (unique) |
| `isActive` | Boolean? | Trạng thái active |
| `slugRedirect` | String? | URL đích để redirect |
| `isRedirect` | Boolean? | Có phải là redirect không |
| `errorCode` | String? | HTTP error code (301, 302, 404, etc.) |
| `createdAt` | DateTime | Ngày tạo |
| `updatedAt` | DateTime? | Ngày cập nhật |
| `createdBy` | String? | Người tạo |
| `updatedBy` | String? | Người cập nhật |
| `isDeleted` | Boolean? | Đã xóa chưa |
| `deletedBy` | String? | Người xóa |
| `deletedAt` | DateTime? | Ngày xóa |

## Các loại Entity

- **Product** - Sản phẩm
- **Category** - Danh mục sản phẩm
- **Page** - Trang tĩnh (giới thiệu, liên hệ, chính sách, etc.)
- **News** - Tin tức
- **NewsCategory** - Danh mục tin tức

## HTTP Error Codes

### 301 - Permanent Redirect
Redirect vĩnh viễn từ URL cũ sang URL mới. Search engines sẽ cập nhật index.

**Ví dụ:**
```
slug: "lienhe"
slugRedirect: "lien-he"
errorCode: "301"
isRedirect: true
```

### 302 - Temporary Redirect
Redirect tạm thời. Search engines sẽ không cập nhật index.

**Ví dụ:**
```
slug: "temp-redirect"
slugRedirect: "gioi-thieu"
errorCode: "302"
isRedirect: true
```

### 404 - Not Found
URL không tồn tại hoặc đã bị xóa.

**Ví dụ:**
```
slug: "deleted-page"
slugRedirect: null
errorCode: "404"
isRedirect: false
isActive: false
```

## Seed Data

### Chạy seed
```bash
npx tsx prisma/seed-url-records.ts
```

### Seed bao gồm:
1. **URL Record References** - 20 entity types
2. **Product URLs** - Tự động tạo từ products trong database
3. **Category URLs** - Tự động tạo từ categories trong database
4. **Static Pages** - 13 trang tĩnh (trang chủ, liên hệ, giới thiệu, etc.)
5. **Redirect Examples** - 6 ví dụ về redirect và error codes

## Admin Interface

### Trang danh sách: `/admin/url-records`

**Features:**
- Hiển thị tất cả URL records
- Tìm kiếm theo slug, entityName
- Lọc theo trạng thái (active/inactive)
- Phân trang
- Xem thông tin redirect và error codes

**Columns:**
- STT
- Slug
- Entity Name
- Entity ID
- Slug Redirect (URL đích)
- Error Code (301, 302, 404, etc.)
- Redirect (có phải redirect không)
- Active (trạng thái)
- Deleted (đã xóa chưa)
- Thao tác (Edit/Delete)

### Trang tạo mới: `/admin/url-records/new`

Tạo URL record mới với các thông tin:
- Entity Name
- Slug
- Slug Redirect (optional)
- Error Code (optional)
- Is Redirect
- Is Active

### Trang chỉnh sửa: `/admin/url-records/:id/edit`

Chỉnh sửa thông tin URL record.

## API Endpoints

### GET `/admin/api/url-records`
Lấy danh sách URL records (có phân trang và filter)

**Query params:**
- `page` - Số trang
- `pageSize` - Số records mỗi trang
- `search` - Tìm kiếm theo slug, entityName
- `status` - Lọc theo trạng thái (active/inactive)

### GET `/admin/api/url-records/:id`
Lấy thông tin chi tiết một URL record

### POST `/admin/api/url-records`
Tạo URL record mới

### PUT `/admin/api/url-records/:id`
Cập nhật URL record

### DELETE `/admin/api/url-records/:id`
Xóa URL record (soft delete)

## Use Cases

### 1. Tạo redirect từ URL cũ sang URL mới
Khi thay đổi slug của một sản phẩm hoặc trang:

```typescript
{
  slug: "old-product-slug",
  entityName: "Product",
  slugRedirect: "new-product-slug",
  isRedirect: true,
  errorCode: "301",
  isActive: true
}
```

### 2. Đánh dấu URL đã xóa
Khi xóa một trang hoặc sản phẩm:

```typescript
{
  slug: "deleted-product",
  entityName: "Product",
  slugRedirect: null,
  isRedirect: false,
  errorCode: "404",
  isActive: false
}
```

### 3. Temporary redirect
Redirect tạm thời cho maintenance hoặc testing:

```typescript
{
  slug: "under-maintenance",
  entityName: "Page",
  slugRedirect: "coming-soon",
  isRedirect: true,
  errorCode: "302",
  isActive: true
}
```

## Best Practices

1. **Luôn dùng 301 cho permanent redirects** - Giúp SEO tốt hơn
2. **Dùng 302 cho temporary redirects** - Khi chưa chắc chắn về redirect
3. **Soft delete thay vì hard delete** - Giữ lại lịch sử URL
4. **Chuẩn hóa entityName** - Dùng singular form (Product, Category, Page)
5. **Unique slugs** - Mỗi slug chỉ có một record
6. **Track changes** - Luôn cập nhật createdBy, updatedBy

## Troubleshooting

### Vấn đề: Không hiển thị redirect data
**Nguyên nhân:** Dữ liệu trong database có các trường null
**Giải pháp:** Chạy lại seed để tạo dữ liệu mẫu

### Vấn đề: Entity name không nhất quán
**Nguyên nhân:** Seed data cũ dùng nhiều tên khác nhau (Products vs Product)
**Giải pháp:** Chuẩn hóa entityName trong seed script

### Vấn đề: BigInt serialization error
**Nguyên nhân:** entityId là BigInt nhưng Product/Category ID là CUID string
**Giải pháp:** Để entityId = null cho các entity dùng CUID

## Future Enhancements

- [ ] Bulk import/export URL records
- [ ] Redirect chain detection (A → B → C)
- [ ] Analytics tracking cho redirects
- [ ] Auto-create URL records khi tạo Product/Category
- [ ] URL validation và duplicate detection
- [ ] Redirect history tracking
