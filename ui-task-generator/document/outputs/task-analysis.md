# Task Analysis: Menu Management Enhancement

## 1. Task Summary

| Field | Value |
|-------|-------|
| **Module** | Menu Management (Menu + MenuLink) |
| **Task Type** | enhancement |
| **Goal** | Cập nhật module quản lý menu: (1) lọc theo loại menu, (2) hiển thị label thay vì số, (3) bổ sung icon thiết lập điều hướng sang trang thiết lập liên kết |
| **Affected Layers** | UI (filter, table, form), Service (filter logic), Repository (select optimization) |
| **Risk Level** | low |

---

## 2. Files To Read

### Nhóm 1 — Bắt buộc đọc (đã đọc)
- `src/server/validators/menu.validator.ts` — MENU_TYPE_LABELS, getMenuTypeLabel, validateMenu
- `src/server/services/menu.service.ts` — getAllMenus, getMenuById, CRUD operations
- `src/server/repositories/menu.repository.ts` — findAll, findById, CRUD
- `src/admin/layout/menus/MenusPage.tsx` — page server component, filter logic
- `src/admin/features/menu/MenuTable.tsx` — bảng với cột loại menu, action buttons
- `src/admin/features/menu/MenuFilters.tsx` — form tìm kiếm với dropdown loại menu
- `src/admin/features/menu/MenuForm.tsx` — form thêm/sửa menu
- `src/admin/layout/menus/EditMenuPage.tsx` — page chỉnh sửa
- `src/admin/layout/menus/NewMenuPage.tsx` — page thêm mới
- `src/admin/components/MenuFormWrapper.tsx` — dynamic import wrapper
- `src/app/admin/api/menus/route.ts` — API GET/POST
- `src/app/admin/api/menus/[id]/route.ts` — API GET/PUT/DELETE
- `src/admin/layout/menu-links/MenuLinksPage.tsx` — trang menu-link (destination của "Thiết lập")
- `src/admin/features/menu-link/MenuLinkForm.tsx` — form menu-link (pre-fill menuId)
- `src/admin/components/AdminTopNav.tsx` — sidebar navigation
- `src/lib/constants.ts` — constants
- `prisma/schema.prisma` — Menu model (menuTypeId: BigInt)

### Nhóm 2 — Có thể cần đọc thêm
- `src/server/services/menu-link.service.ts` — để hiểu filter theo menuId ở service
- `src/server/repositories/menu-link.repository.ts` — để hiểu data access pattern

### Nhóm 3 — Không cần đọc
- `src/site/*` — site public (ngoài phạm vi task)
- `src/server/validators/menu-link.validator.ts` — menu-link validator
- `src/app/admin/api/menu-links/*` — menu-link API

---

## 3. Current Logic Summary

### 3.1. Menu List (MenusPage)
- Server component fetch `menuService.getAllMenus()` (không params)
- Filter bằng in-memory JS: `search`, `menuTypeId`, `status`
- `menuTypeId` filter: so sánh BigInt với BigInt parsed từ string
- Pass filtered data xuống `MenuTable` và `MenuFilters`

### 3.2. MenuFilters
- 3 controls: từ khóa (text), loại menu (dropdown với label "Menu Top/ Footer/ Left/ Right"), trạng thái (select)
- Submit button gọi `router.push()` với searchParams
- Reset button clear all fields

### 3.3. MenuTable
- Render table với STT, Tên menu, Loại menu (dùng `getMenuTypeLabel()`), Trạng thái, Ngày tạo, Thao tác
- Action column có: icon thiết lập (link đến `/admin/menu-links?menuId=${id}`), icon sửa, icon xóa
- Delete bằng fetch DELETE API + router.refresh()

### 3.4. MenuForm
- Fields: Tên menu (text), Loại menu (select với label), Công khai (checkbox)
- Submit POST/PUT đến `/admin/api/menus`
- Sau khi lưu: `window.location.href = '/admin/menus'`

### 3.5. MenuLink (menu-links page)
- **VẤN ĐỀ**: Trang `/admin/menu-links` là trang generic — hiển thị TẤT CẢ menu links, KHÔNG filter theo `menuId` từ URL param
- `menuId` từ `?menuId=...` được truyền xuống `MenuLinkFilters` nhưng không được dùng
- `MenuLinkForm` có field menuId nhưng không có cơ chế pre-fill từ URL

---

## 4. Gap Analysis

### REQ-01: Thêm bộ lọc loại menu
| Criteria | Status |
|----------|--------|
| Dropdown chọn loại menu | **ĐÚNG** — `MenuFilters` đã có dropdown |
| Filter kết hợp với text search | **ĐÚNG** — in-memory filter trong MenusPage |
| Label hiển thị thân thiện | **ĐÚNG** — dùng `getMenuTypeLabel()` |
| Không chọn → trả về tất cả | **ĐÚNG** — `if (sp.menuTypeId)` mới filter |

### REQ-02: Chuẩn hóa hiển thị loại menu
| Criteria | Status |
|----------|--------|
| Bảng hiển thị label (không phải số) | **ĐÚNG** — `getMenuTypeLabel()` trả về text |
| Form chọn bằng option rõ ràng | **ĐÚNG** — select với 4 options |
| Submit map đúng menuTypeId | **ĐÚNG** — form gửi số 1-4 |

### REQ-03: Bổ sung icon thiết lập trong cột thao tác
| Criteria | Status |
|----------|--------|
| Icon thiết lập mỗi dòng | **ĐÚNG** — đã có `btn-setup` với icon |
| Click điều hướng đúng | **CHƯA ĐÚNG** — điều hướng đến `/admin/menu-links?menuId=...` nhưng trang đó KHÔNG filter theo menuId |
| Route truyền đúng params | **CẦN CẢI THIỆN** — cần trang chuyên biệt hoặc filter thực sự |

### REQ-04: Giữ nguyên luồng cũ
| Criteria | Status |
|----------|--------|
| Popup thêm/sửa vẫn lưu được | **ĐÚNG** — không thay đổi |
| Không làm lỗi chức năng cũ | **ĐÚNG** — không có breaking changes |

---

## 5. Files To Modify

| File | Lý do |
|------|-------|
| `src/admin/layout/menu-links/MenuLinksPage.tsx` | Thêm param `menuId` vào Props, thêm filter theo menuId, hiển thị thông tin menu đang thiết lập |
| `src/admin/features/menu-link/MenuLinkFilters.tsx` | Thêm dropdown chọn menu để filter |
| `src/admin/features/menu-link/MenuLinkTable.tsx` | Đọc để hiểu cấu trúc bảng (cần cho context) |

---

## 6. Implementation Plan

### Bước 1: Cập nhật MenuLinksPage
- Thêm `menuId` vào searchParams interface
- Thêm logic filter `menuId` tương tự search/status
- Nếu có `menuId`, hiển thị banner info "Đang thiết lập liên kết cho: [Tên Menu]"
- Truyền `defaultMenuId` xuống `MenuLinkFilters`

### Bước 2: Cập nhật MenuLinkFilters
- Thêm prop `defaultMenuId`
- Thêm state `menuId`
- Thêm dropdown chọn menu (lấy từ API `/admin/api/menus`)
- Khi có `menuId` từ URL, pre-select và disable (vì đang trong context của 1 menu)
- Update `push()` để bao gồm `menuId`

### Bước 3: Verify & Test
- Kiểm tra MenusPage filter hoạt động đúng
- Kiểm tra MenuTable hiển thị label đúng
- Kiểm tra click "Thiết lập" → vào `/admin/menu-links?menuId=X` → hiển thị đúng menu + filter links

---

## 7. Risks

### UI
- **Low**: Không thay đổi layout, chỉ thêm banner info và filter control
- Risk: Dropdown menu trong MenuLinkFilters gọi API → cần handle loading state

### API
- **Low**: API `/admin/api/menus` đã có, không cần tạo mới
- API menu-links đã có filter search/status, thêm menuId filter đơn giản

### Service/Repository
- **Low**: Không đụng service/repository — filter in-memory ở page component
- Nếu sau này cần pagination thì mới cần đẩy xuống repository

### Regression
- **Low**: Task chỉ thêm/chỉnh sửa nhỏ ở UI filter
- Không ảnh hưởng: Menu CRUD, MenuLink CRUD, site rendering

---

## 8. Assumptions

1. **Icon "Thiết lập" đã hoạt động** — link đúng, nhưng trang đích chưa filter. Task này KHÔNG phải tạo trang mới mà chỉ cải thiện trang menu-links có sẵn.
2. **Không cần tạo page mới** — user muốn filter trên trang menu-links hiện có, không cần `/admin/menu-links/[menuId]/setup` riêng.
3. **Filter in-memory là đủ** — hiện tại menu-links cũng filter in-memory (search, status). Nếu dữ liệu lớn thì sau này mới cần chuyển xuống repository với pagination.
4. **MenuId trong menu-links là BigInt** — schema `menuId BigInt?` nên cần so sánh BigInt với BigInt (dùng `BigInt()` parse).

---

## 9. Module Reference Used

- `category` module pattern — tham khảo filter + table + page structure
- Slider module — tham khảo simple CRUD với filters
