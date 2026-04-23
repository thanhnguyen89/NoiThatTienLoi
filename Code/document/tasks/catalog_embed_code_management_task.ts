/**
 * TASK: Catalog Embed Code Management CRUD
 * Module: Catalog Embed Code
 * Type: Feature
 * Status: Ready for implementation
 */

export const TASK_METADATA = {
  name: 'catalog-embed-code-management-crud',
  module: 'catalog-embed-code',
  type: 'feature',
  priority: 'medium',
  estimatedDays: 1,
};

// ============================================================
// 🎯 MỤC TIÊU
// ============================================================

export const TASK_GOAL = `
Xây dựng module quản lý mã nhúng (CatalogEmbedCode) CRUD cho admin panel:
- Danh sách mã nhúng với search theo tiêu đề
- Form tạo mới mã nhúng (tiêu đề, vị trí, mã code, ghi chú, công khai)
- Form sửa mã nhúng
- Xóa soft-delete mã nhúng
- Bật/tắt mã nhúng bằng checkbox "Công khai" (isActive)
- Hỗ trợ vị trí: Header, Footer, Custom
`;

// ============================================================
// 🖥️ UI / SCREEN CONTEXT
// ============================================================

export const UI_CONTEXT = {
  screens: [
    '/admin/catalog-embed-codes',           // Danh sách
    '/admin/catalog-embed-codes/new',       // Tạo mới
    '/admin/catalog-embed-codes/[id]',      // Sửa
  ],
  screenshot: 'ảnh gồm danh sách mã nhúng, form tạo/sửa',
  description: `
Trang danh sách mã nhúng (DANH SÁCH MÃ NHÚNG):
- Bảng hiển thị: ID, Tiêu đề, Vị trí, Hoạt động (status), Actions
- Search input: tìm kiếm theo Tiêu đề
- Nút "Thêm mới"
- Action icons: sửa, xóa

Form tạo/sửa (Thêm mới linh vực):
- Field Tiêu đề (required, max 200)
- Dropdown Vị trí (Thế Header / Thế Footer / Custom)
- Textarea Mã nhúng (required, hỗ trợ HTML/JS/CSS)
- Textarea Ghi chú (optional)
- Checkbox Công khai (isActive, default true)
- Nút Lưu / Đóng
`,
};

// ============================================================
// 📋 YÊU CẦU CHI TIẾT
// ============================================================

export const REQUIREMENTS = [
  'REQ-01: Tạo trang danh sách mã nhúng',
  '  - Hiển thị bảng danh sách (pagination)',
  '  - Search theo Tiêu đề (partial match)',
  '  - Display vị trí (Header/Footer/Custom)',
  '  - Display trạng thái Hoạt động (checkmark hoặc Yes/No)',
  '',
  'REQ-02: Tạo form tạo mới mã nhúng',
  '  - Tiêu đề: required, max 200',
  '  - Vị trí: required (enum HEADER/FOOTER/CUSTOM)',
  '  - Mã nhúng: required (textarea, HTML/JS/CSS)',
  '  - Ghi chú: optional (textarea)',
  '  - Công khai: checkbox, default true',
  '  - Submit → danh sách',
  '',
  'REQ-03: Tạo form sửa mã nhúng',
  '  - Tải dữ liệu từ ID',
  '  - Cho phép update tất cả fields',
  '  - Submit → danh sách',
  '',
  'REQ-04: Hỗ trợ xóa soft-delete',
  '  - Click xóa → confirm',
  '  - Xóa → isDeleted=true, ghi deletedBy, deletedAt',
  '  - Danh sách ẩn deleted records',
  '',
  'REQ-05: Hỗ trợ bật/tắt mã nhúng',
  '  - Checkbox "Công khai" → isActive',
  '  - Frontend chỉ load khi isActive=true',
];

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  'Tiêu đề phải unique (hoặc unique per position)',
  'Vị trí: HEADER | FOOTER | CUSTOM',
  'IsActive = true: mã nhúng hoạt động, false: bị vô hiệu hóa',
  'Soft delete: không xóa vật lý, chỉ đặt isDeleted = true',
  'Mã nhúng có thể chứa HTML, JavaScript, CSS',
  'Danh sách mặc định chỉ hiển thị isDeleted = false/null',
  'Sắp xếp theo sortOrder (asc)',
  'Frontend API sẽ load mã nhúng dựa trên isActive = true',
];

// ============================================================
// 📂 FILES LIÊN QUAN
// ============================================================

export const RELATED_FILES = {
  referenceModule: 'product-color hoặc product-size (simple CRUD)',
  filesToRead: [
    'prisma/schema.prisma',
    'src/lib/types.ts (PaginatedResult)',
    'src/lib/constants.ts (position enum)',
    'src/server/errors.ts',
    'src/admin/features/product-color/ (reference UI pattern)',
  ],
  filesToCreate: [
    'src/server/validators/catalog-embed-code.validator.ts',
    'src/server/repositories/catalog-embed-code.repository.ts',
    'src/server/services/catalog-embed-code.service.ts',
    'src/admin/api/catalog-embed-codes/route.ts',
    'src/admin/api/catalog-embed-codes/[id]/route.ts',
    'src/admin/features/catalog-embed-code/CatalogEmbedCodeTable.tsx',
    'src/admin/features/catalog-embed-code/CatalogEmbedCodeFilters.tsx',
    'src/admin/features/catalog-embed-code/CatalogEmbedCodeForm.tsx',
    'src/admin/components/CatalogEmbedCodeFormWrapper.tsx',
    'src/admin/layout/catalog-embed-codes/CatalogEmbedCodesPage.tsx',
    'src/admin/layout/catalog-embed-codes/NewCatalogEmbedCodePage.tsx',
    'src/admin/layout/catalog-embed-codes/EditCatalogEmbedCodePage.tsx',
  ],
  filesToModify: [
    'src/lib/constants.ts (thêm position enum nếu chưa có)',
    'src/admin/layout/sidebar hoặc navigation file (thêm menu link)',
  ],
};

// ============================================================
// 🔄 EXPECTED FLOW
// ============================================================

export const EXPECTED_FLOW = `
1. Admin: /admin/catalog-embed-codes → danh sách
2. Admin: nhập tiêu đề tìm kiếm
3. Admin: click "Thêm mới" hoặc click sửa trên bảng
4. Form: điền thông tin → submit
5. API: validate → service layer → repository → database
6. Admin: quay về danh sách, thấy dữ liệu đã cập nhật
7. Admin: click xóa → confirm → soft delete → danh sách ẩn record
8. Frontend: load mã nhúng từ API GET /api/catalog-embed-codes (filter isActive=true)
`;

// ============================================================
// 🎯 ACCEPTANCE CRITERIA
// ============================================================

export const ACCEPTANCE_CRITERIA = [
  'REQ-01: Danh sách hiển thị đúng data, search hoạt động',
  'REQ-02: Form tạo mới validate đúng, submit success',
  'REQ-03: Form sửa load data đúng, update success',
  'REQ-04: Xóa confirm dialog, soft delete hoạt động, danh sách ẩn deleted',
  'REQ-05: Checkbox "Công khai" hoạt động đúng',
  'Không ảnh hưởng feature cũ',
  'Code đúng convention project (3-layer, Zod, AppError...)',
  'TypeScript đầy đủ, không dùng any',
  'Form có "use client" directive, page dùng dynamic import',
];

// ============================================================
// ⚠️ CONSTRAINTS
// ============================================================

export const CONSTRAINTS = [
  'Không thêm thư viện mới',
  'Không sửa ngoài module catalog-embed-code',
  'Không refactor code không liên quan',
  'Phải tuân thủ 3-layer architecture',
  'Mã nhúng dùng plain textarea, không cần CKEditor',
  'Delete là soft-delete (không xóa vật lý)',
];

// ============================================================
// 🧪 TEST REQUIREMENTS
// ============================================================

export const TEST_REQUIREMENTS = [
  'Validator: test required fields, enum values',
  'Service: test create, getAll, getById, update, delete (soft)',
  'Repository: test findAll, findById, findByTitle, create, update, softDelete',
  'API: test GET 200, POST 201, PUT 200, DELETE 200, error cases',
  'Manual QA:',
  '  - search theo tiêu đề',
  '  - tạo mới mã nhúng',
  '  - sửa mã nhúng',
  '  - xóa soft-delete → danh sách ẩn',
  '  - checkbox công khai hoạt động',
  '  - verify validation error',
];

// ============================================================
// 📝 NOTES
// ============================================================

export const NOTES = `
1. Position Enum:
   - Values: HEADER, FOOTER, CUSTOM
   - Check if exists in constants.ts
   - If not: create export const POSITION_ENUM = {...}

2. Tiêu đề:
   - Unique check: service layer + optional database constraint
   - Max 200 ký tự

3. Mã nhúng (Content):
   - Plain textarea (không CKEditor)
   - Hỗ trợ HTML, JavaScript, CSS
   - Lưu as-is, không validate HTML

4. Soft Delete:
   - deletedBy: current user ID từ middleware
   - deletedAt: auto set DateTime.now()
   - Danh sách: WHERE isDeleted = false OR isDeleted IS NULL

5. IsActive (Công khai):
   - Checkbox trong form
   - Default true khi tạo mới
   - Frontend chỉ load khi isActive = true

6. Sắp xếp:
   - sortOrder field (int)
   - Sắp xếp theo: sortOrder asc → position → title

7. Form Page Navigation:
   - Edit page: /admin/catalog-embed-codes/[id]
   - After submit: router.push('/admin/catalog-embed-codes') + router.refresh()

8. Pagination:
   - Dùng PaginatedResult<CatalogEmbedCode> từ lib/types
   - Default page size: 10 hoặc 20
`;

// ============================================================
// 🧩 TASK CONTROL (LEVEL 2)
// ============================================================

export const TASK_CONTROL = {
  taskSource: 'screenshot + prisma schema',
  affectedLayers: ['validator', 'repository', 'service', 'api', 'ui'],
  riskLevel: 'low',
  rollbackPlan: 'Revert tất cả file catalog-embed-code nếu query bị lỗi',
  regressionTargets: [
    'Catalog pages (category, product)',
    'Admin sidebar navigation',
  ],
  manualQaChecklist: [
    '[ ] Danh sách load đúng data',
    '[ ] Search theo tiêu đề hoạt động',
    '[ ] Tạo mới → validate required fields',
    '[ ] Tạo mới → submit success → danh sách',
    '[ ] Sửa → load form đúng',
    '[ ] Sửa → update success → danh sách',
    '[ ] Xóa → confirm dialog',
    '[ ] Xóa → soft delete → danh sách ẩn',
    '[ ] Checkbox "Công khai" hoạt động',
    '[ ] Form validation client-side + server-side khớp',
  ],
};

export const IMPLEMENTATION_ORDER = [
  '1. src/lib/constants.ts → thêm POSITION enum (nếu chưa có)',
  '2. src/server/validators/catalog-embed-code.validator.ts',
  '3. src/server/repositories/catalog-embed-code.repository.ts',
  '4. src/server/services/catalog-embed-code.service.ts',
  '5. src/admin/api/catalog-embed-codes/route.ts (GET + POST)',
  '6. src/admin/api/catalog-embed-codes/[id]/route.ts (GET + PUT + DELETE)',
  '7. src/admin/features/catalog-embed-code/CatalogEmbedCodeTable.tsx',
  '8. src/admin/features/catalog-embed-code/CatalogEmbedCodeFilters.tsx',
  '9. src/admin/features/catalog-embed-code/CatalogEmbedCodeForm.tsx',
  '10. src/admin/components/CatalogEmbedCodeFormWrapper.tsx',
  '11. src/admin/layout/catalog-embed-codes/CatalogEmbedCodesPage.tsx',
  '12. src/admin/layout/catalog-embed-codes/NewCatalogEmbedCodePage.tsx',
  '13. src/admin/layout/catalog-embed-codes/EditCatalogEmbedCodePage.tsx',
  '14. Admin sidebar → thêm link /admin/catalog-embed-codes',
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
