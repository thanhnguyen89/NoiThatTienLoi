# Thiết kế màn hình quản lý đơn hàng - Admin Panel

## 1. Tổng quan

Hệ thống quản lý đơn hàng bao gồm các màn hình chính:
- **Danh sách đơn hàng** (Order List)
- **Chi tiết đơn hàng** (Order Detail)
- **Tạo/Chỉnh sửa đơn hàng** (Order Form)
- **Lịch sử trạng thái** (Status History)
- **Quản lý vận chuyển** (Shipment Management)

---

## 2. Màn hình danh sách đơn hàng (Order List)

### 2.1. Mục đích
- Hiển thị tất cả đơn hàng trong hệ thống
- Lọc và tìm kiếm đơn hàng nhanh chóng
- Thực hiện các thao tác hàng loạt

### 2.2. Layout chính

```
┌─────────────────────────────────────────────────────────────────┐
│ QUẢN LÝ ĐỐN HÀNG                                    [+ Tạo đơn] │
├─────────────────────────────────────────────────────────────────┤
│ Bộ lọc & Tìm kiếm                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Tìm kiếm: Mã đơn, SĐT, Email...        ] [🔍 Tìm]         │ │
│ │                                                             │ │
│ │ Trạng thái:    [Tất cả ▼]                                  │ │
│ │ Thanh toán:    [Tất cả ▼]                                  │ │
│ │ Loại khách:    [Tất cả ▼] Member/Guest                     │ │
│ │ Từ ngày:       [📅 DD/MM/YYYY] - Đến: [📅 DD/MM/YYYY]     │ │
│ │ Khoảng tiền:   [Từ __________] - [Đến __________]         │ │
│ │                                                             │ │
│ │ [🔄 Làm mới]  [Xuất Excel]  [Áp dụng bộ lọc]             │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Thống kê nhanh                                                  │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│ │ Chờ xác  │ Đã xác   │ Đang     │ Đã giao  │ Đã hủy       │  │
│ │ nhận     │ nhận     │ giao     │          │              │  │
│ │   45     │   120    │   38     │   567    │   23         │  │
│ └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Danh sách đơn hàng                          Hiển thị 20/500    │
│ ┌─┬─────────┬──────────┬─────────┬────────┬─────────┬────────┐│
│ │☐│Mã đơn   │Ngày đặt  │Khách    │Tổng    │Trạng    │Thao    ││
│ │ │         │          │hàng     │tiền    │thái     │tác     ││
│ ├─┼─────────┼──────────┼─────────┼────────┼─────────┼────────┤│
│ │☐│ORD-0001 │09/04/2026│Nguyễn   │5.500K  │[Chờ xác │[Chi    ││
│ │ │         │10:30 AM  │Văn A    │        │ nhận]   │tiết]   ││
│ │ │         │          │Member   │Đã cọc  │         │[Sửa]   ││
│ │ │         │          │09xxx123 │2.000K  │         │        ││
│ ├─┼─────────┼──────────┼─────────┼────────┼─────────┼────────┤│
│ │☐│ORD-0002 │09/04/2026│Trần Thị │8.200K  │[Đang    │[Chi    ││
│ │ │         │09:15 AM  │B        │        │giao]    │tiết]   ││
│ │ │         │          │Guest    │Chưa TT │         │[Sửa]   ││
│ │ │         │          │08xxx456 │        │         │        ││
│ ├─┼─────────┼──────────┼─────────┼────────┼─────────┼────────┤│
│ │☐│ORD-0003 │08/04/2026│Lê Văn  │12.500K │[Đã giao]│[Chi    ││
│ │ │         │15:20 PM  │C        │        │         │tiết]   ││
│ │ │         │          │Member   │Đã TT   │         │        ││
│ │ │         │          │09xxx789 │        │         │        ││
│ └─┴─────────┴──────────┴─────────┴────────┴─────────┴────────┘│
│                                                                 │
│ [☐ Chọn tất cả]  Với đơn được chọn: [Thay đổi trạng thái ▼]   │
│                                                                 │
│ ◄ 1 2 3 ... 25 ►                                   [Trang 1/25]│
└─────────────────────────────────────────────────────────────────┘
```

### 2.3. Các trường hiển thị trong bảng

| Cột | Nội dung | Ghi chú |
|-----|----------|---------|
| Checkbox | Chọn đơn | Để thao tác hàng loạt |
| Mã đơn | `order_no` | Link đến trang chi tiết |
| Ngày đặt | `placed_at` | Format: DD/MM/YYYY HH:mm |
| Khách hàng | `customer_name`<br>`customer_type`<br>`customer_phone` | Hiển thị badge Member/Guest |
| Tổng tiền | `grand_total_amount`<br>`deposit_amount` | Hiển thị số tiền đã cọc |
| Trạng thái | `order_status`<br>`payment_status` | Badge màu theo trạng thái |
| Thao tác | Nút Chi tiết, Sửa | Quick actions |

### 2.4. Màu sắc trạng thái đơn hàng

| Trạng thái | Màu badge | Ý nghĩa |
|------------|-----------|---------|
| `pending` | Vàng | Chờ xác nhận |
| `confirmed` | Xanh dương nhạt | Đã xác nhận |
| `processing` | Xanh dương | Đang xử lý |
| `shipping` | Tím | Đang giao hàng |
| `delivered` | Xanh lá | Đã giao hàng |
| `completed` | Xanh lá đậm | Hoàn thành |
| `cancelled` | Đỏ | Đã hủy |
| `returned` | Cam | Trả hàng |

### 2.5. Màu sắc trạng thái thanh toán

| Trạng thái | Màu badge |
|------------|-----------|
| `unpaid` | Đỏ nhạt |
| `partially_paid` | Cam |
| `paid` | Xanh lá |
| `refunded` | Xám |
| `partially_refunded` | Cam nhạt |

### 2.6. Chức năng tìm kiếm

Cho phép tìm kiếm theo:
- Mã đơn hàng (`order_no`)
- Số điện thoại khách hàng (`customer_phone`)
- Email khách hàng (`customer_email`)
- Tên khách hàng (`customer_name`)
- Mã tracking (`tracking_code`)

### 2.7. Bộ lọc

- **Trạng thái đơn**: Tất cả các giá trị trong `order_status_enum`
- **Trạng thái thanh toán**: Tất cả các giá trị trong `payment_status_enum`
- **Loại khách hàng**: Member / Guest
- **Khoảng thời gian**: Từ ngày - Đến ngày
- **Khoảng giá trị**: Từ - Đến (grand_total_amount)
- **Kho xuất hàng**: Dropdown từ bảng `warehouses`
- **Đơn vị vận chuyển**: Dropdown từ bảng `shipping_providers`

### 2.8. Thao tác hàng loạt

- Thay đổi trạng thái nhiều đơn cùng lúc
- Xuất danh sách đơn ra Excel/CSV
- In nhãn giao hàng hàng loạt
- Gửi email thông báo hàng loạt

---

## 3. Màn hình chi tiết đơn hàng (Order Detail)

### 3.1. Mục đích
- Xem đầy đủ thông tin đơn hàng
- Theo dõi lịch sử trạng thái
- Cập nhật trạng thái đơn
- Quản lý thông tin vận chuyển

### 3.2. Layout chính

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Quay lại DS         CHI TIẾT ĐƠN HÀNG #ORD-0001               │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Thông tin chung ────────────────────────────────────────────┐│
│ │ Mã đơn:        ORD-0001                                      ││
│ │ Ngày đặt:      09/04/2026 10:30 AM                           ││
│ │ Trạng thái:    [Chờ xác nhận ▼] [Cập nhật]                  ││
│ │ Thanh toán:    [Chưa thanh toán ▼] [Cập nhật]               ││
│ │ Loại khách:    👤 Member (ID: 123)                           ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ ┌─ TABS ──────────────────────────────────────────────────────┐│
│ │ [📋 Tổng quan] [📦 Sản phẩm] [🚚 Vận chuyển] [📊 Lịch sử]  ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ TAB: TỔNG QUAN                                                  │
│ ┌─────────────────────────────┬─────────────────────────────┐  │
│ │ THÔNG TIN KHÁCH HÀNG        │ THÔNG TIN GIAO HÀNG         │  │
│ │                             │                             │  │
│ │ Họ tên:  Nguyễn Văn A       │ Người nhận: Nguyễn Văn A    │  │
│ │ SĐT:     0901234567         │ SĐT:        0901234567      │  │
│ │ Email:   nguyenvana@m.com   │ Email:      nguyenvana@...  │  │
│ │                             │                             │  │
│ │ [Xem hồ sơ thành viên]      │ Địa chỉ:                    │  │
│ │                             │ 123 Đường ABC, Phường XYZ   │  │
│ │                             │ Quận 1, TP.HCM              │  │
│ │                             │                             │  │
│ │                             │ 📍 [Xem bản đồ]             │  │
│ └─────────────────────────────┴─────────────────────────────┘  │
│ ┌─────────────────────────────┬─────────────────────────────┐  │
│ │ THÔNG TIN THANH TOÁN        │ TỔNG TIỀN                   │  │
│ │                             │                             │  │
│ │ Tiền hàng:       5.200.000đ │ Tạm tính:       5.200.000đ │  │
│ │ Giảm giá:        - 200.000đ │ Giảm giá:       - 200.000đ │  │
│ │ Phí vận chuyển:  + 500.000đ │ Phí ship:       + 500.000đ │  │
│ │ Phụ phí khác:    +       0đ │ Thuế:           +       0đ │  │
│ │ Thuế:            +       0đ │                             │  │
│ │ ───────────────────────────  │ ═══════════════════════════ │  │
│ │ Tổng cộng:       5.500.000đ │ TỔNG:           5.500.000đ │  │
│ │                             │                             │  │
│ │ Đã đặt cọc:      2.000.000đ │ Đã cọc:         2.000.000đ │  │
│ │ Còn lại:         3.500.000đ │ Còn lại:        3.500.000đ │  │
│ └─────────────────────────────┴─────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ GHI CHÚ                                                     ││
│ │                                                             ││
│ │ Ghi chú khách:    "Giao hàng giờ hành chính"                ││
│ │ Ghi chú nội bộ:   "Kiểm tra kỹ hàng trước khi giao"         ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.3. TAB: SẢN PHẨM

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: SẢN PHẨM                                                   │
│ ┌───┬──────────────────────┬─────┬──────────┬──────────┬──────┐│
│ │STT│Sản phẩm              │SL   │Đơn giá   │Giảm giá  │Thành ││
│ │   │                      │     │          │          │tiền  ││
│ ├───┼──────────────────────┼─────┼──────────┼──────────┼──────┤│
│ │ 1 │Ghế sofa da 3 chỗ    │  2  │2.500.000đ│-100.000đ│4.800K││
│ │   │SKU: SF-001           │     │          │          │      ││
│ │   │Màu: Nâu | Size: L    │     │          │          │      ││
│ │   │[Xem sản phẩm]        │     │          │          │      ││
│ ├───┼──────────────────────┼─────┼──────────┼──────────┼──────┤│
│ │ 2 │Bàn trà gỗ óc chó     │  1  │  500.000đ│      0đ│  500K││
│ │   │SKU: TB-002           │     │          │          │      ││
│ │   │Màu: Tự nhiên         │     │          │          │      ││
│ │   │[Xem sản phẩm]        │     │          │          │      ││
│ └───┴──────────────────────┴─────┴──────────┴──────────┴──────┘│
│                                                                 │
│ Tổng tiền hàng: 5.200.000đ                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4. TAB: VẬN CHUYỂN

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: VẬN CHUYỂN                                   [+ Thêm lô VCH]│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Lô vận chuyển #1                            [Sửa] [Xóa]    ││
│ │ ─────────────────────────────────────────────────────────── ││
│ │ Kho xuất:         Kho trung tâm Quận 9                      ││
│ │ Đơn vị VC:        Giao Hàng Nhanh (GHN)                     ││
│ │                                                             ││
│ │ Từ:               123 Đường XYZ, Quận 9, TP.HCM             ││
│ │ Đến:              456 Đường ABC, Quận 1, TP.HCM             ││
│ │                                                             ││
│ │ Khoảng cách:      15.5 km (ước tính: 15 km)                ││
│ │                                                             ││
│ │ Phương tiện:      🚐 Xe Van                                 ││
│ │ Dịch vụ:          Giao hàng tiêu chuẩn                      ││
│ │                                                             ││
│ │ Phí vận chuyển:   500.000đ                                  ││
│ │ Phụ phí:          0đ                                        ││
│ │ Giảm giá ship:    0đ                                        ││
│ │ Thành tiền:       500.000đ                                  ││
│ │                                                             ││
│ │ Mã vận đơn:       GHN123456789                              ││
│ │ Mã tracking:      TRACK-001                                 ││
│ │                                                             ││
│ │ Ngày xuất kho:    09/04/2026 14:00                          ││
│ │ Dự kiến giao:     10/04/2026                                ││
│ │ Thực tế giao:     [Chưa giao]                               ││
│ │                                                             ││
│ │ [📍 Xem bản đồ route] [🔍 Tra cứu vận đơn]                 ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.5. TAB: LỊCH SỬ

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: LỊCH SỬ TRẠNG THÁI                                         │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ │ ⚫ 09/04/2026 10:30 AM                                       ││
│ │   Đơn hàng được tạo                                         ││
│ │   Trạng thái: pending                                       ││
│ │   Bởi: Khách hàng (Nguyễn Văn A)                            ││
│ │                                                             ││
│ │ │                                                           ││
│ │                                                             ││
│ │ ⚫ 09/04/2026 10:45 AM                                       ││
│ │   Xác nhận đơn hàng                                         ││
│ │   Trạng thái: pending → confirmed                           ││
│ │   Bởi: Admin (Trần Văn B - ID: 5)                           ││
│ │   Ghi chú: "Đã xác nhận qua điện thoại"                     ││
│ │                                                             ││
│ │ │                                                           ││
│ │                                                             ││
│ │ ⚫ 09/04/2026 11:00 AM                                       ││
│ │   Khách hàng đặt cọc                                        ││
│ │   Trạng thái thanh toán: unpaid → partially_paid            ││
│ │   Số tiền: 2.000.000đ                                       ││
│ │   Bởi: Hệ thống (Payment Gateway)                           ││
│ │                                                             ││
│ │ │                                                           ││
│ │                                                             ││
│ │ ⚫ 09/04/2026 14:00 PM                                       ││
│ │   Bắt đầu xử lý đơn                                         ││
│ │   Trạng thái: confirmed → processing                        ││
│ │   Bởi: Admin (Lê Thị C - ID: 8)                             ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Cập nhật trạng thái ────────────────────────────────────────┐│
│ │ Trạng thái mới:    [Đang giao hàng ▼]                       ││
│ │ Ghi chú:           [________________________________]        ││
│ │                                                              ││
│ │                    [Hủy]  [Cập nhật trạng thái]             ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Màn hình tạo/chỉnh sửa đơn hàng

### 4.1. Mục đích
- Tạo đơn hàng mới cho khách (admin tạo hộ)
- Chỉnh sửa thông tin đơn hàng

### 4.2. Layout - BƯỚC 1: Thông tin khách hàng

```
┌─────────────────────────────────────────────────────────────────┐
│ TẠO ĐƠN HÀNG MỚI                                                │
│ Bước 1/4: Thông tin khách hàng                                  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Loại khách hàng ───────────────────────────────────────────┐│
│ │ ⚪ Thành viên (Member)    ⚫ Khách vãng lai (Guest)          ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Tìm kiếm thành viên (nếu chọn Member) ─────────────────────┐│
│ │ [Tìm theo SĐT, Email hoặc tên...                    ] [🔍] ││
│ │                                                             ││
│ │ Kết quả:                                                    ││
│ │ ┌───────────────────────────────────────────────────────┐  ││
│ │ │ 👤 Nguyễn Văn A - 0901234567         [Chọn khách này]│  ││
│ │ │    nguyenvana@email.com                             │  ││
│ │ └───────────────────────────────────────────────────────┘  ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Thông tin khách hàng ──────────────────────────────────────┐│
│ │ Họ tên: *      [________________________]                   ││
│ │ Số điện thoại: [________________________]                   ││
│ │ Email:         [________________________]                   ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Địa chỉ giao hàng ─────────────────────────────────────────┐│
│ │ (Nếu là Member, có thể chọn từ sổ địa chỉ)                  ││
│ │ [Chọn từ sổ địa chỉ ▼] hoặc nhập mới:                       ││
│ │                                                             ││
│ │ Người nhận: *  [________________________]                   ││
│ │ SĐT nhận:      [________________________]                   ││
│ │                                                             ││
│ │ Tỉnh/TP: *     [Chọn tỉnh/thành phố ▼]                     ││
│ │ Quận/Huyện: *  [Chọn quận/huyện ▼]                          ││
│ │ Phường/Xã: *   [Chọn phường/xã ▼]                           ││
│ │ Địa chỉ: *     [________________________________]           ││
│ │                [________________________________]           ││
│ │                                                             ││
│ │ Ghi chú giao hàng: [_______________________________]        ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                    [Hủy]  [Tiếp theo: Sản phẩm]│
└─────────────────────────────────────────────────────────────────┘
```

### 4.3. Layout - BƯỚC 2: Chọn sản phẩm

```
┌─────────────────────────────────────────────────────────────────┐
│ TẠO ĐƠN HÀNG MỚI                                                │
│ Bước 2/4: Chọn sản phẩm                                         │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Tìm kiếm sản phẩm ─────────────────────────────────────────┐│
│ │ [Tìm theo tên, SKU, mã sản phẩm...              ] [🔍]      ││
│ │ Danh mục: [Tất cả ▼]                                        ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Kết quả tìm kiếm ──────────────────────────────────────────┐│
│ │ ┌────────────────────────────────────────────────────────┐  ││
│ │ │ [IMG] Ghế sofa da 3 chỗ                                │  ││
│ │ │       SKU: SF-001                                      │  ││
│ │ │       Giá: 2.500.000đ  Tồn: 15 cái                     │  ││
│ │ │       Màu: [Nâu ▼]  Size: [L ▼]  SL: [1]  [+ Thêm]   │  ││
│ │ └────────────────────────────────────────────────────────┘  ││
│ │ ┌────────────────────────────────────────────────────────┐  ││
│ │ │ [IMG] Bàn trà gỗ óc chó                                │  ││
│ │ │       SKU: TB-002                                      │  ││
│ │ │       Giá: 500.000đ  Tồn: 8 cái                        │  ││
│ │ │       SL: [1]  [+ Thêm]                                │  ││
│ │ └────────────────────────────────────────────────────────┘  ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Sản phẩm đã chọn ──────────────────────────────────────────┐│
│ │ ┌───┬──────────────┬─────┬──────────┬─────────┬──────┬───┐ ││
│ │ │STT│Sản phẩm      │Biến │Đơn giá   │SL       │Thành │   │ ││
│ │ │   │              │thể  │          │         │tiền  │   │ ││
│ │ ├───┼──────────────┼─────┼──────────┼─────────┼──────┼───┤ ││
│ │ │ 1 │Ghế sofa da   │Nâu,L│2.500.000đ│[2]      │5.000K│[X]│ ││
│ │ ├───┼──────────────┼─────┼──────────┼─────────┼──────┼───┤ ││
│ │ │ 2 │Bàn trà gỗ    │-    │  500.000đ│[1]      │  500K│[X]│ ││
│ │ └───┴──────────────┴─────┴──────────┴─────────┴──────┴───┘ ││
│ │                                                             ││
│ │ Tổng tiền hàng: 5.500.000đ                                  ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                   [Quay lại]  [Tiếp: Vận chuyển]│
└─────────────────────────────────────────────────────────────────┘
```

### 4.4. Layout - BƯỚC 3: Vận chuyển

```
┌─────────────────────────────────────────────────────────────────┐
│ TẠO ĐƠN HÀNG MỚI                                                │
│ Bước 3/4: Vận chuyển                                            │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Điểm xuất hàng ────────────────────────────────────────────┐│
│ │ Kho: *         [Kho trung tâm Quận 9 ▼]                     ││
│ │ Địa chỉ kho:   123 Đường XYZ, Quận 9, TP.HCM                ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Thông tin vận chuyển ──────────────────────────────────────┐│
│ │ Đơn vị vận chuyển: * [Giao Hàng Nhanh (GHN) ▼]             ││
│ │                                                             ││
│ │ Phương tiện:     * [⚪ Xe máy  ⚫ Xe van  ⚪ Xe tải]       ││
│ │ Loại dịch vụ:      [Tiêu chuẩn ▼]                          ││
│ │                                                             ││
│ │ Khoảng cách ước tính: 15.5 km                               ││
│ │ [📍 Tính toán khoảng cách]                                  ││
│ │                                                             ││
│ │ Phí vận chuyển:    [500,000] đ                              ││
│ │ Phụ phí:           [0] đ                                    ││
│ │ Giảm giá ship:     [0] đ                                    ││
│ │ ─────────────────────────────                               ││
│ │ Tổng phí ship:     500,000 đ                                ││
│ │                                                             ││
│ │ Thời gian dự kiến: [10/04/2026] (1 ngày)                    ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Ghi chú vận chuyển ────────────────────────────────────────┐│
│ │ [_________________________________________________]         ││
│ │ [_________________________________________________]         ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                [Quay lại]  [Tiếp: Xác nhận đơn] │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5. Layout - BƯỚC 4: Xác nhận và thanh toán

```
┌─────────────────────────────────────────────────────────────────┐
│ TẠO ĐƠN HÀNG MỚI                                                │
│ Bước 4/4: Xác nhận đơn hàng                                     │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Tóm tắt đơn hàng ──────────────────────────────────────────┐│
│ │                                                             ││
│ │ Khách hàng:    Nguyễn Văn A (Guest)                         ││
│ │ SĐT:           0901234567                                   ││
│ │ Địa chỉ:       123 Đường ABC, Phường XYZ, Q1, TPHCM         ││
│ │                                                             ││
│ │ Sản phẩm:      2 sản phẩm                                   ││
│ │ Vận chuyển:    Giao Hàng Nhanh - Xe Van                     ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Tổng tiền ─────────────────────────────────────────────────┐│
│ │ Tiền hàng:          5.500.000đ                              ││
│ │ Giảm giá:           -       0đ  [Áp mã giảm giá]            ││
│ │ Phí vận chuyển:     + 500.000đ                              ││
│ │ Phụ phí:            +       0đ  [Nhập]                      ││
│ │ Thuế VAT (0%):      +       0đ                              ││
│ │ ───────────────────────────────                             ││
│ │ TỔNG CỘNG:          6.000.000đ                              ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Thanh toán ────────────────────────────────────────────────┐│
│ │ Số tiền đặt cọc:    [2,000,000] đ                           ││
│ │ Còn lại phải TT:    4.000.000đ                              ││
│ │                                                             ││
│ │ Trạng thái đơn:     [Chờ xác nhận ▼]                        ││
│ │ Trạng thái TT:      [Đã cọc một phần ▼]                     ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Ghi chú ───────────────────────────────────────────────────┐│
│ │ Ghi chú khách:     [_______________________________]        ││
│ │ Ghi chú nội bộ:    [_______________________________]        ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│                            [Quay lại]  [Hủy]  [Tạo đơn hàng]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Các thành phần UI bổ sung

### 5.1. Modal thay đổi trạng thái nhanh

```
┌─────────────────────────────────────────┐
│ THAY ĐỔI TRẠNG THÁI ĐƠN HÀNG      [×] │
├─────────────────────────────────────────┤
│ Đơn hàng:  #ORD-0001                    │
│                                         │
│ Trạng thái hiện tại:                    │
│   [Chờ xác nhận]                        │
│                                         │
│ Trạng thái mới: *                       │
│   [Đã xác nhận ▼]                       │
│                                         │
│ Ghi chú:                                │
│   [_____________________________]       │
│   [_____________________________]       │
│                                         │
│ ☐ Gửi email thông báo cho khách         │
│ ☐ Gửi SMS thông báo                     │
│                                         │
│            [Hủy]  [Xác nhận thay đổi]   │
└─────────────────────────────────────────┘
```

### 5.2. Badge trạng thái

**HTML/CSS mẫu:**

```html
<!-- Trạng thái đơn -->
<span class="badge badge-pending">Chờ xác nhận</span>
<span class="badge badge-confirmed">Đã xác nhận</span>
<span class="badge badge-processing">Đang xử lý</span>
<span class="badge badge-shipping">Đang giao</span>
<span class="badge badge-delivered">Đã giao</span>
<span class="badge badge-completed">Hoàn thành</span>
<span class="badge badge-cancelled">Đã hủy</span>
<span class="badge badge-returned">Trả hàng</span>

<!-- Trạng thái thanh toán -->
<span class="badge badge-payment-unpaid">Chưa thanh toán</span>
<span class="badge badge-payment-partial">Đã cọc</span>
<span class="badge badge-payment-paid">Đã thanh toán</span>
<span class="badge badge-payment-refunded">Đã hoàn tiền</span>
```

### 5.3. Timeline lịch sử

```html
<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-marker"></div>
    <div class="timeline-content">
      <div class="timeline-time">09/04/2026 10:30</div>
      <div class="timeline-title">Đơn hàng được tạo</div>
      <div class="timeline-body">
        Trạng thái: <strong>pending</strong><br>
        Bởi: Khách hàng (Nguyễn Văn A)
      </div>
    </div>
  </div>
</div>
```

---

## 6. Responsive Design

### 6.1. Mobile Layout (< 768px)

- Bảng danh sách đơn hàng chuyển thành card layout
- Bộ lọc collapse thành drawer/bottom sheet
- Tab chuyển thành accordion
- Form tạo đơn giữ nguyên step-by-step

### 6.2. Tablet Layout (768px - 1024px)

- Bảng hiển thị đầy đủ nhưng giảm số cột
- Chi tiết đơn hàng: 1 column thay vì 2 columns
- Giữ nguyên hầu hết chức năng

---

## 7. Chức năng nâng cao

### 7.1. Export/Import

- **Export Excel**: Xuất danh sách đơn hàng theo bộ lọc
- **Export PDF**: Xuất hóa đơn, phiếu giao hàng
- **Import Excel**: Import đơn hàng hàng loạt

### 7.2. In ấn

- In hóa đơn
- In phiếu giao hàng
- In nhãn vận chuyển (shipping label)
- In phiếu xuất kho

### 7.3. Thông báo

- Gửi email xác nhận đơn hàng
- Gửi SMS thông báo trạng thái
- Push notification cho admin khi có đơn mới

### 7.4. Báo cáo

- Dashboard thống kê đơn hàng
- Báo cáo doanh thu theo thời gian
- Báo cáo hiệu suất vận chuyển
- Phân tích chi phí logistics

### 7.5. Tích hợp

- Tích hợp với các đơn vị vận chuyển (GHN, GHTK, Viettel Post...)
- Tích hợp cổng thanh toán
- Tích hợp CRM
- Webhook cho third-party systems

---

## 8. Quy tắc nghiệp vụ UI

### 8.1. Chuyển trạng thái đơn

Một số quy tắc khi chuyển trạng thái:

| Từ trạng thái | Có thể chuyển sang |
|---------------|---------------------|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `processing`, `cancelled` |
| `processing` | `shipping`, `cancelled` |
| `shipping` | `delivered`, `returned` |
| `delivered` | `completed`, `returned` |
| `completed` | - |
| `cancelled` | - |
| `returned` | `completed` (sau xử lý) |

### 8.2. Quyền hạn

- **Admin cấp cao**: Toàn quyền quản lý đơn
- **Nhân viên bán hàng**: Tạo đơn, xem đơn, cập nhật trạng thái (trừ hủy)
- **Nhân viên kho**: Xem đơn, cập nhật trạng thái xuất kho
- **Shipper**: Xem đơn giao cho mình, cập nhật trạng thái giao hàng

### 8.3. Validation

- Không được tạo đơn không có sản phẩm
- Không được để trống thông tin khách hàng bắt buộc
- Số tiền đặt cọc không được lớn hơn tổng đơn
- Khi hủy đơn đã cọc phải hoàn tiền

---

## 9. Wireframe tóm tắt luồng

```
┌───────────────┐
│ Danh sách đơn │
└───────┬───────┘
        │
        ├─────────► [Tạo đơn mới] ──► Bước 1: Khách hàng
        │                            └──► Bước 2: Sản phẩm
        │                                └──► Bước 3: Vận chuyển
        │                                    └──► Bước 4: Xác nhận
        │
        └─────────► [Chi tiết đơn] ──► Tab Tổng quan
                                       ├─► Tab Sản phẩm
                                       ├─► Tab Vận chuyển
                                       └─► Tab Lịch sử
```

---

## 10. Kết luận

Thiết kế màn hình quản lý đơn hàng này:

- **Đầy đủ chức năng**: Từ tạo, xem, sửa, theo dõi đến phân tích
- **Dễ sử dụng**: Layout rõ ràng, workflow hợp lý
- **Hỗ trợ cả Member và Guest**: Linh hoạt theo nghiệp vụ
- **Quản lý vận chuyển chi tiết**: Theo dõi logistics hiệu quả
- **Audit trail đầy đủ**: Lịch sử thay đổi minh bạch
- **Responsive**: Hoạt động tốt trên mọi thiết bị
- **Mở rộng được**: Dễ tích hợp thêm tính năng mới

Thiết kế này phù hợp cho:
- Hệ thống bán hàng nội thất
- E-commerce platform
- Hệ thống quản lý đơn hàng B2B/B2C
