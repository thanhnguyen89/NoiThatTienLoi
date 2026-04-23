# Thiết kế màn hình quản lý Warehouses (Kho) - Admin Panel

## 1. Tổng quan

Hệ thống quản lý kho bao gồm:
- **Danh sách kho** (Warehouses List)
- **Chi tiết kho** (Warehouse Detail)
- **Tạo/Chỉnh sửa kho** (Warehouse Form)

---

## 2. Màn hình danh sách kho (Warehouses List)

### 2.1. Mục đích
- Hiển thị tất cả kho trong hệ thống
- Quản lý thông tin kho
- Theo dõi trạng thái hoạt động

### 2.2. Layout chính

```
┌─────────────────────────────────────────────────────────────────┐
│ QUẢN LÝ KHO HÀNG                                   [+ Thêm kho] │
├─────────────────────────────────────────────────────────────────┤
│ Bộ lọc & Tìm kiếm                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Tìm kiếm: Mã kho, tên, địa chỉ...         ] [🔍 Tìm]      │ │
│ │                                                             │ │
│ │ Trạng thái:     [Tất cả ▼] Active/Inactive                 │ │
│ │ Khu vực:        [Tất cả ▼] Miền Bắc/Trung/Nam              │ │
│ │ Tỉnh/TP:        [Tất cả ▼]                                 │ │
│ │                                                             │ │
│ │ [🔄 Làm mới]  [Xuất Excel]  [Áp dụng bộ lọc]              │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Thống kê nhanh                                                  │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│ │ Tổng kho │ Hoạt động│ Tạm đóng │ Miền Bắc │ Miền Nam     │  │
│ │    15    │    12    │     3    │     6    │      7       │  │
│ └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Danh sách kho                                   Hiển thị 10/15  │
│ ┌─┬──────┬─────────────┬──────────────────┬─────────┬────────┐│
│ │☐│Mã kho│Tên kho      │Địa chỉ           │Trạng    │Thao    ││
│ │ │      │             │                  │thái     │tác     ││
│ ├─┼──────┼─────────────┼──────────────────┼─────────┼────────┤│
│ │☐│WH-01 │Kho TT Q9    │123 Đường ABC     │✅ Active│[Chi    ││
│ │ │      │             │Quận 9, TPHCM     │         │tiết]   ││
│ │ │      │Người QL:    │SĐT: 0901234567   │15 đơn   │[Sửa]   ││
│ │ │      │Nguyễn Văn A │                  │xuất     │        ││
│ ├─┼──────┼─────────────┼──────────────────┼─────────┼────────┤│
│ │☐│WH-02 │Kho Bình Thạnh│456 Đường XYZ    │✅ Active│[Chi    ││
│ │ │      │             │Bình Thạnh, TPHCM │         │tiết]   ││
│ │ │      │Người QL:    │SĐT: 0987654321   │8 đơn    │[Sửa]   ││
│ │ │      │Trần Thị B   │                  │xuất     │        ││
│ ├─┼──────┼─────────────┼──────────────────┼─────────┼────────┤│
│ │☐│WH-HN1│Kho Hà Nội   │789 Đường DEF     │❌ Đóng  │[Chi    ││
│ │ │      │             │Cầu Giấy, Hà Nội  │         │tiết]   ││
│ │ │      │Người QL:    │SĐT: 0912345678   │0 đơn    │[Sửa]   ││
│ │ │      │Lê Văn C     │                  │         │[Mở]    ││
│ └─┴──────┴─────────────┴──────────────────┴─────────┴────────┘│
│                                                                 │
│ [☐ Chọn tất cả]  Với kho được chọn: [Kích hoạt] [Đóng] [Xóa]  │
│                                                                 │
│ ◄ 1 2 ►                                            [Trang 1/2] │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3. Các trường hiển thị

| Cột | Dữ liệu | Ghi chú |
|-----|---------|---------|
| Mã kho | `code` | Mã định danh kho |
| Tên kho | `name`<br>`contactName` | Tên và người quản lý |
| Địa chỉ | `fullAddress`<br>`contactPhone` | Địa chỉ đầy đủ và SĐT |
| Trạng thái | `isActive`<br>Số đơn xuất | Badge + thống kê |
| Thao tác | Chi tiết, Sửa, Đóng/Mở | Quick actions |

### 2.4. Chức năng tìm kiếm

Tìm kiếm theo:
- Mã kho (`code`)
- Tên kho (`name`)
- Địa chỉ (`fullAddress`, `provinceName`)
- Số điện thoại (`contactPhone`)

---

## 3. Màn hình chi tiết kho (Warehouse Detail)

### 3.1. Layout chính

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Quay lại DS         CHI TIẾT KHO: WH-01 - KHO TT Q9           │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Thông tin kho ─────────────────────────────────────────────┐│
│ │ Mã kho:          WH-01                                      ││
│ │ Tên kho:         Kho trung tâm Quận 9                       ││
│ │ Trạng thái:      ✅ Active  [Đóng kho]                      ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ ┌─ TABS ──────────────────────────────────────────────────────┐│
│ │ [📋 Thông tin] [📦 Đơn xuất] [📊 Thống kê] [📍 Bản đồ]   ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ TAB: THÔNG TIN                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ THÔNG TIN CƠ BẢN                                            ││
│ │                                                             ││
│ │ Mã kho:          WH-01                                      ││
│ │ Tên kho:         Kho trung tâm Quận 9                       ││
│ │ Người quản lý:   Nguyễn Văn A                               ││
│ │ SĐT liên hệ:     0901234567                                 ││
│ │ Trạng thái:      ✅ Đang hoạt động                          ││
│ │                                                             ││
│ │ [Sửa thông tin]                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ĐỊA CHỈ KHO                                                 ││
│ │                                                             ││
│ │ Tỉnh/TP:         TP. Hồ Chí Minh                            ││
│ │ Quận/Huyện:      Quận 9                                     ││
│ │ Phường/Xã:       Phường Phú Hữu                             ││
│ │ Địa chỉ:         123 Đường ABC, Khu công nghiệp XYZ         ││
│ │                                                             ││
│ │ Tọa độ GPS:      10.8231, 106.7569                          ││
│ │ 📍 [Xem trên bản đồ]                                        ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ THÔNG TIN BỔ SUNG                                           ││
│ │                                                             ││
│ │ Ngày tạo:        15/01/2025 10:00 AM                        ││
│ │ Cập nhật:        09/04/2026 14:30 PM                        ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. TAB: ĐƠN XUẤT

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: ĐƠN XUẤT TỪ KHO                                           │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Bộ lọc: Từ [📅 01/04/2026] - Đến [📅 09/04/2026]  [Lọc]   ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌───┬──────────┬────────────┬──────────────┬──────────┬──────┐│
│ │STT│Mã đơn    │Ngày xuất   │Địa chỉ giao  │Trạng thái│Thao  ││
│ │   │          │            │              │          │tác   ││
│ ├───┼──────────┼────────────┼──────────────┼──────────┼──────┤│
│ │ 1 │ORD-0001  │09/04 14:00 │Quận 1, TPHCM │Đang giao │[Xem] ││
│ ├───┼──────────┼────────────┼──────────────┼──────────┼──────┤│
│ │ 2 │ORD-0005  │09/04 10:30 │Quận 3, TPHCM │Đã giao   │[Xem] ││
│ ├───┼──────────┼────────────┼──────────────┼──────────┼──────┤│
│ │ 3 │ORD-0012  │08/04 15:20 │Bình Thạnh    │Đã giao   │[Xem] ││
│ └───┴──────────┴────────────┴──────────────┴──────────┴──────┘│
│                                                                 │
│ Tổng đơn xuất (tháng này): 45 đơn                              │
│ ◄ 1 2 3 ►                                          [Trang 1/3] │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3. TAB: THỐNG KÊ

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: THỐNG KÊ                                                   │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ THỐNG KÊ XUẤT KHO                                           ││
│ │                                                             ││
│ │ ┌──────────────┬──────────────┬──────────────┐             ││
│ │ │ Hôm nay      │ Tuần này     │ Tháng này    │             ││
│ │ │    5 đơn     │   28 đơn     │   45 đơn     │             ││
│ │ └──────────────┴──────────────┴──────────────┘             ││
│ │                                                             ││
│ │ ┌──────────────┬──────────────┬──────────────┐             ││
│ │ │ Trung bình   │ Tổng đơn     │ Khoảng cách  │             ││
│ │ │ /ngày: 3.2   │ tất cả: 523  │ TB: 12.5 km  │             ││
│ │ └──────────────┴──────────────┴──────────────┘             ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ BIỂU ĐỒ XUẤT KHO THEO THÁNG                                ││
│ │ [Biểu đồ cột]                                               ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ TOP KHU VỰC GIAO HÀNG                                       ││
│ │                                                             ││
│ │ 1. Quận 1       - 85 đơn  (16%)                             ││
│ │ 2. Quận 3       - 72 đơn  (14%)                             ││
│ │ 3. Bình Thạnh   - 65 đơn  (12%)                             ││
│ │ 4. Phú Nhuận    - 58 đơn  (11%)                             ││
│ │ 5. Quận 10      - 45 đơn  (9%)                              ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.4. TAB: BẢN ĐỒ

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: BẢN ĐỒ                                                     │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ │           [Google Maps / Leaflet Integration]               ││
│ │                                                             ││
│ │   📍 Vị trí kho: WH-01                                      ││
│ │      123 Đường ABC, Quận 9, TPHCM                           ││
│ │      Tọa độ: 10.8231, 106.7569                              ││
│ │                                                             ││
│ │   [Hiển thị bản đồ với marker tại vị trí kho]              ││
│ │                                                             ││
│ │   [+ Xem đơn hàng đang giao từ kho này trên bản đồ]        ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ [Lấy tọa độ hiện tại]  [Chỉnh sửa vị trí]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Màn hình tạo/chỉnh sửa kho

### 4.1. Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ THÊM KHO MỚI                                                    │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Thông tin cơ bản ──────────────────────────────────────────┐│
│ │                                                             ││
│ │ Mã kho: *          [________________]  (Tự động: WH-XXX)    ││
│ │                                                             ││
│ │ Tên kho: *         [________________________________]       ││
│ │                    VD: Kho trung tâm Quận 9                 ││
│ │                                                             ││
│ │ Người quản lý:     [________________________________]       ││
│ │                                                             ││
│ │ SĐT liên hệ:       [________________________________]       ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌─ Địa chỉ kho ───────────────────────────────────────────────┐│
│ │                                                             ││
│ │ Quốc gia:          [Việt Nam ▼]                            ││
│ │                                                             ││
│ │ Tỉnh/TP: *         [Chọn tỉnh/thành phố ▼]                 ││
│ │                                                             ││
│ │ Quận/Huyện: *      [Chọn quận/huyện ▼]                      ││
│ │                                                             ││
│ │ Phường/Xã: *       [Chọn phường/xã ▼]                       ││
│ │                                                             ││
│ │ Địa chỉ chi tiết:* [________________________________]       ││
│ │                    [________________________________]       ││
│ │                                                             ││
│ │ Địa chỉ đầy đủ:    [Tự động tạo từ các trường trên]        ││
│ │ (readonly)                                                  ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌─ Tọa độ GPS ────────────────────────────────────────────────┐│
│ │                                                             ││
│ │ Latitude:          [__________]  VD: 10.8231                ││
│ │ Longitude:         [__________]  VD: 106.7569               ││
│ │                                                             ││
│ │ [📍 Lấy tọa độ từ địa chỉ]  [🗺️ Chọn trên bản đồ]        ││
│ │                                                             ││
│ │ [Hiển thị preview bản đồ nếu có tọa độ]                     ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌─ Trạng thái ────────────────────────────────────────────────┐│
│ │                                                             ││
│ │ ☑ Kích hoạt kho                                             ││
│ │                                                             ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                    [Hủy]  [Lưu kho]            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Tính năng bổ sung

### 5.1. Tính khoảng cách
- Tính khoảng cách từ kho đến địa chỉ khách hàng
- Gợi ý kho gần nhất cho đơn hàng

### 5.2. Tối ưu logistics
- Phân tích kho nào phục vụ khu vực nào hiệu quả nhất
- Đề xuất mở kho mới tại khu vực có nhiều đơn

### 5.3. Export/Import
- Export danh sách kho ra Excel
- Import kho hàng loạt

### 5.4. Tích hợp bản đồ
- Google Maps / Leaflet
- Hiển thị vị trí kho
- Chọn vị trí kho trên bản đồ
- Tính khoảng cách tự động

### 5.5. Báo cáo
- Báo cáo hiệu suất xuất kho
- Thống kê theo thời gian
- Phân tích khu vực phục vụ

---

## 6. Quy tắc nghiệp vụ

### 6.1. Validation

- Mã kho phải unique
- Tên kho không được trống
- Địa chỉ phải đầy đủ (tỉnh, quận, phường)
- Tọa độ GPS (nếu có) phải đúng format

### 6.2. Khi xóa kho

- Soft delete (đánh dấu `isActive = false`)
- Không xóa nếu có đơn hàng đang xuất từ kho
- Có thể khôi phục

### 6.3. Quyền hạn

- **Super Admin**: Toàn quyền
- **Warehouse Manager**: Quản lý kho của mình
- **Admin**: Xem, tạo, sửa
- **Staff**: Chỉ xem

---

## 7. API Endpoints (tham khảo)

```
GET    /api/admin/warehouses              # Danh sách
GET    /api/admin/warehouses/:id          # Chi tiết
POST   /api/admin/warehouses              # Tạo mới
PUT    /api/admin/warehouses/:id          # Cập nhật
DELETE /api/admin/warehouses/:id          # Xóa (soft)
POST   /api/admin/warehouses/:id/activate # Kích hoạt
POST   /api/admin/warehouses/:id/deactivate # Đóng

# Thống kê
GET    /api/admin/warehouses/:id/stats           # Thống kê
GET    /api/admin/warehouses/:id/shipments       # Đơn xuất
GET    /api/admin/warehouses/:id/coverage-areas  # Khu vực phục vụ

# Tối ưu
POST   /api/admin/warehouses/nearest             # Tìm kho gần nhất
POST   /api/admin/warehouses/calculate-distance  # Tính khoảng cách
```

---

## 8. Responsive Design

### 8.1. Mobile (< 768px)
- Bảng → Card layout
- Bộ lọc collapse
- Bản đồ responsive

### 8.2. Tablet (768px - 1024px)
- Layout 1 column
- Bản đồ full width

---

## 9. Kết luận

Thiết kế quản lý Warehouses:
- ✅ Quản lý thông tin kho đầy đủ
- ✅ Tích hợp GPS và bản đồ
- ✅ Thống kê hiệu suất xuất kho
- ✅ Phân tích khu vực phục vụ
- ✅ Tối ưu logistics
- ✅ Tính khoảng cách tự động
