/**
 * TASK: Warehouse Management CRUD + Detail View
 * Module: Warehouse
 * Type: Feature
 * Status: Ready for implementation
 */

export const TASK_METADATA = {
  name: 'warehouse-management-crud',
  module: 'warehouse',
  type: 'feature',
  priority: 'high',
  estimatedDays: 2,
};

// ============================================================
// 🎯 MỤC TIÊU
// ============================================================

export const TASK_GOAL = `
Xây dựng module quản lý Kho hàng (Warehouse) cho admin panel:
- Danh sách kho với search + filter (trạng thái, khu vực)
- Thống kê nhanh (tổng kho, hoạt động, tạm đóng, theo miền)
- Chi tiết kho với 4 tabs: Thông tin / Đơn xuất / Thống kê / Bản đồ
- Form tạo mới / sửa kho (thông tin cơ bản + địa chỉ phân cấp + GPS)
- Toggle active/deactive kho
- Xóa mềm kho
- Không cần tính năng: tính khoảng cách, tối ưu logistics, export/import (sẽ làm sau)
`;

// ============================================================
// 🖥️ UI / SCREEN CONTEXT
// ============================================================

export const UI_CONTEXT = {
  screens: [
    '/admin/warehouses',                    // Danh sách
    '/admin/warehouses/new',                // Tạo mới
    '/admin/warehouses/[id]',               // Chi tiết (tab Thông tin)
    '/admin/warehouses/[id]/edit',          // Sửa
  ],
  uiDesignDoc: 'document/admin/warehouses_management_ui_design.md',
  description: `
Màn hình danh sách kho:
- Header: "QUẢN LÝ KHO HÀNG" + nút [+ Thêm kho]
- Thống kê nhanh: Tổng kho | Hoạt động | Tạm đóng | Miền Bắc | Miền Nam
- Bộ lọc: Tìm kiếm (mã, tên, địa chỉ, SĐT) + Trạng thái + Khu vực (miền)
- Bảng: Mã kho | Tên kho + Người QL | Địa chỉ + SĐT | Trạng thái + số đơn xuất | Actions
- Actions: Chi tiết, Sửa, Đóng/Mở
- Pagination

Màn hình chi tiết kho (4 tabs):
- Tab Thông tin: thông tin cơ bản + địa chỉ + tọa độ GPS
- Tab Đơn xuất: danh sách đơn hàng xuất từ kho này
- Tab Thống kê: thống kê xuất kho theo thời gian
- Tab Bản đồ: hiển thị vị trí kho (chỉ hiển thị, chưa tích hợp map thật)

Form tạo/sửa kho:
- Thông tin cơ bản: Mã kho (auto), Tên kho, Người quản lý, SĐT
- Địa chỉ: Quốc gia, Tỉnh/TP, Quận/Huyện, Phường/Xã (dùng chung province/district/ward data)
- Tọa độ GPS: Latitude, Longitude
- Trạng thái: checkbox Kích hoạt
`,
};

// ============================================================
// 📋 YÊU CẦU CHI TIẾT
// ============================================================

export const REQUIREMENTS = [
  'REQ-01: Trang danh sách kho',
  '  - Header "QUẢN LÝ KHO HÀNG" + nút [+ Thêm kho]',
  '  - Stats row: Tổng kho | Hoạt động | Tạm đóng (3 stat cards)',
  '  - Bộ lọc: search theo code, name, address, phone + status filter',
  '  - Bảng danh sách: code, name+contact, address+phone, status+shipment count, actions',
  '  - Actions: Chi tiết (link), Sửa (link)',
  '  - Toggle active/deactive từ danh sách hoặc chi tiết',
  '  - Pagination',
  '',
  'REQ-02: Trang chi tiết kho (4 tabs)',
  '  - Tab Thông tin: thông tin cơ bản (code, name, contact, phone, status), địa chỉ, GPS',
  '  - Tab Đơn xuất: danh sách OrderShipment xuất từ kho này (chỉ list, chưa cần xem chi tiết đơn)',
  '  - Tab Thống kê: thống kê xuất kho (tổng đơn, đơn hôm nay, tuần, tháng)',
  '  - Tab Bản đồ: hiển thị tọa độ GPS + text (chưa tích hợp map thật)',
  '  - Toggle active/deactive trên trang chi tiết',
  '',
  'REQ-03: Form tạo mới kho',
  '  - Mã kho: auto-generate (WH-001, WH-002...) nếu không nhập',
  '  - Tên kho: required, max 255',
  '  - Người quản lý: optional',
  '  - SĐT liên hệ: optional',
  '  - Địa chỉ: Quốc gia (default Việt Nam), Tỉnh/TP, Quận/Huyện, Phường/Xã (dùng location data có sẵn)',
  '  - Địa chỉ chi tiết: textarea',
  '  - Latitude/Longitude: optional (Decimal 10,7)',
  '  - isActive: checkbox, default true',
  '  - Submit → danh sách',
  '',
  'REQ-04: Form sửa kho',
  '  - Tải dữ liệu từ ID',
  '  - Cho phép update tất cả fields',
  '  - Submit → chi tiết hoặc danh sách',
  '',
  'REQ-05: Toggle active/deactive',
  '  - POST /admin/api/warehouses/:id/toggle-active',
  '  - Soft deactivate (isActive = false)',
  '  - Không xóa nếu có đơn hàng đang xuất (check shipments count > 0)',
  '',
  'REQ-06: Delete (soft)',
  '  - Không xóa vật lý, chỉ set isActive = false',
  '  - Hoặc có thể dùng toggle thay vì delete riêng',
];

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  'Mã kho (code) là optional nhưng phải unique nếu có',
  'Tên kho (name) bắt buộc, max 255 ký tự',
  'Địa chỉ: provinceCode, provinceName, districtCode, districtName, wardCode, wardName, addressLine bắt buộc (phải đầy đủ)',
  'Tọa độ GPS: latitude và longitude là optional, kiểu Decimal(10,7)',
  'isActive = true: kho hoạt động, false: tạm đóng',
  'Khi deactivate: nên kiểm tra không có đơn hàng đang xử lý (shipments > 0 → warning nhưng vẫn cho đóng)',
  'Danh sách mặc định hiển thị tất cả (không lọc isActive theo mặc định)',
  'OrderShipment.warehouseId liên kết với Warehouse.id',
  'Sắp xếp: isActive desc, name asc',
  'Warehouse được dùng trong OrderShipment khi tạo đơn hàng',
];

// ============================================================
// 📂 FILES LIÊN QUAN
// ============================================================

export const RELATED_FILES = {
  referenceModule: 'shipping-provider (simple CRUD với stats row + detail page + toggle)',
  filesToRead: [
    'prisma/schema.prisma (Warehouse model + OrderShipment model)',
    'src/server/errors.ts',
    'src/lib/utils.ts (createSlug, formatPrice, helpers)',
    'src/lib/types.ts',
    'src/admin/features/shipping-providers/ (reference pattern)',
  ],
  filesToCreate: [
    // Backend
    'src/server/validators/warehouse.validator.ts',
    'src/server/repositories/warehouse.repository.ts',
    'src/server/services/warehouse.service.ts',
    // API routes
    'src/admin/api/warehouses/route.ts',
    'src/admin/api/warehouses/[id]/route.ts',
    'src/admin/api/warehouses/[id]/toggle-active/route.ts',
    // UI features
    'src/admin/features/warehouses/WarehouseTable.tsx',
    'src/admin/features/warehouses/WarehouseFilters.tsx',
    'src/admin/features/warehouses/WarehouseForm.tsx',
    'src/admin/features/warehouses/WarehouseDetailClient.tsx',
    // Wrappers
    'src/admin/components/WarehouseFormWrapper.tsx',
    // Layout pages
    'src/admin/layout/warehouses/WarehousesPage.tsx',
    'src/admin/layout/warehouses/NewWarehousePage.tsx',
    'src/admin/layout/warehouses/EditWarehousePage.tsx',
    'src/admin/layout/warehouses/WarehouseDetailPage.tsx',
  ],
  filesToModify: [
    'src/admin/components/AdminSidebar.tsx (thêm menu Warehouses)',
  ],
};

// ============================================================
// 🔄 EXPECTED FLOW
// ============================================================

export const EXPECTED_FLOW = `
1. Admin: /admin/warehouses → danh sách kho với stats + filters
2. Admin: nhập search → lọc kho
3. Admin: chọn status filter → lọc theo isActive
4. Admin: click "Thêm kho" → form tạo mới
5. Admin: điền thông tin (tên, địa chỉ, GPS) → submit
6. API: validate → service → repository → database
7. Admin: quay về danh sách, thấy kho mới
8. Admin: click "Chi tiết" → trang detail với 4 tabs
9. Admin: xem tab Đơn xuất → thấy các lô hàng từ kho
10. Admin: xem tab Thống kê → thấy số đơn hôm nay/tuần/tháng
11. Admin: toggle Đóng/Mở kho
12. Admin: click Sửa → form sửa → update
`;

// ============================================================
// 🎯 ACCEPTANCE CRITERIA
// ============================================================

export const ACCEPTANCE_CRITERIA = [
  'Danh sách kho hiển thị đúng với stats row',
  'Search hoạt động (code, name, address, phone)',
  'Status filter hoạt động (active/inactive/all)',
  'Form tạo mới validate đúng, submit success, redirect về danh sách',
  'Form sửa load data đúng từ ID, update success',
  'Trang chi tiết kho hiển thị 4 tabs: Thông tin, Đơn xuất, Thống kê, Bản đồ',
  'Tab Đơn xuất: hiển thị danh sách OrderShipment từ kho này',
  'Tab Thống kê: hiển thị tổng đơn xuất',
  'Toggle active/deactive hoạt động',
  'Không ảnh hưởng feature cũ (đặc biệt OrderShipment)',
  'Code đúng convention (3-layer, Zod, AppError)',
  'TypeScript đầy đủ, không dùng any',
  'Form có "use client", page dùng dynamic import ssr:false',
  'Sidebar có link đến /admin/warehouses',
];

// ============================================================
// ⚠️ CONSTRAINTS
// ============================================================

export const CONSTRAINTS = [
  'Không thêm thư viện mới',
  'Không tích hợp Google Maps / Leaflet thật (chỉ hiển thị tọa độ text)',
  'Không cần tính khoảng cách, tối ưu logistics, export/import',
  'Không cần gợi ý kho gần nhất',
  'Không cần biểu đồ thật trong tab thống kê (chỉ hiển thị số)',
  'Warehouse model đã có sẵn trong schema — không cần tạo migration mới',
  'Phải tuân thủ 3-layer architecture',
  'Không refactor code không liên quan',
];

// ============================================================
// 🧪 TEST REQUIREMENTS
// ============================================================

export const TEST_REQUIREMENTS = [
  'Validator: test required fields, latitude/longitude format, nullable fields',
  'Service: test create, getAll, getById, update, toggleActive, getStatusCounts, getShipmentStats',
  'Repository: test findAll (with search, isActive), findById, findByCode, create, update, toggleActive',
  'API: test GET 200, POST 201, PUT 200, DELETE 200, toggle POST, error cases',
  'Manual QA:',
  '  - danh sách load đúng với stats',
  '  - search theo code, name, address, phone',
  '  - filter status active/inactive',
  '  - tạo mới kho → validate required fields',
  '  - tạo mới → submit success → danh sách',
  '  - sửa kho → load form đúng',
  '  - sửa kho → update success',
  '  - chi tiết kho → 4 tabs hoạt động',
  '  - tab Đơn xuất → hiển thị đúng shipments',
  '  - tab Thống kê → hiển thị đúng stats',
  '  - tab Bản đồ → hiển thị GPS',
  '  - toggle Đóng/Mở kho',
  '  - sidebar link hoạt động',
];

// ============================================================
// 📝 NOTES
// ============================================================

export const NOTES = `
// 1. Warehouse Model (đã có trong schema.prisma):
Warehouse {
  id             String   @id @default(cuid())
  code           String?  @unique @db.VarChar(100)   // Mã kho, optional, unique
  name           String   @db.VarChar(255)           // Tên kho, required
  contactName    String?  @db.VarChar(255)           // Người quản lý
  contactPhone   String?  @db.VarChar(50)            // SĐT
  countryCode    String?  @db.VarChar(20)            // Mã quốc gia
  provinceCode   String?  @db.VarChar(50)            // Mã Tỉnh/TP
  provinceName   String?  @db.VarChar(255)           // Tên Tỉnh/TP
  districtCode   String?  @db.VarChar(50)            // Mã Quận/Huyện
  districtName   String?  @db.VarChar(255)           // Tên Quận/Huyện
  wardCode       String?  @db.VarChar(50)            // Mã Phường/Xã
  wardName       String?  @db.VarChar(255)           // Tên Phường/Xã
  addressLine    String   @db.VarChar(500)           // Địa chỉ chi tiết
  fullAddress    String?  @db.VarChar(1000)          // Địa chỉ đầy đủ (auto concat)
  latitude       Decimal? @db.Decimal(10, 7)         // GPS latitude
  longitude      Decimal? @db.Decimal(10, 7)         // GPS longitude
  isActive       Boolean  @default(true)             // Trạng thái hoạt động
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  shipments OrderShipment[]  // Quan hệ 1-n với OrderShipment
}

2. OrderShipment liên kết:
OrderShipment {
  warehouseId    String?     @db.VarChar(100)
  warehouse      Warehouse?  @relation(fields: [warehouseId], references: [id])
}

3. Auto-generate warehouse code:
- Pattern: WH-XXX (ví dụ WH-001, WH-002...)
- Logic: đếm số warehouse hiện có + 1, pad thành 3 chữ số
- Hoặc: không auto nếu đã có code

4. Location Data:
- Sử dụng location data có sẵn trong project (kiểm tra lib/location hoặc constants)
- Nếu chưa có: tạm dùng dropdown đơn giản với hardcoded data
- Provinces, Districts, Wards: nên có API endpoint để lấy data phân cấp

5. Tab Đơn xuất:
- Lấy OrderShipment where warehouseId = current warehouse.id
- Chỉ cần hiển thị: id, orderNo, shippingMethod, trackingCode, createdAt
- Có link đến chi tiết đơn hàng (nếu có)

6. Tab Thống kê:
- getShipmentStats(warehouseId): tổng đơn, đơn hôm nay, đơn tuần này, đơn tháng này
- Đếm OrderShipment where warehouseId = id và createdAt trong khoảng

7. Form address:
- Province dropdown → District dropdown (theo province) → Ward dropdown (theo district)
- Khi chọn đủ: auto-generate fullAddress = addressLine + wardName + districtName + provinceName

8. GPS:
- Latitude: -90 to 90, Decimal(10,7)
- Longitude: -180 to 180, Decimal(10,7)
- Validation: optional nhưng phải đúng format nếu có

9. Reference Pattern: shipping-provider
- Tương tự cấu trúc: list page với stats + filters + table
- Khác: Warehouse có thêm detail page với tabs
- Form: Warehouse phức tạp hơn (thêm address + GPS)
- Warehouse không có website nhưng có thêm địa chỉ phân cấp
`;

// ============================================================
// 🧩 TASK CONTROL (LEVEL 2)
// ============================================================

export const TASK_CONTROL = {
  taskSource: 'ui-design-document',
  affectedLayers: ['validator', 'repository', 'service', 'api', 'ui'],
  riskLevel: 'medium',
  rollbackPlan: 'Revert tất cả file warehouse nếu ảnh hưởng OrderShipment hoặc schema',
  regressionTargets: [
    'Order management (OrderShipment)',
    'Order creation form (chọn kho)',
    'Admin sidebar navigation',
  ],
  manualQaChecklist: [
    '[ ] Danh sách kho load đúng với stats row',
    '[ ] Search theo code, name, address, phone',
    '[ ] Filter status active/inactive hoạt động',
    '[ ] Tạo kho mới → validate required fields',
    '[ ] Tạo kho → submit → danh sách hiển thị đúng',
    '[ ] Sửa kho → form load đúng dữ liệu',
    '[ ] Sửa kho → update → chi tiết hiển thị đúng',
    '[ ] Chi tiết kho → Tab Thông tin: hiển thị đúng',
    '[ ] Chi tiết kho → Tab Đơn xuất: list shipments đúng',
    '[ ] Chi tiết kho → Tab Thống kê: stats đúng',
    '[ ] Chi tiết kho → Tab Bản đồ: GPS hiển thị',
    '[ ] Toggle Đóng/Mở kho hoạt động',
    '[ ] Tạo đơn hàng mới → chọn kho → dropdown hiển thị đúng',
    '[ ] Sidebar có link Warehouses',
  ],
};

// ============================================================
// 🚀 IMPLEMENTATION ORDER
// ============================================================

export const IMPLEMENTATION_ORDER = [
  '1. src/server/validators/warehouse.validator.ts (Zod schema)',
  '2. src/server/repositories/warehouse.repository.ts (Prisma queries)',
  '3. src/server/services/warehouse.service.ts (business logic)',
  '4. src/admin/api/warehouses/route.ts (GET + POST)',
  '5. src/admin/api/warehouses/[id]/route.ts (GET + PUT)',
  '6. src/admin/api/warehouses/[id]/toggle-active/route.ts',
  '7. src/admin/features/warehouses/WarehouseFilters.tsx',
  '8. src/admin/features/warehouses/WarehouseTable.tsx',
  '9. src/admin/features/warehouses/WarehouseForm.tsx (với address + GPS)',
  '10. src/admin/features/warehouses/WarehouseDetailClient.tsx (4 tabs)',
  '11. src/admin/components/WarehouseFormWrapper.tsx',
  '12. src/admin/layout/warehouses/WarehousesPage.tsx (list + stats)',
  '13. src/admin/layout/warehouses/NewWarehousePage.tsx',
  '14. src/admin/layout/warehouses/EditWarehousePage.tsx',
  '15. src/admin/layout/warehouses/WarehouseDetailPage.tsx',
  '16. src/admin/components/AdminSidebar.tsx (thêm menu Warehouses)',
  '17. Unit tests (validator + service)',
];

export default {
  TASK_METADATA,
  TASK_GOAL,
  UI_CONTEXT,
  REQUIREMENTS,
  BUSINESS_RULES,
  RELATED_FILES,
  EXPECTED_FLOW,
  ACCEPTANCE_CRITERIA,
  CONSTRAINTS,
  TEST_REQUIREMENTS,
  NOTES,
  TASK_CONTROL,
  IMPLEMENTATION_ORDER,
};
