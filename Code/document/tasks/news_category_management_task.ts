/**
 * TASK: News Category Management CRUD (Multi-Tab Form)
 * Module: news-category
 * Type: Feature
 * Status: Ready for implementation
 * Complexity: High (parent-child + multi-tab + rich editor)
 */

export const TASK_METADATA = {
  name: 'news-category-management-crud',
  module: 'news-category',
  type: 'feature',
  priority: 'high',
  estimatedDays: 3,
};

// ============================================================
// 🎯 MỤC TIÊU
// ============================================================

export const TASK_GOAL = `
Xây dựng module quản lý danh mục tin tức (News Category) CRUD cho admin panel:
- Danh sách danh mục với search, filter (từ khóa, ngày, công khai)
- Form tạo mới danh mục (4 tab: Thông tin, SEO, Media, Nội dung)
- Form sửa danh mục
- Xóa soft-delete danh mục
- Hỗ trợ danh mục cha-con (parent-child tree)
- Hỗ trợ slug auto-generation, unique check
- Hỗ trợ image upload (imageUrl)
- Hỗ trợ rich text content (CKEditor)
- Hỗ trợ SEO fields (title, keywords, description, canonical, noindex)
- Hỗ trợ redirect (slugRedirect + isRedirect)
`;

// ============================================================
// 🖥️ UI / SCREEN CONTEXT
// ============================================================

export const UI_CONTEXT = {
  screens: [
    '/admin/news-categories',           // Danh sách
    '/admin/news-categories/new',       // Tạo mới
    '/admin/news-categories/[id]',      // Sửa
  ],
  screenshot: 'ảnh gồm danh sách, form info, form content+SEO',
  description: `
Trang danh sách danh mục tin tức (THÔNG TIN TÌM KIẾM):
- Search input: tìm kiếm theo tiêu đề
- Filter controls: 
  * Chuyên mục (dropdown select parent category)
  * Ngày tạo (từ ngày - đến ngày)
  * Công khai (All / Yes / No)
- Nút "Thêm mới"
- Bảng danh sách: STT, Tiêu đề, Chuyên mục, Ngày tạo, Công khai ✓, Thao tác
- Action icons: sửa, xóa

Form tạo/sửa (Multi-Tab):
TAB 1 - THÔNG TIN:
  - Tiêu đề (required, max 200)
  - Tóm tắt (optional, max 400)
  - Chuyên mục (dropdown select parent)
  - Sắp xếp (number)
  - Checkbox: Công khai (isPublished), Hiển thị trang chủ (isShowHome), Hoạt động (isActive)

TAB 2 - SEO:
  - URL slug (seName, unique, auto-generate từ tiêu đề)
  - Tiêu đề SEO (metaTitle)
  - Từ khóa SEO (metaKeywords)
  - Mô tả SEO (metaDescription)
  - SEO Canonical (seoCanonical)
  - Checkbox: Không index (seoNoindex)

TAB 3 - MEDIA:
  - Hình ảnh (image upload)

TAB 4 - NỘI DUNG:
  - Nội dung (CKEditor rich text)
  - Nút Lưu / Đóng
`,
};

// ============================================================
// 📋 YÊU CẦU CHI TIẾT
// ============================================================

export const REQUIREMENTS = [
  'REQ-01: Tạo trang danh sách danh mục tin tức',
  '  - Bảng list với pagination (10-20 dòng/page)',
  '  - Search theo title',
  '  - Filter parentId, isPublished, date range',
  '  - Hiển thị đúng, không hiển thị deleted records',
  '',
  'REQ-02: Tạo form tạo mới danh mục',
  '  - 4 tabs: Thông tin, SEO, Media, Nội dung',
  '  - Tab Thông tin: title, summary, parentId, sortOrder, checkboxes',
  '  - Tab SEO: slug, title, keywords, description, canonical, noindex',
  '  - Tab Media: image upload',
  '  - Tab Nội dung: CKEditor',
  '  - Validation: title required, slug unique',
  '  - Auto-generate slug từ title',
  '  - Submit → danh sách',
  '',
  'REQ-03: Tạo form sửa danh mục',
  '  - Load dữ liệu từ DB',
  '  - Cho phép update tất cả fields',
  '  - Submit → danh sách',
  '',
  'REQ-04: Hỗ trợ xóa soft-delete',
  '  - Click xóa → confirm',
  '  - Xóa → isDeleted=true, ghi deletedUser, deletedDate',
  '  - Danh sách ẩn deleted',
  '',
  'REQ-05: Hỗ trợ parent-child tree',
  '  - Dropdown chọn danh mục cha',
  '  - Auto-calculate categoryLevel',
  '',
  'REQ-06: Hỗ trợ redirect',
  '  - Field slugRedirect, checkbox isRedirect',
];

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  'Danh mục có parent-child relationship (tree)',
  'Slug (seName) phải unique',
  'IsPublished = true: công khai, false: nháp',
  'IsActive = true: hoạt động, false: vô hiệu hóa',
  'IsShowHome = true: hiển thị ở homepage, false: ẩn',
  'Soft delete: không xóa vật lý',
  'CategoryLevel = parent.categoryLevel + 1',
  'SEO fields: title, keywords, description, canonical, noindex',
  'Redirect: slugRedirect + isRedirect',
  'List hides: WHERE isDeleted = false/null',
  'Sort: categoryLevel asc → sortOrder asc → title',
];

// ============================================================
// 📂 FILES LIÊN QUAN
// ============================================================

export const RELATED_FILES = {
  referenceModule: 'category (parent-child pattern)',
  filesToRead: [
    'prisma/schema.prisma (NewsCategory model)',
    'src/server/repositories/category.repository.ts (parent-child queries)',
    'src/server/services/category.service.ts (slug generation)',
    'src/admin/features/category/CategoryForm.tsx (multi-tab form)',
    'src/lib/constants.ts',
  ],
  filesToCreate: [
    'src/server/validators/news-category.validator.ts',
    'src/server/repositories/news-category.repository.ts',
    'src/server/services/news-category.service.ts',
    'src/admin/api/news-categories/route.ts',
    'src/admin/api/news-categories/[id]/route.ts',
    'src/admin/features/news-category/NewsCategoryTable.tsx',
    'src/admin/features/news-category/NewsCategoryFilters.tsx',
    'src/admin/features/news-category/NewsCategoryFormTabs.tsx',
    'src/admin/features/news-category/NewsCategoryForm.tsx',
    'src/admin/components/NewsCategoryFormWrapper.tsx',
    'src/admin/layout/news-categories/NewsCategoriesPage.tsx',
    'src/admin/layout/news-categories/NewNewsCategoryPage.tsx',
    'src/admin/layout/news-categories/EditNewsCategoryPage.tsx',
  ],
  filesToModify: [
    'src/admin/layout/sidebar (add /admin/news-categories link)',
  ],
};

// ============================================================
// 🔄 EXPECTED FLOW
// ============================================================

export const EXPECTED_FLOW = `
1. Admin: /admin/news-categories → danh sách
2. Admin: search hoặc filter
3. Admin: click "Thêm mới" hoặc "Sửa"
4. Form: 4 tabs (Thông tin, SEO, Media, Nội dung)
5. Admin: điền thông tin → upload ảnh → nhập nội dung
6. Admin: click Lưu
7. API: validate → service → repository → database
8. Admin: quay về danh sách, thấy dữ liệu mới
9. Admin: click xóa → confirm → soft delete
10. Danh sách ẩn deleted record
`;

// ============================================================
// 🎯 ACCEPTANCE CRITERIA
// ============================================================

export const ACCEPTANCE_CRITERIA = [
  'REQ-01: List page search + filter hoạt động đúng',
  'REQ-02: Form 4 tabs đầy đủ, validation đúng',
  'REQ-03: Edit page load + update đúng',
  'REQ-04: Delete soft-delete hoạt động',
  'REQ-05: Parent-child relationship hoạt động',
  'REQ-06: Slug auto-generate + unique check',
  'Image upload hoạt động',
  'CKEditor content lưu đúng',
  'Redirect fields hoạt động',
  'No TypeScript errors',
  'No regressions in news display',
];

// ============================================================
// ⚠️ CONSTRAINTS
// ============================================================

export const CONSTRAINTS = [
  'Không thêm thư viện mới',
  'Không sửa ngoài module news-category',
  'Phải tuân thủ 3-layer architecture',
  'Dùng Bootstrap 5 convention',
  'Soft delete (không xóa vật lý)',
  'Slug unique check',
  'Reuse ImageUploader + RichTextEditor',
];

// ============================================================
// 🧪 TEST REQUIREMENTS
// ============================================================

export const TEST_REQUIREMENTS = [
  'Validator: test required fields, enum, slug unique',
  'Service: test CRUD, slug generation, parent-child',
  'Repository: test findAll with filters, parent-child queries',
  'API: test GET list, GET detail, POST create, PUT update, DELETE',
  'Manual QA:',
  '  - list → search → filter → works',
  '  - create → 4 tabs → validate → save → verify',
  '  - edit → load → update → save → verify',
  '  - delete → confirm → soft delete → list hides',
  '  - parent-child relationship',
  '  - slug generation + unique check',
  '  - image upload',
  '  - CKEditor content',
];

// ============================================================
// 📝 NOTES
// ============================================================

export const NOTES = `
1. Parent-Child:
   - Field parentId: nullable BigInt
   - categoryLevel: auto-calculate = parent.categoryLevel + 1
   - Repository: findAll can filter by parentId
   - Tree display: can show hierarchy (optional - admin might just list flat)

2. Slug Generation:
   - Use createSlug() from lib/utils.ts
   - Auto-generate from title nếu chưa có seName
   - Check unique: service before insert/update
   - Slug read-only in edit form (hoặc allow with unique check)

3. Image Upload:
   - Dùng ImageUploader component có sẵn
   - Lưu URL vào imageUrl field
   - Optional field

4. CKEditor:
   - Dùng RichTextEditor component có sẵn
   - Lưu vào content field
   - Optional field

5. Soft Delete:
   - WHERE isDeleted = false/null trong tất cả queries
   - deletedUser: current user từ middleware
   - deletedDate: DateTime.now()

6. SEO Fields:
   - metaTitle, metaKeywords, metaDescription: strings
   - seoCanonical: optional URL
   - seoNoindex: boolean (default false)

7. Multi-Tab Form:
   - Bootstrap tabs component
   - hoặc React useState for tab state
   - Lưu toàn bộ cùng lúc

8. Pagination:
   - Dùng PaginatedResult<NewsCategory>
   - Default page size từ constants.ts

9. Date Filter:
   - Format YYYY-MM-DD
   - Query: WHERE createdDate >= dateFrom AND createdDate <= dateTo
`;

// ============================================================
// 🧩 TASK CONTROL (LEVEL 2)
// ============================================================

export const TASK_CONTROL = {
  taskSource: 'screenshot + prisma schema',
  affectedLayers: ['validator', 'repository', 'service', 'api', 'ui', 'forms'],
  riskLevel: 'medium',
  rollbackPlan: 'Revert news-category files if queries fail',
  regressionTargets: [
    'News list page (frontend)',
    'News detail page',
    'Homepage news display',
    'Navigation using NewsCategory',
  ],
  manualQaChecklist: [
    '[ ] List loads with correct data',
    '[ ] Search by title works',
    '[ ] Filter parentId/date/published works',
    '[ ] Filter + search together work',
    '[ ] Create → 4 tabs complete',
    '[ ] Form validates title + slug unique',
    '[ ] Slug auto-generates from title',
    '[ ] Image upload works',
    '[ ] CKEditor content saves',
    '[ ] Edit → load correct data',
    '[ ] Edit → update → verify changes',
    '[ ] Delete → confirm → soft delete → hidden from list',
    '[ ] Parent-child dropdown works',
    '[ ] categoryLevel auto-calculated',
    '[ ] Redirect fields optional',
  ],
};

export const IMPLEMENTATION_ORDER = [
  '1. src/server/validators/news-category.validator.ts',
  '2. src/server/repositories/news-category.repository.ts',
  '3. src/server/services/news-category.service.ts',
  '4. src/admin/api/news-categories/route.ts (GET + POST)',
  '5. src/admin/api/news-categories/[id]/route.ts (GET + PUT + DELETE)',
  '6. src/admin/features/news-category/NewsCategoryTable.tsx',
  '7. src/admin/features/news-category/NewsCategoryFilters.tsx',
  '8. src/admin/features/news-category/NewsCategoryFormTabs.tsx',
  '9. src/admin/features/news-category/NewsCategoryForm.tsx',
  '10. src/admin/components/NewsCategoryFormWrapper.tsx',
  '11. src/admin/layout/news-categories/NewsCategoriesPage.tsx',
  '12. src/admin/layout/news-categories/NewNewsCategoryPage.tsx',
  '13. src/admin/layout/news-categories/EditNewsCategoryPage.tsx',
  '14. Admin sidebar → add link',
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
