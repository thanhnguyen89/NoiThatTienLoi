/**
 * ============================================================
 * TASK TEMPLATE — WEB BÁN HÀNG NỘI THẤT SÀT
 * ============================================================
 * Mục đích: Cấu trúc chuẩn để senior backend developer code chính xác.
 * Cách dùng:
 * - Copy file này → rename theo task
 * - Điền đầy đủ tất cả sections theo thứ tự
 * - KHÔNG bỏ qua section nào (mark N/A nếu không áp dụng)
 */

// ============================================================
// 📋 METADATA
// ============================================================

export const TASK_METADATA = {
  /** Tên task (slug, không dấu cách) */
  taskName: 'ten-task',
  /** Module: menu | product | category | seo-config | system-config | ... */
  module: 'module-name',
  /** Loại task */
  type: 'feature' as 'feature' | 'bugfix' | 'refactor' | 'enhancement',
  /** Độ ưu tiên */
  priority: 'high' as 'low' | 'medium' | 'high' | 'critical',
  /** Nguồn task: screenshot | discussion | bug-report | user-request */
  source: 'screenshot' as 'screenshot' | 'discussion' | 'bug-report' | 'user-request',
  /** Ai làm (để trống nếu chưa assign) */
  assignee: '',
  /** Ngày tạo: YYYY-MM-DD */
  createdAt: '2026-04-02',
};

// ============================================================
// 🎯 MỤC TIÊU
// ============================================================

export const TASK_GOAL = `
Mục tiêu: [1-2 câu mô tả ngắn gọn mục tiêu cuối cùng]
`;

// ============================================================
// 💾 DATABASE CHANGES
// ============================================================

export const DB_CHANGES = {
  /** Có thay đổi schema Prisma không? */
  schemaChange: false,

  /**
   * Nếu có schemaChange: mô tả chính xác thay đổi
   * Format: ADD | MODIFY | REMOVE | RENAME
   */
  migrations: [
    // Ví dụ:
    // {
    //   action: 'ADD',
    //   model: 'SeoConfig',
    //   field: 'md5Keyword',
    //   type: 'String?',
    //   description: 'Thêm field md5Keyword để lưu hash của keyword',
    // },
  ],

  /** Model mới cần tạo */
  newModels: [
    // Ví dụ:
    // {
    //   name: 'SeoConfig',
    //   fields: [
    //     { name: 'id', type: 'Int', isId: true, isAutoIncrement: true },
    //     { name: 'title', type: 'String' },
    //   ],
    // },
  ],
};

// ============================================================
// 🔌 API CONTRACTS
// ============================================================

export const API_CONTRACTS = {
  /**
   * Mô tả từng endpoint. Nếu endpoint đã tồn tại → ghi rõ CHỈ THAY ĐỔI gì.
   */
  endpoints: [
    {
      method: 'GET' as const,
      path: '/admin/api/ten-module',
      description: 'Lấy danh sách',
      status: 'new' as 'new' | 'modify' | 'existing',
      request: {
        queryParams: [
          // { name: 'keyword', type: 'string', required: false },
        ],
      },
      response: {
        success: {
          data: 'Item[]',
          pagination: '{ total, page, pageSize }',
        },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A hoặc mô tả thay đổi so với hiện tại',
    },
    // Thêm các endpoint khác...
  ],
};

// ============================================================
// 📂 FILE STRUCTURE
// ============================================================

export const FILE_STRUCTURE = {
  /**
   * Files cần tạo mới
   */
  filesToCreate: [
    // Ví dụ:
    // 'src/server/repositories/seo-config.repository.ts',
    // 'src/server/services/seo-config.service.ts',
  ],

  /**
   * Files cần sửa — ghi rõ CHỈNH SỬA GÌ trong mỗi file
   */
  filesToModify: [
    // Ví dụ:
    // {
    //   path: 'src/admin/features/seo-config/SeoConfigTable.tsx',
    //   changes: 'Thêm cột md5Keyword, noindex',
    // },
  ],

  /**
   * Files chỉ để đọc tham khảo (không sửa)
   */
  filesToRead: [
    // Ví dụ:
    // 'src/admin/features/category/CategoryTable.tsx — reference pattern',
  ],

  /**
   * Files bị ảnh hưởng (side effect, cần check không bị lỗi)
   */
  filesToCheck: [
    // Ví dụ:
    // 'src/server/routes/index.ts — kiểm tra route đã registered chưa',
  ],
};

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  // Ví dụ:
  // 'Field title là bắt buộc, không được rỗng',
  // 'Field url phải unique trong toàn bộ bảng',
  // 'softDelete = true → record không hiển thị trong list nhưng vẫn tồn tại trong DB',
];

// ============================================================
// 📋 REQUIREMENTS
// ============================================================

export const REQUIREMENTS = [
  {
    id: 'REQ-01',
    title: 'Tiêu đề requirement',
    description: 'Mô tả chi tiết requirement',
    acceptanceCriteria: [
      'AC-01: Mô tả tiêu chí chấp nhận 1',
      'AC-02: Mô tả tiêu chí chấp nhận 2',
    ],
    affectedFiles: [
      // 'SeoConfigTable.tsx',
      // 'seo-config.repository.ts',
    ],
  },
];

// ============================================================
// ⚠️ CONSTRAINTS (Ràng buộc)
// ============================================================

export const CONSTRAINTS = [
  // Ví dụ:
  // 'Không thêm thư viện mới',
  // 'Phải tuân thủ 3-layer architecture: repository → service → api',
  // 'Không sửa bất kỳ module nào ngoài module hiện tại',
  // 'UI phải dùng Bootstrap 5 convention của project',
];

// ============================================================
// 🔄 IMPLEMENTATION ORDER
// ============================================================

export const IMPLEMENTATION_ORDER = [
  // Thứ tự chính xác senior dev phải làm theo
  'Bước 1: Kiểm tra Prisma schema — xem model đã tồn tại chưa',
  'Bước 2: Nếu cần schema change → chạy prisma migrate',
  'Bước 3: Tạo repository (database access layer)',
  'Bước 4: Tạo service (business logic layer)',
  'Bước 5: Tạo/verify API routes',
  'Bước 6: Tạo UI components',
  'Bước 7: Test từng endpoint bằng Postman/curl trước khi code UI',
];

// ============================================================
// 🧪 TEST STRATEGY
// ============================================================

export const TEST_STRATEGY = {
  /** Test API bằng curl/postman */
  apiTests: [
    // Ví dụ:
    // 'GET /admin/api/seo-configs — expect 200, array',
    // 'POST /admin/api/seo-configs body={title:""} — expect 400 validation error',
  ],

  /** Test thủ công UI */
  manualTests: [
    // Ví dụ:
    // 'Mở /admin/seo-configs → thấy bảng với đầy đủ cột',
    // 'Click Thêm mới → form hiện ra → nhập title → Lưu → thấy item mới trong bảng',
  ],
};

// ============================================================
// ⚡ ROLLBACK PLAN
// ============================================================

export const ROLLBACK_PLAN = {
  /** Nếu migrate lỗi */
  schemaRollback: 'git revert migration file + git checkout prisma/schema.prisma',
  /** Nếu code lỗi */
  codeRollback: 'git stash or revert specific files listed in filesToModify',
  /** Nếu deploy lỗi */
  deployRollback: 'Git revert commit hoặc rollback image',
};

// ============================================================
// 🚨 REGRESSION TARGETS
// ============================================================

export const REGRESSION_TARGETS = [
  // Các module/features có thể bị ảnh hưởng — cần test lại
  // Ví dụ:
  // 'Trang public hiển thị SEO config',
  // 'Admin list dùng chung repository pattern',
];

// ============================================================
// 📝 IMPLEMENTATION NOTES
// ============================================================

export const IMPLEMENTATION_NOTES = [
  // Ghi chú đặc biệt cho senior dev
  // Ví dụ:
  // 'Pattern reference: tham khảo category.repository.ts — implement tương tự',
  // 'Upload ảnh: tái sử dụng ImageUploader component đã có',
  // 'Enum values lấy từ src/lib/constants.ts',
];

// ============================================================
// 👀 UI SCREENS (nếu có screenshot/UI mockup)
// ============================================================

export const UI_SCREENS = [
  {
    name: 'screen-name',
    route: '/admin/ten-module',
    description: 'Mô tả màn hình',
    keyElements: [
      // ['element-1', 'element-2', '...'],
    ],
    screenshotRef: 'link-to-screenshot or N/A',
  },
];

// ============================================================
// ✅ CHECKLIST TRƯỚC KHI GỬI PR
// ============================================================

export const PR_CHECKLIST = [
  'Đã chạy prisma migrate (nếu có schema change)',
  'Đã test tất cả API endpoints bằng curl/postman',
  'Đã test UI thủ công theo manualTests',
  'Không sửa file ngoài module được phép',
  'Code tuân thủ 3-layer architecture',
  'Không thêm thư viện mới',
  'TypeScript compilation không lỗi',
];
