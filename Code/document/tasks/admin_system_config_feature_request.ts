/**
 * ============================================================
 * TASK: System Configuration
 * ============================================================
 */

// ============================================================
// 📋 METADATA
// ============================================================

export const TASK_METADATA = {
  taskName: 'system-config-management',
  module: 'system-config',
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
Xây dựng hoàn thiện trang Cấu hình hệ thống cho admin,
gồm 3 nhóm: Cấu hình chung, Cấu hình mail, Thông tin chung.
Mỗi nhóm là 1 card có thể thu/mở, lưu toàn bộ cùng lúc bằng nút "Lưu".
`;

// ============================================================
// 💾 DATABASE CHANGES
// ============================================================

export const DB_CHANGES = {
  schemaChange: false,

  /**
   * Kiểm tra trước: model SystemConfig có thể đã tồn tại.
   * Nếu chưa có → tạo mới.
   */
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
      path: '/admin/api/system-config',
      description: 'Lấy toàn bộ cấu hình hệ thống (singleton)',
      status: 'new',
      request: {},
      response: {
        success: {
          data: {
            general: 'GeneralConfigFields',
            mail: 'MailConfigFields (password masked)',
            info: 'GeneralInfoFields',
          },
        },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'PUT',
      path: '/admin/api/system-config',
      description: 'Cập nhật toàn bộ 3 nhóm cấu hình cùng lúc (upsert singleton)',
      status: 'new',
      request: {
        body: [
          { name: 'general', type: 'object', required: true },
          { name: 'mail', type: 'object', required: true },
          { name: 'info', type: 'object', required: true },
        ],
      },
      response: {
        success: { message: 'Cập nhật thành công' },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'PUT',
      path: '/admin/api/system-config/mail-password',
      description: 'Đổi mật khẩu SMTP độc lập (không cần submit toàn bộ form)',
      status: 'new',
      request: {
        body: [
          { name: 'newPassword', type: 'string', required: true },
        ],
      },
      response: {
        success: { message: 'Đổi mật khẩu thành công' },
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
    'src/server/repositories/system-config.repository.ts',
    'src/server/services/system-config.service.ts',
    'src/server/validators/system-config.validator.ts',
    'src/admin/api/system-config/route.ts',
    'src/admin/api/system-config/mail-password/route.ts',
    'src/admin/features/system-config/SystemConfigCard.tsx',
    'src/admin/features/system-config/SystemConfigForm.tsx',
    'src/admin/layout/system-config/SystemConfigPage.tsx',
  ],

  filesToModify: [],

  filesToRead: [
    'prisma/schema.prisma — kiểm tra model SystemConfig đã tồn tại chưa',
    'src/server/repositories/seo-config.repository.ts — reference pattern singleton',
    'src/server/services/seo-config.service.ts — reference pattern',
    'src/lib/constants.ts — kiểm tra DEFAULT_PAGE_SIZE hoặc hằng liên quan',
    'src/lib/types.ts — thêm SystemConfig types nếu cần',
    'src/server/errors.ts — error classes',
  ],

  filesToCheck: [
    'src/server/routes/index.ts — đăng ký routes mới',
  ],
};

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  'Chỉ có 1 bản ghi SystemConfig trong DB (singleton)',
  'Lần đầu truy cập nếu chưa có bản ghi → tạo mới với giá trị mặc định',
  'Mật khẩu SMTP không bao giờ trả về dạng plain text từ API (dùng select exclude)',
  'Thời gian truy cập hệ thống: Từ/Đến format HH:MM',
  'searchPageSize dùng làm default pageSize cho admin list queries',
  'SEO fields trong general là fallback global — các trang con có thể override',
  'URL mạng xã hội (Facebook, Zalo, Twitter, YouTube) là optional',
  'Đổi mật khẩu SMTP hoạt động độc lập — không cần submit toàn bộ form',
  'Collapsible state chỉ ảnh hưởng card tương ứng, không ảnh hưởng card khác',
];

// ============================================================
// 📋 REQUIREMENTS
// ============================================================

export const REQUIREMENTS = [
  {
    id: 'REQ-01',
    title: 'Card Cấu hình chung',
    description: 'Thu/thu gọn được, lưu được các trường general config',
    acceptanceCriteria: [
      'AC-01: Load trang hiển thị đúng giá trị đang lưu trong DB',
      'AC-02: Trường: Đường dẫn upload hình ảnh, Thời gian truy cập (Từ/Đến HH:MM), Số hàng hiển thị tìm kiếm (number > 0), Tiêu đề SEO, Từ khóa SEO, Mô tả SEO',
      'AC-03: Icon thu gọn (−) / mở rộng (+) hoạt động đúng',
      'AC-04: Lưu → cập nhật thành công + thông báo',
    ],
    affectedFiles: [
      'SystemConfigCard.tsx',
      'SystemConfigForm.tsx',
      'system-config.service.ts',
    ],
  },
  {
    id: 'REQ-02',
    title: 'Card Cấu hình mail',
    description: 'Thu/thu gọn được, lưu được SMTP config, đổi mật khẩu riêng',
    acceptanceCriteria: [
      'AC-01: Load trang hiển thị đúng cấu hình (mật khẩu luôn masked)',
      'AC-02: Trường: Địa chỉ email, Tên hiển thị, SMTP Host, Port (number), Người dùng, Mật khẩu (masked)',
      'AC-03: Nút "Đổi mật khẩu" màu xanh → mở modal/input → nhập mới → xác nhận → gọi API riêng',
      'AC-04: Đổi mật khẩu hoạt động độc lập — không cần submit toàn bộ form',
      'AC-05: Lưu cấu hình mail không bắt buộc nhập lại mật khẩu nếu không thay đổi',
    ],
    affectedFiles: [
      'SystemConfigCard.tsx',
      'SystemConfigForm.tsx',
      'src/admin/api/system-config/mail-password/route.ts',
    ],
  },
  {
    id: 'REQ-03',
    title: 'Card Thông tin chung',
    description: 'Thu/thu gọn được, icon sửa và làm mới hoạt động đúng',
    acceptanceCriteria: [
      'AC-01: Load trang hiển thị đúng thông tin đơn vị',
      'AC-02: Trường: Tên đơn vị, Tên viết tắt, Địa chỉ, Điện thoại, Fax, Email, Website, Copyright, Facebook, Zalo, Twitter, YouTube, Nội dung website (textarea)',
      'AC-03: Layout 2 cột cho phần lớn fields, textarea "Nội dung website" chiếm full width',
      'AC-04: Tất cả trường là optional',
      'AC-05: Icon sửa (bút chì) hoạt động đúng',
      'AC-06: Icon làm mới (↺) reload/reset data về giá trị từ DB',
    ],
    affectedFiles: [
      'SystemConfigCard.tsx',
      'SystemConfigForm.tsx',
    ],
  },
  {
    id: 'REQ-04',
    title: 'Nút Lưu toàn trang',
    description: 'Lưu cả 3 section cùng lúc, loading state, error handling',
    acceptanceCriteria: [
      'AC-01: Click Lưu → gửi payload chứa đủ 3 nhóm cấu hình',
      'AC-02: Hiển thị loading state khi đang lưu',
      'AC-03: Thành công → thông báo toast/alert',
      'AC-04: Thất bại → hiển thị lỗi rõ ràng, không mất dữ liệu đã nhập',
      'AC-05: Lỗi validation field cụ thể → highlight đúng trường trong đúng section',
      'AC-06: Nút Lưu màu xanh lá, cố định góc dưới phải hoặc cuối trang',
    ],
    affectedFiles: [
      'SystemConfigForm.tsx',
      'SystemConfigPage.tsx',
    ],
  },
];

// ============================================================
// ⚠️ CONSTRAINTS
// ============================================================

export const CONSTRAINTS = [
  'Không thêm thư viện mới',
  'Phải tuân thủ 3-layer architecture: repository → service → api',
  'Không sửa bất kỳ module nào ngoài system-config',
  'UI phải dùng Bootstrap 5 convention của project (btn btn-success cho Lưu)',
  'Mật khẩu SMTP phải được hash/encrypt trước khi lưu',
  'Không bao giờ trả mật khẩu plain text về client',
  'Collapsible UI dùng React useState — không cần thư viện mới',
  'Textarea "Nội dung website" dùng plain textarea — không cần CKEditor',
];

// ============================================================
// 🔄 IMPLEMENTATION ORDER
// ============================================================

export const IMPLEMENTATION_ORDER = [
  'Bước 1: Đọc prisma/schema.prisma — kiểm tra model SystemConfig đã tồn tại chưa',
  'Bước 2: Nếu chưa có → thêm vào schema → chạy prisma migrate dev --name add_system_config',
  'Bước 3: Tạo system-config.repository.ts (singleton pattern: findFirst + upsert)',
  'Bước 4: Tạo system-config.service.ts (business logic)',
  'Bước 5: Tạo system-config.validator.ts (Zod validation)',
  'Bước 6: Tạo API routes (GET, PUT, PUT mail-password)',
  'Bước 7: Test API bằng curl trước khi code UI',
  'Bước 8: Tạo SystemConfigCard.tsx (1 component dùng chung cho 3 cards)',
  'Bước 9: Tạo SystemConfigForm.tsx (3 section forms)',
  'Bước 10: Tạo SystemConfigPage.tsx (layout + nút Lưu)',
  'Bước 11: Đăng ký route /admin/system-config',
];

// ============================================================
// 🧪 TEST STRATEGY
// ============================================================

export const TEST_STRATEGY = {
  apiTests: [
    'GET /admin/api/system-config — expect 200, có 3 nhóm data',
    'PUT /admin/api/system-config body={} — expect validation error',
    'PUT /admin/api/system-config body={general:{uploadPath:"/uploads"},mail:{},info:{}} — expect 200',
    'PUT /admin/api/system-config/mail-password body={newPassword:"test"} — expect 200',
    'GET /admin/api/system-config — verify password không nằm trong response',
  ],

  manualTests: [
    'Load /admin/system-config → 3 card hiển thị đầy đủ dữ liệu',
    'Thu gọn từng card → body ẩn; mở lại → body hiện',
    'Sửa uploadPath → Lưu → reload trang → giá trị mới hiển thị',
    'Sửa searchPageSize → Lưu → kiểm tra page size trong list admin',
    'Sửa SEO title → Lưu → kiểm tra meta tag nếu có dùng',
    'Đổi mật khẩu SMTP → xác nhận → verify không crash',
    'Bấm Lưu khi có lỗi → thông báo lỗi đúng, form không reset',
    'Icon làm mới (↺) → data reset về giá trị DB',
    'Collapse/expand từng card → không ảnh hưởng card khác',
  ],
};

// ============================================================
// ⚡ ROLLBACK PLAN
// ============================================================

export const ROLLBACK_PLAN = {
  schemaRollback: 'git checkout prisma/schema.prisma && rm -rf prisma/migrations/*/add_system_config',
  codeRollback: 'git checkout -- src/server/repositories/system-config.repository.ts src/server/services/system-config.service.ts src/server/validators/system-config.validator.ts src/admin/api/system-config src/admin/features/system-config src/admin/layout/system-config',
  deployRollback: 'Git revert commit hoặc rollback image',
};

// ============================================================
// 🚨 REGRESSION TARGETS
// ============================================================

export const REGRESSION_TARGETS = [
  'Trang admin dùng searchPageSize từ config',
  'Middleware kiểm soát giờ hoạt động nếu có (đọc accessTime từ DB)',
  'Gửi mail SMTP — nếu thay đổi cấu hình mail phải test gửi mail thật',
];

// ============================================================
// 📝 IMPLEMENTATION NOTES
// ============================================================

export const IMPLEMENTATION_NOTES = [
  'Đọc prisma/schema.prisma TRƯỚC — SystemConfig có thể đã tồn tại',
  'Pattern singleton: repository dùng findFirst() thay vì findById()',
  'Upsert singleton: prisma.systemConfig.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } })',
  'Không trả mật khẩu SMTP về response GET — dùng select để exclude',
  'Collapsible: dùng React useState với object { general: true, mail: true, info: true }',
  'Giữ nguyên Bootstrap 5 UI convention — không import thư viện UI mới',
  'Trước khi sửa, tóm tắt file nào sẽ thay đổi và lý do',
  'Sau khi sửa, liệt kê cách test thủ công từng REQ',
];

// ============================================================
// 👀 UI SCREENS
// ============================================================

export const UI_SCREENS = [
  {
    name: 'system-config-page',
    route: '/admin/system-config',
    description: 'Trang cấu hình hệ thống',
    keyElements: [
      'Card CẤU HÌNH CHUNG (collapse/expand, icon −/+)',
      'Card CẤU HÌNH MAIL (collapse/expand, nút Đổi mật khẩu xanh)',
      'Card THÔNG TIN CHUNG (collapse/expand, icon sửa, icon làm mới ↺)',
      'Nút Lưu màu xanh lá (góc dưới phải hoặc cuối trang)',
      'Trường mật khẩu SMTP luôn masked',
    ],
    screenshotRef: 'N/A',
  },
];

// ============================================================
// ✅ CHECKLIST TRƯỚC KHI GỬI PR
// ============================================================

export const PR_CHECKLIST = [
  'Đã kiểm tra prisma/schema.prisma — SystemConfig đã có hoặc đã migrate',
  'Đã test GET/PUT system-config và PUT mail-password bằng curl',
  'Đã test UI: collapse/expand, đổi mật khẩu, Lưu toàn trang',
  'Mật khẩu SMTP không bao giờ trả về plain text',
  'Không sửa file ngoài module system-config',
  'Code tuân thủ 3-layer architecture',
  'Không thêm thư viện mới',
  'TypeScript compilation không lỗi',
];
