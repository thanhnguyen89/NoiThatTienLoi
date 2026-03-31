# Test Plan: Menu Management Enhancement

## 1. Manual QA Checklist

### REQ-01: Bộ lọc loại menu ở trang danh sách menu (MenuFilters)

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|---------|--------|
| 1 | Filter theo loại Menu Top | Chọn "Menu Top", bấm Tìm kiếm | Chỉ hiển thị menu có loại Menu Top | — |
| 2 | Filter theo loại Menu Footer | Chọn "Menu Footer", bấm Tìm kiếm | Chỉ hiển thị menu có loại Menu Footer | — |
| 3 | Filter kết hợp text + loại menu | Nhập text "abc" + chọn loại → Tìm | Lọc đúng cả 2 điều kiện | — |
| 4 | Không chọn loại → tất cả | Bỏ trống dropdown → Tìm | Hiển thị tất cả menu | — |
| 5 | Reset xóa filter loại | Bấm Làm mới | Dropdown về "Tất cả", danh sách đầy đủ | — |
| 6 | URL param đúng | Sau khi filter, copy URL | URL chứa `?menuTypeId=1` hoặc tương tự | — |

### REQ-02: Chuẩn hóa hiển thị loại menu

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|---------|--------|
| 1 | Bảng hiển thị label | Mở trang danh sách menu | Cột "Loại menu" hiển thị text: "Menu Top", "Menu Footer" thay vì "1", "2" | — |
| 2 | Form thêm menu chọn loại | Mở `/admin/menus/new`, mở dropdown | Options hiển thị: Menu Top, Menu Footer, Menu Left, Menu Right | — |
| 3 | Form sửa menu hiển thị đúng | Mở `/admin/menus/[id]/edit` | Dropdown chọn đúng loại hiện tại | — |
| 4 | Submit lưu đúng giá trị | Tạo menu với loại "Menu Left", lưu → vào sửa | Loại vẫn là "Menu Left" | — |

### REQ-03: Icon thiết lập trong cột thao tác

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|---------|--------|
| 1 | Click icon thiết lập | Ở trang danh sách menu, bấm icon chain ở dòng nào đó | Chuyển đến `/admin/menu-links?menuId=X` (X = menuTypeId của menu đó) | — |
| 2 | Trang menu-links hiển thị banner | Vào từ icon thiết lập | Banner hiện: "Đang thiết lập liên kết cho: [Tên Menu] ([Loại])" | — |
| 3 | Danh sách links đã lọc | Vào từ icon thiết lập của 1 menu cụ thể | Chỉ hiển thị links thuộc menu đó | — |
| 4 | Filter menu dropdown bị khóa | Vào từ menu context | Dropdown "Menu" bị disable, hiển thị đúng menu | — |
| 5 | Nút Thêm mới giữ context | Vào từ menu context, bấm "Thêm mới" | Link là `/admin/menu-links/new?menuId=X` (giữ context) | — |
| 6 | Form tạo link pre-fill menuId | Vào Thêm mới từ context menu | Trường Menu ID đã pre-fill đúng | — |
| 7 | Quay lại từ banner | Bấm "Quay lai danh sach menu" | Về `/admin/menus` | — |

### REQ-04: Giữ nguyên luồng cũ

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|---------|--------|
| 1 | Tạo menu mới | `/admin/menus/new` → nhập tên, chọn loại, lưu | Menu mới xuất hiện trong danh sách | — |
| 2 | Sửa menu | Mở sửa menu → đổi tên → lưu | Tên cập nhật, các field khác giữ nguyên | — |
| 3 | Xóa menu | Bấm xóa menu → xác nhận | Menu biến mất khỏi danh sách | — |
| 4 | Tạo menu-link thủ công | `/admin/menu-links/new` (không qua menu context) | Form bình thường, không pre-fill | — |
| 5 | Sửa menu-link | Mở sửa menu-link → đổi title → lưu | Lưu đúng, về danh sách | — |
| 6 | Xóa menu-link | Bấm xóa → xác nhận | Link biến mất | — |

---

## 2. Regression Tests

| # | Feature | Test | Expected | Status |
|---|---------|------|---------|--------|
| R1 | Menu list | Mở `/admin/menus` | Tải đúng dữ liệu, không lỗi | — |
| R2 | Menu filter | Filter tìm kiếm text | Tìm đúng theo tên | — |
| R3 | Menu filter | Filter trạng thái active/inactive | Lọc đúng trạng thái | — |
| R4 | MenuLink list | Mở `/admin/menu-links` không param | Hiển thị tất cả, không banner | — |
| R5 | MenuLink filter | Search theo title/slug | Lọc đúng | — |
| R6 | MenuLink filter | Filter trạng thái nofollow | Lọc đúng | — |
| R7 | API menus | GET `/admin/api/menus` | Trả về JSON `{ success: true, data: [...] }` | — |
| R8 | API menu-links | GET `/admin/api/menu-links` | Trả về JSON đúng format | — |

---

## 3. Edge Cases

| # | Scenario | Steps | Expected | Status |
|---|----------|-------|---------|--------|
| E1 | Menu không có tên | Vào thiết lập menu không tên | Banner hiển thị "Khong co ten" | — |
| E2 | Menu ID không tồn tại trong links | Vào menu-links?menuId=999 | Banner hiển thị tên, danh sách trống | — |
| E3 | Xóa filter menu khi đang locked | Bấm Làm mới khi dropdown bị lock | URL mất `menuId`, filter mở khóa, hiển thị tất cả | — |
| E4 | Nhiều menu cùng loại | Tạo 2 menu Top | Filter theo loại hiển thị đúng cả 2 | — |
| E5 | BigInt overflow (menuId lớn) | Truyền menuId > Number.MAX_SAFE_INTEGER | Filter vẫn đúng (dùng BigInt) | — |

---

## 4. Quick Test Script

```bash
# 1. Chạy dev server
npm run dev

# 2. Đăng nhập admin
# Username: admin / Password: admin123

# 3. Test flow đầy đủ:
# 3a. Menu list + filter (REQ-01, REQ-02)
open http://localhost:3000/admin/menus
→ Chọn "Menu Top" → Tìm kiếm
→ Reset → Làm mới

# 3b. Tạo menu mới (REQ-04)
open http://localhost:3000/admin/menus/new
→ Nhập "Menu Test", chọn "Menu Footer", lưu

# 3c. Click thiết lập (REQ-03)
open http://localhost:3000/admin/menus
→ Bấm icon chain của "Menu Test"
→ Kiểm tra banner info
→ Kiểm tra danh sách links đã lọc đúng menu

# 3d. Thêm menu-link từ context (REQ-03)
→ Bấm "Thêm mới" (giữ context)
→ Kiểm tra trường Menu ID đã pre-fill

# 3e. Regression (REQ-04)
→ Tạo menu-link thủ công (ra khỏi context)
→ Kiểm tra form hoạt động bình thường
```
