# Hashtags & Keywords Quick-Add Guide

## Tổng quan

Đã thêm 20 hashtags và keywords mẫu cho cả 3 tab (Facebook, TikTok, YouTube) để người dùng có thể click nhanh thêm vào nội dung.

## Tính năng đã thêm

### 1. Facebook Tab

#### Keywords (20 từ khóa)
- Màu: `btn-outline-info` (xanh dương nhạt)
- Vị trí: Dưới input Keywords
- Chức năng: Click để thêm vào field Keywords (phân cách bằng dấu phẩy)

**Danh sách Keywords:**
1. nội thất
2. nội thất đẹp
3. nội thất giá rẻ
4. nội thất cao cấp
5. sofa
6. bàn ghế
7. giường ngủ
8. tủ quần áo
9. bàn làm việc
10. kệ tivi
11. thiết kế nội thất
12. thi công nội thất
13. nội thất phòng khách
14. nội thất phòng ngủ
15. nội thất bếp
16. nội thất văn phòng
17. nội thất gỗ
18. nội thất hiện đại
19. nội thất tối giản
20. nội thất TPHCM

#### Hashtags (20 hashtags)
- Màu: `btn-outline-primary` (xanh dương)
- Vị trí: Dưới input Hashtags
- Chức năng: Click để thêm vào field Hashtags (tự động thêm dấu #)

**Danh sách Hashtags:**
1. #noithat
2. #noithatdep
3. #noithatgiare
4. #noithatcaocap
5. #sofa
6. #banghe
7. #giuongngu
8. #tuquanao
9. #banlamviec
10. #ketivi
11. #thietkenoithat
12. #thicongnoithat
13. #noithatphongkhach
14. #noithatphongngu
15. #noithatbep
16. #noithatvanphong
17. #noithatgo
18. #noithathiendai
19. #noithattoigian
20. #noithattphcm

---

### 2. TikTok Tab

#### Keywords (20 từ khóa)
- Màu: `btn-outline-info` (xanh dương nhạt)
- Vị trí: Dưới input Keywords
- Chức năng: Click để thêm vào field Keywords (phân cách bằng dấu phẩy)

**Danh sách Keywords:** (Giống Facebook)

#### Hashtags (20 hashtags)
- Màu: `btn-outline-primary` (xanh dương)
- Vị trí: Dưới input Hashtags
- Chức năng: Click để thêm vào field Hashtags (tự động thêm dấu #)

**Danh sách Hashtags TikTok-specific:**
1. #noithat
2. #noithatdep
3. #tiktoknoithat ⭐ (TikTok specific)
4. #fyp ⭐ (TikTok trending)
5. #xuhuong ⭐ (TikTok trending)
6. #viral ⭐ (TikTok trending)
7. #sofa
8. #banghe
9. #giuongngu
10. #tuquanao
11. #thietkenoithat
12. #thicongnoithat
13. #noithatphongkhach
14. #noithatphongngu
15. #noithatbep
16. #noithatvanphong
17. #noithatgo
18. #noithathiendai
19. #noithattoigian
20. #noithattphcm

---

### 3. YouTube Tab

#### Tags (20 tags)
- Màu: `btn-outline-danger` (đỏ - màu YouTube)
- Vị trí: Dưới input Tags
- Chức năng: Click để thêm vào field Tags (phân cách bằng dấu phẩy)

**Danh sách Tags:** (Giống Keywords Facebook)

#### Hashtags (20 hashtags)
- Màu: `btn-outline-primary` (xanh dương)
- Vị trí: Dưới input Hashtags
- Chức năng: Click để thêm vào field Hashtags (tự động thêm dấu #)

**Danh sách Hashtags:** (Giống Facebook)

---

## Thiết kế UI

### Container Style
```css
{
  maxHeight: '120px',
  overflowY: 'auto',
  padding: '6px',
  border: '1px solid #dee2e6',
  borderRadius: '4px',
  fontSize: '11px'
}
```

### Button Style
```css
{
  fontSize: '10px',
  padding: '2px 6px'
}
```

### Đặc điểm:
- **Scrollable**: Chiều cao tối đa 120px, có thanh cuộn nếu cần
- **Compact**: Buttons nhỏ gọn để tiết kiệm không gian
- **Color-coded**: 
  - Keywords/Tags: Xanh nhạt (info)
  - Hashtags: Xanh dương (primary)
  - YouTube Tags: Đỏ (danger)
- **Helper text**: "click để thêm" để hướng dẫn người dùng

---

## Logic thêm nội dung

### Keywords/Tags
```javascript
onClick={() => setState(p => ({ 
  ...p, 
  keywords: p.keywords ? p.keywords + ', từ_khóa' : 'từ_khóa' 
}))}
```
- Nếu đã có keywords → thêm dấu phẩy + từ khóa mới
- Nếu chưa có → chỉ thêm từ khóa

### Hashtags
```javascript
onClick={() => setState(p => ({ 
  ...p, 
  hashtags: p.hashtags ? p.hashtags + ' #hashtag' : '#hashtag' 
}))}
```
- Nếu đã có hashtags → thêm khoảng trắng + hashtag mới
- Nếu chưa có → chỉ thêm hashtag
- Tự động thêm dấu # vào đầu

---

## Lợi ích

1. **Tiết kiệm thời gian**: Không cần gõ tay, chỉ cần click
2. **Chuẩn hóa**: Đảm bảo keywords/hashtags đúng chính tả
3. **SEO tốt hơn**: Sử dụng từ khóa phổ biến, có lượng tìm kiếm cao
4. **Dễ sử dụng**: UI trực quan, dễ hiểu
5. **Tiết kiệm không gian**: Scrollable container không chiếm nhiều màn hình

---

## Cách sử dụng

1. Mở tab Facebook/TikTok/YouTube
2. Cuộn xuống phần Keywords/Tags và Hashtags
3. Click vào button mẫu muốn thêm
4. Nội dung sẽ tự động được thêm vào input field
5. Có thể click nhiều lần để thêm nhiều keywords/hashtags
6. Có thể chỉnh sửa thủ công trong input field nếu cần

---

## Tương lai có thể mở rộng

- Thêm nhiều keywords/hashtags mẫu hơn
- Phân loại theo danh mục (phòng khách, phòng ngủ, bếp...)
- Lưu keywords/hashtags yêu thích của user
- Gợi ý keywords trending dựa trên thời gian
- Tích hợp API để lấy hashtags trending từ TikTok/Instagram

