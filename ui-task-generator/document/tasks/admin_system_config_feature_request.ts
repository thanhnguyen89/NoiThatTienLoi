/**
 * Feature request: System Configuration (Cấu hình hệ thống)
 * Extracted from UI screenshot — admin panel.
 * Purpose: give Claude Code / terminal agent a precise, machine-readable brief.
 *
 * Route observed: /admin/system-config (breadcrumb: "Cấu hình hệ thống")
 * UI pattern: single page with 3 collapsible card sections + 1 global Lưu button.
 */

export type SystemConfigSectionId =
  | 'general'   // CẤU HÌNH CHUNG
  | 'mail'      // CẤU HÌNH MAIL
  | 'info';     // THÔNG TIN CHUNG

export interface ScreenReference {
  name: string;
  purpose: string;
  keyElements: string[];
}

export interface RequirementItem {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

export interface SystemConfigFeatureRequest {
  module: string;
  goal: string;
  context: string[];
  observedScreens: ScreenReference[];
  requirements: RequirementItem[];
  businessRules: string[];
  implementationHints: string[];
  suggestedFilesToInspect: string[];
  expectedFlow: string[];
  notesForClaudeCode: string[];
}

// ============================================================
// DATA SHAPE (from screenshot analysis)
// ============================================================

/**
 * CẤU HÌNH CHUNG — General system config
 */
export interface GeneralConfigFields {
  uploadPath: string;            // Đường dẫn upload hình ảnh
  accessTimeFrom: string;        // Thời gian truy cập hệ thống — Từ (VD: "00:00")
  accessTimeTo: string;          // Thời gian truy cập hệ thống — Đến (VD: "23:59")
  searchPageSize: number;        // Số hàng hiển thị khi load danh sách tìm kiếm
  seoTitle: string;              // Tiêu đề SEO
  seoKeywords: string;           // Từ khóa SEO
  seoDescription: string;        // Mô tả SEO
}

/**
 * CẤU HÌNH MAIL — Mail SMTP config
 */
export interface MailConfigFields {
  emailAddress: string;          // Địa chỉ email
  emailDisplayName: string;      // Tên hiển thị email
  host: string;                  // SMTP Host
  port: number;                  // Cổng (VD: 9045)
  username: string;              // Người dùng
  password: string;              // Mật khẩu (masked, editable via "Đổi mật khẩu" action)
}

/**
 * THÔNG TIN CHUNG — General organization info
 */
export interface GeneralInfoFields {
  unitName: string;              // Tên đơn vị
  unitShortName: string;         // Tên viết tắt
  address: string;               // Địa chỉ
  phone: string;                 // Điện thoại
  fax: string;                   // Fax
  email: string;                 // Email liên hệ
  website: string;               // Website URL
  copyright: string;             // Copyright
  facebook: string;              // Facebook URL
  zalo: string;                  // Zalo
  twitter: string;               // Twitter
  youtube: string;               // Youtube
  websiteContent: string;        // Nội dung website (textarea — SEO / intro text)
}

// ============================================================
// FEATURE REQUEST
// ============================================================

export const SYSTEM_CONFIG_FEATURE_REQUEST: SystemConfigFeatureRequest = {
  module: 'System Config',
  goal:
    'Xây dựng hoặc hoàn thiện trang Cấu hình hệ thống cho admin, bao gồm 3 nhóm cấu hình: Cấu hình chung, Cấu hình mail, và Thông tin chung. Mỗi nhóm là một card có thể thu/mở, toàn bộ lưu cùng lúc bằng nút "Lưu" ở cuối trang.',

  context: [
    'Trang nằm ở route admin, breadcrumb hiển thị "Cấu hình hệ thống".',
    'Giao diện chia thành 3 card section: CẤU HÌNH CHUNG, CẤU HÌNH MAIL, THÔNG TIN CHUNG.',
    'Mỗi card có icon thu gọn (−) và mở rộng toàn màn hình (□) ở góc trên phải.',
    'Card THÔNG TIN CHUNG có thêm icon sửa (bút chì) và làm mới (↺) ngoài icon thu gọn.',
    'Nút "Lưu" màu xanh lá nằm ở góc dưới phải màn hình, lưu toàn bộ 3 section cùng lúc.',
    'Trường Mật khẩu ở CẤU HÌNH MAIL hiển thị dạng masked, có nút "Đổi mật khẩu" màu xanh riêng.',
    'Model SystemConfig có thể đã tồn tại trong Prisma schema — cần kiểm tra trước khi tạo mới.',
  ],

  observedScreens: [
    {
      name: 'system-config-page',
      purpose: 'Trang duy nhất quản lý toàn bộ cấu hình hệ thống',
      keyElements: [
        'Card section "CẤU HÌNH CHUNG" — collapse/expand',
        'Card section "CẤU HÌNH MAIL" — collapse/expand',
        'Card section "THÔNG TIN CHUNG" — collapse/expand/edit/refresh',
        'Nút "Lưu" toàn trang (góc dưới phải)',
        'Nút "Đổi mật khẩu" trong CẤU HÌNH MAIL',
      ],
    },
    {
      name: 'change-password-modal',
      purpose: 'Popup hoặc inline form để thay đổi mật khẩu SMTP riêng biệt',
      keyElements: [
        'Input mật khẩu mới',
        'Nút xác nhận / hủy',
      ],
    },
  ],

  requirements: [
    {
      id: 'REQ-01',
      title: 'Hiển thị và lưu CẤU HÌNH CHUNG',
      description:
        'Card đầu tiên chứa các trường: đường dẫn upload hình ảnh, thời gian truy cập hệ thống (Từ/Đến dạng time picker hoặc text), số hàng hiển thị tìm kiếm, tiêu đề SEO, từ khóa SEO, mô tả SEO.',
      acceptanceCriteria: [
        'Load trang hiển thị đúng giá trị đang lưu trong DB.',
        'Thời gian truy cập có 2 input riêng: "Từ" và "Đến" với format HH:MM.',
        'Số hàng hiển thị là input number, giá trị dương.',
        'Các trường SEO (tiêu đề, từ khóa, mô tả) hỗ trợ text dài.',
        'Bấm "Lưu" cập nhật thành công và hiển thị thông báo.',
      ],
    },
    {
      id: 'REQ-02',
      title: 'Hiển thị và lưu CẤU HÌNH MAIL',
      description:
        'Card thứ hai chứa các trường SMTP: địa chỉ email, tên hiển thị, host, cổng (port), người dùng, mật khẩu (masked). Mật khẩu có nút "Đổi mật khẩu" riêng biệt.',
      acceptanceCriteria: [
        'Load trang hiển thị đúng cấu hình mail đã lưu (mật khẩu luôn masked).',
        'Trường port là input number.',
        'Nút "Đổi mật khẩu" mở form/modal cho phép nhập mật khẩu mới.',
        'Đổi mật khẩu hoạt động độc lập — không cần submit toàn bộ form.',
        'Lưu cấu hình mail không bắt buộc phải nhập lại mật khẩu nếu không thay đổi.',
      ],
    },
    {
      id: 'REQ-03',
      title: 'Hiển thị và lưu THÔNG TIN CHUNG',
      description:
        'Card thứ ba chứa thông tin đơn vị: tên, tên viết tắt, địa chỉ, điện thoại, fax, email, website, copyright, facebook, zalo, twitter, youtube, và textarea nội dung website.',
      acceptanceCriteria: [
        'Load trang hiển thị đúng thông tin đơn vị.',
        'Bố cục 2 cột (trái/phải) cho phần lớn fields, textarea "Nội dung website" chiếm full width bên dưới.',
        'Tất cả trường là optional — không bắt buộc.',
        'Nội dung website là textarea hỗ trợ nhiều dòng.',
        'Icon sửa (bút chì) và làm mới (↺) hoạt động đúng chức năng.',
      ],
    },
    {
      id: 'REQ-04',
      title: 'Collapsible card sections',
      description:
        'Mỗi card section có thể thu gọn / mở rộng bằng icon "−" / "+" ở góc trên phải header. Card THÔNG TIN CHUNG có thêm icon làm mới và sửa.',
      acceptanceCriteria: [
        'Click icon "−" thu gọn body của card đó.',
        'Click icon "+" mở lại body của card.',
        'State collapse/expand chỉ ảnh hưởng đến card tương ứng, không ảnh hưởng card khác.',
        'Icon làm mới (↺) ở THÔNG TIN CHUNG reload/reset data về giá trị từ DB.',
      ],
    },
    {
      id: 'REQ-05',
      title: 'Nút Lưu toàn trang',
      description:
        'Nút "Lưu" màu xanh lá cố định ở góc dưới phải (hoặc cuối trang), khi click sẽ submit và lưu đồng thời cả 3 section.',
      acceptanceCriteria: [
        'Click Lưu → gửi payload chứa đủ 3 nhóm cấu hình.',
        'Hiển thị trạng thái loading khi đang lưu.',
        'Thành công → hiển thị thông báo (toast hoặc alert).',
        'Thất bại → hiển thị lỗi rõ ràng, không mất dữ liệu đã nhập.',
        'Nếu có lỗi validation field cụ thể → highlight đúng trường lỗi trong đúng section.',
      ],
    },
    {
      id: 'REQ-06',
      title: 'Đổi mật khẩu SMTP độc lập',
      description:
        'Nút "Đổi mật khẩu" trong CẤU HÌNH MAIL cho phép thay đổi password SMTP mà không cần lưu toàn bộ form.',
      acceptanceCriteria: [
        'Click "Đổi mật khẩu" → mở modal hoặc inline input.',
        'Nhập mật khẩu mới → xác nhận → gọi API riêng để cập nhật.',
        'Sau khi đổi thành công → trường mật khẩu vẫn hiển thị dạng masked.',
        'Có nút Hủy để đóng modal không lưu.',
      ],
    },
  ],

  businessRules: [
    'Chỉ có 1 bản ghi SystemConfig duy nhất trong DB (singleton config).',
    'Lần đầu truy cập nếu chưa có bản ghi → tạo mới với giá trị mặc định.',
    'Mật khẩu SMTP không bao giờ trả về dạng plain text từ API — chỉ để cập nhật.',
    'Thời gian truy cập hệ thống có thể dùng để kiểm soát giờ hoạt động của site (nếu có middleware tương ứng).',
    'Số hàng hiển thị tìm kiếm (searchPageSize) dùng làm default pageSize cho admin list queries.',
    'SEO fields (tiêu đề, từ khóa, mô tả) của SystemConfig là fallback global — các trang con có thể override.',
    'Toàn bộ các URL mạng xã hội (Facebook, Zalo, Twitter, YouTube) là optional.',
  ],

  implementationHints: [
    'Kiểm tra prisma/schema.prisma — model SystemConfig có thể đã tồn tại.',
    'Nếu SystemConfig chưa có, tạo model singleton với upsert pattern (findFirst + upsert).',
    'Tham khảo pattern của seo-config module (CRUD đơn giản) nếu đã có sẵn.',
    'API route nên dùng GET để load và PUT để cập nhật (singleton — không cần POST create riêng).',
    'Mật khẩu SMTP phải được hash hoặc encrypt trước khi lưu (bcrypt hoặc AES tùy project).',
    'Endpoint "Đổi mật khẩu" nên là PUT /admin/api/system-config/mail-password riêng.',
    'Collapsible cards implement bằng React state (useState) — không cần thư viện mới.',
    'Nút Lưu dùng Bootstrap class "btn btn-success" theo convention project (Bootstrap 5).',
    'Textarea "Nội dung website" không cần CKEditor — plain textarea đủ.',
    'Kiểm tra src/lib/constants.ts xem có DEFAULT_PAGE_SIZE hoặc hằng tương tự không.',
  ],

  suggestedFilesToInspect: [
    'prisma/schema.prisma — kiểm tra model SystemConfig',
    'src/server/validators/system-config.validator.ts (nếu đã có)',
    'src/server/repositories/system-config.repository.ts (nếu đã có)',
    'src/server/services/system-config.service.ts (nếu đã có)',
    'src/admin/api/system-config/route.ts (nếu đã có)',
    'src/admin/features/system-config/ (thư mục nếu đã có)',
    'src/admin/layout/system-config/SystemConfigPage.tsx (nếu đã có)',
    'src/server/validators/seo-config.validator.ts — reference pattern đơn giản',
    'src/server/repositories/seo-config.repository.ts — reference pattern đơn giản',
    'src/lib/constants.ts — xem có DEFAULT_PAGE_SIZE không',
    'src/lib/types.ts — xem shared types liên quan',
    'src/server/errors.ts — error classes',
  ],

  expectedFlow: [
    'Admin truy cập trang /admin/system-config',
    'Trang load → GET API trả về toàn bộ config hiện tại',
    'Form hiển thị 3 card với dữ liệu đã điền sẵn',
    'Admin chỉnh sửa field bất kỳ trong card bất kỳ',
    'Nếu cần đổi mật khẩu SMTP → click "Đổi mật khẩu" → nhập mới → xác nhận',
    'Admin bấm nút "Lưu" ở cuối trang',
    'PUT API nhận payload 3 nhóm → validate → upsert DB',
    'Hiển thị thông báo thành công / thất bại',
    'Admin có thể thu gọn/mở rộng từng card để dễ đọc',
  ],

  notesForClaudeCode: [
    'Đọc prisma/schema.prisma TRƯỚC — model SystemConfig có thể đã tồn tại, tránh tạo lại.',
    'Nếu chưa có model, thêm vào schema rồi chạy: npx prisma migrate dev --name add_system_config',
    'Pattern singleton: repository dùng findFirst() thay vì findById().',
    'Upsert pattern cho singleton: prisma.systemConfig.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } }).',
    'Không trả mật khẩu SMTP về response GET — dùng select để exclude field password.',
    'Collapsible UI: dùng React useState với object { general: true, mail: true, info: true }.',
    'Giữ nguyên Bootstrap 5 UI convention — không import thư viện UI mới.',
    'Trước khi sửa, tóm tắt file nào sẽ thay đổi và lý do.',
    'Sau khi sửa, liệt kê cách test thủ công từng REQ.',
    'Không sửa bất kỳ module nào ngoài system-config và shared types nếu cần.',
  ],
};

// ============================================================
// TASK CONTROL (Level 2)
// ============================================================

export const TASK_CONTROL = {
  taskSource: 'screenshot' as const,
  affectedLayers: ['validator', 'repository', 'service', 'api', 'ui'] as const,
  riskLevel: 'medium' as const,
  rollbackPlan:
    'Nếu upsert SystemConfig làm lỗi query hiện tại, revert file repository và schema về trạng thái cũ.',
  regressionTargets: [
    'Các trang admin dùng searchPageSize từ config',
    'Middleware truy cập hệ thống nếu đang đọc accessTime từ DB',
    'Gửi mail SMTP — nếu thay đổi cấu hình mail phải test gửi mail thật',
  ],
  manualQaChecklist: [
    'Load trang → 3 card hiển thị đầy đủ dữ liệu',
    'Thu gọn từng card → body ẩn; mở lại → body hiện',
    'Sửa uploadPath → Lưu → reload lại trang xem giá trị mới',
    'Sửa searchPageSize → Lưu → vào trang danh sách admin xem có đổi pageSize không',
    'Sửa SEO title → Lưu → kiểm tra API hoặc meta tag nếu có dùng',
    'Đổi mật khẩu SMTP → xác nhận → kiểm tra mail gửi thật nếu có thể',
    'Bấm Lưu khi có lỗi validation → thông báo lỗi đúng, form không reset',
    'Icon làm mới (↺) ở THÔNG TIN CHUNG → data reset về giá trị DB',
  ],
};

export default SYSTEM_CONFIG_FEATURE_REQUEST;
