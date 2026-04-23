/**
 * TASK: URL Record Management CRUD
 * Module: URL Record
 * Type: Feature
 * Status: Ready for implementation
 */

export const TASK_METADATA = {
  name: 'url-record-management-crud',
  module: 'url-record',
  type: 'feature',
  priority: 'medium',
  estimatedDays: 2,
};

// ============================================================
// 🎯 MỤC TIÊU
// ============================================================

export const TASK_GOAL = `
Xây dựng module quản lý URL Record (CRUD) cho admin panel:
- Danh sách URL Record với search, filter theo Entity Type, Status
- Form tạo mới URL Record
- Form sửa URL Record (redirect đúng URL sửa)
- Xóa soft-delete URL Record
- Hỗ trợ redirect slug cũ sang slug mới
- Theo dõi error code
`;

// ============================================================
// 🖥️ UI / SCREEN CONTEXT
// ============================================================

export const UI_CONTEXT = {
  screens: [
    '/admin/url-records',           // Danh sách
    '/admin/url-records/new',       // Tạo mới
    '/admin/url-records/[id]',      // Sửa (redirect đúng URL này)
  ],
  screenshot: 'ảnh gồm danh sách URL, form tạo, form sửa',
  description: `
Trang danh sách URL Record:
- Bảng hiển thị: ID, Slug, Entity Type, IsActive, ErrorCode, Actions
- Search input: tìm kiếm theo Slug
- Filter dropdowns: Entity Type (All/Product/Category/Page/News), Status (All/Active/Inactive)
- Nút "Thêm mới"
- Action icons: sửa, xóa

Form tạo/sửa:
- Field Slug (unique, bắt buộc)
- Field Entity ID (nếu cần)
- Dropdown Entity Type (bắt buộc)
- Checkbox IsActive (mặc định true)
- Checkbox IsRedirect
- Field SlugRedirect (bắt buộc nếu IsRedirect checked)
- Dropdown/Input ErrorCode (optional)
- Nút Lưu / Đóng
`,
};

// ============================================================
// 📋 YÊU CẦU CHI TIẾT
// ============================================================

export const REQUIREMENTS = [
  'REQ-01: Tạo trang danh sách URL Record',
  '  - Hiển thị bảng danh sách (pagination)',
  '  - Search theo Slug (partial match)',
  '  - Filter theo Entity Type (ALL/PRODUCT/CATEGORY/PAGE/NEWS)',
  '  - Filter theo Status (All/Active/Inactive)',
  '  - Bộ lọc kết hợp được (AND condition)',
  '',
  'REQ-02: Tạo form tạo mới URL Record',
  '  - Slug: bắt buộc, unique check',
  '  - Entity Type: bắt buộc (enum)',
  '  - Entity ID: optional',
  '  - IsActive: checkbox, mặc định true',
  '  - IsRedirect: checkbox',
  '  - SlugRedirect: bắt buộc nếu IsRedirect checked',
  '  - ErrorCode: optional',
  '  - Submit → danh sách',
  '',
  'REQ-03: Tạo form sửa URL Record',
  '  - Tải dữ liệu từ ID',
  '  - Cho phép update các field',
  '  - Slug: read-only hoặc allow with unique check',
  '  - Submit → danh sách',
  '',
  'REQ-04: Hỗ trợ xóa soft-delete',
  '  - Click xóa → confirm',
  '  - Xóa → isDeleted=true, ghi deletedUserId, deletedDate',
  '  - Danh sách ẩn deleted records',
  '',
  'REQ-05: Hỗ trợ redirect + error code',
  '  - IsRedirect checked → SlugRedirect bắt buộc',
  '  - ErrorCode dropdown gợi ý (404, 410, MOVED, etc.)',
  '  - Logic redirect ở public site API (admin chỉ quản lý data)',
];

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  'Slug phải unique trong toàn bộ hệ thống',
  'Entity Type: PRODUCT | CATEGORY | PAGE | NEWS | OTHER',
  'IsActive = true: URL hoạt động, false: URL tạm ngừng',
  'IsRedirect = true: slug cũ redirect sang SlugRedirect',
  'Soft delete: không xóa vật lý, chỉ đặt isDeleted = true',
  'Danh sách mặc định chỉ hiển thị isDeleted = null/false',
  'Delete: cần ghi deletedUserId (từ session/middleware)',
  'Redirect logic ở site API, admin chỉ quản lý CRUD',
];

// ============================================================
// 📂 FILES LIÊN QUAN
// ============================================================

export const RELATED_FILES = {
  referenceModule: 'category hoặc product',
  filesToRead: [
    'prisma/schema.prisma',
    'src/lib/types.ts (PaginatedResult)',
    'src/lib/constants.ts (entity type enum)',
    'src/server/errors.ts',
    'src/admin/features/category/ (reference UI pattern)',
    'src/admin/layout/categories/ (reference page pattern)',
  ],
  filesToCreate: [
    'src/server/validators/url-record.validator.ts',
    'src/server/repositories/url-record.repository.ts',
    'src/server/services/url-record.service.ts',
    'src/admin/api/url-records/route.ts',
    'src/admin/api/url-records/[id]/route.ts',
    'src/admin/features/url-record/UrlRecordTable.tsx',
    'src/admin/features/url-record/UrlRecordFilters.tsx',
    'src/admin/features/url-record/UrlRecordForm.tsx',
    'src/admin/components/UrlRecordFormWrapper.tsx',
    'src/admin/layout/url-records/UrlRecordsPage.tsx',
    'src/admin/layout/url-records/NewUrlRecordPage.tsx',
    'src/admin/layout/url-records/EditUrlRecordPage.tsx',
  ],
  filesToModify: [
    'src/lib/constants.ts (thêm entity type enum nếu chưa có)',
    'src/admin/layout/sidebar hoặc navigation file (thêm menu link)',
  ],
};

// ============================================================
// 🔄 EXPECTED FLOW
// ============================================================

export const EXPECTED_FLOW = `
1. Admin: /admin/url-records → danh sách
2. Admin: nhập slug hoặc chọn filter
3. Admin: click "Thêm mới" hoặc click sửa trên bảng
4. Form: điền thông tin → submit
5. API: validate → service layer → repository → database
6. Admin: quay về danh sách, thấy dữ liệu đã cập nhật
7. Admin: click xóa → confirm → soft delete → danh sách ẩn record
`;

// ============================================================
// 🎯 ACCEPTANCE CRITERIA
// ============================================================

export const ACCEPTANCE_CRITERIA = [
  'REQ-01: Danh sách hiển thị đúng data, search + filter hoạt động',
  'REQ-02: Form tạo mới validate đúng, unique check slug, submit success',
  'REQ-03: Form sửa load data đúng, update success, redirect đúng URL sửa',
  'REQ-04: Xóa confirm dialog, soft delete hoạt động, danh sách ẩn deleted',
  'REQ-05: IsRedirect checkbox trigger SlugRedirect required, ErrorCode optional',
  'Không ảnh hưởng feature cũ (category, product...)',
  'Code đúng convention project (3-layer, Zod, AppError...)',
  'TypeScript đầy đủ, không dùng any',
  'Form có "use client" directive, page dùng dynamic import',
];

// ============================================================
// ⚠️ CONSTRAINTS (RÀNG BUỘC)
// ============================================================

export const CONSTRAINTS = [
  'Không thêm thư viện mới',
  'Không sửa ngoài module url-record',
  'Không refactor code không liên quan',
  'Phải tuân thủ 3-layer architecture',
  'Slug read-only trong form sửa hoặc allow with unique check (quyết định trước code)',
  'Delete là soft-delete (không xóa vật lý)',
];

// ============================================================
// 🧪 TEST REQUIREMENTS
// ============================================================

export const TEST_REQUIREMENTS = [
  'Validator: test unique slug check, required fields, enum values',
  'Service: test getAll, getById, create (unique check), update, delete (soft)',
  'Repository: test findAll, findById, findBySlug, create, update, softDelete',
  'API: test GET 200, POST 201, PUT 200, DELETE 200, error cases (404, 409...)',
  'Manual QA:',
  '  - search theo slug',
  '  - filter entity type + status',
  '  - tạo mới URL Record',
  '  - sửa URL Record (verify redirect URL đúng)',
  '  - xóa soft-delete → danh sách ẩn',
  '  - kiểm tra unique constraint',
  '  - kiểm tra IsRedirect + SlugRedirect required',
];

// ============================================================
// 📝 NOTES (QUAN TRỌNG)
// ============================================================

export const NOTES = `
1. Entity Type Enum:
   - Quyết định: entity type đã tồn tại trong constants.ts không?
   - Nếu chưa: thêm vào constants.ts
   - Nếu có: reuse

2. Slug:
   - Unique constraint đã tồn tại trong Prisma schema (@@unique([slug]))
   - Service layer cần catch Prisma P2002 error → throw DuplicateError
   - Form sửa: có thể slug read-only hoặc allow with unique check (tùy UX)

3. Soft Delete:
   - deletedUserId: cần middleware để lấy current user ID
   - deletedDate: auto set DateTime.now() khi delete
   - Danh sách: WHERE isDeleted IS NULL OR isDeleted = false

4. Redirect Logic:
   - KHÔNG implement logic redirect ở admin (chỉ quản lý data)
   - Public site sẽ có API route: /api/url-redirect/[slug]
   - Admin chỉ update field IsRedirect, SlugRedirect, ErrorCode

5. Form Page Navigation:
   - Edit page: /admin/url-records/[id] ← đảm bảo param đúng
   - After submit: router.push('/admin/url-records') + router.refresh()

6. Pagination:
   - Dùng PaginatedResult<> từ lib/types
   - Default page size: 10 hoặc 20
   - Query: ?page=1&search=...&entityType=...&status=...

7. Error Code:
   - Có thể hardcode enum: 404, 410, MOVED, ARCHIVED, etc.
   - Hoặc tạo separate table URLRecordErrorCode (nâng cấp sau)
   - Hiện tại: optional dropdown input

8. Modal vs Navigation:
   - Không dùng modal (tương tự category, product)
   - Tạo/Sửa mở page riêng: /new, /[id]
   - Submit → điều hướng về /admin/url-records
`;

// ============================================================
// 🧩 TASK CONTROL (LEVEL 2)
// ============================================================

export const TASK_CONTROL = {
  taskSource: 'screenshot + prisma schema',
  affectedLayers: ['validator', 'repository', 'service', 'api', 'ui'],
  riskLevel: 'medium',
  rollbackPlan: 'Revert tất cả file url-record nếu unique constraint hoặc API query bị lỗi',
  regressionTargets: [
    'URL redirect logic ở site (nếu có)',
    'Category/Product pages (không liên quan, nhưng check)',
    'Admin panel navigation',
  ],
  manualQaChecklist: [
    '[ ] Danh sách load đúng data',
    '[ ] Search theo slug hoạt động',
    '[ ] Filter entity type hoạt động',
    '[ ] Filter status (active/inactive) hoạt động',
    '[ ] Tạo mới → validate required fields',
    '[ ] Tạo mới slug trùng → error 409',
    '[ ] Sửa URL Record → load form đúng',
    '[ ] Sửa → update thành công → danh sách refresh',
    '[ ] Sửa URL → verify redirect đúng /admin/url-records/[id]',
    '[ ] Xóa → confirm dialog',
    '[ ] Xóa → soft delete → danh sách ẩn',
    '[ ] IsRedirect checked → SlugRedirect required',
    '[ ] ErrorCode dropdown gợi ý',
    '[ ] Form validation client-side + server-side khớp',
  ],
};

export const IMPLEMENTATION_ORDER = [
  '1. src/lib/constants.ts → thêm ENTITY_TYPE enum (nếu chưa có)',
  '2. src/server/validators/url-record.validator.ts',
  '3. src/server/repositories/url-record.repository.ts',
  '4. src/server/services/url-record.service.ts',
  '5. src/admin/api/url-records/route.ts (GET + POST)',
  '6. src/admin/api/url-records/[id]/route.ts (GET + PUT + DELETE)',
  '7. src/admin/features/url-record/UrlRecordTable.tsx',
  '8. src/admin/features/url-record/UrlRecordFilters.tsx',
  '9. src/admin/features/url-record/UrlRecordForm.tsx',
  '10. src/admin/components/UrlRecordFormWrapper.tsx',
  '11. src/admin/layout/url-records/UrlRecordsPage.tsx',
  '12. src/admin/layout/url-records/NewUrlRecordPage.tsx',
  '13. src/admin/layout/url-records/EditUrlRecordPage.tsx',
  '14. Admin sidebar → thêm link /admin/url-records',
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
