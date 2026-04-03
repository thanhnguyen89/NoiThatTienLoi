/**
 * ============================================================
 * TASK: Menu Management + Menu Link Setup
 * ============================================================
 */

// ============================================================
// 📋 METADATA
// ============================================================

export const TASK_METADATA = {
  taskName: 'menu-management-menu-link-setup',
  module: 'menu',
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
Cập nhật module quản lý menu: thêm filter theo loại menu,
hiển thị label loại menu, thêm icon Thiết lập trong cột thao tác.
Xây dựng đầy đủ trang thiết lập liên kết menu (menu-link)
với 2 panel, tree với icon chính xác và drag-drop.
`;

// ============================================================
// 💾 DATABASE CHANGES
// ============================================================

export const DB_CHANGES = {
  schemaChange: false,

  /**
   * Kiểm tra trước: model MenuLink có đủ fields chưa?
   * Cần: id, menuId, parentId(nullable), title, url, target, sortOrder
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
      path: '/admin/api/menus',
      description: 'Lấy danh sách menu, hỗ trợ filter theo keyword + menuTypeId',
      status: 'modify',
      request: {
        queryParams: [
          { name: 'keyword', type: 'string', required: false },
          { name: 'menuTypeId', type: 'number (1|2|3|4)', required: false },
        ],
      },
      response: {
        success: {
          data: 'MenuItem[]',
          pagination: '{ total, page, pageSize }',
        },
        error: '{ error: string, code: string }',
      },
      changes: 'Thêm filter menuTypeId — AND với keyword. Không thay đổi response format hiện tại.',
    },
    {
      method: 'PUT',
      path: '/admin/api/menus/:id',
      description: 'Cập nhật menu (tên, loại, công khai)',
      status: 'existing',
      request: {
        pathParams: [{ name: 'id', type: 'number', required: true }],
        body: 'Giữ nguyên như hiện tại',
      },
      response: { success: '{}', error: '{ error: string }' },
      changes: 'Không thay đổi',
    },
    {
      method: 'GET',
      path: '/admin/api/menu-links',
      description: 'Lấy danh sách menu-link theo menuId, dạng tree',
      status: 'new',
      request: {
        queryParams: [
          { name: 'menuId', type: 'number', required: true },
        ],
      },
      response: {
        success: {
          data: 'MenuLinkTreeItem[]',
        },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'POST',
      path: '/admin/api/menu-links',
      description: 'Tạo 1 hoặc nhiều menu-link items',
      status: 'new',
      request: {
        body: [
          { name: 'menuId', type: 'number', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'url', type: 'string', required: true },
          { name: 'target', type: 'string', required: false, default: '_self' },
          { name: 'parentId', type: 'number|null', required: false },
          { name: 'sortOrder', type: 'number', required: false },
          { name: 'items', type: 'array', required: false, description: 'Batch create — array of items khi tick nhiều checkbox trong accordion' },
        ],
      },
      response: {
        success: { data: 'MenuLinkItem|MenuLinkItem[]', message: 'Thêm thành công' },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'PUT',
      path: '/admin/api/menu-links/:id',
      description: 'Cập nhật 1 menu-link item',
      status: 'new',
      request: {
        pathParams: [{ name: 'id', type: 'number', required: true }],
        body: [
          { name: 'title', type: 'string', required: true },
          { name: 'url', type: 'string', required: true },
          { name: 'target', type: 'string', required: false },
          { name: 'parentId', type: 'number|null', required: false },
          { name: 'sortOrder', type: 'number', required: false },
        ],
      },
      response: {
        success: { data: 'MenuLinkItem', message: 'Cập nhật thành công' },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'DELETE',
      path: '/admin/api/menu-links/:id',
      description: 'Xóa menu-link item (cascade xóa children)',
      status: 'new',
      request: {
        pathParams: [{ name: 'id', type: 'number', required: true }],
      },
      response: {
        success: { message: 'Xóa thành công' },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'PUT',
      path: '/admin/api/menu-links/reorder',
      description: 'Batch reorder: cập nhật parentId + sortOrder hàng loạt sau drag-drop hoặc click icon',
      status: 'new',
      request: {
        body: [
          { name: 'items', type: 'array', required: true, description: '[{id, parentId, sortOrder}, ...]' },
        ],
      },
      response: {
        success: { message: 'Lưu thứ tự thành công' },
        error: '{ error: string, code: string }',
      },
      changes: 'N/A — endpoint mới',
    },
    {
      method: 'GET',
      path: '/admin/api/menu-link-sources',
      description: 'Lấy danh sách nguồn link theo type (cho accordion panel trái)',
      status: 'new',
      request: {
        queryParams: [
          { name: 'type', type: 'string', required: true, description: 'news-content|news-category|static-page|product-category|product|package-category|package' },
          { name: 'search', type: 'string', required: false },
        ],
      },
      response: {
        success: { data: 'SourceItem[]' },
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
    'src/server/repositories/menu-link.repository.ts',
    'src/server/services/menu-link.service.ts',
    'src/server/validators/menu-link.validator.ts',
    'src/admin/api/menu-links/route.ts',
    'src/admin/api/menu-links/[id]/route.ts',
    'src/admin/api/menu-links/reorder/route.ts',
    'src/admin/api/menu-link-sources/route.ts',
    'src/admin/features/menu-link/MenuLinkFormPanel.tsx',
    'src/admin/features/menu-link/MenuLinkAccordion.tsx',
    'src/admin/features/menu-link/MenuLinkTreePanel.tsx',
    'src/admin/features/menu-link/MenuLinkTree.tsx',
    'src/admin/features/menu-link/MenuLinkTreeRow.tsx',
    'src/admin/layout/menu-links/MenuLinkSetupPage.tsx',
  ],

  filesToModify: [
    {
      path: 'src/admin/features/menu/MenuFilters.tsx',
      changes: 'Thêm dropdown filter theo menuTypeId (HEADER / FOOTER / LEFT / RIGHT)',
    },
    {
      path: 'src/admin/features/menu/MenuTable.tsx',
      changes: 'Hiển thị label loại menu (dùng MENU_TYPE_LABELS), thêm icon Thiết lập vào cột thao tác (thứ tự: Sửa → Thiết lập → Xóa)',
    },
  ],

  filesToRead: [
    'prisma/schema.prisma — kiểm tra model MenuLink có đủ: parentId, sortOrder, target chưa',
    'src/lib/constants.ts — thêm MENU_TYPE_LABELS nếu chưa có',
    'src/lib/types.ts — thêm MenuLinkItem, MenuTreeNode types',
    'src/admin/features/menu/MenuFilters.tsx — reference filter pattern',
    'src/admin/features/menu/MenuTable.tsx — reference table pattern',
  ],

  filesToCheck: [
    'src/server/routes/index.ts — đăng ký routes menu-link mới',
    'src/admin/layout/menu/MenusPage.tsx — kiểm tra link navigate tới menu-link',
  ],
};

// ============================================================
// 🧠 BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = [
  'menuTypeId: 1 = Menu Top, 2 = Menu Footer, 3 = Menu Left, 4 = Menu Right',
  'Filter danh sách menu: text AND menuTypeId, không chọn type thì trả tất cả',
  'MenuLink hỗ trợ cấu trúc tree theo parentId (nullable — root có parentId = null)',
  'sortOrder tăng dần trong cùng parentId group',
  'Target mặc định: _self; hợp lệ: _self | _blank | _parent | _top',
  'URL cho phép absolute (https://...) hoặc relative (/san-pham/...)',
  'Xóa item có con: cascade xóa children hoặc báo lỗi nếu có con (tùy business)',
  'Accordion lazy load: chỉ gọi API khi user mở section lần đầu',
  'Batch add từ accordion: POST nhiều MenuLink, parentId mặc định theo nơi add, sortOrder tự tăng',
  'Click 1 item trong accordion: auto-fill Tiêu đề + URL vào form, KHÔNG tự add vào cây',
  'formMode = "add" | "edit" — 2 nút form LUÔN cùng hiển thị, phân biệt bằng formMode',
  'fas fa-level-up-alt: chuyển item vào thư mục con gần nhất',
  'fas fa-level-down-alt: chuyển item ra khỏi thư mục con hiện tại, về cấp cha gần nhất',
  'fas fa-plus / fas fa-minus: toggle expand/collapse, CHỈ hiển thị cho item có con',
  'Nút Lưu: save batch sortOrder + parentId toàn cây (gọi PUT reorder)',
  'Nút Đóng: navigate /admin/menu, không save',
  'Sau mọi thao tác (move, drag-drop) → normalize sortOrder theo group',
];

// ============================================================
// 📋 REQUIREMENTS
// ============================================================

export const REQUIREMENTS = [
  {
    id: 'REQ-01',
    title: 'Filter loại menu ở trang danh sách',
    description: 'Dropdown "--Chọn loại menu--" kết hợp với ô tìm kiếm text (AND condition)',
    acceptanceCriteria: [
      'AC-01: Dropdown với 4 options: Menu Top, Menu Footer, Menu Left, Menu Right',
      'AC-02: Chọn loại → chỉ hiện menu đúng loại',
      'AC-03: Không chọn → hiện tất cả',
      'AC-04: Kết hợp text + loại menu filter đúng',
    ],
    affectedFiles: ['MenuFilters.tsx', 'menus/route.ts', 'menu.service.ts'],
  },
  {
    id: 'REQ-02',
    title: 'Hiển thị label loại menu trong bảng',
    description: 'Dùng MENU_TYPE_LABELS thay vì số nguyên ở bảng, form, filter',
    acceptanceCriteria: [
      'AC-01: Bảng hiển thị đúng label: Menu Top, Menu Footer, Menu Left, Menu Right',
      'AC-02: Dùng 1 constant MENU_TYPE_LABELS chung cho cả bảng, filter, form',
    ],
    affectedFiles: ['MenuTable.tsx', 'MenuFilters.tsx', 'src/lib/constants.ts'],
  },
  {
    id: 'REQ-03',
    title: 'Icon Thiết lập trong cột thao tác',
    description: 'Thêm icon Thiết lập (thứ tự: Sửa → Thiết lập → Xóa). Click → /admin/menu-links/:menuId',
    acceptanceCriteria: [
      'AC-01: Mỗi dòng có icon Thiết lập (bi-gear hoặc bi-link-45deg)',
      'AC-02: Thứ tự icon: Sửa → Thiết lập → Xóa',
      'AC-03: Click Thiết lập → navigate đúng route với menuId',
    ],
    affectedFiles: ['MenuTable.tsx'],
  },
  {
    id: 'REQ-04',
    title: 'Giữ nguyên popup thêm/sửa menu hiện tại',
    description: 'Không phá vỡ chức năng CRUD menu đang có',
    acceptanceCriteria: [
      'AC-01: Popup thêm/sửa vẫn lưu đúng: tên menu, loại menu, công khai',
      'AC-02: Không làm lỗi chức năng cũ',
    ],
    affectedFiles: ['MenuTable.tsx (chỉ thêm icon, không sửa logic sửa/xóa)'],
  },
  {
    id: 'REQ-05',
    title: 'Panel trái: Form LUÔN hiện + Accordion 7 sources',
    description: 'Form Tiêu đề/URL/Target LUÔN hiển thị. Bên dưới là accordion 7 nguồn dữ liệu',
    acceptanceCriteria: [
      'AC-01: Form LUÔN render (không toggle)',
      'AC-02: Input Tiêu đề có dropdown button (▼) bên phải (Bootstrap input-group + dropdown-toggle)',
      'AC-03: Select Target: default "_self", đủ 4 options',
      'AC-04: Nút "Cập nhật" (btn-primary) và "+ Thêm vào menu" (btn-success) LUÔN hiển thị cùng lúc',
      'AC-05: formMode state: "add" | "edit" — phân biệt hành động 2 nút',
      'AC-06: 7 accordion sections: Nội dung tin tức, Chuyên mục tin tức, Trang tĩnh, Danh mục sản phẩm, Sản phẩm, Danh mục gói cước, Gói cước',
      'AC-07: Khi expand section: hiện search input + checkbox list (multi-select, scrollable) + nút "+ Thêm vào menu"',
      'AC-08: Lazy load: chỉ gọi API khi mở section lần đầu',
      'AC-09: Tick nhiều items → bấm "+ Thêm vào menu" → batch add vào cây → reset checkbox',
      'AC-10: Click 1 item trong accordion → auto-fill Tiêu đề + URL vào form (không tự add vào cây)',
    ],
    affectedFiles: [
      'MenuLinkFormPanel.tsx',
      'MenuLinkAccordion.tsx',
      'MenuLinkSetupPage.tsx',
    ],
  },
  {
    id: 'REQ-06',
    title: 'Panel phải: Tree menu items — icon/actions chính xác, expand/collapse, drag-drop',
    description: 'Tree dạng flat legacy list, 4 icon điều hướng riêng, toggle expand/collapse, edit, delete, drag-drop',
    acceptanceCriteria: [
      'AC-01: Header panel phải chỉ hiển thị tên menu (ví dụ: "Menu top"), KHÔNG thêm loại trong ngoặc',
      'AC-02: Tree dạng flat legacy list — mỗi item là 1 row full width, border mảnh, action bên phải',
      'AC-03: 4 icon điều hướng RIÊNG BIỆT: fas fa-chevron-up, fas fa-chevron-down, fas fa-level-up-alt, fas fa-level-down-alt',
      'AC-04: fas fa-chevron-up: move up trong cùng parent group',
      'AC-05: fas fa-chevron-down: move down trong cùng parent group',
      'AC-06: fas fa-level-up-alt (clickable): chuyển item vào thư mục con gần nhất',
      'AC-07: fas fa-level-down-alt (clickable): chuyển item ra khỏi thư mục con hiện tại',
      'AC-08: Item có con + collapsed → hiển thị fas fa-plus',
      'AC-09: Item có con + expanded → hiển thị fas fa-minus',
      'AC-10: Click plus/minus → toggle expand/collapse children',
      'AC-11: Item không có con → KHÔNG hiển thị plus/minus',
      'AC-12: fas fa-edit: load item lên form panel trái, set formMode = "edit"',
      'AC-13: fas fa-trash: xóa item; nếu có con → confirm trước',
      'AC-14: Drag-drop: kéo item vào vị trí mong muốn, thả vào root hay child đều cập nhật parentId + sortOrder đúng',
      'AC-15: Nút "Lưu" và "Đóng" nằm cuối panel, căn phải',
    ],
    affectedFiles: [
      'MenuLinkTreePanel.tsx',
      'MenuLinkTree.tsx',
      'MenuLinkTreeRow.tsx',
      'MenuLinkSetupPage.tsx',
    ],
  },
  {
    id: 'REQ-07',
    title: 'Edit item: click edit → load form → bấm Cập nhật → save',
    description: 'Khi click edit, form panel trái load dữ liệu. Bấm "Cập nhật" → PUT API',
    acceptanceCriteria: [
      'AC-01: Click edit → form điền Tiêu đề, URL, Target của item. formMode = "edit"',
      'AC-02: Bấm "Cập nhật" → PUT API → cập nhật item trong cây',
      'AC-03: Sau update: reset form về rỗng, formMode = "add"',
      'AC-04: Sau Cập nhật hoặc Thêm: reset form về rỗng, formMode = "add"',
    ],
    affectedFiles: ['MenuLinkFormPanel.tsx', 'MenuLinkTree.tsx'],
  },
  {
    id: 'REQ-08',
    title: 'Lưu toàn bộ tree sau thao tác',
    description: 'Nút Lưu gọi batch reorder API, nút Đóng quay về /admin/menu không save',
    acceptanceCriteria: [
      'AC-01: Click "Lưu" → gọi PUT /admin/api/menu-links/reorder với payload [{id, parentId, sortOrder}, ...]',
      'AC-02: Click "Đóng" → navigate /admin/menu, không save thay đổi',
      'AC-03: Sau mọi action (move, drag-drop) → normalize sortOrder trong local state trước',
    ],
    affectedFiles: ['MenuLinkTreePanel.tsx', 'MenuLinkSetupPage.tsx', 'PUT reorder endpoint'],
  },
];

// ============================================================
// ⚠️ CONSTRAINTS
// ============================================================

export const CONSTRAINTS = [
  'Không thêm thư viện mới (drag-drop dùng HTML5 drag events)',
  'Phải tuân thủ 3-layer architecture: repository → service → api',
  'Không sửa bất kỳ module nào ngoài menu + menu-link',
  'UI phải dùng Bootstrap 5 convention của project',
  'KHÔNG gộp chung 4 icon điều hướng thành "3 mũi tên" — phải tách rõ từng icon',
  'fas fa-level-up-alt và fas fa-level-down-alt là 2 action RIÊNG BIỆT',
  'fas fa-plus và fas fa-minus là toggle expand/collapse — không phải decoration',
  'Form panel trái LUÔN visible — không conditional render',
  'Hai nút "Cập nhật" và "+ Thêm vào menu" LUÔN hiển thị cùng lúc',
  'Panel phải dùng flat legacy list style — không dùng nested card UI hiện đại',
];

// ============================================================
// 🔄 IMPLEMENTATION ORDER
// ============================================================

export const IMPLEMENTATION_ORDER = [
  'Bước 1: Đọc prisma/schema.prisma — kiểm tra model MenuLink có đủ fields chưa (parentId, sortOrder, target)',
  'Bước 2: Nếu thiếu field → chạy prisma migrate dev --name add_menu_link_fields',
  'Bước 3: Thêm MENU_TYPE_LABELS vào src/lib/constants.ts',
  'Bước 4: Thêm MenuLinkItem, MenuTreeNode types vào src/lib/types.ts',
  'Bước 5: Sửa MenuFilters.tsx — thêm dropdown filter menuTypeId',
  'Bước 6: Sửa MenuTable.tsx — hiển thị label + icon Thiết lập',
  'Bước 7: Tạo menu-link.repository.ts',
  'Bước 8: Tạo menu-link.service.ts',
  'Bước 9: Tạo menu-link.validator.ts',
  'Bước 10: Tạo API routes (GET menu-links, POST, PUT/:id, DELETE/:id, PUT reorder, GET sources)',
  'Bước 11: Test API bằng curl trước khi code UI',
  'Bước 12: Tạo MenuLinkFormPanel.tsx (form LUÔN visible + 2 nút)',
  'Bước 13: Tạo MenuLinkAccordion.tsx (7 sections với lazy load)',
  'Bước 14: Tạo MenuLinkTreeRow.tsx (1 row với đúng 4 icon điều hướng + expand/collapse + edit + delete)',
  'Bước 15: Tạo MenuLinkTree.tsx (tree với local state, expand/collapse, normalize sortOrder)',
  'Bước 16: Tạo MenuLinkTreePanel.tsx (panel phải với header + tree + nút Lưu/Đóng)',
  'Bước 17: Tạo MenuLinkSetupPage.tsx (layout 2 panel ngang)',
  'Bước 18: Cập nhật route /admin/menu-links/:menuId trong routes/index.ts',
];

// ============================================================
// 🧪 TEST STRATEGY
// ============================================================

export const TEST_STRATEGY = {
  apiTests: [
    'GET /admin/api/menu-links?menuId=1 — expect 200, array',
    'GET /admin/api/menu-link-sources?type=news-category — expect 200, array',
    'POST /admin/api/menu-links body={menuId:1,title:"Test",url:"/test"} — expect 201',
    'POST /admin/api/menu-links body={menuId:1,items:[{title:"A",url:"/a"},{title:"B",url:"/b"}]} — expect 201, 2 items',
    'PUT /admin/api/menu-links/1 body={title:"Updated"} — expect 200',
    'PUT /admin/api/menu-links/reorder body={items:[{id:1,parentId:null,sortOrder:0}]} — expect 200',
    'DELETE /admin/api/menu-links/999 — expect 404',
    'DELETE /admin/api/menu-links/1 — expect 200 (cascade hoặc confirm)',
  ],

  manualTests: [
    '(Menu list) Mở /admin/menu → thấy dropdown loại menu + input search',
    '(Menu list) Chọn Menu Top → chỉ hiện menu loại Top',
    '(Menu list) Chọn loại + nhập text → filter đúng (AND)',
    '(Menu list) Cột Loại menu hiển thị label (Menu Top...)',
    '(Menu list) Click icon Thiết lập → navigate /admin/menu-links/:id',
    '(Menu link) Load trang → panel phải hiện tree items, panel trái hiện form rỗng',
    '(Menu link) Mở accordion "Chuyên mục tin tức" → search → tick items → "+ Thêm vào menu" → items thêm vào tree',
    '(Menu link) Click 1 item accordion → Tiêu đề + URL auto-fill vào form',
    '(Menu link) Bấm "+ Thêm vào menu" (form) → item mới thêm vào cây',
    '(Menu link) Click fas fa-edit → form load dữ liệu → sửa → bấm "Cập nhật"',
    '(Menu link) Click fas fa-chevron-up → item đổi lên trên trong cùng group',
    '(Menu link) Click fas fa-chevron-down → item đổi xuống dưới trong cùng group',
    '(Menu link) Click fas fa-level-up-alt → item vào thư mục con',
    '(Menu link) Click fas fa-level-down-alt → item ra khỏi thư mục con',
    '(Menu link) Item có con → click fas fa-plus → children hiện → icon đổi fas fa-minus',
    '(Menu link) Item có con → click fas fa-minus → children ẩn → icon đổi fas fa-plus',
    '(Menu link) Drag-drop item vào vị trí khác → tree cập nhật',
    '(Menu link) Click fas fa-trash → confirm → item xóa',
    '(Menu link) Bấm "Lưu" → save batch thành công',
    '(Menu link) Bấm "Đóng" → về /admin/menu, không save',
  ],
};

// ============================================================
// ⚡ ROLLBACK PLAN
// ============================================================

export const ROLLBACK_PLAN = {
  schemaRollback: 'git checkout prisma/schema.prisma && rm -rf prisma/migrations/*/add_menu_link_fields',
  codeRollback: 'git checkout -- src/admin/features/menu/MenuFilters.tsx src/admin/features/menu/MenuTable.tsx src/server/repositories/menu-link.repository.ts src/server/services/menu-link.service.ts src/server/validators/menu-link.validator.ts src/admin/api/menu-links src/admin/api/menu-link-sources src/admin/features/menu-link src/admin/layout/menu-links',
  deployRollback: 'Git revert commit hoặc rollback image',
};

// ============================================================
// 🚨 REGRESSION TARGETS
// ============================================================

export const REGRESSION_TARGETS = [
  'Trang danh sách menu hiện tại không bị lỗi',
  'Popup thêm/sửa menu vẫn hoạt động',
  'Các API menu hiện tại không bị ảnh hưởng',
  'Admin layout không bị ảnh hưởng',
];

// ============================================================
// 📝 IMPLEMENTATION NOTES
// ============================================================

export const IMPLEMENTATION_NOTES = [
  'Đọc prisma/schema.prisma TRƯỚC — kiểm tra MenuLink model có đủ fields chưa',
  'Panel grid: Bootstrap col-md-6 / col-lg-6 mỗi panel',
  'Form LUÔN visible — không dùng conditional render',
  'formMode state: "add" | "edit" — 2 nút LUÔN render, phân biệt bằng formMode',
  'Dropdown button (▼) bên phải input Tiêu đề: Bootstrap input-group + dropdown-toggle',
  'Accordion: Bootstrap 5 accordion',
  'Checkbox list trong accordion: track checked bằng Set<string>',
  'Lazy load: Set<string> cho loadedSections',
  'Tách panel phải: MenuLinkTreePanel → MenuLinkTree → MenuLinkTreeRow',
  'Icon map: MOVE_CONSTANTS riêng cho từng icon — KHÔNG hardcode chung',
  'fas fa-plus mặc định collapsed, fas fa-minus khi expanded',
  'Local tree state ở client cho expand/collapse và drag-drop trước khi save',
  'Drag & drop: HTML5 drag events (hiện có trong project hoặc tự implement)',
  'Sau mọi thao tác → normalize sortOrder theo group',
  'KHÔNG gộp 4 icon điều hướng thành "3 mũi tên"',
  'Priority: panel phải là ưu tiên cao nhất vì đang bị hiểu sai spec',
];

// ============================================================
// 👀 UI SCREENS
// ============================================================

export const UI_SCREENS = [
  {
    name: 'menu-index',
    route: '/admin/menu',
    description: 'Trang danh sách menu',
    keyElements: [
      'Nút Thêm mới',
      'Input tìm kiếm text',
      'Dropdown chọn loại menu (--Chọn loại menu--) với 4 options',
      'Bảng danh sách: cột Loại menu hiển thị label (Menu Top...)',
      'Cột thao tác: Sửa → Thiết lập → Xóa',
    ],
    screenshotRef: 'N/A',
  },
  {
    name: 'menu-link-page',
    route: '/admin/menu-links/:menuId',
    description: 'Trang thiết lập liên kết menu — 2 panel ngang',
    keyElements: [
      'Heading: "THIẾT LẬP LIÊN KẾT MENU TOP" (tên menu thay đổi theo menu)',
      'Panel trái: form Tiêu đề/URL/Target LUÔN hiện + 2 nút LUÔN hiện',
      'Panel trái: dropdown button (▼) bên phải input Tiêu đề',
      'Panel trái: accordion 7 nguồn (Nội dung tin tức → Gói cước)',
      'Panel phải header teal: "Menu top" (chỉ tên menu, KHÔNG thêm ngoặc)',
      'Panel phải: flat list rows, 4 icon điều hướng + expand/collapse + edit + delete',
      'Panel phải: nút Lưu (xanh lá) và Đóng (xám), căn phải',
    ],
    screenshotRef: 'N/A',
  },
];

// ============================================================
// ✅ CHECKLIST TRƯỚC KHI GỬI PR
// ============================================================

export const PR_CHECKLIST = [
  'Đã kiểm tra prisma/schema.prisma — MenuLink đã có đủ fields hoặc đã migrate',
  'Đã test tất cả 7 API endpoints bằng curl/postman',
  'Đã test UI thủ công theo manualTests',
  'Đã verify: 4 icon điều hướng hiển thị RIÊNG BIỆT (không gộp)',
  'Đã verify: plus/minus toggle expand/collapse CHỈ cho item có con',
  'Đã verify: form LUÔN visible, 2 nút LUÔN hiện cùng lúc',
  'Không sửa file ngoài module menu + menu-link',
  'Code tuân thủ 3-layer architecture',
  'Không thêm thư viện mới',
  'TypeScript compilation không lỗi',
  'SortOrder normalize đúng sau mọi thao tác',
];
