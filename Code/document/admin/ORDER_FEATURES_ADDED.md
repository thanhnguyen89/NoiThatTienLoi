# CÁC TÍNH NĂNG MỚI ĐÃ BỔ SUNG CHO HỆ THỐNG QUẢN LÝ ĐƠN HÀNG

## 📋 TỔNG QUAN

Tài liệu này mô tả các tính năng mới đã được bổ sung vào hệ thống quản lý đơn hàng để đạt 100% theo thiết kế UI.

---

## ✅ CÁC TÍNH NĂNG ĐÃ BỔ SUNG

### 1. **OrderStatusValidator** - Validation Flow Trạng Thái

**File:** `src/admin/features/order/OrderStatusValidator.ts`

**Chức năng:**
- Định nghĩa các quy tắc chuyển trạng thái hợp lệ
- Ngăn chặn chuyển trạng thái không hợp lệ (VD: từ `completed` → `pending`)
- Cung cấp thông báo cảnh báo khi chuyển sang trạng thái quan trọng

**Quy tắc chuyển trạng thái:**
```
pending      → confirmed, cancelled
confirmed    → processing, cancelled
processing   → shipping, cancelled
shipping     → delivered, returned
delivered    → completed, returned
completed    → (không thể chuyển nữa)
cancelled    → (không thể chuyển nữa)
returned     → completed
```

**Sử dụng:**
```typescript
import { canTransitionStatus, validateStatusTransition } from './OrderStatusValidator';

// Kiểm tra có thể chuyển không
const canChange = canTransitionStatus('pending', 'confirmed'); // true
const cannotChange = canTransitionStatus('completed', 'pending'); // false

// Validate và lấy thông báo lỗi
const validation = validateStatusTransition('pending', 'completed');
if (!validation.valid) {
  alert(validation.error);
}
```

---

### 2. **OrderStatusModal** - Modal Thay Đổi Trạng Thái Nhanh

**File:** `src/admin/features/order/OrderStatusModal.tsx`

**Chức năng:**
- Modal popup để thay đổi trạng thái đơn hàng
- Chỉ hiển thị các trạng thái hợp lệ có thể chuyển đến
- Checkbox gửi email/SMS thông báo cho khách hàng
- Nhập ghi chú khi thay đổi trạng thái

**Tích hợp:**
- Đã tích hợp vào `OrderDetailClient`
- Hiển thị qua nút "Đổi trạng thái" ở header

**Screenshot Flow:**
1. Người dùng click "Đổi trạng thái"
2. Modal hiện ra với dropdown chỉ chứa trạng thái hợp lệ
3. Chọn trạng thái mới, nhập ghi chú
4. Tích chọn gửi email/SMS (nếu muốn)
5. Click "Xác nhận thay đổi"

**Lưu ý:**
- Nếu trạng thái là final (completed/cancelled), nút "Đổi trạng thái" sẽ bị disabled
- Có cảnh báo đặc biệt khi chuyển sang trạng thái: cancelled, returned, completed

---

### 3. **OrderExportButton** - Xuất Excel

**File:** `src/admin/features/order/OrderExportButton.tsx`
**API:** `src/app/admin/api/orders/export/route.ts`

**Chức năng:**
- Xuất danh sách đơn hàng ra file Excel (.xlsx)
- Tự động áp dụng các bộ lọc hiện tại (search, status, date range, etc.)
- File Excel chứa đầy đủ thông tin: mã đơn, khách hàng, giá trị, trạng thái, địa chỉ, ghi chú

**Tích hợp:**
- Đã thêm vào `OrdersPage` (góc phải trên, cạnh nút "Tạo đơn mới")

**Sử dụng:**
```tsx
<OrderExportButton
  filters={{
    search: 'keyword',
    status: 'pending',
    dateFrom: '2026-01-01',
    dateTo: '2026-01-31',
    // ... các filter khác
  }}
/>
```

**Package cần cài:**
```bash
npm install xlsx
```

**Cấu trúc file Excel xuất ra:**
| STT | Mã đơn | Ngày đặt | Khách hàng | SĐT | Email | Loại khách | Tổng tiền | Đã cọc | Còn lại | Trạng thái đơn | Trạng thái TT | Địa chỉ | Ghi chú khách | Ghi chú nội bộ |

---

### 4. **MemberSearchModal** - Tìm Kiếm Thành Viên

**File:** `src/admin/features/order/MemberSearchModal.tsx`

**Chức năng:**
- Modal popup tìm kiếm thành viên theo tên, SĐT, email
- Hiển thị danh sách kết quả với thông tin đầy đủ
- Click chọn để auto-fill thông tin khách hàng vào form

**Sử dụng trong OrderForm:**
```tsx
const [showMemberSearch, setShowMemberSearch] = useState(false);

function handleSelectMember(member: Member) {
  setCustomerName(member.fullName);
  setCustomerPhone(member.phoneNumber || '');
  setCustomerEmail(member.email || '');
  setSelectedMemberId(member.id);
}

// Trong JSX
{showMemberSearch && (
  <MemberSearchModal
    onSelect={handleSelectMember}
    onClose={() => setShowMemberSearch(false)}
  />
)}
```

---

### 5. **ProductVariantSelector** - Chọn Biến Thể Sản Phẩm

**File:** `src/admin/features/order/ProductVariantSelector.tsx`

**Chức năng:**
- Component hiển thị sản phẩm với dropdown chọn biến thể (size/color)
- Hiển thị giá, tồn kho theo biến thể được chọn
- Nhập số lượng và thêm vào giỏ hàng
- Validation: không cho thêm quá tồn kho, bắt buộc chọn biến thể (nếu có)

**Sử dụng:**
```tsx
<ProductVariantSelector
  product={{
    id: 'prod-1',
    name: 'Ghế sofa',
    sku: 'SF-001',
    salePrice: 5000000,
    variants: [
      {
        id: 'var-1',
        variantName: 'Màu đỏ - Size L',
        sku: 'SF-001-RED-L',
        salePrice: 5200000,
        stockQty: 10,
        sizeLabel: 'L',
        colorName: 'Đỏ',
      },
    ],
  }}
  onAddToCart={(item) => {
    setCartItems([...cartItems, item]);
  }}
/>
```

---

### 6. **OrderFilters** - Bộ Lọc Nâng Cao

**File:** `src/admin/features/order/OrderFilters.tsx` (đã cập nhật)

**Tính năng mới:**
- ✅ Lọc theo **Kho xuất hàng** (warehouse)
- ✅ Lọc theo **Đơn vị vận chuyển** (shipping provider)

**Props mới:**
```typescript
interface Props {
  // ... các props cũ
  defaultWarehouse?: string;
  defaultShippingProvider?: string;
  warehouses?: Array<{ id: string; name: string }>;
  shippingProviders?: Array<{ id: string; name: string }>;
}
```

**Sử dụng trong OrdersPage:**
```tsx
<OrderFilters
  // ... các props khác
  defaultWarehouse={sp.warehouse || ''}
  defaultShippingProvider={sp.shippingProvider || ''}
  warehouses={warehouseList}
  shippingProviders={providerList}
/>
```

---

## 📝 CÁC TÍNH NĂNG CHƯA CODE (CẦN BỔ SUNG THÊM)

### 1. **Chức năng EDIT đơn hàng**
- **Trạng thái:** Đã chuẩn bị cấu trúc nhưng chưa hoàn thiện
- **Cần làm:**
  - Load dữ liệu đơn hàng khi có `orderId`
  - Pre-fill form với dữ liệu hiện tại
  - Update API thay vì Create khi submit

### 2. **Áp mã giảm giá (Coupon/Voucher)**
- **Cần tạo:**
  - Component `CouponSelector`
  - API `/admin/api/coupons/validate`
  - Logic tính giảm giá vào `grandTotalAmount`

### 3. **In hóa đơn / Phiếu giao hàng**
- **Cần tạo:**
  - Template HTML cho hóa đơn
  - API `/admin/api/orders/[id]/print`
  - Component `PrintButton` với print dialog

### 4. **Gửi Email / SMS Thông Báo**
- **Hiện tại:** Chỉ có checkbox trong Modal, chưa có logic thật
- **Cần tích hợp:**
  - Email service (Nodemailer, SendGrid, etc.)
  - SMS service (Twilio, VNPT, etc.)
  - Template email/SMS

### 5. **Tích hợp API vận chuyển**
- **Đơn vị:** GHN, GHTK, Viettel Post
- **Cần làm:**
  - Tích hợp API tạo đơn vận chuyển
  - Tracking real-time
  - Tính phí ship tự động

### 6. **Dashboard báo cáo chi tiết**
- **Cần tạo:**
  - Biểu đồ doanh thu theo thời gian
  - Báo cáo hiệu suất vận chuyển
  - Phân tích chi phí logistics
  - Top sản phẩm bán chạy

---

## 🔧 HƯỚNG DẪN SỬ DỤNG CÁC TÍNH NĂNG MỚI

### A. Sử dụng Modal Thay Đổi Trạng Thái

1. Vào trang chi tiết đơn hàng
2. Click nút **"Đổi trạng thái"** ở góc phải trên
3. Chọn trạng thái mới từ dropdown
4. Nhập ghi chú (tùy chọn)
5. Tích "Gửi email" hoặc "Gửi SMS" nếu muốn thông báo khách
6. Click **"Xác nhận thay đổi"**

### B. Xuất Excel Danh Sách Đơn Hàng

1. Vào trang danh sách đơn hàng
2. Áp dụng các bộ lọc mong muốn (trạng thái, ngày tháng, etc.)
3. Click nút **"Xuất Excel"** ở góc phải trên
4. File sẽ tự động tải về với tên `orders_YYYY-MM-DD.xlsx`

### C. Tìm Kiếm Và Chọn Member Khi Tạo Đơn

1. Vào trang tạo đơn mới
2. Ở bước 1 (Thông tin khách hàng), chọn **"Thành viên"**
3. Click nút **"Tìm kiếm thành viên"** (cần thêm vào UI)
4. Nhập tên/SĐT/email → Click "Tìm kiếm"
5. Click "Chọn" ở thành viên muốn chọn
6. Thông tin sẽ tự động điền vào form

### D. Chọn Biến Thể Sản Phẩm

1. Vào bước 2 (Sản phẩm) trong form tạo đơn
2. Tìm sản phẩm có biến thể
3. Dropdown **"Chọn biến thể"** sẽ hiện ra
4. Chọn size/color phù hợp
5. Giá và tồn kho sẽ tự động cập nhật
6. Nhập số lượng → Click "Thêm vào đơn"

---

## 🎨 CẢI TIẾN UI/UX

### Màu sắc Badge Trạng Thái

| Trạng thái | Màu | Class CSS |
|-----------|-----|-----------|
| pending | Vàng | bg-warning |
| confirmed | Xanh dương | bg-primary |
| processing | Xanh nhạt | bg-info |
| shipping | Tím | bg-purple |
| delivered | Xanh lá | bg-success |
| completed | Xanh đậm | bg-success |
| cancelled | Đỏ | bg-danger |
| returned | Cam | bg-orange |

### Icons Mới

- 🔄 `bi-arrow-repeat`: Đổi trạng thái
- 📊 `bi-file-earmark-excel`: Xuất Excel
- 🔍 `bi-search`: Tìm kiếm Member
- ✅ `bi-check2`: Xác nhận
- 📧 `bi-envelope`: Email
- 📱 `bi-phone`: SMS
- 👤 `bi-person-badge`: Xem hồ sơ Member

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. **Validation Trạng Thái**
- Hệ thống sẽ **TỰ ĐỘNG NGĂN** các chuyển đổi trạng thái không hợp lệ
- Admin không thể chuyển từ trạng thái cuối (completed/cancelled) sang trạng thái khác
- Có cảnh báo đặc biệt khi hủy đơn hoặc đánh dấu trả hàng

### 2. **Excel Export**
- Maximum 10,000 đơn hàng mỗi lần xuất
- File Excel có thể mở bằng Microsoft Excel, LibreOffice, Google Sheets
- Định dạng: `.xlsx` (OpenXML)

### 3. **Member Search**
- Cần có API `/admin/api/members` trả về danh sách thành viên
- Minimum 2 ký tự để tìm kiếm
- Maximum 20 kết quả mỗi lần tìm

### 4. **Product Variants**
- Nếu sản phẩm có biến thể, **BẮT BUỘC** phải chọn biến thể mới thêm được vào giỏ
- Không cho phép thêm số lượng > tồn kho

---

## 📦 DEPENDENCIES MỚI

Các package đã thêm vào `package.json`:

```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

**Cài đặt:**
```bash
npm install xlsx
```

---

## 🚀 ROADMAP TIẾP THEO

### Ưu tiên CAO (1-2 tuần)
1. ✅ Hoàn thiện chức năng EDIT đơn hàng
2. ✅ Thêm link "Xem hồ sơ Member" trong OrderDetail
3. ✅ Tích hợp áp mã giảm giá
4. ✅ In hóa đơn cơ bản (PDF)

### Ưu tiên TRUNG (2-4 tuần)
5. Email/SMS notification thật sự
6. Tích hợp 1 đơn vị vận chuyển (GHN hoặc GHTK)
7. Dashboard báo cáo cơ bản

### Ưu tiên THẤP (> 1 tháng)
8. Tích hợp đầy đủ nhiều đơn vị VC
9. Báo cáo phân tích sâu
10. Phân quyền chi tiết theo role

---

## 📞 HỖ TRỢ

Nếu có vấn đề khi sử dụng các tính năng mới:

1. Kiểm tra console log (F12) để xem lỗi
2. Đảm bảo đã cài đặt đầy đủ dependencies
3. Kiểm tra API endpoints đã hoạt động chưa
4. Liên hệ team dev để được hỗ trợ

---

**Cập nhật lần cuối:** 14/04/2026
**Phiên bản:** 1.0
**Tác giả:** Development Team
