# Thiết kế màn hình quản lý Shipping Providers (Đơn vị vận chuyển) - Admin Panel

## 1. Tổng quan

Hệ thống quản lý đơn vị vận chuyển bao gồm:
- **Danh sách đơn vị vận chuyển** (Shipping Providers List)
- **Chi tiết đơn vị vận chuyển** (Provider Detail)
- **Tạo/Chỉnh sửa đơn vị vận chuyển** (Provider Form)

---

## 2. Màn hình danh sách đơn vị vận chuyển

### 2.1. Mục đích
- Hiển thị tất cả đơn vị vận chuyển
- Quản lý thông tin liên hệ
- Theo dõi hiệu suất giao hàng

### 2.2. Layout chính

```
┌─────────────────────────────────────────────────────────────────┐
│ QUẢN LÝ ĐƠN VỊ VẬN CHUYỂN                          [+ Thêm mới] │
├─────────────────────────────────────────────────────────────────┤
│ Bộ lọc & Tìm kiếm                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Tìm kiếm: Mã, tên đơn vị, SĐT...          ] [🔍 Tìm]      │ │
│ │                                                             │ │
│ │ Trạng thái:     [Tất cả ▼] Active/Inactive                 │ │
│ │ Loại dịch vụ:   [Tất cả ▼] Nhanh/Tiêu chuẩn/Tiết kiệm     │ │
│ │                                                             │ │
│ │ [🔄 Làm mới]  [Xuất Excel]  [Áp dụng bộ lọc]              │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Thống kê nhanh                                                  │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│ │ Tổng ĐV  │ Hoạt động│ Tạm ngưng│ Đơn hôm  │ Chi phí TB   │  │
│ │    8     │    6     │    2     │ nay: 45  │ 35,000đ      │  │
│ └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Danh sách đơn vị vận chuyển                      Hiển thị 6/8  │
│ ┌─┬──────┬──────────────┬─────────────┬─────────┬────────────┐│
│ │☐│Mã ĐV │Tên đơn vị    │Liên hệ      │Hiệu suất│Thao tác    ││
│ ├─┼──────┼──────────────┼─────────────┼─────────┼────────────┤│
│ │☐│GHN   │Giao Hàng Nhanh│1900-xxxx   │✅ Active│[Chi tiết]  ││
│ │ │      │              │ghn.vn       │         │[Sửa]       ││
│ │ │      │              │             │⭐ 4.5/5 │[Báo giá]   ││
│ │ │      │              │             │142 đơn  │            ││
│ ├─┼──────┼──────────────┼─────────────┼─────────┼────────────┤│
│ │☐│GHTK  │Giao Hàng Tiết│1900-yyyy    │✅ Active│[Chi tiết]  ││
│ │ │      │Kiệm          │ghtk.vn      │         │[Sửa]       ││
│ │ │      │              │             │⭐ 4.3/5 │[Báo giá]   ││
│ │ │      │              │             │98 đơn   │            ││
│ ├─┼──────┼──────────────┼─────────────┼─────────┼────────────┤│
│ │☐│VTP   │Viettel Post  │1900-zzzz    │✅ Active│[Chi tiết]  ││
│ │ │      │              │viettelpost  │         │[Sửa]       ││
│ │ │      │              │             │⭐ 4.7/5 │[Báo giá]   ││
│ │ │      │              │             │85 đơn   │            ││
│ ├─┼──────┼──────────────┼─────────────┼─────────┼────────────┤│
│ │☐│GRAB  │GrabExpress   │028-xxxx     │✅ Active│[Chi tiết]  ││
│ │ │      │              │grab.com     │         │[Sửa]       ││
│ │ │      │              │             │⭐ 4.6/5 │[Báo giá]   ││
│ │ │      │              │             │67 đơn   │            ││
│ ├─┼──────┼──────────────┼─────────────┼─────────┼────────────┤│
│ │☐│VNPOST│Bưu điện VN   │1900-aaaa    │❌ Ngưng │[Chi tiết]  ││
│ │ │      │              │vnpost.vn    │         │[Sửa]       ││
│ │ │      │              │             │⭐ 3.8/5 │[Kích hoạt] ││
│ │ │      │              │             │12 đơn   │            ││
│ └─┴──────┴──────────────┴─────────────┴─────────┴────────────┘│
│                                                                 │
│ [☐ Chọn tất cả]  Với ĐV được chọn: [Kích hoạt] [Ngưng] [Xóa]  │
│                                                                 │
│ ◄ 1 ►                                              [Trang 1/1] │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3. Các trường hiển thị

| Cột | Dữ liệu | Ghi chú |
|-----|---------|---------|
| Mã ĐV | `code` | Mã viết tắt (GHN, GHTK...) |
| Tên đơn vị | `name` | Tên đầy đủ |
| Liên hệ | `phone`<br>`website` | SĐT hotline & website |
| Hiệu suất | `isActive`<br>Rating<br>Số đơn | Badge + stats |
| Thao tác | Chi tiết, Sửa, Báo giá | Quick actions |

### 2.4. Chức năng tìm kiếm

Tìm kiếm theo:
- Mã đơn vị (`code`)
- Tên đơn vị (`name`)
- Số điện thoại (`phone`)
- Website (`website`)

---

## 3. Màn hình chi tiết đơn vị vận chuyển

### 3.1. Layout chính
- 
+ Chỉ load và hiển thị thông tin (read-only)
  + Không cho phép chỉnh sửa trực tiếp
  + Các nút hành động: [Sửa thông tin], [Sửa bảng giá] → chuyển sang Edit mode
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Quay lại DS    CHI TIẾT: GHN - GIAO HÀNG NHANH               │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Thông tin đơn vị ──────────────────────────────────────────┐│
│ │ Mã:             GHN                                         ││
│ │ Tên:            Giao Hàng Nhanh                             ││
│ │ Trạng thái:     ✅ Active  [Ngưng hợp tác]                  ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ ┌─ TABS ──────────────────────────────────────────────────────┐│
│ │ [📋 Thông tin] [💰 Bảng giá] [📦 Đơn hàng] [📊 Thống kê] ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ TAB: THÔNG TIN                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ THÔNG TIN CƠ BẢN                                            ││
│ │                                                             ││
│ │ Mã đơn vị:       GHN                                        ││
│ │ Tên đầy đủ:      Công ty TNHH Giao Hàng Nhanh              ││
│ │ Hotline:         1900-xxxx                                  ││
│ │ Website:         https://ghn.vn                             ││
│ │ Trạng thái:      ✅ Đang hợp tác                            ││
│ │                                                             ││
│ │ [Sửa thông tin]                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ DỊCH VỤ CUNG CẤP                                            ││
│ │                                                             ││
│ │ ✅ Giao hàng tiêu chuẩn (Standard)                          ││
│ │ ✅ Giao hàng nhanh (Express)                                ││
│ │ ✅ Giao trong ngày (Same Day)                               ││
│ │ ❌ Hẹn lịch giao (Scheduled)                                ││
│ │                                                             ││
│ │ Phương tiện:                                                ││
│ │ ✅ Xe máy  ✅ Xe van  ✅ Xe tải  ❌ Máy bay                ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ GHI CHÚ                                                     ││
│ │                                                             ││
│ │ - Đối tác tin cậy từ năm 2020                               ││
│ │ - Hỗ trợ COD, hoàn tiền nhanh                               ││
│ │ - API tích hợp tốt                                          ││
│ │ - Giá cạnh tranh cho đơn hàng nội thành                     ││
│ │                                                             ││
│ │ [Sửa ghi chú]                                               ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. TAB: BẢNG GIÁ

┌─────────────────────────────────────────────────────────────────┐
│ TAB: BẢNG GIÁ                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ BẢNG GIÁ THEO KHOẢNG CÁCH                                   ││
│ │    Bộ lọc │
| │ Phương tiện: [Tất cả ▼] Xe máy / Xe van / Xe tải │         ││
│ │ ┌───────────────┬──────────────┬──────────────┬──────────┐ ││
│ │ │ Khoảng cách   │ Tiêu chuẩn   │ Nhanh        │ Trong ngày││
│ │ ├───────────────┼──────────────┼──────────────┼──────────┤ ││
│ │ │ 0-3 km        │ 15,000đ      │ 25,000đ      │ 35,000đ  │ ││
│ │ │ 3-5 km        │ 20,000đ      │ 30,000đ      │ 45,000đ  │ ││
│ │ │ 5-10 km       │ 25,000đ      │ 40,000đ      │ 60,000đ  │ ││
│ │ │ 10-20 km      │ 35,000đ      │ 55,000đ      │ 85,000đ  │ ││
│ │ │ 20-30 km      │ 45,000đ      │ 70,000đ      │    -     │ ││
│ │ │ > 30 km       │ Liên hệ      │ Liên hệ      │    -     │ ││
│ │ └───────────────┴──────────────┴──────────────┴──────────┘ ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ PHỤ PHÍ                                                     ││
│ │                                                             ││
│ │ - Giao ngoài giờ (18h-22h):      +10,000đ                  ││
│ │ - Giao cuối tuần:                 +15,000đ                  ││
│ │ - Hàng cồng kềnh (>50kg):         +50,000đ                  ││
│ │ - Thu hộ COD:                     1% (min 5,000đ)           ││
│ │                                                             ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ CHÍNH SÁCH GIẢM GIÁ                                         ││
│ │                                                             ││
│ │ - Từ 50 đơn/tháng:    Giảm 5%                               ││
│ │ - Từ 100 đơn/tháng:   Giảm 10%                              ││
│ │ - Từ 200 đơn/tháng:   Giảm 15%                              ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.3. TAB: ĐƠN HÀNG

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: ĐƠN HÀNG SỬ DỤNG ĐƠN VỊ NÀY                               │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Bộ lọc: Từ [📅 01/04/2026] - Đến [📅 09/04/2026]  [Lọc]   ││
│ │ Trạng thái: [Tất cả ▼]                                      ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌───┬──────────┬────────────┬─────────┬──────────┬──────────┐│
│ │STT│Mã đơn    │Ngày giao   │Chi phí  │Trạng thái│Mã vận đơn││
│ ├───┼──────────┼────────────┼─────────┼──────────┼──────────┤│
│ │ 1 │ORD-0001  │09/04 14:00 │35,000đ  │Đang giao │GHN12345  ││
│ ├───┼──────────┼────────────┼─────────┼──────────┼──────────┤│
│ │ 2 │ORD-0005  │09/04 10:30 │25,000đ  │Đã giao   │GHN12346  ││
│ ├───┼──────────┼────────────┼─────────┼──────────┼──────────┤│
│ │ 3 │ORD-0008  │08/04 15:20 │40,000đ  │Đã giao   │GHN12347  ││
│ └───┴──────────┴────────────┴─────────┴──────────┴──────────┘│
│                                                                 │
│ Tổng đơn (tháng này): 142 | Tổng chi phí: 4,850,000đ          │
│ ◄ 1 2 3 4 5 ►                                      [Trang 1/5] │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4. TAB: THỐNG KÊ

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: THỐNG KÊ HIỆU SUẤT                                         │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ TỔNG QUAN SỬ DỤNG                                           ││
│ │                                                             ││
│ │ ┌──────────────┬──────────────┬──────────────┐             ││
│ │ │ Tháng này    │ Quý này      │ Năm nay      │             ││
│ │ │  142 đơn     │  385 đơn     │  1,247 đơn   │             ││
│ │ │ 4.85M        │  13.2M       │   42.5M      │             ││
│ │ └──────────────┴──────────────┴──────────────┘             ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ HIỆU SUẤT GIAO HÀNG                                         ││
│ │                                                             ││
│ │ ┌──────────────┬──────────────┬──────────────┐             ││
│ │ │ Tỷ lệ giao   │ Thời gian TB │ Đánh giá TB  │             ││
│ │ │ thành công   │ giao hàng    │              │             ││
│ │ │   96.5%      │   1.8 ngày   │  ⭐ 4.5/5    │             ││
│ │ └──────────────┴──────────────┴──────────────┘             ││
│ │                                                             ││
│ │ ┌──────────────┬──────────────┬──────────────┐             ││
│ │ │ Giao đúng hạn│ Hoàn hàng    │ Thất lạc     │             ││
│ │ │   94.2%      │   2.8%       │   0.5%       │             ││
│ │ └──────────────┴──────────────┴──────────────┘             ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ CHI PHÍ TRUNG BÌNH                                          ││
│ │                                                             ││
│ │ Mỗi đơn:         34,150đ                                    ││
│ │ Mỗi km:          2,450đ                                     ││
│ │                                                             ││
│ │ [Xem biểu đồ chi tiết]                                      ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ SO SÁNH VỚI CÁC ĐƠN VỊ KHÁC                                ││
│ │                                                             ││
│ │ 1. GHN      - 4.5/5 ⭐ | 142 đơn | 34,150đ/đơn             ││
│ │ 2. GHTK    - 4.3/5 ⭐ |  98 đơn | 31,200đ/đơn             ││
│ │ 3. VTP     - 4.7/5 ⭐ |  85 đơn | 38,500đ/đơn             ││
│ │ 4. GRAB    - 4.6/5 ⭐ |  67 đơn | 42,300đ/đơn             ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Màn hình tạo/chỉnh sửa đơn vị vận chuyển
  + Load toàn bộ thông tin hiện tại
  + Cho phép chỉnh sửa các field
  + Có nút [Lưu] và [Hủy]
  + Sau khi lưu → quay về View mode
```
Tab thông tin cơ bản
┌─────────────────────────────────────────────────────────────────┐
│ THÊM ĐƠN VỊ VẬN CHUYỂN MỚI                                     │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Thông tin cơ bản ──────────────────────────────────────────┐│
│ │                                                             ││
│ │ Mã đơn vị: *       [________]  (VD: GHN, GHTK, VTP)         ││
│ │                                                             ││
│ │ Tên đơn vị: *      [________________________________]       ││
│ │                    VD: Giao Hàng Nhanh                      ││
│ │                                                             ││
│ │ Số điện thoại:     [________________________________]       ││
│ │                    VD: 1900-xxxx                            ││
│ │                                                             ││
│ │ Website:           [________________________________]       ││
│ │                    VD: https://ghn.vn                       ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌─ Dịch vụ cung cấp ──────────────────────────────────────────┐│
│ │                                                             ││
│ │ Loại dịch vụ:                                               ││
│ │ ☑ Tiêu chuẩn (Standard)                                     ││
│ │ ☑ Nhanh (Express)                                           ││
│ │ ☐ Trong ngày (Same Day)                                     ││
│ │ ☐ Hẹn lịch (Scheduled)                                      ││
│ │                                                             ││
│ │ Phương tiện hỗ trợ:                                         ││
│ │ ☑ Xe máy  ☑ Xe van  ☐ Xe tải  ☐ Máy bay                  ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌─ Ghi chú ───────────────────────────────────────────────────┐│
│ │                                                             ││
│ │ [__________________________________________________]        ││
│ │ [__________________________________________________]        ││
│ │ [__________________________________________________]        ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌─ Trạng thái ────────────────────────────────────────────────┐│
│ │                                                             ││
│ │ ☑ Đang hợp tác                                              ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                    [Hủy]  [Lưu đơn vị]         │
└─────────────────────────────────────────────────────────────────┘
```

Tab bảng giá
- Bảng giá được cấu hình theo khoảng cách (distance range)
- Các cột trong bảng giá sẽ được load động dựa trên:
  + Dịch vụ đã chọn trong TAB: Thông tin
  + Loại phương tiện đã chọn
- Cụ thể:
  + Chọn dịch vụ nào → hiển thị cột tương ứng
  + Chọn phương tiện nào → bảng giá áp dụng theo phương tiện đó
  + 
### Nguyên tắc hiển thị

- Khi vào TAB Bảng giá:
  + Load danh sách dịch vụ đã chọn
  + Load danh sách phương tiện đã chọn
- Bảng giá:
  + Cột = loại dịch vụ
  + Có thể filter theo phương tiện
### Rule

- Không có dịch vụ → không hiển thị cột
- Không có phương tiện → không cho cấu hình bảng giá
- Các khoảng cách không được overlap
```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: BẢNG GIÁ                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ BẢNG GIÁ THEO KHOẢNG CÁCH                                   ││
│ │    Bộ lọc │
| │ Phương tiện: [Tất cả ▼] Xe máy / Xe van / Xe tải │                     ││
  │ │ ┌───────────────┬──────────────┬────────────┬──────────────────────    ││
│ │ │ Khoảng cách   │ Tiêu chuẩn   │ Nhanh        │ Trong ngày|  thao tác││
│ │ ├───────────────┼──────────────┼──────────────┼──────────┤───────────││
│ │ │ 0-3 km        │ 15,000đ      │ 25,000đ      │ 35,000đ  │icon delete││
│ │ │ 3-5 km        │ 20,000đ      │ 30,000đ      │ 45,000đ  │icon delete││
│ │ │ 5-10 km       │ 25,000đ      │ 40,000đ      │ 60,000đ  │           ││
│ │ │ 10-20 km      │ 35,000đ      │ 55,000đ      │ 85,000đ  │           ││
│ │ │ 20-30 km      │ 45,000đ      │ 70,000đ      │    0     │           ││
│ │ │ > 30 km       │  70,000đ     │  70,000đ     │    0     │           ││
│ │ └───────────────┴──────────────┴──────────────┴──────────┘───────────││
│ │  [button Thêm khoảng giá] [button lưu giá]     │
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ PHỤ PHÍ                                                     ││
│ │                                                             ││
│ │ - Giao ngoài giờ (18h-22h):       [__10,000___] đ          ││
│ │ - Giao cuối tuần:                 [__10,000___] đ          ││
│ │ - Hàng cồng kềnh (>50kg):          [__10,000đ___] đ        ││
│ │ - Thu hộ COD:                    [__ 1% (min 5,000đ)  ___]  ││
│ │                                                             ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ CHÍNH SÁCH GIẢM GIÁ                                         ││
│ │                                                             ││
│ │ - Từ 50 đơn/tháng:     [_________Giảm 5%____________]       ││
│ │ - Từ 100 đơn/tháng:    [_________Giảm 10% ____________]     ││
│ │ - Từ 200 đơn/tháng:    [__________Giảm 15% ___________]     ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
 [button Thêm khoảng giá]  : click vào button thêm khoảng giá sẽ tạo thêm 1 dòng. Input cần ràng buộc
phải nhập số. nhập gì cung
[button lưu giá: lưu thông tin gia theo loai phương tiện
---

## 6. Tính năng bổ sung

### 6.1. Tích hợp API
- Tích hợp API của các đơn vị vận chuyển
- Tracking tự động
- Đồng bộ trạng thái đơn hàng
- Tạo vận đơn tự động

### 6.2. So sánh giá
- So sánh giá giữa các đơn vị
- Gợi ý đơn vị tối ưu cho từng đơn hàng
- Tính chi phí dự kiến

### 6.3. Đánh giá & Review
- Hệ thống đánh giá sao
- Comment từ admin/khách hàng
- Theo dõi khiếu nại

### 6.4. Báo cáo
- Báo cáo hiệu suất giao hàng
- So sánh chi phí theo thời gian
- Phân tích tỷ lệ thành công

### 6.5. Export/Import
- Export danh sách đơn vị
- Export bảng giá
- Import bảng giá hàng loạt

---

## 7. Quy tắc nghiệp vụ

### 7.1. Validation

- Mã đơn vị phải unique
- Tên đơn vị không được trống
- Website phải đúng format URL (nếu có)
- SĐT phải đúng format (nếu có)

### 7.2. Khi xóa đơn vị

- Soft delete (đánh dấu `isActive = false`)
- Không xóa nếu có đơn hàng đang vận chuyển
- Dữ liệu lịch sử vẫn giữ nguyên

### 7.3. Chọn đơn vị tự động

- Hệ thống có thể gợi ý đơn vị dựa trên:
  - Khoảng cách
  - Giá thành
  - Tỷ lệ thành công
  - Rating
  - Thời gian giao

---

## 8. API Endpoints (tham khảo)

```
GET    /api/admin/shipping-providers              # Danh sách
GET    /api/admin/shipping-providers/:id          # Chi tiết
POST   /api/admin/shipping-providers              # Tạo mới
PUT    /api/admin/shipping-providers/:id          # Cập nhật
DELETE /api/admin/shipping-providers/:id          # Xóa (soft)
POST   /api/admin/shipping-providers/:id/activate # Kích hoạt
POST   /api/admin/shipping-providers/:id/deactivate # Ngưng

# Bảng giá
GET    /api/admin/shipping-providers/:id/pricing  # Bảng giá
POST   /api/admin/shipping-providers/:id/pricing  # Thêm giá
PUT    /api/admin/shipping-providers/:id/pricing/:priceId # Sửa
DELETE /api/admin/shipping-providers/:id/pricing/:priceId # Xóa

# Thống kê
GET    /api/admin/shipping-providers/:id/stats           # Thống kê
GET    /api/admin/shipping-providers/:id/shipments       # Đơn hàng
GET    /api/admin/shipping-providers/:id/performance     # Hiệu suất

# Tính toán
POST   /api/admin/shipping-providers/calculate-fee      # Tính phí
POST   /api/admin/shipping-providers/suggest-best       # Gợi ý tốt nhất
POST   /api/admin/shipping-providers/compare            # So sánh

# Tích hợp API
POST   /api/admin/shipping-providers/:id/create-order   # Tạo vận đơn
GET    /api/admin/shipping-providers/:id/track/:code    # Tracking
```

---

## 9. Responsive Design

### 9.1. Mobile (< 768px)
- Bảng → Card layout
- Bộ lọc collapse
- Biểu đồ responsive

### 9.2. Tablet (768px - 1024px)
- Giảm số cột
- Layout 1 column

---

## 10. Kết luận

Thiết kế quản lý Shipping Providers:
- ✅ Quản lý đầy đủ thông tin đơn vị vận chuyển
- ✅ Bảng giá linh hoạt theo khoảng cách
- ✅ Thống kê hiệu suất chi tiết
- ✅ So sánh giữa các đơn vị
- ✅ Tích hợp API tracking
- ✅ Gợi ý đơn vị tối ưu
- ✅ Báo cáo chi phí logistics
