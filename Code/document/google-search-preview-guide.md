# Google Search Result Preview Guide

## Tổng quan

Đã thêm preview kết quả tìm kiếm Google vào tab "SEO Website" để người dùng có thể xem trước cách bài viết sẽ hiển thị trên Google Search.

## Vị trí

**Tab**: SEO Website  
**Vị trí**: Sau phần OG Image, trước phần "Hình ảnh Website"

## Thiết kế

### Container
```css
{
  background: '#fff',
  border: '1px solid #dfe1e5',
  maxWidth: 600
}
```

### Header
- Icon Google (bi-google)
- Text: "Xem trước kết quả Google"
- Background: #f8f9fa

### Nội dung Preview

#### 1. Breadcrumb (URL path)
- Icon: Shop icon trong circle
- Text: `noithatminhquan.vn/trang-chu`
- Font size: 12px
- Color: #5f6368 (gray)

#### 2. Title (Meta Title)
- Font size: 20px
- Color: #1a0dab (Google blue)
- Line height: 1.3
- Hiển thị: `webSeo.metaTitle`
- Fallback: "Nội Thất Minh Quân – Nội Thất Giá Xưởng | Giường, Tủ, Bàn Gh"
- Max length: 60 ký tự

#### 3. Description (Meta Description)
- Font size: 14px
- Color: #4d5156 (dark gray)
- Line height: 1.58
- Hiển thị: `webSeo.metaDescription`
- Fallback: "Mua nội thất giá xưởng tại Nội Thất Minh Quân – sản phẩm bền đẹp, giao nhanh 1–3 ngày, hỗ trợ đặt theo yêu cầu. Xem ngay ưu đãi hôm nay!"
- Max length: 160 ký tự

#### 4. Meta Info (Character count)
- Font size: 12px
- Color: #70757a (light gray)
- Hiển thị:
  - **Title:** X/60 ký tự
  - **Desc:** X/160 ký tự
  - **Tốt** (status indicator)

## Màu sắc Google-style

| Element | Color | Hex Code |
|---------|-------|----------|
| Title link | Google Blue | #1a0dab |
| Description | Dark Gray | #4d5156 |
| URL/Breadcrumb | Gray | #5f6368 |
| Meta info | Light Gray | #70757a |
| Border | Light Border | #dfe1e5 |
| Background | White | #fff |
| Header BG | Light Gray | #f8f9fa |

## Tính năng

### Real-time Preview
- Preview tự động cập nhật khi user nhập Meta Title hoặc Meta Description
- Hiển thị số ký tự đã dùng / giới hạn
- Giúp user tối ưu SEO trước khi publish

### Character Counter
- **Title**: 60 ký tự (Google limit)
- **Description**: 160 ký tự (Google limit)
- Hiển thị trạng thái "Tốt" khi trong giới hạn

### Fallback Content
- Nếu user chưa nhập, hiển thị nội dung mẫu
- Giúp user hình dung được kết quả cuối cùng

## Lợi ích

1. **SEO Optimization**: User thấy được cách Google hiển thị bài viết
2. **Character Limit**: Tránh bị cắt title/description trên Google
3. **Visual Feedback**: Thấy ngay kết quả khi chỉnh sửa
4. **Professional**: Giao diện giống Google thật
5. **User Experience**: Dễ dàng tối ưu SEO mà không cần công cụ bên ngoài

## So sánh với hình mẫu

### Hình mẫu có:
✅ Breadcrumb URL (noithatminhquan.vn/trang-chu)  
✅ Title màu xanh Google (#1a0dab)  
✅ Description màu xám  
✅ Character count (Title: 60/60 • Desc: 138/160 • Tốt)  

### Implementation có:
✅ Breadcrumb URL với icon  
✅ Title màu xanh Google chính xác  
✅ Description màu xám chính xác  
✅ Character count real-time  
✅ Google icon trong header  
✅ Border và styling giống Google  

## Code Structure

```tsx
<div className="card mt-3" style={{ background: '#fff', border: '1px solid #dfe1e5', maxWidth: 600 }}>
  {/* Header */}
  <div className="card-header">
    <i className="bi bi-google"></i>
    Xem trước kết quả Google
  </div>
  
  {/* Body */}
  <div className="card-body">
    {/* Breadcrumb */}
    <div>noithatminhquan.vn/trang-chu</div>
    
    {/* Title */}
    <a>{webSeo.metaTitle || fallback}</a>
    
    {/* Description */}
    <div>{webSeo.metaDescription || fallback}</div>
    
    {/* Meta Info */}
    <div>Title: X/60 • Desc: X/160 • Tốt</div>
  </div>
</div>
```

## Cách sử dụng

1. Mở tab "SEO Website"
2. Nhập Meta Title (tối đa 60 ký tự)
3. Nhập Meta Description (tối đa 160 ký tự)
4. Xem preview Google Search Result ở dưới
5. Điều chỉnh nội dung để tối ưu SEO
6. Đảm bảo không vượt quá giới hạn ký tự

## Best Practices

### Meta Title (60 ký tự)
- Đặt từ khóa chính ở đầu
- Bao gồm tên thương hiệu
- Hấp dẫn, rõ ràng
- VD: "Nội Thất Minh Quân – Nội Thất Giá Xưởng | Giường, Tủ, Bàn Gh"

### Meta Description (160 ký tự)
- Mô tả ngắn gọn nội dung
- Bao gồm call-to-action
- Nhấn mạnh lợi ích
- VD: "Mua nội thất giá xưởng tại Nội Thất Minh Quân – sản phẩm bền đẹp, giao nhanh 1–3 ngày, hỗ trợ đặt theo yêu cầu. Xem ngay ưu đãi hôm nay!"

## Tương lai có thể mở rộng

- Thêm preview Mobile (màn hình nhỏ)
- Thêm preview Rich Snippets (rating stars, price, etc.)
- Tích hợp Google Search Console API để xem CTR thực tế
- Gợi ý title/description tối ưu bằng AI
- Kiểm tra duplicate title/description trong database

