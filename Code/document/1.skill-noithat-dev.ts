/**
 * Skill: noithat-dev
 * Reusable coding skill cho dự án Nội Thất Tiện Lợi
 * File này chứa dữ liệu cấu trúc để Claude tự động đọc và tuân thủ khi làm việc với project.
 */

export const SKILL_METADATA = {
  name: 'noithat-dev',
  version: '1.0.0',
  description: 'Reusable coding skill cho dự án Next.js e-commerce Nội Thất Tiện Lợi',
  trigger: 'Khi làm việc với bất kỳ task nào trong dự án Nội Thất Tiện Lợi',
} as const;

// ============================================================
// PROJECT CONTEXT
// ============================================================

export const PROJECT_CONTEXT = {
  name: 'Nội Thất Tiện Lợi',
  type: 'Next.js 15 E-commerce',
  techStack: {
    framework: 'Next.js 15 + React 19 + TypeScript',
    database: 'PostgreSQL + Prisma ORM',
    ui: 'Bootstrap 5 + Bootstrap Icons',
    richText: 'CKEditor 5',
    validation: 'Zod',
    auth: 'JWT cookie-based',
  },
  rootPath: 'D:/Website/NoiThatTienLoi/Html/Code',
  srcPath: 'D:/Website/NoiThatTienLoi/Html/Code/src',
} as const;

// ============================================================
// FOLDER STRUCTURE
// ============================================================

export const FOLDER_STRUCTURE = {
  'src/app': 'Next.js App Router (server pages)',
  'src/admin': {
    '': 'Client components cho admin panel',
    'api': 'API routes (thin wrappers, chỉ gọi service)',
    'components': 'Shared components (ImageUploader, RichTextEditor, FormWrapper...)',
    'features': 'Feature modules (Table, Form, Filters — đặt theo tên model)',
    'layout': 'Page-level server components (CategoriesPage, NewCategoryPage...)',
  },
  'src/server': {
    'repositories': 'Data access — Prisma queries, select tối giản',
    'services': 'Business logic — validation Zod, gọi repository',
    'validators': 'Zod schemas + type inference',
  },
  'src/site': {
    '': 'Public site pages',
    'api': 'Public API routes (không auth)',
    'features': 'Feature components (home, product, contact...)',
    'layout': 'Page layouts',
    'shared': 'Shared components (Breadcrumb, Pagination...)',
    'assets/styles': 'CSS styles',
  },
  'src/lib': {
    'types.ts': 'Shared TypeScript types (PaginationParams, PaginatedResult, ApiResponse...)',
    'constants.ts': 'Constants (PAGINATION, PRODUCT_SORT_OPTIONS, labels...)',
    'utils.ts': 'Helpers (formatPrice, createSlug, calcDiscountPercent...)',
    'prisma.ts': 'Prisma client singleton',
    'db-safe.ts': 'Database safe utilities',
  },
  'prisma': {
    'schema.prisma': 'Database schema — tất cả models',
  },
} as const;

// ============================================================
// DATABASE MODELS
// ============================================================

export const DATABASE_MODELS = [
  'Category',
  'CategoryPlatformSeo',
  'CategoryPlatformImage',
  'Product',
  'ProductVariant',
  'ProductSize',
  'ProductColor',
  'ProductImage',
  'ProductMedia',
  'ProductSeoPlatform',
  'ProductSeoMedia',
  'ProductPlatformImage',
  'Slider',
  'SliderPicture',
  'Inquiry',
  'AdminUser',
  'AdminRole',
  'AdminPermission',
  'AdminRolePermission',
  'AdminSession',
  'AdminActivityLog',
  'SeoConfig',
  'CatalogRedirect',
  'CatalogTextToLink',
  'NewsContent',
  'NewsCategory',
  'NewsRelated',
  'Page',
  'Menu',
  'MenuLink',
  'CatalogEmbedCode',
  'CatalogNewsLevel',
  'SystemConfig',
  'SliderPicture',
  'UrlRecord',
  'UrlRecordReference',
] as const;

// ============================================================
// MODULE REFERENCE
// ============================================================

export const MODULE_REFERENCE = {
  fullCRUD: [
    { module: 'category', reason: 'CRUD + platformSeos + platformImages + parent tree + upsert transaction' },
    { module: 'product', reason: 'CRUD + variants + images + media + SEO 4 platform + pagination admin list' },
  ],
  simpleCRUD: [
    { module: 'slider', reason: 'CRUD đơn giản' },
    { module: 'product-color', reason: 'CRUD đơn giản' },
    { module: 'product-size', reason: 'CRUD đơn giản' },
    { module: 'seo-config', reason: 'CRUD đơn giản' },
    { module: 'catalog-redirect', reason: 'CRUD đơn giản' },
    { module: 'catalog-text-to-link', reason: 'CRUD đơn giản' },
    { module: 'admin-user', reason: 'CRUD + role assignment' },
    { module: 'admin-role', reason: 'CRUD + permission assignment' },
  ],
  defaultReference: 'category hoặc product — luôn dùng làm reference khi tạo module mới',
} as const;

// ============================================================
// NAMING CONVENTIONS
// ============================================================

export const NAMING_CONVENTIONS = {
  fileExtension: {
    tsx: 'kebab-case — ví dụ: category-form.tsx, product-table.tsx',
    ts: 'camelCase — ví dụ: category.service.ts, product.repository.ts',
  },
  directory: 'kebab-case — ví dụ: src/admin/features/category/',
  component: 'PascalCase — ví dụ: CategoryForm, ProductTable',
  type: 'PascalCase — ví dụ: CategoryDetail, ProductListItem',
  prismaModel: 'PascalCase — ví dụ: Product, ProductVariant',
  enumValue: 'UPPER_SNAKE hoặc Pascal — WEBSITE, FACEBOOK, TIKTOK, YOUTUBE',
  url: 'kebab-case — ví dụ: /admin/categories, /admin/products',
  apiEndpoint: 'kebab-case — ví dụ: /admin/api/products',
  platformEnum: 'WEBSITE | FACEBOOK | TIKTOK | YOUTUBE',
} as const;

// ============================================================
// PATHS (KEY FILES)
// ============================================================

export const KEY_FILES = {
  errors: 'src/server/errors.ts',
  types: 'src/lib/types.ts',
  constants: 'src/lib/constants.ts',
  utils: 'src/lib/utils.ts',
  prismaSchema: 'prisma/schema.prisma',
  middleware: 'src/middleware.ts',
  references: {
    category: {
      repository: 'src/server/repositories/category.repository.ts',
      service: 'src/server/services/category.service.ts',
      validator: 'src/server/validators/category.validator.ts',
      apiRoute: 'src/admin/api/categories/route.ts',
      apiDetail: 'src/admin/api/categories/[id]/route.ts',
      form: 'src/admin/features/category/CategoryForm.tsx',
      table: 'src/admin/features/category/CategoryTable.tsx',
      filters: 'src/admin/features/category/CategoryFilters.tsx',
      page: 'src/admin/layout/categories/CategoriesPage.tsx',
      newPage: 'src/admin/layout/categories/NewCategoryPage.tsx',
      editPage: 'src/admin/layout/categories/EditCategoryPage.tsx',
      formWrapper: 'src/admin/components/CategoryFormWrapper.tsx',
    },
    product: {
      repository: 'src/server/repositories/product.repository.ts',
      service: 'src/server/services/product.service.ts',
      validator: 'src/server/validators/product.validator.ts',
      apiRoute: 'src/admin/api/products/route.ts',
      apiDetail: 'src/admin/api/products/[id]/route.ts',
      form: 'src/admin/features/product/ProductForm.tsx',
      table: 'src/admin/features/product/ProductTable.tsx',
      filters: 'src/admin/features/product/ProductFilters.tsx',
      page: 'src/admin/layout/products/ProductsPage.tsx',
      newPage: 'src/admin/layout/products/NewProductPage.tsx',
      editPage: 'src/admin/layout/products/EditProductPage.tsx',
    },
    slider: {
      repository: 'src/server/repositories/slider.repository.ts',
      service: 'src/server/services/slider.service.ts',
      validator: 'src/server/validators/slider.validator.ts',
      form: 'src/admin/features/slider/SliderForm.tsx',
      table: 'src/admin/features/slider/SliderTable.tsx',
    },
  },
} as const;

// ============================================================
// ERROR CLASSES
// ============================================================

export const ERROR_CLASSES = {
  NotFoundError: { status: 404, code: 'NOT_FOUND', usage: 'Không tìm thấy tài nguyên' },
  ValidationError: { status: 422, code: 'VALIDATION', usage: 'Dữ liệu không hợp lệ (kèm field errors)' },
  DuplicateError: { status: 409, code: 'DUPLICATE', usage: 'Trùng lặp (slug, email, code...)' },
  ConflictError: { status: 409, code: 'CONFLICT', usage: 'Xung đột nghiệp vụ' },
  UnauthorizedError: { status: 401, code: 'UNAUTHORIZED', usage: 'Chưa xác thực' },
  ForbiddenError: { status: 403, code: 'FORBIDDEN', usage: 'Không có quyền truy cập' },
  AppError: { status: 500, code: 'INTERNAL', usage: 'Base class — Lỗi không xác định' },
  helpers: {
    parse: 'parseAppError(err) — convert any error thành AppError',
    check: 'isAppError(err) — type guard',
  },
} as const;

// ============================================================
// SHARED UTILITIES
// ============================================================

export const SHARED_UTILITIES = {
  'createSlug(text)': 'Tạo slug từ tiếng Việt — dùng trong service.create/update',
  'formatPrice(price)': 'Format giá VND — ví dụ: 1.500.000₫',
  'calcDiscountPercent(price, comparePrice)': 'Tính % giảm giá',
  'parsePageParam(param)': 'Parse page từ searchParams',
  'truncate(text, maxLength)': 'Cắt text với maxLength',
  'formatSoldCount(count)': 'Format số đã bán (VD: 1.2k)',
} as const;

// ============================================================
// SOP — 6 BƯỚC CHUẨN
// ============================================================

export const SOP_STEPS = {
  1: {
    title: 'Đọc project (LUÔN LUÔN làm trước)',
    actions: [
      'package.json — biết dependencies, scripts',
      'prisma/schema.prisma — hiểu models',
      'src/lib/types.ts, constants.ts, utils.ts — shared utilities',
      'src/server/errors.ts — error classes',
      '1 module reference gần nhất (category hoặc product hoặc slider)',
      'src/middleware.ts — auth flow',
    ],
  },
  2: {
    title: 'Xác định phạm vi thay đổi',
    actions: [
      'Xác định module: admin CRUD / site page / shared utility / API mới',
      'Tạo mới → luôn theo pattern có sẵn',
      'Sửa → chỉ sửa những file liên quan, không sửa lan',
      'Kiểm tra file đích đã tồn tại chưa',
    ],
  },
  3: {
    title: 'Hỏi câu hỏi làm rõ (nếu chưa rõ)',
    questions: [
      'Tính năng mới thuộc module nào?',
      'Có cần tạo bảng database mới không?',
      'Module nào trong project là reference gần nhất?',
      'Có cần SEO đa nền tảng (4 platform) không?',
      'Có cần phân quyền admin không?',
      'API endpoint là public (site) hay protected (admin)?',
    ],
  },
  4: {
    title: 'Code theo template (pattern có sẵn)',
    templates: {
      adminCRUD: [
        'src/server/validators/{name}.validator.ts',
        'src/server/repositories/{name}.repository.ts',
        'src/server/services/{name}.service.ts',
        'src/admin/api/{name}/route.ts',
        'src/admin/api/{name}/[id]/route.ts',
        'src/admin/features/{name}/{Name}Table.tsx',
        'src/admin/features/{name}/{Name}Filters.tsx',
        'src/admin/features/{name}/{Name}Form.tsx',
        'src/admin/components/{Name}FormWrapper.tsx',
        'src/admin/layout/{name}s/{Name}sPage.tsx',
        'src/admin/layout/{name}s/New{Name}Page.tsx',
        'src/admin/layout/{name}s/Edit{Name}Page.tsx',
        '→ Thêm route vào admin sidebar navigation',
      ],
      sitePublic: [
        'src/site/api/{name}/route.ts (public, không auth)',
        'src/site/layout/{name}/{Name}Page.tsx',
        'src/site/features/{name}/ (nếu cần)',
        'src/site/shared/ (nếu cần)',
        'src/site/assets/styles/ hoặc inline CSS modules',
      ],
      fixExisting: [
        'Đọc tất cả files liên quan trước',
        'Sửa tối thiểu, đúng vị trí',
        'Thêm field DB → schema.prisma + prisma generate + migrate',
        'Thêm API field → types.ts + repository select + service',
        'Thêm UI field → Form + Table (nếu cần)',
      ],
    },
  },
  5: {
    title: 'Review theo checklist',
    checklistKey: 'REVIEW_CHECKLIST',
  },
  6: {
    title: 'Báo cáo kết quả',
    output: [
      'Danh sách file tạo mới / sửa',
      'Giải thích ngắn gọn từng thay đổi',
      'Các bước chạy tiếp theo (npm run dev, prisma generate, migrate...)',
    ],
  },
} as const;

// ============================================================
// CODING GUARDRAILS
// ============================================================

export const GUARDRAILS = {
  mustDo: [
    'Luôn đọc module reference trước khi code',
    'Dùng z.infer<> để infer type từ Zod schema',
    'Dùng Prisma.TransactionClient khi có nhiều write operations',
    'Select tối giản (chỉ lấy field cần thiết)',
    'Validate input bằng Zod ở service layer',
    'Dùng parseAppError() hoặc isAppError() trong route handlers',
    'Dùng createSlug() cho slug auto-generation',
    'Dynamic import với ssr: false cho form components',
    'Dùng router.push() + router.refresh() sau khi submit form thành công',
    'Auto-generate slug và code từ name nếu chưa có trong service.create/update',
    'Khi upsert platformSeos/platformImages: dùng $transaction với deleteMany + createMany',
    'Dùng Bootstrap 5 class names (card, form-control, btn, etc.) cho admin UI',
  ],
  mustNotDo: [
    'Viết logic trực tiếp trong route handler (route chỉ gọi service)',
    'Hardcode error messages tiếng Anh (dùng tiếng Việt)',
    'Dùng any type',
    'Tạo file mới nếu đã có pattern tương tự — tham khảo và adapter',
    'Sửa nhiều hơn 3 files không liên quan cho 1 task',
    'Ignore TypeScript errors',
    'Commit node_modules/, .env, *.tsbuildinfo, .next/',
  ],
} as const;

// ============================================================
// REVIEW CHECKLIST
// ============================================================

export const REVIEW_CHECKLIST = {
  architecture: [
    'Route handler chỉ gọi service, không có logic nghiệp vụ?',
    'Service gọi repository, có validation Zod?',
    'Repository dùng Prisma với select tối giản?',
    'Upsert nhiều bảng có dùng $transaction?',
  ],
  typescript: [
    'Không có any type?',
    'Input type được infer từ Zod schema?',
    'Shared types khai báo trong src/lib/types.ts?',
  ],
  naming: [
    'File TSX đặt tên kebab-case?',
    'File TS đặt tên camelCase?',
    'Service/Repository export named singleton?',
    'Import alias dùng @/ prefix?',
  ],
  errorHandling: [
    'Dùng đúng AppError subclasses?',
    'API route parse error với parseAppError() hoặc isAppError()?',
    'Error response có format { success: false, error: string, code?: string }?',
  ],
  uiForm: [
    'Client component có "use client" directive?',
    'Form page dùng dynamic import ssr: false?',
    'Submit thành công có router.push() + router.refresh()?',
    'Image upload dùng SingleImageUploader / ImageManagerModal?',
  ],
  database: [
    'Schema prisma đã cập nhật nếu thêm field?',
    'Đã chạy npx prisma generate sau khi đổi schema?',
    'Migration file có meaningful name?',
  ],
} as const;

// ============================================================
// PRISMA COMMANDS
// ============================================================

export const PRISMA_COMMANDS = {
  'Thay đổi model, cần migrate DB': 'npx prisma migrate dev --name <ten_migration>',
  'Chỉ update Prisma Client types': 'npx prisma generate',
  'Xem trạng thái migration': 'npx prisma migrate status',
  'Reset DB (dev only)': 'npx prisma migrate reset',
  'Xem DB qua UI': 'npx prisma studio',
  'Push schema lên DB (không migration)': 'npx prisma db push',
  'Format schema file': 'npx prisma format',
  'Validate schema': 'npx prisma validate',
} as const;

export const DEV_WORKFLOW = 'npx prisma generate → npx prisma db push → npm run dev';

// ============================================================
// API RESPONSE FORMAT
// ============================================================

export const API_RESPONSE_FORMAT = {
  success: '{ success: true, data: <result> }',
  successWithPagination: '{ success: true, data: <items>, pagination: { page, pageSize, total, totalPages } }',
  error: '{ success: false, error: "<message>", code?: "<code>", errors?: { <field>: <message> } }',
} as const;

// ============================================================
// REUSABLE PROMPT TEMPLATE
// ============================================================

export const REUSABLE_PROMPT = `Bạn đang làm việc trên dự án Nội Thất Tiện Lợi — Next.js e-commerce nội thất.

Trước khi code, ĐỌC PROJECT:
- src/server/errors.ts (error classes)
- src/lib/types.ts, src/lib/constants.ts, src/lib/utils.ts (shared)
- prisma/schema.prisma (database)
- 1 module reference gần nhất (category hoặc product hoặc slider)
- middleware.ts (auth flow)

TUÂN THỦ:
- 3-layer: Repository (Prisma) → Service (logic) → Route (HTTP)
- Path alias: @/ → src/
- File naming: TSX kebab-case, TS camelCase
- Service/Repository: named export singleton
- Validator: Zod schema + z.infer type
- Error: dùng AppError subclasses (NotFoundError, ValidationError...)
- API response: { success, data } hoặc { success, error }
- Client components: 'use client' + dynamic import trong server page
- SEO pattern: 4 tabs (Website / Facebook / TikTok / YouTube)
- Platform enum: WEBSITE | FACEBOOK | TIKTOK | YOUTUBE

CHỈ sửa files liên quan trực tiếp. Không sửa lung tung.
Sau khi code, liệt kê files tạo/sửa + bước chạy tiếp theo.`;

// ============================================================
// ADMIN CREDENTIALS (dev)
// ============================================================

export const ADMIN_CREDENTIALS = {
  users: [
    { username: 'admin', password: 'admin123', role: 'SUPER_ADMIN' },
    { username: 'editor', password: 'admin123', role: 'EDITOR' },
  ],
  loginPath: '/admin/login',
  dashboardPath: '/admin',
} as const;

// ============================================================
// SEO MULTI-PLATFORM PATTERN
// ============================================================

export const SEO_PLATFORMS = [
  { id: 'WEBSITE', label: 'Website', badge: 'WEBSITE' },
  { id: 'FACEBOOK', label: 'Facebook', badge: 'FACEBOOK' },
  { id: 'TIKTOK', label: 'TikTok', badge: 'TIKTOK' },
  { id: 'YOUTUBE', label: 'YouTube', badge: 'YOUTUBE' },
] as const;

export const SEO_PLATFORM_TABS = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'seo-web', label: 'SEO Website' },
  { id: 'seo-fb', label: 'Facebook' },
  { id: 'seo-tt', label: 'TikTok' },
  { id: 'seo-yt', label: 'YouTube' },
] as const;
