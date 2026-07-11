# Page Titles & Pagination - Tổng Hợp

## ✅ Đã Hoàn Thành

### 1. Page Titles (document.title)

Tất cả các trang đã có title riêng:

| Page | Title | File |
|------|-------|------|
| Login | Đăng Nhập - Content Agent | `web/app/login/page.tsx` |
| Home | Viết Bài Thông Minh - Content Agent | `web/app/viet-bai-thong-minh/page.tsx` |
| Step 2 | Chọn Dàn Ý - Content Agent | `web/app/viet-bai-thong-minh/step2/page.tsx` |
| Step 3 | Viết Bài - Content Agent | `web/app/viet-bai-thong-minh/step3/page.tsx` |
| Step 4 | Chỉnh Sửa & Xuất Bản - Content Agent | `web/app/viet-bai-thong-minh/step4/page.tsx` |
| Articles | Quản Lý Bài Viết - Content Agent | `web/app/dashboard/articles/page.tsx` |
| AI Check | Cấu Hình AI Check - Content Agent | `web/app/cau-hinh/ai-check/page.tsx` |
| AI Models | Quản Lý AI Models - Content Agent | `web/app/cau-hinh/ai-models/page.tsx` |

### 2. Pagination

#### AI Models Page
- ✅ **Có phân trang**
- Component: `Pagination` (reusable)
- Default: 12 items/page
- Options: 10, 20, 50, 100 items/page
- File: `web/app/cau-hinh/ai-models/page.tsx`

#### AI Check Page
- ✅ **Có phân trang**
- Component: `Pagination` (reusable)
- Default: 20 items/page
- Options: 10, 20, 50, 100 items/page
- File: `web/app/cau-hinh/ai-check/page.tsx`

#### Articles Dashboard
- ✅ **Có phân trang**
- Server-side pagination
- Default: 20 items/page
- File: `web/app/dashboard/articles/page.tsx`

## Implementation Details

### Page Title Pattern

```typescript
useEffect(() => {
  document.title = 'Page Name - Content Agent';
}, []);
```

**Lợi ích:**
- SEO friendly
- Dễ nhận diện tab trong browser
- Professional branding

### Pagination Pattern

```typescript
// State
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(12);

// Logic
const totalPages = Math.ceil(items.length / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
const currentItems = items.slice(startIndex, endIndex);

// Component
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  itemsPerPage={itemsPerPage}
  totalItems={items.length}
  onPageChange={setCurrentPage}
  onItemsPerPageChange={(newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  }}
/>
```

## Reusable Pagination Component

File: `web/components/Pagination.tsx`

**Props:**
- `currentPage: number` - Trang hiện tại
- `totalPages: number` - Tổng số trang
- `itemsPerPage: number` - Số items mỗi trang
- `totalItems: number` - Tổng số items
- `onPageChange: (page: number) => void` - Callback khi đổi trang
- `onItemsPerPageChange: (size: number) => void` - Callback khi đổi size

**Features:**
- Previous/Next buttons
- Page number buttons (max 5 visible)
- Items per page selector
- Total items display
- Responsive design

## Browser Tab Titles

Khi user mở nhiều tab, họ sẽ thấy:

```
🗂️ Đăng Nhập - Content Agent
🗂️ Viết Bài Thông Minh - Content Agent
🗂️ Chọn Dàn Ý - Content Agent
🗂️ Viết Bài - Content Agent
🗂️ Chỉnh Sửa & Xuất Bản - Content Agent
🗂️ Quản Lý Bài Viết - Content Agent
🗂️ Cấu Hình AI Check - Content Agent
🗂️ Quản Lý AI Models - Content Agent
```

## Testing

### Test Page Titles
1. Mở từng trang
2. Check browser tab title
3. Verify format: `[Page Name] - Content Agent`

### Test Pagination
1. Vào trang có pagination
2. Test Previous/Next buttons
3. Test page number buttons
4. Test items per page selector
5. Verify data hiển thị đúng

## Files Changed

### Page Titles:
- `web/app/login/page.tsx`
- `web/app/viet-bai-thong-minh/page.tsx`
- `web/app/viet-bai-thong-minh/step2/page.tsx`
- `web/app/viet-bai-thong-minh/step3/page.tsx`
- `web/app/viet-bai-thong-minh/step4/page.tsx`
- `web/app/dashboard/articles/page.tsx`
- `web/app/cau-hinh/ai-check/page.tsx`
- `web/app/cau-hinh/ai-models/page.tsx`

### Pagination:
- `web/components/Pagination.tsx` (reusable component)
- `web/app/cau-hinh/ai-models/page.tsx` (added pagination)

## Next Steps (Optional)

### 1. Dynamic Titles
Update title based on page state:
```typescript
useEffect(() => {
  if (article) {
    document.title = `${article.title} - Content Agent`;
  }
}, [article]);
```

### 2. Favicon
Add favicon to show in browser tab:
```html
<link rel="icon" href="/favicon.ico" />
```

### 3. Meta Tags
Add meta tags for SEO:
```typescript
<Head>
  <title>Page Title - Content Agent</title>
  <meta name="description" content="..." />
  <meta property="og:title" content="..." />
</Head>
```

## Summary

✅ **8 pages** có title riêng
✅ **3 pages** có pagination
✅ **1 reusable** Pagination component
✅ **Professional** branding với "Content Agent"
✅ **User-friendly** với clear navigation

Tất cả các trang giờ đã có title rõ ràng và pagination (nếu cần)! 🎉
