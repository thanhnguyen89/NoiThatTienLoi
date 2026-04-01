/**
 * Feature request summary — Menu Management Module
 * Purpose: give Claude Opus / terminal agent a precise, machine-readable brief.
 *
 * Nguồn: phân tích từ nhiều ảnh UI thực tế của màn hình menu-link,
 * bao gồm ảnh tổng thể 2 panel, ảnh panel trái expanded,
 * ảnh close-up panel phải và ảnh close-up các icon action.
 *
 * GHI CHÚ QUAN TRỌNG:
 * - Phần panel phải trước đây bị mô tả sai khi gộp nhiều icon thành 3 mũi tên chung chung.
 * - Bản này chốt lại CHÍNH XÁC từng icon, từng hành vi click, từng điều kiện hiển thị.
 * - Đây là spec ưu tiên cao; nếu code hiện tại khác spec này thì phải sửa theo spec này.
 */

// ============================================================
// DIFF: VERSION SPEC CŨ → VERSION FINAL ĐÚNG
// ============================================================
//
// Điểm                                Spec cũ sai / thiếu              Spec final đúng
// ───────────────────────────────────────────────────────────────────────────────────────
// Action tree item                    Gộp thành 3 mũi tên              Có 4 icon action riêng biệt + edit + delete
// Icon đổi cấp                        Mô tả mơ hồ bằng ↑/⇄            Tách rõ fa-level-up-alt và fa-level-down-alt
// Toggle expand/collapse              Chưa mô tả rõ                    Có fas fa-plus / fas fa-minus cho item có con
// Drag & drop                         Chưa đề cập                      Có thể kéo thả vào vị trí mong muốn
// Tree style                          Mô tả chưa chặt                  Flat list legacy, row full-width, action group bên phải
// Child visual                        Chỉ nói icon + xanh             Là toggle cho item có con; nếu collapsed mặc định là plus
// Root/child action visibility        Chưa đủ chi tiết                 Có rule hiển thị riêng cho từng icon
// Promote/Demote behavior             Chưa chuẩn                        Level-up = vào thư mục con gần nhất; Level-down = ra khỏi thư mục vừa vào
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

export type MenuTreeActionIcon =
  | 'fas fa-chevron-up'
  | 'fas fa-chevron-down'
  | 'fas fa-level-up-alt'
  | 'fas fa-level-down-alt'
  | 'fas fa-plus'
  | 'fas fa-minus'
  | 'fas fa-edit'
  | 'fas fa-trash';

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
  { key: 'news-content', label: 'Nội dung tin tức' },
  { key: 'news-category', label: 'Chuyên mục tin tức' },
  { key: 'static-page', label: 'Trang tĩnh' },
  { key: 'product-category', label: 'Danh mục sản phẩm' },
  { key: 'product', label: 'Sản phẩm' },
  { key: 'package-category', label: 'Danh mục gói cước' },
  { key: 'package', label: 'Gói cước' },
];

// ============================================================
// PANEL TRÁI — CẤU TRÚC ĐẦY ĐỦ
// ============================================================
//
// Layout từ trên xuống dưới:
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
//  │ [HEADER TEAL ▶] Nội dung tin tức        │
//  │ [HEADER TEAL ▼] Chuyên mục tin tức      │
//  │   [___ Tìm kiếm __________] [🔍]        │
//  │   ┌─────────────────────────────────┐   │
//  │   │ ☑ Item 1                       │   │
//  │   │ ☑ Item 2                       │   │
//  │   │ ☐ Item 3                       │   │
//  │   └──────────── [scrollbar] ───────┘   │
//  │   [+ Thêm vào menu]                     │
//  │ [HEADER TEAL ▶] Trang tĩnh              │
//  │ [HEADER TEAL ▶] Danh mục sản phẩm       │
//  │ [HEADER TEAL ▶] Sản phẩm                │
//  │ [HEADER TEAL ▶] Danh mục gói cước       │
//  │ [HEADER TEAL ▶] Gói cước                │
//  └─────────────────────────────────────────┘
//
// ============================================================

// ============================================================
// PANEL PHẢI — FINAL UI CHUẨN THEO ẢNH THẬT
// ============================================================
//
//  ┌──────────────────────────────────────────────────────────────┐
//  │ [HEADER TEAL] Menu top                                      │
//  ├──────────────────────────────────────────────────────────────┤
//  │ Trang chủ                               [▼][✏][🗑]          │
//  │                                                              │
//  │ [ + ] Gói cước 4G          [▲][▼][level-up][level-down][✏][🗑]
//  │ [ + ] Gói cước DCOM        [▲][▼][level-up][level-down][✏][🗑]
//  │ [ + ] Gói cước COMBO       [▲][▼][level-up][level-down][✏][🗑]
//  │                                                              │
//  │ Gói cước roaming           [▲][▼][level-up][level-down][✏][🗑]
//  │ Tin tức                    [▲][▼][level-up][level-down][✏][🗑]
//  │ Tổng đài Viettel           [▲][level-down][✏][🗑]            │
//  ├──────────────────────────────────────────────────────────────┤
//  │                                              [💾 Lưu] [⊗ Đóng]
//  └──────────────────────────────────────────────────────────────┘
//
// GHI CHÚ QUAN TRỌNG:
// - Header chỉ hiện tên menu, ví dụ: "Menu top". KHÔNG append "(Menu Top)".
// - Danh sách là flat legacy list, không phải card tree hiện đại.
// - Mỗi row là full width, background trắng, border mảnh, action group nằm bên phải.
// - Nếu item có children thì phải có icon toggle expand/collapse riêng: plus / minus.
// - plus/minus là icon tree toggle, không được gộp chung với move-up/move-down.
// - Drag & drop phải được hỗ trợ để kéo item vào vị trí mong muốn.
//
// ============================================================

export const MENU_TREE_ICON_RULES = {
  expandCollapsed: 'fas fa-plus',
  expandExpanded: 'fas fa-minus',
  moveUp: 'fas fa-chevron-up',
  moveDown: 'fas fa-chevron-down',
  moveIntoNearestFolder: 'fas fa-level-up-alt',
  moveOutOfCurrentFolder: 'fas fa-level-down-alt',
  edit: 'fas fa-edit',
  delete: 'fas fa-trash',
} as const;

export const MENU_TREE_ACTION_DESCRIPTIONS = {
  'fas fa-plus': 'Toggle mở rộng item có con khi item đang ở trạng thái collapsed.',
  'fas fa-minus': 'Toggle thu gọn item có con khi item đang ở trạng thái expanded.',
  'fas fa-chevron-up': 'Di chuyển item lên trên trong cùng group anh em (cùng parentId).',
  'fas fa-chevron-down': 'Di chuyển item xuống dưới trong cùng group anh em (cùng parentId).',
  'fas fa-level-up-alt': 'Clickable: chuyển item vào thư mục / nhóm con gần nó nhất theo rule tree hiện tại.',
  'fas fa-level-down-alt': 'Clickable: chuyển item ra khỏi thư mục con hiện tại, quay về cấp cha ngay phía ngoài.',
  'fas fa-edit': 'Load item lên form panel trái để chỉnh sửa.',
  'fas fa-trash': 'Xóa item; nếu có con thì confirm trước khi xóa.',
} as const;

// ============================================================
// MAIN FEATURE REQUEST
// ============================================================

export const MENU_FEATURE_REQUEST = {
  module: 'Menu Management + Menu Link',
  goal:
    'Cập nhật module quản lý menu để hỗ trợ lọc theo loại menu, hiển thị label loại menu, thêm action icon thiết lập, và xây dựng đầy đủ trang thiết lập liên kết menu (menu-link) theo đúng UI thực tế, bao gồm tree action chính xác, drag-drop, và toggle expand/collapse.',

  context: [
    'Trang danh sách menu: cột thao tác cần bổ sung icon Thiết lập (Sửa → Thiết lập → Xóa).',
    'Trang menu-link gồm 2 panel ngang.',
    'Panel trái: form Tiêu đề/URL/Target (LUÔN hiện, không toggle) + accordion 7 sources bên dưới.',
    'Panel phải: cây menu items dạng legacy flat list, hỗ trợ root/child, 4 icon điều hướng riêng biệt, expand/collapse, edit, delete và drag-drop.',
  ],

  formModeState: [
    'Panel trái dùng state formMode: "add" | "edit" để phân biệt hành động 2 nút.',
    'Khi formMode = "add" (mặc định): "+ Thêm vào menu" là nút chính.',
    'Khi formMode = "edit": "Cập nhật" là nút chính.',
    'Click edit trên item cây → formMode = "edit", điền dữ liệu vào form.',
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
        'Heading trang: "THIẾT LẬP LIÊN KẾT MENU TOP" (tên menu thay đổi theo menu)',
        'Panel trái luôn hiện form + accordion 7 nguồn dữ liệu.',
        'Panel phải header teal chỉ hiện tên menu, ví dụ: "Menu top".',
        'Panel phải hiển thị tree list dạng row phẳng, action bên phải, không phải nested card hiện đại.',
        'Tree hỗ trợ expand/collapse, move up, move down, move into, move out, edit, delete, drag-drop.',
      ],
      uiDetail: [
        'Dropdown button (▼) bên phải input Tiêu đề: Bootstrap input-group. Dùng để chọn nhanh loại nguồn link → auto-fill title+url vào form.',
        '"Cập nhật": dùng khi formMode = "edit". Gọi PUT API update item.',
        '"+ Thêm vào menu": dùng để tạo item mới từ dữ liệu đang có trong form. Gọi POST API.',
        'Hai nút luôn hiển thị cùng lúc. formMode state ("add" | "edit") phân biệt hành động.',
        'Sau khi Cập nhật hoặc Thêm xong: reset form về rỗng, formMode = "add".',
        'Lazy load accordion: chỉ gọi API khi user mở section lần đầu.',
        'Click item trong accordion → auto-fill Tiêu đề + URL vào form (KHÔNG tự add vào cây).',
        'Tick nhiều checkbox → click "+ Thêm vào menu" trong section → batch add tất cả items checked vào cây.',
        'Sau khi batch add: bỏ check tất cả checkbox trong section đó.',
        'Tìm kiếm trong section: filter danh sách items theo keyword.',
        'Tree row phải có 4 icon action điều hướng riêng biệt, KHÔNG được gộp chung thành 3 mũi tên.',
        'fas fa-chevron-up: move up trong cùng parent group.',
        'fas fa-chevron-down: move down trong cùng parent group.',
        'fas fa-level-up-alt: clickable, chuyển item vào thư mục con gần nó nhất theo rule tree hiện tại.',
        'fas fa-level-down-alt: clickable, chuyển item ra khỏi thư mục con vừa vào / current folder, trở về cấp cha phía ngoài.',
        'Nếu item có con thì có icon fas fa-plus khi collapsed, fas fa-minus khi expanded.',
        'fas fa-plus / fas fa-minus là toggle expand/collapse, không phải icon trang trí.',
        'Drag & drop: user có thể kéo thả item vào vị trí mong muốn; thả vào root hay child đều phải cập nhật parentId + sortOrder đúng.',
        'fas fa-edit: load item lên form panel trái, set formMode = "edit".',
        'fas fa-trash: xóa item; nếu có con → hiện confirm dialog, có thể cascade theo rule backend.',
        'Nút "Lưu": lưu batch toàn bộ cây (sortOrder + parentId + expanded state nếu cần giữ UI state ở client).',
        'Nút "Đóng": navigate về /admin/menu, không lưu thay đổi chưa save.',
      ],
    },
  ],

  uiActionRules: [
    'Không được mô tả chung là "3 mũi tên". Đây là 4 icon điều hướng riêng biệt + toggle expand/collapse + edit + delete.',
    'Icon điều hướng riêng biệt gồm: move-up, move-down, move-into, move-out.',
    'move-up = fas fa-chevron-up.',
    'move-down = fas fa-chevron-down.',
    'move-into = fas fa-level-up-alt.',
    'move-out = fas fa-level-down-alt.',
    'Nếu item có children và đang collapsed → hiển thị fas fa-plus.',
    'Nếu item có children và đang expanded → hiển thị fas fa-minus.',
    'fas fa-plus / fas fa-minus là clickable toggle expand/collapse.',
    'fas fa-edit và fas fa-trash là action riêng, không thuộc nhóm điều hướng.',
    'Action buttons phải là từng button riêng biệt, không được gộp suy diễn sai logic.',
  ],

  uiStyleRules: [
    'Panel phải là legacy flat list style.',
    'Mỗi item là 1 row full width, background trắng, border mảnh, chiều cao đồng đều.',
    'Text item căn trái, action area căn phải.',
    'Không dùng nested card UI kiểu hiện đại.',
    'Child items phải thụt vào so với root items.',
    'Nếu item có con thì icon plus/minus nằm ở vùng đầu row để toggle tree.',
    'Không hiển thị badge phụ như "Mới" nếu không có trong UI gốc.',
    'Header panel phải chỉ hiện tên menu; không thêm loại menu trong ngoặc.',
    'Footer panel phải chứa nút Lưu và Đóng, căn phải.',
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
      title: 'Panel phải: Tree menu items với icon/action chính xác, expand/collapse và drag-drop',
      description:
        'Panel phải phải render đúng tree legacy UI, có 4 icon điều hướng riêng biệt, icon toggle expand/collapse cho item có con, edit/delete riêng và hỗ trợ kéo thả.',
      acceptanceCriteria: [
        'Header panel phải chỉ hiển thị tên menu lấy từ DB.',
        'Tree render dạng flat legacy list, không dùng nested card UI.',
        'Có 4 icon điều hướng riêng: fas fa-chevron-up, fas fa-chevron-down, fas fa-level-up-alt, fas fa-level-down-alt.',
        'Không được gộp logic 4 icon trên thành "3 mũi tên".',
        'fas fa-level-up-alt clickable: chuyển item vào thư mục con gần nó nhất theo rule tree hiện tại.',
        'fas fa-level-down-alt clickable: chuyển item ra khỏi thư mục con hiện tại / vừa vào.',
        'Nếu item có children và collapsed thì hiển thị fas fa-plus.',
        'Nếu item có children và expanded thì hiển thị fas fa-minus.',
        'Click plus/minus phải toggle được mở rộng / thu gọn children.',
        'Item không có con thì không hiển thị plus/minus toggle.',
        'fas fa-edit load item lên form panel trái, set formMode = "edit".',
        'fas fa-trash xóa item; nếu có con thì confirm trước.',
        'Có thể kéo thả item vào vị trí mong muốn trong tree.',
        'Sau drag-drop phải cập nhật parentId, sortOrder và cấu trúc tree đúng.',
        'Nút "Lưu" và "Đóng" nằm cuối panel, căn phải.',
      ],
    },
    {
      id: 'REQ-07',
      title: 'Form sửa item: click edit load lên form, bấm "Cập nhật" để save',
      description: 'Khi click edit, form panel trái load dữ liệu item. Bấm "Cập nhật" → PUT API.',
      acceptanceCriteria: [
        'Click edit → form điền Tiêu đề, URL, Target của item. formMode = "edit".',
        'Bấm "Cập nhật" → PUT API update → cập nhật item trong cây.',
        'Sau khi update: reset form về rỗng, formMode = "add".',
        'Có thể cancel sửa để về trạng thái add.',
      ],
    },
    {
      id: 'REQ-08',
      title: 'API backend: menu-link CRUD + reorder + drag-drop + sources',
      description: 'Đầy đủ API endpoints cho trang menu-link, bao gồm reorder sau click icon và sau drag-drop.',
      acceptanceCriteria: [
        'GET  /admin/api/menu-links?menuId=xxx → [{id, title, url, target, parentId, sortOrder, children:[]}].',
        'POST /admin/api/menu-links → tạo 1 item hoặc batch array.',
        'PUT  /admin/api/menu-links/[id] → update title/url/target/parentId/sortOrder.',
        'DELETE /admin/api/menu-links/[id] → xóa (cascade con hoặc báo lỗi nếu có con).',
        'PUT  /admin/api/menu-links/reorder → nhận payload batch để update hàng loạt parentId + sortOrder sau click icon hoặc drag-drop.',
        'GET  /admin/api/menu-link-sources?type=xxx&search=yyy → [{id, title, url}] cho accordion.',
        'Validator Zod: title bắt buộc, target ∈ {_self,_blank,_parent,_top}, url string.',
      ],
    },
  ],

  businessRules: [
    'Menu type hợp lệ: 1 (Menu Top), 2 (Menu Footer), 3 (Menu Left), 4 (Menu Right).',
    'Filter danh sách: text AND menuType, không chọn type thì trả tất cả.',
    'Trang menu-link: 1 menu → 1 trang /admin/menu-link/[menuId].',
    'MenuLink hỗ trợ cấu trúc tree theo parentId; tối thiểu phải hỗ trợ root và child như UI hiện tại.',
    'sortOrder tăng dần trong cùng parentId group.',
    'Target mặc định _self.',
    'Xóa item có con: confirm trước khi xóa; backend có thể cascade nếu business chấp nhận.',
    'Accordion lazy load: gọi API khi mở section lần đầu.',
    'Batch add từ accordion: POST nhiều MenuLink, parentId mặc định theo nơi add, sortOrder tự tăng.',
    'Auto-fill từ accordion click: chỉ điền form, KHÔNG tự add vào cây.',
    'Nút "+ Thêm vào menu" trong accordion section: batch add items đã check.',
    'Nút "+ Thêm vào menu" trên form: add 1 item từ dữ liệu form.',
    'URL cho phép absolute (https://...) hoặc relative (/san-pham/...).',
    'Nút Lưu: save batch sortOrder + parentId toàn cây.',
    'Nút Đóng: navigate /admin/menu, không save.',
    'formMode = "add" | "edit" — 2 nút form LUÔN cùng hiện, phân biệt bằng formMode.',
    'fas fa-level-up-alt: dùng để chuyển item vào thư mục con gần nhất theo rule tree hiện hành.',
    'fas fa-level-down-alt: dùng để đưa item ra khỏi thư mục con hiện tại, về cấp cha gần nhất.',
    'fas fa-plus / fas fa-minus chỉ hiển thị cho item có con.',
    'Drag-drop có hiệu lực tương đương thao tác thay đổi vị trí tree và phải được lưu bằng batch reorder.',
  ],

  implementationHints: [
    'Kiểm tra Prisma model MenuLink — cần tối thiểu: id, menuId, parentId (nullable), title, url, target, sortOrder.',
    'Nếu thiếu field phục vụ tree / reorder → prisma migrate trước, sau đó mới code UI.',
    'Panel grid: Bootstrap col-md-6 / col-lg-6 mỗi panel.',
    'Form LUÔN visible — không dùng conditional render.',
    'formMode state: "add" | "edit" — dùng để phân biệt hành động 2 nút. Luôn render cả 2 nút.',
    'Dropdown button (▼) bên phải input Tiêu đề: Bootstrap input-group + dropdown-toggle.',
    'Accordion: Bootstrap 5 accordion.',
    'Checkbox list trong accordion section: render từ API, track checked bằng Set<string> state.',
    'Lazy load tracking: Set<sectionKey> cho loadedSections.',
    'Panel phải nên tách thành: MenuLinkTreePanel → MenuLinkTree → MenuLinkTreeRow.',
    'Không hardcode icon logic mơ hồ; phải map explicit từng action icon.',
    'fas fa-plus / fas fa-minus là toggle expand/collapse của item có con.',
    'fas fa-level-up-alt và fas fa-level-down-alt là 2 action RIÊNG, không dùng chung 1 icon suy diễn.',
    'Cần local tree state ở client để hỗ trợ click action và drag-drop trước khi bấm Lưu.',
    'Drag & drop có thể dùng HTML5 drag events hiện có hoặc giải pháp không thêm thư viện mới.',
    'Sau mọi thao tác click action / drag-drop, phải normalize lại sortOrder theo group.',
    'MenuLinkSources API: 1 route với ?type=xxx để tránh nhiều endpoints.',
    'Tái sử dụng MENU_TYPE_LABELS trong table, form, filter — không hardcode.',
  ],

  suggestedFilesToInspect: [
    'prisma/schema.prisma — kiểm tra MenuLink model: có parentId? sortOrder? target?',
    'src/lib/constants.ts — thêm MENU_TYPE_LABELS và icon constants nếu cần',
    'src/lib/types.ts — thêm MenuLinkItem / MenuTreeNode type nếu cần',

    'src/admin/features/menu/MenuFilters.tsx',
    'src/admin/features/menu/MenuTable.tsx',
    'src/admin/layout/menu/MenusPage.tsx',

    'src/admin/layout/menu-links/MenuLinkSetupPage.tsx — page chính 2 panel',
    'src/admin/features/menu-link/MenuLinkFormPanel.tsx — form Tiêu đề/URL/Target + 2 nút',
    'src/admin/features/menu-link/MenuLinkAccordion.tsx — accordion 7 sources',
    'src/admin/features/menu-link/MenuLinkTree.tsx — tree panel phải',
    'src/admin/features/menu-link/MenuLinkTreeRow.tsx — 1 row tree với icon/action cụ thể',

    'src/server/validators/menu-link.validator.ts',
    'src/server/repositories/menu-link.repository.ts',
    'src/server/services/menu-link.service.ts',

    'src/admin/api/menu-links/route.ts',
    'src/admin/api/menu-links/[id]/route.ts',
    'src/admin/api/menu-links/reorder/route.ts',
    'src/admin/api/menu-link-sources/route.ts',
  ],

  expectedFlow: [
    '(Menu list) Mở /admin/menu',
    '(Menu list) Chọn loại menu + nhập text → Tìm kiếm → danh sách lọc đúng',
    '(Menu list) Xem cột Loại menu hiển thị label (Menu Top...)',
    '(Menu list) Click icon Thiết lập → /admin/menu-link/[menuId]',
    '',
    '(Menu link) Load trang: panel phải hiện tree items, panel trái LUÔN hiện form rỗng + accordion collapsed',
    '(Menu link) Mở accordion "Chuyên mục tin tức" → API load danh sách → tick nhiều items → "+ Thêm vào menu" → items thêm vào tree',
    '(Menu link) Click 1 item trong accordion → Tiêu đề + URL auto-fill vào form → bấm "+ Thêm vào menu" → add 1 item',
    '(Menu link) Click edit item trong tree → form load dữ liệu → sửa → bấm "Cập nhật"',
    '(Menu link) Click chevron-up / chevron-down → đổi vị trí item trong cùng group',
      '(Menu link) Click level-up-alt → chuyển item vào thư mục con gần nó nhất',
      '(Menu link) Click level-down-alt → chuyển item ra khỏi thư mục con hiện tại',                     
    '(Menu link) Nếu item có con → click plus/minus để thu gọn / mở rộng children',
    '(Menu link) Kéo thả item vào vị trí mong muốn trong tree',
    '(Menu link) Bấm "Lưu" → save batch về DB',
    '(Menu link) Bấm "Đóng" → về /admin/menu',
  ],

  notesForClaudeCode: [
    'ĐỌC prisma/schema.prisma TRƯỚC — kiểm tra MenuLink model có đủ: parentId, sortOrder, target chưa. Nếu thiếu → migrate trước.',
    'Xác định route menu-link hiện tại trước khi gắn link trong MenuTable.',
    'Form panel trái: LUÔN render, không toggle.',
    'Hai nút "Cập nhật" và "+ Thêm vào menu": LUÔN render cùng lúc — không toggle ẩn/hiện.',
    'KHÔNG mô tả hay implement icon tree theo kiểu gộp chung "3 mũi tên".',
    'fas fa-level-up-alt và fas fa-level-down-alt là 2 action riêng biệt, bắt buộc tách logic riêng.',
    'fas fa-plus mặc định là collapsed state cho item có con; expanded thì dùng fas fa-minus.',
    'Panel phải cần local tree state để xử lý expand/collapse và drag-drop trước khi save.',
    'Cần normalize sortOrder sau mọi hành động reorder / move-into / move-out / drag-drop.',
    'Không tự ý thêm badge hoặc text phụ không có trong UI gốc.',
    'Priority: chốt đúng panel phải trước, vì đây là phần đang bị hiểu sai spec.',
    'Sau khi code: liệt kê files tạo/sửa + cách test thủ công cho từng REQ.',
  ],
};

export default MENU_FEATURE_REQUEST;
