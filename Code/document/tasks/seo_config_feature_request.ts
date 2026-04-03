/**
 * ============================================================
 * TASK: SEO Config Management
 * ============================================================
 */

// ============================================================
// 📋 METADATA
// ============================================================

export const TASK_METADATA = {
  taskName: 'seo-config-management',
  module: 'seo-config',
  type: 'feature',
  priority: 'high',
  source: 'screenshot',
  assignee: '',
  createdAt: '2026-04-02',
};

// ============================================================
// 🎯 MỤC TIÊU
// ============================================================

export const TASK_GOAL = `
Xây dựng/cập nhật đầy đủ module quản lý cấu hình SEO gồm:
trang danh sách, form thêm/sửa, upload media, editor content
trước/sau, cấu hình SEO, và khu vực ghi chú token.
`;

// ============================================================
// 💾 DATABASE CHANGES
// ============================================================

export const DB_CHANGES = {
  schemaChange: false,

  /** Kiểm tra trước: xem model SeoConfig đã tồn tại chưa */
  migrations: [],

  newModels: [],
};

// ============================================================
// 🔌 API CONTRACTS
// ============================================================

export const API_CONTRACTS = {
  endpoints: [
    {
      method: 'GET',
      path: '/admin/api/seo-configs',
      description: 'Lấy danh sách cấu hình SEO, hỗ trợ filter keyword',
      status: 'new',
      request: {
        queryParams: [
          { name: 'keyword', type: 'string', required: false, description: 'Tìm theo url, tiêu đề, tiêu đề seo, tên hệ thống' },
          { name: 'page', type: 'number', required: false },
          { name: 'pageSize', type: 'number', required: false },
        ],
      },
      response: {
        success: {
          data: 'SeoConfigItem[]',
          pagination: '{ total, page, pageSize }',
        },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'GET',
      path: '/admin/api/seo-configs/:id',
      description: 'Lấy chi tiết 1 cấu hình SEO',
      status: 'new',
      request: {
        pathParams: [
          { name: 'id', type: 'number', required: true },
        ],
      },
      response: {
        success: { data: 'SeoConfigDetail' },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'POST',
      path: '/admin/api/seo-configs',
      description: 'Tạo mới cấu hình SEO',
      status: 'new',
      request: {
        body: [
          { name: 'title', type: 'string', required: true },
          { name: 'systemName', type: 'string', required: true },
          { name: 'url', type: 'string', required: true },
          { name: 'contentBefore', type: 'string', required: false },
          { name: 'contentAfter', type: 'string', required: false },
          { name: 'image', type: 'string', required: false },
          { name: 'sortOrder', type: 'number', required: false },
          { name: 'isActive', type: 'boolean', required: false },
          { name: 'seoTitle', type: 'string', required: false },
          { name: 'seoDescription', type: 'string', required: false },
          { name: 'seoKeyword', type: 'string', required: false },
          { name: 'seoCanonical', type: 'string', required: false },
          { name: 'md5Keyword', type: 'string', required: false },
          { name: 'noindex', type: 'boolean', required: false },
        ],
      },
      response: {
        success: { data: 'SeoConfigDetail', message: 'Tạo thành công' },
        error: '{ error: string, code: string, details?: object }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'PUT',
      path: '/admin/api/seo-configs/:id',
      description: 'Cập nhật cấu hình SEO',
      status: 'new',
      request: {
        pathParams: [
          { name: 'id', type: 'number', required: true },
        ],
        body: 'Giống POST',
      },
      response: {
        success: { data: 'SeoConfigDetail', message: 'Cập nhật thành công' },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'DELETE',
      path: '/admin/api/seo-configs/:id',
      description: 'Xóa cấu hình SEO',
      status: 'new',
      request: {
        pathParams: [
          { name: 'id', type: 'number', required: true },
        ],
      },
      response: {
        success: { message: 'Xóa thành công' },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
  ],
};

// ============================================================
// 📂 FILE STRUCTURE
// ============================================================

export const FILE_STRUCTURE = {
  filesToCreate: [
    'src/server/repositories/seo-config.repository.ts',
    'src/server/services/seo-config.service.ts',
    'src/server/validators/seo-config.validator.ts',
    'src/admin/api/seo-configs/route.ts',
    'src/admin/api/seo-configs/[id]/route.ts',
    'src/admin/features/seo-config/SeoConfigTable.tsx',
    'src/admin/features/seo-config/SeoConfigForm.tsx',
    'src/admin/features/seo-config/SeoConfigFilters.tsx',
    'src/admin/layout/seo-config/SeoConfigsPage.tsx',
    'src/admin/layout/seo-config/NewSeoConfigPage.tsx',
    'src/admin/layout/seo-config/EditSeoConfigPage.tsx',
  ],

  filesToModify: [],

  filesToRead: [
    'prisma/schema.prisma — kiểm tra model SeoConfig đã tồn tại chưa',
    'src/server/repositories/category.repository.ts — reference pattern',
    'src/server/services/category.service.ts — reference pattern',
    'src/admin/features/category/CategoryTable.tsx — reference pattern list page',
    'src/admin/components/RichTextEditor.tsx — kiểm tra editor wrapper có sẵn',
    'src/admin/components/ImageUploader.tsx — kiểm tra upload component có sẵn',
    'src/lib/constants.ts — thêm NOTE_TOKENS nếu cần',
    'src/lib/types.ts — thêm SeoConfigDetail, SeoConfigListItem types',
  ],

  filesToCheck: [
    'src/server/routes/index.ts — đăng ký routes mới',
    'src/server/errors.ts — kiểm tra error classes',
  ],
};

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  'Tên hệ thống (systemName) là khóa định danh logic nội bộ — phải unique',
  'URL là route public — phải unique',
  'ContentBefore và ContentAfter lưu HTML string',
  'Công khai = true → record được kích hoạt sử dụng',
  'Noindex = true → page sinh meta robots noindex',
  'sortOrder dùng để sắp xếp trong danh sách admin',
  'Xóa record cần confirm trước',
  'Nếu có ảnh đại diện → hiển thị preview; nếu không → placeholder',
  'Panel Ghi chú chỉ hiển thị token tham chiếu, không phải editable data',
];

// ============================================================
// 📋 REQUIREMENTS
// ============================================================

export const REQUIREMENTS = [
  {
    id: 'REQ-01',
    title: 'Trang danh sách cấu hình SEO',
    description: 'Xây dựng trang danh sách có khối tìm kiếm và bảng dữ liệu',
    acceptanceCriteria: [
      'AC-01: Có input Từ khóa tìm theo url, tiêu đề, tiêu đề seo, tên hệ thống',
      'AC-02: Nút Tìm kiếm filter dữ liệu; nút Làm mới reset',
      'AC-03: Có nút Thêm mới chuyển tới form tạo mới',
      'AC-04: Bảng hiển thị cột: Url, Tiêu đề, Tiêu đề seo, Tên hệ thống, Noindex, Thứ tự, Công khai, Thao tác',
      'AC-05: Cột Công khai hiển thị icon tick xanh',
      'AC-06: Cột Noindex hiển thị rõ ràng (tick / badge), không để trống mơ hồ',
      'AC-07: Cột Thao tác có đúng 2 action: sửa (xanh) và xóa (đỏ)',
    ],
    affectedFiles: [
      'SeoConfigsPage.tsx',
      'SeoConfigTable.tsx',
      'SeoConfigFilters.tsx',
      'seo-config.service.ts',
      'seo-config.repository.ts',
    ],
  },
  {
    id: 'REQ-02',
    title: 'Form thêm/sửa cấu hình SEO',
    description: 'Form đủ field, layout 2 cột đúng theo UI thực tế',
    acceptanceCriteria: [
      'AC-01: Cột trái: Tiêu đề (*), Tên hệ thống (*), Content Before (rich editor), Content After (rich editor)',
      'AC-02: Cột phải: Media (upload ảnh + preview + Thứ tự + Công khai), SEO (URL*, Tiêu đề seo, Mô tả seo, Từ khóa, Canonical, MD5 Keyword, Noindex), Ghi chú (token list)',
      'AC-03: URL, Tiêu đề, Tên hệ thống là bắt buộc',
      'AC-04: Content Before và Content After dùng rich text editor',
      'AC-05: Upload/chọn ảnh đại diện + preview ảnh',
      'AC-06: Panel Ghi chú hiển thị danh sách token placeholder',
    ],
    affectedFiles: [
      'SeoConfigForm.tsx',
      'NewSeoConfigPage.tsx',
      'EditSeoConfigPage.tsx',
    ],
  },
  {
    id: 'REQ-03',
    title: 'Validation dữ liệu',
    description: 'Validate ở cả client và server',
    acceptanceCriteria: [
      'AC-01: Tiêu đề không được rỗng',
      'AC-02: Tên hệ thống không rỗng và phải unique',
      'AC-03: URL không rỗng và phải unique',
      'AC-04: sortOrder là số nguyên >= 0',
      'AC-05: Tiêu đề seo giới hạn 70 ký tự',
      'AC-06: Mô tả seo giới hạn 160 ký tự',
      'AC-07: Công khai và Noindex map đúng boolean',
    ],
    affectedFiles: [
      'seo-config.validator.ts',
      'SeoConfigForm.tsx',
    ],
  },
  {
    id: 'REQ-04',
    title: 'Upload media và lưu ảnh đại diện',
    description: 'Chọn/upload ảnh, preview, lưu URL vào DB',
    acceptanceCriteria: [
      'AC-01: Có nút Chọn hình',
      'AC-02: Sau khi chọn → preview ảnh cập nhật đúng',
      'AC-03: Nếu chưa có ảnh → hiển thị placeholder',
      'AC-04: Giá trị imageUrl/imagePath được lưu vào DB',
    ],
    affectedFiles: [
      'SeoConfigForm.tsx',
    ],
  },
  {
    id: 'REQ-05',
    title: 'Panel Ghi chú — hiển thị token placeholder',
    description: 'Panel Ghi chú hiển thị danh sách token để người dùng tham khảo',
    acceptanceCriteria: [
      'AC-01: Hiển thị đầy đủ token: #goicuoc#, #domain#, #thang#, #view#, #md5#, #zalo#, #facebook#, #mang#, #nam#, #tentieude#, #slug#, #phobien#, #hotline#',
      'AC-02: Trình bày rõ ràng, chia 2 cột',
      'AC-03: Không có form chỉnh sửa trong màn này',
    ],
    affectedFiles: [
      'SeoConfigForm.tsx',
      'src/lib/constants.ts',
    ],
  },
];

// ============================================================
// ⚠️ CONSTRAINTS
// ============================================================

export const CONSTRAINTS = [
  'Không thêm thư viện mới (editor, upload đều dùng component có sẵn)',
  'Phải tuân thủ 3-layer architecture: repository → service → api',
  'Không sửa bất kỳ module nào ngoài seo-config',
  'Không tự ý đổi tên field DB nếu model SeoConfig đã tồn tại và hoạt động',
  'UI phải dùng Bootstrap 5 convention của project',
  'Mật khẩu/secret không lưu trong module này',
];

// ============================================================
// 🔄 IMPLEMENTATION ORDER
// ============================================================

export const IMPLEMENTATION_ORDER = [
  'Bước 1: Đọc prisma/schema.prisma — kiểm tra model SeoConfig đã tồn tại chưa',
  'Bước 2: Nếu chưa có model → thêm vào schema → chạy prisma migrate dev --name add_seo_config',
  'Bước 3: Tạo seo-config.repository.ts (CRUD operations)',
  'Bước 4: Tạo seo-config.service.ts (business logic, validation)',
  'Bước 5: Tạo seo-config.validator.ts (Zod validation)',
  'Bước 6: Tạo API routes (GET list, GET detail, POST, PUT, DELETE)',
  'Bước 7: Test API bằng curl trước khi code UI',
  'Bước 8: Tạo SeoConfigTable.tsx (bảng danh sách)',
  'Bước 9: Tạo SeoConfigFilters.tsx (filter/search)',
  'Bước 10: Tạo SeoConfigForm.tsx (form thêm/sửa, 2 cột, rich editor, upload, SEO, token notes)',
  'Bước 11: Tạo pages: SeoConfigsPage, NewSeoConfigPage, EditSeoConfigPage',
  'Bước 12: Đăng ký routes trong routes/index.ts nếu cần',
];

// ============================================================
// 🧪 TEST STRATEGY
// ============================================================

export const TEST_STRATEGY = {
  apiTests: [
    'GET /admin/api/seo-configs — expect 200, array',
    'GET /admin/api/seo-configs?keyword=test — expect filtered results',
    'POST /admin/api/seo-configs body={} — expect 400 validation error',
    'POST /admin/api/seo-configs body={title:"Test",systemName:"test",url:"/test"} — expect 201 created',
    'PUT /admin/api/seo-configs/1 body={title:"Updated"} — expect 200',
    'DELETE /admin/api/seo-configs/1 — expect 200',
    'DELETE /admin/api/seo-configs/999 — expect 404',
  ],

  manualTests: [
    'Mở /admin/seo-configs → thấy bảng + filter tìm kiếm + nút Thêm mới',
    'Click Thêm mới → form hiện ra với layout 2 cột đúng',
    'Nhập Tiêu đề, Tên hệ thống, URL → Lưu → thấy item mới trong bảng',
    'Click sửa item → form điền đúng dữ liệu cũ',
    'Sửa → Lưu → xem bảng cập nhật đúng',
    'Click xóa → confirm → item biến mất',
    'Upload ảnh đại diện → preview hiện đúng',
    'Nhập SEO fields → Lưu → verify lại dữ liệu',
    'Cột Noindex hiển thị rõ ràng (không trống)',
    'Panel Ghi chú hiển thị đủ 14 tokens',
  ],
};

// ============================================================
// ⚡ ROLLBACK PLAN
// ============================================================

export const ROLLBACK_PLAN = {
  schemaRollback: 'git checkout prisma/schema.prisma && rm -rf prisma/migrations/*/add_seo_config',
  codeRollback: 'git checkout -- src/server/repositories/seo-config.repository.ts src/server/services/seo-config.service.ts src/server/validators/seo-config.validator.ts src/admin/api/seo-configs src/admin/features/seo-config src/admin/layout/seo-config',
  deployRollback: 'Git revert commit hoặc rollback image',
};

// ============================================================
// 🚨 REGRESSION TARGETS
// ============================================================

export const REGRESSION_TARGETS = [
  'Trang public sử dụng SEO config (nếu có middleware/page đọc SeoConfig)',
  'Admin layout không bị ảnh hưởng',
  'Các API routes khác không bị ảnh hưởng',
];

// ============================================================
// 📝 IMPLEMENTATION NOTES
// ============================================================

export const IMPLEMENTATION_NOTES = [
  'Đọc prisma/schema.prisma TRƯỚC — SeoConfig model có thể đã tồn tại',
  'Reference pattern: category.repository.ts + category.service.ts',
  'Editor: tái sử dụng RichTextEditor wrapper có sẵn, không nhúng mới',
  'Upload ảnh: tái sử dụng ImageUploader component có sẵn',
  'NOTE_TOKENS: hardcode constant trong src/lib/constants.ts',
  'SeoConfigListItem type và SeoConfigDetail type thêm vào src/lib/types.ts',
  'Tách implementation: phase 1 (list page), phase 2 (form + media + SEO + notes)',
  'Nếu UI thực tế và code hiện tại khác nhau → ưu tiên theo UI thực tế',
];

// ============================================================
// 👀 UI SCREENS
// ============================================================

export const UI_SCREENS = [
  {
    name: 'seo-config-index',
    route: '/admin/seo-configs',
    description: 'Trang danh sách cấu hình SEO',
    keyElements: [
      'Panel THÔNG TIN TÌM KIẾM (input Từ khóa, nút Tìm kiếm, nút Làm mới)',
      'Panel DANH SÁCH CẤU HÌNH SEO (nút Thêm mới, bảng dữ liệu)',
      'Bảng cột: Url, Tiêu đề, Tiêu đề seo, Tên hệ thống, Noindex, Thứ tự, Công khai, Thao tác',
    ],
    screenshotRef: 'N/A',
  },
  {
    name: 'seo-config-form',
    route: '/admin/seo-configs/new hoặc /admin/seo-configs/:id/edit',
    description: 'Form thêm/sửa cấu hình SEO, layout 2 cột',
    keyElements: [
      'Cột trái: Tiêu đề(*), Tên hệ thống(*), Content Before (rich editor), Content After (rich editor)',
      'Cột phải: Media (upload hình, preview placeholder, Thứ tự, Công khai)',
      'Cột phải: SEO (URL*, Tiêu đề seo 70, Mô tả seo 160, Từ khóa, Canonical, MD5, Noindex)',
      'Cột phải: Ghi chú (14 tokens trong 2 cột)',
    ],
    screenshotRef: 'N/A',
  },
];

// ============================================================
// ✅ CHECKLIST TRƯỚC KHI GỬI PR
// ============================================================

export const PR_CHECKLIST = [
  'Đã kiểm tra prisma/schema.prisma — model SeoConfig đã có hoặc đã migrate',
  'Đã test tất cả 7 API endpoints bằng curl/postman',
  'Đã test UI thủ công theo manualTests',
  'Không sửa file ngoài module seo-config',
  'Code tuân thủ 3-layer architecture',
  'Không thêm thư viện mới',
  'TypeScript compilation không lỗi',
  'Unique validation: systemName và url không trùng',
  'Rich editor và uploader tái sử dụng component có sẵn',
];
