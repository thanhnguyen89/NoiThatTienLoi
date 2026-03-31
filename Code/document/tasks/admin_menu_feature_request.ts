/**
 * Feature request summary — Menu Management Module
 * Purpose: give Claude Opus / terminal agent a precise, machine-readable brief.
 *
 * Nguồn: phân tích từ 3 ảnh UI thực tế:
 *   Ảnh 1 (overview): 2 panel tổng thể, form ở trạng thái mặc định
 *   Ảnh 2 (accordion expanded): panel trái khi mở "Chuyên mục tin tức" (multi-select)
 *   Ảnh 3 (full form): panel trái hiển thị form đầy đủ + accordion bên dưới
 */

// ============================================================
// DIFF: Version cũ → Version mới (đúng)
// ============================================================
//
// Điểm              Version cũ                 Version mới (đúng)
// ───────────────────────────────────────────────────────────────
// Form "Thêm/Sửa"   Chỉ hiện khi click ✏      Luôn hiển thị cố định
// 2 nút dưới form  Toggle ẩn hiện nhau        Luôn hiển thị cùng lúc
// Input Tiêu đề    Input đơn giản              Có dropdown button (▼) bên phải
// Vị trí accordion Thay thế form               Nằm bên dưới form
// "Trang chủ"      Đủ ▲▼↑✏🗑                   Chỉ [▼][✏][🗑] (item đầu, no ▲↑)
// "Tổng đài"      Đủ ▲▼↑✏🗑                   Chỉ [▲][↑][✏][🗑] (item cuối, no ▼)
// ASCII diagram    Không có                     Có sơ đồ ASCII rõ 2 panel
// formMode state   Không đề cập                 Mô tả rõ "add" | "edit"
// ============================================================

export type MenuTypeId = 1 | 2 | 3 | 4;

export type MenuLinkTarget = '_self' | '_blank' | '_parent' | '_top';

export type MenuLinkSourceType =
  | 'news-content'
  | 'news-category'
  | 'static-page'
  | 'product-category'
  | 'product'
  | 'package-category'
  | 'package';

// ============================================================
// MENU TYPE LABELS
// ============================================================

export const MENU_TYPE_LABELS: Record<MenuTypeId, string> = {
  1: 'Menu Top',
  2: 'Menu Footer',
  3: 'Menu Left',
  4: 'Menu Right',
};

// ============================================================
// MENU LINK SOURCE TYPES
// Mỗi loại = 1 accordion section ở panel trái, bên dưới form
// ============================================================

export const MENU_LINK_SOURCE_TYPES: Array<{
  key: MenuLinkSourceType;
  label: string;
}> = [
  { key: 'news-content',     label: 'Nội dung tin tức' },
  { key: 'news-category',    label: 'Chuyên mục tin tức' },
  { key: 'static-page',      label: 'Trang tĩnh' },
  { key: 'product-category', label: 'Danh mục sản phẩm' },
  { key: 'product',          label: 'Sản phẩm' },
  { key: 'package-category', label: 'Danh mục gói cước' },
  { key: 'package',          label: 'Gói cước' },
];

// ============================================================
// PANEL TRÁI — CẤU TRÚC ĐẦY ĐỦ
//
// Layout từ trên xuống dưới (từ ảnh 2 + ảnh 3):
//
//  ┌─────────────────────────────────────────┐
//  │ [HEADER TEAL] Thêm/Sửa liên kết        │
//  ├─────────────────────────────────────────┤
//  │ Tiêu đề:                                │
//  │ [_____ input text ________] [▼ btn]    │ ← có dropdown button bên phải
//  │                                         │
//  │ URL:                                    │
//  │ [_____ input text ________________]     │
//  │                                         │
//  │ Target:                                 │
//  │ [Self              ▼ select          ]  │
//  │                                         │
//  │ [🔄 Cập nhật]  [+ Thêm vào menu]       │ ← 2 nút LUÔN hiển thị cùng lúc
//  ├─────────────────────────────────────────┤
//  │ [HEADER TEAL ▶] Nội dung tin tức        │ ← collapsed
//  │ [HEADER TEAL ▼] Chuyên mục tin tức      │ ← ví dụ đang expanded:
//  │   [___ Tìm kiếm __________] [🔍]        │
//  │   ┌─────────────────────────────────┐   │
//  │   │ ☑ Tin tức gói 4G               │   │
//  │   │ ☑ Tin tức gói 5G               │   │
//  │   │ ☑ Tin tức gói COMBO            │   │
//  │   │ ☐ Tin tức gói DCOM             │   │
//  │   │ ☐ Tin tức gói roaming          │   │
//  │   └──────────── [scrollbar] ───────┘   │
//  │   [+ Thêm vào menu]                     │ ← batch add items đã check
//  │ [HEADER TEAL ▶] Trang tĩnh              │ ← collapsed
//  │ [HEADER TEAL ▶] Danh mục sản phẩm      │ ← collapsed
//  │ [HEADER TEAL ▶] Sản phẩm               │ ← collapsed
//  │ [HEADER TEAL ▶] Danh mục gói cước      │ ← collapsed
//  │ [HEADER TEAL ▶] Gói cước               │ ← collapsed (cuộn xuống mới thấy)
//  └─────────────────────────────────────────┘
//
// ============================================================

// ============================================================
// PANEL PHẢI — CẤU TRÚC ĐẦY ĐỦ
//
// Layout + actions chính xác từ ảnh:
//
//  ┌────────────────────────────────────────────────────────┐
//  │ [HEADER TEAL] Menu top                                 │
//  ├────────────────────────────────────────────────────────┤
//  │   Trang chủ                            [▼][✏][🗑]     │ ← root ĐẦU: không có ▲ và ↑
//  │ + Gói cước 4G              [▲][▼][↑][✏][🗑]           │ ← child (icon + xanh)
//  │ + Gói cước DCOM            [▲][▼][↑][✏][🗑]           │ ← child
//  │ + Gói cước COMBO           [▲][▼][↑][✏][🗑]           │ ← child
//  │   Gói cước roaming         [▲][▼][↑][✏][🗑]           │ ← root giữa
//  │   Tin tức                  [▲][▼][↑][✏][🗑]           │ ← root giữa
//  │   Tổng đài Viettel            [▲][↑][✏][🗑]           │ ← root CUỐI: không có ▼
//  ├────────────────────────────────────────────────────────┤
//  │                               [💾 Lưu] [⊗ Đóng]      │ ← căn phải
//  └────────────────────────────────────────────────────────┘
//
// ============================================================

// ============================================================
// MAIN FEATURE REQUEST
// ============================================================

export const MENU_FEATURE_REQUEST = {
  module: 'Menu Management + Menu Link',
  goal:
    'Cập nhật module quản lý menu để hỗ trợ lọc theo loại menu, hiển thị label loại menu, thêm action icon thiết lập, và xây dựng đầy đủ trang thiết lập liên kết menu (menu-link) theo đúng UI thực tế.',

  context: [
    'Trang danh sách menu: cột thao tác cần bổ sung icon Thiết lập (Sửa → Thiết lập → Xóa).',
    'Trang menu-link gồm 2 panel ngang:',
    '  Panel trái: form Tiêu đề/URL/Target (LUÔN hiện, không toggle) + accordion 7 sources bên dưới.',
    '  Panel phải: cây menu items hỗ trợ root/child với actions ▲▼↑✏🗑 theo vị trí item.',
  ],

  formModeState: [
    'Panel trái dùng state formMode: "add" | "edit" để phân biệt hành động 2 nút.',
    'Khi formMode = "add" (mặc định): "+ Thêm vào menu" là nút chính.',
    'Khi formMode = "edit": "Cập nhật" là nút chính.',
    'Click ✏ trên item cây → formMode = "edit", điền dữ liệu vào form.',
    'Sau khi Cập nhật / Thêm / Hủy → formMode = "add", reset form về rỗng.',
    'Hai nút LUÔN render cùng lúc — không toggle ẩn/hiện.',
  ],

  observedScreens: [
    {
      name: 'menu-index',
      purpose: 'Danh sách menu',
      keyElements: [
        'Nút Thêm mới',
        'Ô tìm kiếm text',
        'Dropdown chọn loại menu (--Chọn loại menu--)',
        'Bảng danh sách menu',
        'Cột thao tác: [Sửa] → [Thiết lập] → [Xóa]',
      ],
    },
    {
      name: 'menu-edit-modal',
      purpose: 'Popup thêm/sửa menu',
      keyElements: [
        'Tên menu (input)',
        'Loại menu (select: 1=Menu Top, 2=Menu Footer, 3=Menu Left, 4=Menu Right)',
        'Checkbox Công khai',
        'Nút Lưu / Đóng',
      ],
    },
    {
      name: 'menu-link-page',
      purpose: 'Trang thiết lập liên kết cho một menu cụ thể',
      layout: 'Heading lớn trên cùng, bên dưới là 2 panel ngang (~50%/~50%) Bootstrap grid',

      keyElements: [
        // Page heading
        'Heading trang: "THIẾT LẬP LIÊN KẾT MENU TOP" (tên menu thay đổi theo menu)',

        // PANEL TRÁI — từ trên xuống
        '--- PANEL TRÁI ---',
        'Header teal: "Thêm/Sửa liên kết"',
        '',
        'Form (LUÔN hiển thị, không ẩn hiện):',
        '  Label "Tiêu đề" + Input text + Dropdown button (▼) ở bên phải input',
        '  Label "URL" + Input text (placeholder: URL)',
        '  Label "Target" + Select dropdown (default: "Self")',
        '    Options: Self | Blank | Parent | Top',
        '',
        'Hai nút ngay dưới form (LUÔN hiển thị cùng lúc, không toggle):',
        '  [🔄 Cập nhật]     — btn-primary (xanh dương)',
        '  [+ Thêm vào menu] — btn-success (xanh lá)',
        '',
        'Accordion 7 sections bên dưới nút (collapsed by default):',
        '  [TEAL] Nội dung tin tức',
        '  [TEAL] Chuyên mục tin tức',
        '  [TEAL] Trang tĩnh',
        '  [TEAL] Danh mục sản phẩm',
        '  [TEAL] Sản phẩm',
        '  [TEAL] Danh mục gói cước',
        '  [TEAL] Gói cước  (cuộn xuống mới thấy)',
        '',
        'Khi 1 accordion section EXPANDED:',
        '  - Ô tìm kiếm (input text + nút icon 🔍)',
        '  - Danh sách items có checkbox (multi-select, scrollable, có scrollbar)',
        '  - Nút "+ Thêm vào menu" (btn-success xanh lá) ở cuối section',

        // PANEL PHẢI — từ trên xuống
        '--- PANEL PHẢI ---',
        'Header teal: tên menu (ví dụ "Menu top")',
        '',
        'Cây items (root + child, phân cấp 2 cấp):',
        '  ROOT item ĐẦU "Trang chủ":         actions [▼][✏][🗑]',
        '  CHILD item "Gói cước 4G":   icon+   actions [▲][▼][↑][✏][🗑]',
        '  CHILD item "Gói cước DCOM": icon+   actions [▲][▼][↑][✏][🗑]',
        '  CHILD item "Gói cước COMBO":icon+   actions [▲][▼][↑][✏][🗑]',
        '  ROOT item "Gói cước roaming":       actions [▲][▼][↑][✏][🗑]',
        '  ROOT item "Tin tức":                actions [▲][▼][↑][✏][🗑]',
        '  ROOT item CUỐI "Tổng đài Viettel":  actions [▲][↑][✏][🗑]',
        '',
        'Cuối panel phải: [💾 Lưu] (xanh lá) + [⊗ Đóng] (xám), căn phải',
      ],

      uiDetail: [
        // DROPDOWN BUTTON BÊN PHẢI INPUT TIÊU ĐỀ
        'Dropdown button (▼) bên phải input Tiêu đề: Bootstrap input-group. Dùng để chọn nhanh loại nguồn link → auto-fill title+url vào form. Cần kiểm tra code cũ nếu đã có xử lý.',

        // 2 NÚT TRÊN FORM
        '"Cập nhật": dùng khi formMode = "edit" (sau khi click ✏ trên item cây). Gọi PUT API update item.',
        '"+ Thêm vào menu": dùng để tạo item mới từ dữ liệu đang có trong form. Gọi POST API.',
        'Hai nút luôn hiển thị cùng lúc. formMode state ("add" | "edit") phân biệt hành động.',
        'Sau khi Cập nhật hoặc Thêm xong: reset form về rỗng, formMode = "add".',

        // ACCORDION BEHAVIOR
        'Lazy load accordion: chỉ gọi API khi user mở section lần đầu (track bằng loadedSections state).',
        'Click item trong accordion → auto-fill Tiêu đề + URL vào form (KHÔNG tự add vào cây).',
        'Tick nhiều checkbox → click "+ Thêm vào menu" trong section → batch add tất cả items checked vào cây (dưới dạng root items mới, sortOrder tiếp theo).',
        'Sau khi batch add: bỏ check tất cả checkbox trong section đó.',
        'Tìm kiếm trong section: filter danh sách items theo keyword (realtime hoặc bấm 🔍).',

        // ACTIONS PANEL PHẢI — LOGIC CHÍNH XÁC
        '[▲] Ẩn nếu item là phần tử ĐẦU TIÊN trong group cùng parentId. Visible → swap sortOrder với item kề trên.',
        '[▼] Ẩn nếu item là phần tử CUỐI CÙNG trong group cùng parentId. Visible → swap sortOrder với item kề dưới.',
        '[↑] Với CHILD item: bỏ parentId (promote thành root, sortOrder cuối cùng trong root). Với ROOT item: set parentId = id của root item kề trên nó (nest thành child của root đó).',
        '[✏] Load item lên form panel trái: điền Tiêu đề, URL, Target. Set formMode = "edit".',
        '[🗑] Xóa item. Nếu item có con → hiện confirm dialog, cascade xóa con khi xác nhận.',
        'Icon "+" xanh lá bên trái child items: VISUAL INDICATOR ONLY — không phải nút bấm.',

        // NÚT LƯU / ĐÓNG
        '"Lưu": lưu batch toàn bộ cây (sortOrder + parentId của mỗi item) về DB.',
        '"Đóng": navigate về /admin/menu, không lưu thay đổi chưa save.',
      ],
    },
  ],

  requirements: [
    {
      id: 'REQ-01',
      title: 'Thêm bộ lọc loại menu ở trang danh sách',
      description: 'Dropdown "--Chọn loại menu--" kết hợp với ô tìm kiếm text (AND condition).',
      acceptanceCriteria: [
        'Chọn loại menu → chỉ hiện menu đúng loại.',
        'Không chọn → hiện tất cả.',
        'Kết hợp text + loại menu hoạt động đúng.',
        'Label: 1=Menu Top, 2=Menu Footer, 3=Menu Left, 4=Menu Right.',
      ],
    },
    {
      id: 'REQ-02',
      title: 'Chuẩn hóa hiển thị loại menu',
      description: 'Dùng MENU_TYPE_LABELS thay vì số nguyên ở bảng, form, filter.',
      acceptanceCriteria: [
        'Bảng hiển thị đúng label loại menu.',
        'Form thêm/sửa menu có select option có label rõ ràng.',
        'Submit vẫn map đúng về menuTypeId (1|2|3|4).',
        'Dùng 1 constant MENU_TYPE_LABELS chung cho cả 3 nơi.',
      ],
    },
    {
      id: 'REQ-03',
      title: 'Bổ sung icon Thiết lập trong cột thao tác',
      description: 'Thêm icon Thiết lập (thứ tự: Sửa → Thiết lập → Xóa). Click → /admin/menu-link/[menuId].',
      acceptanceCriteria: [
        'Mỗi dòng có icon Thiết lập (bi-gear hoặc bi-link-45deg).',
        'Thứ tự icon trong cột: Sửa → Thiết lập → Xóa.',
        'Click → navigate đúng route với menuId.',
      ],
    },
    {
      id: 'REQ-04',
      title: 'Giữ nguyên luồng thêm/sửa menu hiện tại',
      description: 'Không phá vỡ popup cập nhật menu đang có.',
      acceptanceCriteria: [
        'Popup thêm/sửa vẫn lưu đúng: tên menu, loại menu, công khai.',
        'Không làm lỗi chức năng cũ.',
      ],
    },
    {
      id: 'REQ-05',
      title: 'Panel trái: Form LUÔN hiện + Accordion sources bên dưới',
      description: 'Form Tiêu đề/URL/Target LUÔN hiển thị (không toggle). Bên dưới là accordion 7 sources.',
      acceptanceCriteria: [
        'Form LUÔN render, không ẩn hiện theo state.',
        'Input Tiêu đề có dropdown button (▼) bên phải — Bootstrap input-group.',
        'Select Target: default "Self", đủ 4 options (_self, _blank, _parent, _top).',
        'Nút "Cập nhật" (btn-primary) và "+ Thêm vào menu" (btn-success) LUÔN hiển thị cùng lúc, không toggle.',
        'formMode state: "add" | "edit" — phân biệt hành động 2 nút.',
        'Có đủ 7 accordion sections bên dưới form, header màu teal, default collapsed.',
        'Khi expand section: hiện search input + danh sách checkbox (multi-select, scrollable) + nút "+ Thêm vào menu".',
        'Lazy load: chỉ gọi API khi mở section lần đầu.',
        'Tìm kiếm trong section filter danh sách items.',
        'Tick nhiều items → bấm "+ Thêm vào menu" trong section → batch add vào cây.',
        'Sau batch add: reset checkbox trong section.',
        'Click 1 item trong accordion → auto-fill Tiêu đề + URL vào form (không tự add vào cây).',
      ],
    },
    {
      id: 'REQ-06',
      title: 'Panel phải: Cây menu items với actions THEO VỊ TRÍ item',
      description: 'Actions ▲▼↑✏🗑 hiển thị đúng theo vị trí item trong group cùng parentId.',
      acceptanceCriteria: [
        'Header panel phải: tên menu lấy từ DB.',
        'Child items có icon "+" xanh lá bên trái (visual only, KHÔNG phải nút).',
        'ROOT item ĐẦU: chỉ [▼][✏][🗑] — không có ▲ và ↑.',
        'ROOT item GIỮA: [▲][▼][↑][✏][🗑].',
        'ROOT item CUỐI: [▲][↑][✏][🗑] — không có ▼.',
        'CHILD item ĐẦU trong group: [▼][↑][✏][🗑] — không có ▲.',
        'CHILD item GIỮA: [▲][▼][↑][✏][🗑].',
        'CHILD item CUỐI trong group: [▲][↑][✏][🗑] — không có ▼.',
        '[▲][▼] swap sortOrder trong cùng parentId group.',
        '[↑] child → promote (parentId = null). Root → nest dưới root item kề trên (parentId = id root trên).',
        '[✏] load item lên form panel trái, set formMode = "edit".',
        '[🗑] xóa, confirm nếu có con.',
        'Nút "Lưu" (btn-success) + "Đóng" (btn-secondary) căn phải cuối panel.',
      ],
    },
    {
      id: 'REQ-07',
      title: 'Form sửa item: click ✏ load lên form, bấm "Cập nhật" để save',
      description: 'Khi click ✏, form panel trái load dữ liệu item. Bấm "Cập nhật" → PUT API.',
      acceptanceCriteria: [
        'Click ✏ → form điền Tiêu đề, URL, Target của item. formMode = "edit".',
        'Bấm "Cập nhật" → PUT API update → cập nhật item trong cây.',
        'Sau khi update: reset form về rỗng, formMode = "add".',
        'Có thể cancel sửa (bấm hủy) để về trạng thái add.',
      ],
    },
    {
      id: 'REQ-08',
      title: 'API backend: menu-link CRUD + reorder + sources',
      description: 'Đầy đủ API endpoints cho trang menu-link.',
      acceptanceCriteria: [
        'GET  /admin/api/menu-links?menuId=xxx → [{id, title, url, target, parentId, sortOrder, children:[]}].',
        'POST /admin/api/menu-links → tạo 1 item hoặc batch array.',
        'PUT  /admin/api/menu-links/[id] → update title/url/target/parentId/sortOrder.',
        'DELETE /admin/api/menu-links/[id] → xóa (cascade con hoặc báo lỗi nếu có con).',
        'PUT  /admin/api/menu-links/reorder → [{id, sortOrder, parentId}] update hàng loạt.',
        'GET  /admin/api/menu-link-sources?type=xxx&search=yyy → [{id, title, url}] cho accordion.',
        'Validator Zod: title bắt buộc, target ∈ {_self,_blank,_parent,_top}, url string.',
      ],
    },
  ],

  businessRules: [
    'Menu type hợp lệ: 1 (Menu Top), 2 (Menu Footer), 3 (Menu Left), 4 (Menu Right).',
    'Filter danh sách: text AND menuType, không chọn type thì trả tất cả.',
    'Trang menu-link: 1 menu → 1 trang /admin/menu-link/[menuId].',
    'MenuLink hỗ trợ 2 cấp phân cấp: root (parentId = null) và child (có parentId).',
    'sortOrder tăng dần trong cùng parentId group.',
    'Target mặc định _self.',
    'Xóa item có con: cascade xóa hoặc confirm trước.',
    'Accordion lazy load: gọi API khi mở section lần đầu.',
    'Batch add từ accordion: POST nhiều MenuLink, parentId = null, sortOrder tự tăng.',
    'Auto-fill từ accordion click: chỉ điền form, KHÔNG tự add vào cây.',
    'Nút "+ Thêm vào menu" trong accordion section: batch add items đã check.',
    'Nút "+ Thêm vào menu" trên form: add 1 item từ dữ liệu form.',
    'URL cho phép absolute (https://...) hoặc relative (/san-pham/...).',
    'Nút Lưu: save batch sortOrder + parentId toàn cây.',
    'Nút Đóng: navigate /admin/menu, không save.',
    'formMode = "add" | "edit" — 2 nút form LUÔN cùng hiện, phân biệt bằng formMode.',
  ],

  implementationHints: [
    'Kiểm tra Prisma model MenuLink — cần: id, menuId, parentId (nullable), title, url, target, sortOrder.',
    'Nếu thiếu field → prisma migrate trước, sau đó mới code UI.',
    'Panel grid: Bootstrap col-md-5 hoặc col-md-6 mỗi panel.',
    'Form LUÔN visible — không dùng conditional render. Reset value bằng setState khi cần.',
    'formMode state: "add" | "edit" — dùng để phân biệt hành động 2 nút. Luôn render cả 2 nút.',
    'Dropdown button (▼) bên phải input Tiêu đề: Bootstrap input-group + dropdown-toggle.',
    'Accordion: Bootstrap 5 accordion (accordion, accordion-item, accordion-collapse, accordion-button).',
    'Checkbox list trong accordion section: render từ API, track checked bằng Set<string> state.',
    'Lazy load tracking: Map<sectionKey, boolean> hoặc Set<sectionKey> cho loadedSections.',
    'MenuLinkTree: recursive component — item có children thì render lồng nhau.',
    'Ẩn ▲: index === 0 trong mảng cùng parentId group. Ẩn ▼: index === last trong group.',
    'Action ↑ logic: child → { parentId: null, sortOrder: max+1 }. Root → { parentId: id_of_root_above, sortOrder: max+1_in_that_parent }.',
    'Batch add từ accordion: POST /admin/api/menu-links với array, response trả về items mới, append vào cây.',
    'MenuLinkSources API: 1 route với ?type=xxx để tránh nhiều endpoints.',
    'Tái sử dụng MENU_TYPE_LABELS trong table, form, filter — không hardcode.',
  ],

  suggestedFilesToInspect: [
    // ĐỌC TRƯỚC (context)
    'prisma/schema.prisma — kiểm tra MenuLink model: có parentId? sortOrder? target?',
    'src/lib/constants.ts — thêm MENU_TYPE_LABELS nếu chưa có',
    'src/lib/types.ts — thêm MenuLinkItem type nếu cần',

    // Menu list page (sửa)
    'src/admin/features/menu/MenuFilters.tsx',
    'src/admin/features/menu/MenuTable.tsx',
    'src/admin/layout/menu/MenusPage.tsx',

    // Menu link page (tạo mới)
    'src/admin/layout/menu-links/MenuLinkSetupPage.tsx — page chính 2 panel',
    'src/admin/features/menu-link/MenuLinkFormPanel.tsx — form Tiêu đề/URL/Target + 2 nút',
    'src/admin/features/menu-link/MenuLinkAccordion.tsx — accordion 7 sources',
    'src/admin/features/menu-link/MenuLinkTree.tsx — cây panel phải',
    'src/admin/features/menu-link/MenuLinkTreeItem.tsx — 1 item đệ quy (nếu có)',

    // Server layer (tạo mới)
    'src/server/validators/menu-link.validator.ts',
    'src/server/repositories/menu-link.repository.ts',
    'src/server/services/menu-link.service.ts',

    // API routes (tạo mới)
    'src/admin/api/menu-links/route.ts              — GET list + POST create',
    'src/admin/api/menu-links/[id]/route.ts         — PUT update + DELETE',
    'src/admin/api/menu-links/reorder/route.ts      — PUT batch reorder',
    'src/admin/api/menu-link-sources/route.ts       — GET sources cho accordion',
  ],

  expectedFlow: [
    '(Menu list) Mở /admin/menu',
    '(Menu list) Chọn loại menu + nhập text → Tìm kiếm → danh sách lọc đúng',
    '(Menu list) Xem cột Loại menu hiển thị label (Menu Top...)',
    '(Menu list) Click icon Thiết lập → /admin/menu-link/[menuId]',
    '',
    '(Menu link) Load trang: panel phải hiện cây items, panel trái LUÔN hiện form rỗng + accordion collapsed',
    '(Menu link) Mở accordion "Chuyên mục tin tức" → API load danh sách → tick 3 items → "+ Thêm vào menu" → 3 items thêm vào cây',
    '(Menu link) Click 1 item trong accordion → Tiêu đề + URL auto-fill vào form → bấm "+ Thêm vào menu" → add 1 item',
    '(Menu link) Click ✏ item trong cây → form load dữ liệu → sửa → bấm "Cập nhật"',
    '(Menu link) Click ▲/▼ → sort item trong group',
    '(Menu link) Click ↑ child → promote thành root',
    '(Menu link) Click ↑ root → nest thành child của root phía trên',
    '(Menu link) Bấm "Lưu" → save batch về DB',
    '(Menu link) Bấm "Đóng" → về /admin/menu',
  ],

  notesForClaudeCode: [
    'ĐỌC prisma/schema.prisma TRƯỚC — kiểm tra MenuLink model có đủ: parentId, sortOrder, target chưa. Nếu thiếu → migrate trước.',
    'Xác định route menu-link hiện tại (/admin/menu-link/[id] hay tên khác) trước khi gắn link trong MenuTable.',
    'Form panel trái: LUÔN render, không toggle. Dùng formMode state ("add" | "edit") để phân biệt hành động 2 nút.',
    'Hai nút "Cập nhật" và "+ Thêm vào menu": LUÔN render cùng lúc — không toggle ẩn/hiện.',
    'Ẩn ▲ nếu index===0, ẩn ▼ nếu index===last trong cùng parentId group.',
    'Accordion lazy load: track loadedSections (Set hoặc Map), chỉ fetch 1 lần mỗi section.',
    'MenuLinkTree: recursive component — children array render lồng nhau.',
    'Action ↑: xác nhận behavior chính xác từ code cũ nếu có, hoặc implement theo mô tả trong uiDetail.',
    'Không tự ý đổi tên field DB/API khi chưa kiểm tra luồng hiện tại.',
    'Priority: REQ-01→REQ-04 (menu list, ít file, ít risk) → REQ-05→REQ-08 (menu-link page, nhiều file).',
    'Sau khi code: liệt kê files tạo/sửa + cách test thủ công cho từng REQ.',
  ],
};

export default MENU_FEATURE_REQUEST;
