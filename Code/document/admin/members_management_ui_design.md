# Thiết kế màn hình quản lý Members (Thành viên) - Admin Panel

## 1. Tổng quan

Hệ thống quản lý thành viên bao gồm:
- **Danh sách thành viên** (Members List)
- **Chi tiết thành viên** (Member Detail)
- **Tạo/Chỉnh sửa thành viên** (Member Form)
- **Quản lý địa chỉ thành viên** (Member Addresses)

---

## 2. Màn hình danh sách thành viên (Members List)

### 2.1. Mục đích
- Hiển thị tất cả thành viên trong hệ thống
- Tìm kiếm và lọc thành viên
- Quản lý trạng thái tài khoản

### 2.2. Layout chính

```
┌─────────────────────────────────────────────────────────────────┐
│ QUẢN LÝ THÀNH VIÊN                                [+ Thêm mới]  │
├─────────────────────────────────────────────────────────────────┤
│ Bộ lọc & Tìm kiếm                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Tìm kiếm: Tên, SĐT, Email...              ] [🔍 Tìm]      │ │
│ │                                                             │ │
│ │ Trạng thái:        [Tất cả ▼] Active/Inactive              │ │
│ │ Đã xác minh Email: [Tất cả ▼] Yes/No                       │ │
│ │ Đã xác minh SĐT:   [Tất cả ▼] Yes/No                       │ │
│ │ Ngày tạo:          [📅 Từ ngày] - [📅 Đến ngày]           │ │
│ │                                                             │ │
│ │ [🔄 Làm mới]  [Xuất Excel]  [Áp dụng bộ lọc]              │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Thống kê nhanh                                                  │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│ │ Tổng TV  │ Hoạt động│ Khóa     │ Email XM │ SĐT XM       │  │
│ │ 1,234    │  1,180   │   54     │   980    │   850        │  │
│ └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Danh sách thành viên                        Hiển thị 20/1,234  │
│ ┌─┬─────┬────────────┬──────────┬─────────┬─────────┬────────┐│
│ │☐│ID   │Thành viên  │Liên hệ   │Ngày TG  │Trạng    │Thao    ││
│ │ │     │            │          │         │thái     │tác     ││
│ ├─┼─────┼────────────┼──────────┼─────────┼─────────┼────────┤│
│ │☐│#001 │Nguyễn Văn A│09xxx123  │01/01/26 │✅ Active│[Chi    ││
│ │ │     │nva@mail.com│✉️ Đã XM  │         │✉️ XM    │tiết]   ││
│ │ │     │Nam, 25t    │📱 Đã XM  │         │📱 XM    │[Sửa]   ││
│ │ │     │            │          │         │         │[Khóa]  ││
│ ├─┼─────┼────────────┼──────────┼─────────┼─────────┼────────┤│
│ │☐│#002 │Trần Thị B  │08xxx456  │15/12/25 │❌ Khóa  │[Chi    ││
│ │ │     │ttb@mail.com│✉️ Đã XM  │         │✉️ XM    │tiết]   ││
│ │ │     │Nữ, 30t     │❌ Chưa XM │         │❌ Chưa  │[Sửa]   ││
│ │ │     │            │          │         │         │[Mở]    ││
│ ├─┼─────┼────────────┼──────────┼─────────┼─────────┼────────┤│
│ │☐│#003 │Lê Văn C    │09xxx789  │20/02/26 │✅ Active│[Chi    ││
│ │ │     │lvc@mail.com│❌ Chưa XM │         │❌ Chưa  │tiết]   ││
│ │ │     │Nam, 28t    │📱 Đã XM  │         │📱 XM    │[Sửa]   ││
│ │ │     │            │          │         │         │        ││
│ └─┴─────┴────────────┴──────────┴─────────┴─────────┴────────┘│
│                                                                 │
│ [☐ Chọn tất cả]  Với TV được chọn: [Kích hoạt] [Khóa] [Xóa]   │
│                                                                 │
│ ◄ 1 2 3 ... 62 ►                                   [Trang 1/62]│
└─────────────────────────────────────────────────────────────────┘
```

### 2.3. Các trường hiển thị

| Cột | Dữ liệu | Ghi chú |
|-----|---------|---------|
| ID | Auto increment hoặc CUID | Link đến chi tiết |
| Thành viên | `fullName`<br>`email`<br>`gender`, tuổi | Avatar nếu có |
| Liên hệ | `phone`<br>Email verified<br>Phone verified | Icon tick/cross |
| Ngày tạo | `createdAt` | Format DD/MM/YY |
| Trạng thái | `isActive`<br>`emailVerifiedAt`<br>`phoneVerifiedAt` | Badge màu |
| Thao tác | Chi tiết, Sửa, Khóa/Mở | Quick actions |

### 2.4. Chức năng tìm kiếm

Tìm kiếm theo:
- Họ tên (`fullName`)
- Email (`email`)
- Số điện thoại (`phone`)
- ID

### 2.5. Bộ lọc

- **Trạng thái**: Active / Inactive
- **Email verified**: Đã xác minh / Chưa xác minh
- **Phone verified**: Đã xác minh / Chưa xác minh
- **Giới tính**: Nam / Nữ / Khác
- **Khoảng thời gian đăng ký**: Từ ngày - Đến ngày
- **Có đơn hàng**: Có / Không

---

## 3. Màn hình chi tiết thành viên (Member Detail)

### 3.1. Layout chính

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Quay lại DS         CHI TIẾT THÀNH VIÊN #001                  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Thông tin cơ bản ──────────────────────────────────────────┐│
│ │ [Avatar]  Nguyễn Văn A                                      ││
│ │           nva@mail.com                                      ││
│ │           0901234567                                        ││
│ │           Trạng thái: ✅ Active  [Khóa tài khoản]           ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ ┌─ TABS ──────────────────────────────────────────────────────┐│
│ │ [📋 Thông tin] [📍 Địa chỉ] [📦 Đơn hàng] [📊 Thống kê]   ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ TAB: THÔNG TIN                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ THÔNG TIN CÁ NHÂN                                           ││
│ │                                                             ││
│ │ Họ tên:          Nguyễn Văn A                               ││
│ │ Email:           nva@mail.com       ✅ Đã xác minh         ││
│ │ Số điện thoại:   0901234567         ✅ Đã xác minh         ││
│ │ Ngày sinh:       15/08/1998 (25 tuổi)                       ││
│ │ Giới tính:       Nam                                        ││
│ │                                                             ││
│ │ [Sửa thông tin]                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ TRẠNG THÁI TÀI KHOẢN                                        ││
│ │                                                             ││
│ │ Trạng thái:         ✅ Active                               ││
│ │ Ngày đăng ký:       01/01/2026 10:30 AM                     ││
│ │ Email verified:     ✅ 01/01/2026 10:35 AM                  ││
│ │ Phone verified:     ✅ 02/01/2026 09:15 AM                  ││
│ │ Cập nhật lần cuối:  09/04/2026 14:20 PM                     ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. TAB: ĐỊA CHỈ

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: ĐỊA CHỈ                                      [+ Thêm địa chỉ]│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ⭐ Địa chỉ mặc định                         [Sửa] [Xóa]    ││
│ │ ─────────────────────────────────────────────────────────── ││
│ │ Người nhận:    Nguyễn Văn A                                 ││
│ │ SĐT:           0901234567                                   ││
│ │ Địa chỉ:       123 Đường ABC                                ││
│ │                Phường Bến Nghé, Quận 1                      ││
│ │                TP. Hồ Chí Minh                              ││
│ │ Ghi chú:       Giao hàng giờ hành chính                     ││
│ │                                                             ││
│ │ 📍 [Xem trên bản đồ] (10.7769, 106.7009)                   ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Địa chỉ văn phòng                          [Sửa] [Xóa]     ││
│ │ ─────────────────────────────────────────────────────────── ││
│ │ Người nhận:    Nguyễn Văn A                                 ││
│ │ SĐT:           0901234567                                   ││
│ │ Địa chỉ:       456 Đường XYZ                                ││
│ │                Phường Tân Định, Quận 1                      ││
│ │                TP. Hồ Chí Minh                              ││
│ │                                                             ││
│ │ [Đặt làm mặc định]                                          ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.3. TAB: ĐƠN HÀNG

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: ĐỐN HÀNG                                                   │
│ ┌───┬──────────┬────────────┬────────────┬─────────┬─────────┐│
│ │STT│Mã đơn    │Ngày đặt    │Tổng tiền   │Trạng thái│Thao tác ││
│ ├───┼──────────┼────────────┼────────────┼─────────┼─────────┤│
│ │ 1 │ORD-0001  │09/04/2026  │5.500.000đ  │Đang giao│[Xem]   ││
│ ├───┼──────────┼────────────┼────────────┼─────────┼─────────┤│
│ │ 2 │ORD-0015  │05/04/2026  │3.200.000đ  │Hoàn thành│[Xem]   ││
│ ├───┼──────────┼────────────┼────────────┼─────────┼─────────┤│
│ │ 3 │ORD-0032  │01/03/2026  │8.500.000đ  │Hoàn thành│[Xem]   ││
│ └───┴──────────┴────────────┴────────────┴─────────┴─────────┘│
│                                                                 │
│ Tổng số đơn: 3 | Tổng giá trị: 17.200.000đ                     │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4. TAB: THỐNG KÊ

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: THỐNG KÊ                                                   │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ TỔNG QUAN MUA HÀNG                                          ││
│ │                                                             ││
│ │ ┌──────────────┬──────────────┬──────────────┐             ││
│ │ │ Tổng đơn     │ Tổng chi tiêu│ Trung bình   │             ││
│ │ │    23        │  45.600.000đ │  1.982.000đ  │             ││
│ │ └──────────────┴──────────────┴──────────────┘             ││
│ │                                                             ││
│ │ ┌──────────────┬──────────────┬──────────────┐             ││
│ │ │ Hoàn thành   │ Đã hủy       │ Tỷ lệ hủy    │             ││
│ │ │    20        │      3       │    13%       │             ││
│ │ └──────────────┴──────────────┴──────────────┘             ││
│ │                                                             ││
│ │ Đơn đầu tiên:     01/01/2026                                ││
│ │ Đơn gần nhất:     09/04/2026                                ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ BIỂU ĐỒ CHI TIÊU THEO THÁNG                                ││
│ │ [Biểu đồ cột hoặc đường]                                    ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Màn hình tạo/chỉnh sửa thành viên

### 4.1. Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ THÊM THÀNH VIÊN MỚI                                             │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Thông tin cơ bản ──────────────────────────────────────────┐│
│ │                                                             ││
│ │ Họ và tên: *       [________________________________]       ││
│ │                                                             ││
│ │ Email: *           [________________________________]       ││
│ │                    ☐ Đã xác minh email                      ││
│ │                                                             ││
│ │ Số điện thoại:     [________________________________]       ││
│ │                    ☐ Đã xác minh số điện thoại              ││
│ │                                                             ││
│ │ Mật khẩu: *        [________________________________]       ││
│ │ Nhập lại mật khẩu: [________________________________]       ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌─ Thông tin cá nhân ─────────────────────────────────────────┐│
│ │                                                             ││
│ │ Ngày sinh:         [📅 DD/MM/YYYY]                         ││
│ │                                                             ││
│ │ Giới tính:         ⚪ Nam  ⚪ Nữ  ⚪ Khác                 ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌─ Trạng thái ────────────────────────────────────────────────┐│
│ │                                                             ││
│ │ ☑ Kích hoạt tài khoản                                       ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                    [Hủy]  [Lưu thành viên]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Modal thêm/sửa địa chỉ

```
┌─────────────────────────────────────────────┐
│ THÊM ĐỊA CHỈ MỚI                      [×]  │
├─────────────────────────────────────────────┤
│ Người nhận: *   [_____________________]     │
│                                             │
│ SĐT liên hệ: *  [_____________________]     │
│                                             │
│ Tỉnh/TP: *      [Chọn tỉnh/TP ▼]           │
│                                             │
│ Quận/Huyện: *   [Chọn quận/huyện ▼]        │
│                                             │
│ Phường/Xã: *    [Chọn phường/xã ▼]         │
│                                             │
│ Địa chỉ chi tiết: * [__________________]    │
│                     [__________________]    │
│                                             │
│ Ghi chú:        [_____________________]     │
│                 [_____________________]     │
│                                             │
│ ☐ Đặt làm địa chỉ mặc định                  │
│                                             │
│            [Hủy]  [Lưu địa chỉ]             │
└─────────────────────────────────────────────┘
```

---

## 6. Tính năng bổ sung

### 6.1. Xác minh Email/SĐT thủ công
- Admin có thể đánh dấu đã xác minh thủ công
- Gửi lại email/SMS xác minh

### 6.2. Reset mật khẩu
- Admin có thể reset mật khẩu cho thành viên
- Gửi email/SMS mật khẩu mới

### 6.3. Merge tài khoản
- Gộp tài khoản trùng lặp (duplicate)
- Chuyển đơn hàng từ guest → member

### 6.4. Export/Import
- Export danh sách thành viên ra Excel
- Import thành viên hàng loạt

### 6.5. Thông báo
- Gửi email/SMS thông báo cho thành viên
- Gửi thông báo khuyến mãi

---

## 7. Quy tắc nghiệp vụ

### 7.1. Validation

- Email phải unique trong hệ thống
- Phone phải unique (nếu có)
- Mật khẩu tối thiểu 8 ký tự
- Ngày sinh không được lớn hơn ngày hiện tại

### 7.2. Quyền hạn

- **Super Admin**: Toàn quyền
- **Admin**: Xem, tạo, sửa
- **Moderator**: Chỉ xem

### 7.3. Khi xóa thành viên

- Soft delete (đánh dấu `isActive = false`)
- Không xóa nếu có đơn hàng đang xử lý
- Có thể khôi phục sau khi xóa

---

## 8. API Endpoints (tham khảo)

```
GET    /api/admin/members              # Danh sách
GET    /api/admin/members/:id          # Chi tiết
POST   /api/admin/members              # Tạo mới
PUT    /api/admin/members/:id          # Cập nhật
DELETE /api/admin/members/:id          # Xóa (soft)
POST   /api/admin/members/:id/activate # Kích hoạt
POST   /api/admin/members/:id/deactivate # Khóa

# Địa chỉ
GET    /api/admin/members/:id/addresses         # DS địa chỉ
POST   /api/admin/members/:id/addresses         # Thêm địa chỉ
PUT    /api/admin/members/:id/addresses/:addrId # Sửa địa chỉ
DELETE /api/admin/members/:id/addresses/:addrId # Xóa địa chỉ

# Đơn hàng
GET    /api/admin/members/:id/orders    # DS đơn hàng

# Thống kê
GET    /api/admin/members/:id/stats     # Thống kê
```

---

## 9. Responsive Design

### 9.1. Mobile (< 768px)
- Bảng chuyển thành card layout
- Bộ lọc collapse
- Tabs chuyển accordion

### 9.2. Tablet (768px - 1024px)
- Giảm số cột trong bảng
- Layout 1 column cho chi tiết

---

## 10. Kết luận

Thiết kế quản lý Members:
- ✅ Đầy đủ thông tin cá nhân
- ✅ Quản lý địa chỉ linh hoạt
- ✅ Xem lịch sử đơn hàng
- ✅ Thống kê chi tiêu
- ✅ Xác minh email/SĐT
- ✅ Hỗ trợ merge tài khoản guest
