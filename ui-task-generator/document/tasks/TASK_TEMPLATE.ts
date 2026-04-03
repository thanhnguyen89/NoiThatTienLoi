/**
 * ============================================================
 * TASK TEMPLATE — NỘI THẤT TIỆN LỢI
 * ============================================================
 * Mô tả: File task chuẩn để Claude Code đọc và implement feature
 * Cách dùng:
 * - Copy file này → rename theo task (VD: menu_feature_task.ts)
 * - Điền đầy đủ các mục bên dưới
 * - Yêu cầu Claude đọc file trước khi code
 */

export const TASK_METADATA = {
  name: 'task-name', // ví dụ: menu-filter-by-type
  module: 'menu', // category | product | slider | menu | ...
  type: 'feature', // feature | bugfix | refactor | enhancement
  priority: 'medium', // low | medium | high
};

// ============================================================
// 🎯 MỤC TIÊU
// ============================================================

export const TASK_GOAL = `
Mô tả ngắn gọn mục tiêu:
- Ví dụ: Thêm filter theo menuTypeId trong danh sách menu admin
- Hiển thị label loại menu
- Thêm action link sang màn hình menu link
`;

// ============================================================
// 🖥️ UI / SCREEN CONTEXT
// ============================================================

export const UI_CONTEXT = {
  screens: [
    '/admin/menu',
    '/admin/menu/[id]',
  ],
  description: `
Mô tả màn hình hiện tại:
- Bảng danh sách menu
- Có các cột: name, status, sortOrder
- Chưa có filter theo loại menu
`,
};

// ============================================================
// 📋 YÊU CẦU CHI TIẾT
// ============================================================

export const REQUIREMENTS = [
  'Thêm filter theo menuTypeId trong danh sách',
  'Hiển thị label menu type (HEADER / FOOTER / SIDEBAR)',
  'Thêm icon action để chuyển sang màn hình menu link',
  'Giữ nguyên logic filter/search hiện tại',
];

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  'menuTypeId là enum: HEADER | FOOTER | SIDEBAR',
  'Filter phải kết hợp với search (AND condition)',
  'Nếu không chọn menuTypeId → hiển thị tất cả',
  'Không được làm thay đổi API response hiện tại',
];

// ============================================================
// 📂 FILES LIÊN QUAN (GỢI Ý)
// ============================================================

export const RELATED_FILES = {
  referenceModule: 'category hoặc product',
  filesToRead: [
    'src/admin/features/menu/MenuTable.tsx',
    'src/admin/features/menu/MenuFilters.tsx',
    'src/admin/layout/menu/MenusPage.tsx',
    'src/server/services/menu.service.ts',
    'src/server/repositories/menu.repository.ts',
  ],
  filesToModify: [
    'MenuFilters.tsx',
    'MenuTable.tsx',
    'menu.service.ts',
    'menu.repository.ts',
  ],
};

// ============================================================
// 🔄 EXPECTED FLOW
// ============================================================

export const EXPECTED_FLOW = `
1. User chọn menu type từ dropdown filter
2. Gửi request kèm menuTypeId
3. Backend filter theo menuTypeId
4. Trả về danh sách đã lọc
5. UI hiển thị đúng label type
`;

// ============================================================
// 🎯 ACCEPTANCE CRITERIA
// ============================================================

export const ACCEPTANCE_CRITERIA = [
  'Filter hoạt động đúng với menuTypeId',
  'UI hiển thị đúng label',
  'Không ảnh hưởng feature cũ',
  'Code đúng convention project',
];

// ============================================================
// ⚠️ CONSTRAINTS (RÀNG BUỘC)
// ============================================================

export const CONSTRAINTS = [
  'Không thêm thư viện mới',
  'Không sửa ngoài module menu',
  'Không refactor code không liên quan',
  'Phải tuân thủ 3-layer architecture',
];

// ============================================================
// 🧪 TEST REQUIREMENTS
// ============================================================

export const TEST_REQUIREMENTS = [
  'Test filter với từng menuTypeId',
  'Test khi không có filter',
  'Test kết hợp search + filter',
  'Test API trả về đúng format',
];

// ============================================================
// 📝 NOTES (OPTIONAL)
// ============================================================

export const NOTES = `
- Có thể reuse pattern filter từ category
- Dùng enum đã có trong constants.ts
`;