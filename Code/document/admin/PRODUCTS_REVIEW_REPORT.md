# 📊 BÁO CÁO REVIEW HỆ THỐNG QUẢN LÝ SẢN PHẨM (PRODUCTS)

## 🎯 TỔNG QUAN

**Ngày review:** 16/04/2026
**Reviewer:** Development Team
**Đánh giá tổng thể:** **85-90%** ✅

---

## ✅ NHỮNG ĐIỂM TỐT (STRENGTHS)

### 1. **Cấu trúc Code Tốt**
- ✅ Component được tách bạch rõ ràng
- ✅ Type safety với TypeScript
- ✅ Sử dụng Server Components + Client Components hợp lý
- ✅ Code dễ đọc, dễ maintain

### 2. **Bộ Lọc Mạnh Mẽ** (ProductFilters)
- ✅ **9 tiêu chí lọc** đầy đủ:
  - Tìm kiếm từ khóa (tên/SKU)
  - Trạng thái công khai (active/inactive)
  - Danh mục (category)
  - Khoảng ngày tạo (from-to)
  - Khoảng giá (min-max)
  - Kích thước (size)
  - Màu sắc (color)
- ✅ Fetch sizes/colors từ API động
- ✅ Enter để search nhanh
- ✅ Reset filter tiện lợi

### 3. **Bảng Hiển Thị Chuyên Nghiệp** (ProductTable)
- ✅ Hiển thị đầy đủ thông tin:
  - STT, Hình ảnh thumbnail
  - Tên + Brand
  - SKU
  - Danh mục
  - Số lượng biến thể
  - Ngày tạo, Lượt xem
  - Nổi bật, Công khai
  - Thao tác (Sửa, Xóa)
- ✅ Confirm trước khi xóa
- ✅ Loading state khi xóa
- ✅ Empty state thân thiện

### 4. **Form Sản Phẩm Đầy Đủ** (ProductForm)
- ✅ **7 Tabs** tổ chức tốt:
  - Thông tin cơ bản
  - Biến thể (variants)
  - Hình ảnh
  - SEO Website
  - Facebook
  - TikTok
  - YouTube
- ✅ Rich Text Editor cho mô tả
- ✅ Upload ảnh (single + multiple)
- ✅ Image Manager Modal
- ✅ Quản lý biến thể (size + color matrix)
- ✅ Auto-generate slug từ tên

### 5. **Tích Hợp Tốt**
- ✅ Pagination component
- ✅ DB safe wrapper
- ✅ Error handling đầy đủ
- ✅ Loading states

---

## ⚠️ CÁC VẤN ĐỀ CẦN KHẮC PHỤC

### 🔴 **QUAN TRỌNG - Cần sửa ngay**

#### 1. **ProductTable - Thiếu Checkbox & Bulk Actions**
**Vấn đề:**
- ❌ Không có checkbox chọn nhiều sản phẩm
- ❌ Không có bulk actions (xóa hàng loạt, đổi trạng thái hàng loạt)
- ❌ Không có "Chọn tất cả"

**So sánh với OrderTable & MemberTable:**
- Orders & Members: Có đầy đủ checkbox + bulk actions ✅
- Products: Không có ❌

**Đề xuất:**
```tsx
// Cần thêm vào ProductTable:
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Checkbox header
<th style={{ width: 40 }}>
  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
</th>

// Checkbox mỗi row
<td>
  <input type="checkbox" checked={selectedIds.has(product.id)}
    onChange={() => toggle(product.id)} />
</td>

// Bulk actions bar
{selectedIds.size > 0 && (
  <div className="alert alert-warning">
    Đã chọn {selectedIds.size} sản phẩm
    <button onClick={handleBulkDelete}>Xóa</button>
    <button onClick={handleBulkActivate}>Công khai</button>
    <button onClick={handleBulkDeactivate}>Ẩn</button>
  </div>
)}
```

#### 2. **ProductsPage - Thiếu Thống Kê Nhanh**
**Vấn đề:**
- ❌ Không có stats cards như Orders/Members
- ❌ Không thể nhìn tổng quan nhanh

**So sánh:**
- Orders: Có 8 stats boxes (pending, confirmed, shipping...) ✅
- Members: Có 4 stats boxes (total, active, inactive...) ✅
- Products: Không có ❌

**Đề xuất:**
Thêm section stats trước bộ lọc:
```tsx
<div className="row g-3 mb-3">
  <div className="col-md-3">
    <div className="dashboard-stat dashboard-stat--total">
      <div className="dashboard-stat__value">{stats.total}</div>
      <div className="dashboard-stat__label">Tổng sản phẩm</div>
    </div>
  </div>
  <div className="col-md-3">
    <div className="dashboard-stat dashboard-stat--active">
      <div className="dashboard-stat__value">{stats.active}</div>
      <div className="dashboard-stat__label">Đang công khai</div>
    </div>
  </div>
  <div className="col-md-3">
    <div className="dashboard-stat dashboard-stat--inactive">
      <div className="dashboard-stat__value">{stats.inactive}</div>
      <div className="dashboard-stat__label">Đang ẩn</div>
    </div>
  </div>
  <div className="col-md-3">
    <div className="dashboard-stat dashboard-stat--featured">
      <div className="dashboard-stat__value">{stats.featured}</div>
      <div className="dashboard-stat__label">Nổi bật</div>
    </div>
  </div>
</div>
```

#### 3. **ProductTable - Thiếu Giá Bán**
**Vấn đề:**
- ❌ Bảng không hiển thị giá bán (salePrice)
- ❌ Khó so sánh giá giữa các sản phẩm
- ❌ Không biết sản phẩm nào đang có giá khuyến mãi

**Đề xuất:**
Thêm cột "Giá bán" sau cột "Danh mục":
```tsx
<th className="text-end" style={{ width: 120 }}>Giá bán</th>

// Body
<td className="text-end">
  <div className="fw-semibold text-danger">
    {formatPrice(product.salePrice)}
  </div>
  {product.promoPrice && product.promoPrice < product.salePrice && (
    <div className="small text-muted text-decoration-line-through">
      {formatPrice(product.promoPrice)}
    </div>
  )}
</td>
```

### 🟡 **TRUNG BÌNH - Nên cải thiện**

#### 4. **Thiếu Export Excel**
- ❌ Không có nút "Xuất Excel" như OrdersPage
- Cần thêm `ProductExportButton` component

#### 5. **Thiếu Quick View**
- ❌ Không có nút "Xem nhanh" sản phẩm
- Phải click "Sửa" mới thấy chi tiết
- Đề xuất: Thêm nút "Chi tiết" mở modal xem nhanh

#### 6. **Thiếu Copy/Duplicate Product**
- ❌ Không có tính năng nhân bản sản phẩm
- Hữu ích khi tạo sản phẩm tương tự
- Đề xuất: Nút "Sao chép" trong dropdown actions

#### 7. **Thiếu Import Excel**
- ❌ Không thể import sản phẩm hàng loạt
- Đề xuất: Nút "Nhập Excel" cạnh "Thêm mới"

#### 8. **ProductFilters - Color Option Rendering**
**Vấn đề hiện tại:**
```tsx
{c.colorCode && (
  <span style={{ display: 'inline-block', width: 12, height: 12,
    borderRadius: 2, backgroundColor: c.colorCode }} />
)}
```
- ⚠️ `<span>` với `style` trong `<option>` **không hoạt động** trên most browsers
- Màu sắc không hiển thị được

**Đề xuất:**
Đổi sang custom select với colored badges:
```tsx
// Hoặc dùng emoji/icon thay vì màu trong option
<option value={c.id}>
  {c.colorCode ? '●' : '○'} {c.colorName}
</option>
```

### 🟢 **THẤP - Nice to have**

9. **Thiếu lọc theo Brand**
10. **Thiếu lọc theo Tags**
11. **Thiếu Bulk Edit** (sửa giá hàng loạt, đổi danh mục hàng loạt)
12. **Thiếu Product History** (lịch sử thay đổi giá, tồn kho)
13. **Thiếu Related Products** suggestion

---

## 📋 DANH SÁCH CẦN BỔ SUNG - ƯU TIÊN

### 🔴 Ưu tiên CAO (1 tuần)

1. **Thêm Checkbox + Bulk Actions vào ProductTable**
   - File: `ProductTable.tsx`
   - Pattern: Copy từ `MemberTable.tsx` hoặc `OrderTable.tsx`
   - Actions: Xóa hàng loạt, Công khai/Ẩn hàng loạt

2. **Thêm Stats Cards vào ProductsPage**
   - File: `ProductsPage.tsx`
   - Tạo API: `productService.getStatusCounts()`
   - Stats: Total, Active, Inactive, Featured

3. **Thêm cột "Giá bán" vào ProductTable**
   - File: `ProductTable.tsx`
   - Hiển thị: salePrice + promoPrice (nếu có)
   - Format: VNĐ

### 🟡 Ưu tiên TRUNG (2-3 tuần)

4. **Export Excel**
   - Component: `ProductExportButton.tsx`
   - API: `/admin/api/products/export`
   - Pattern: Copy từ `OrderExportButton.tsx`

5. **Quick View Modal**
   - Component: `ProductQuickViewModal.tsx`
   - Hiển thị: Thông tin cơ bản + ảnh + giá + tồn kho

6. **Duplicate Product**
   - Button: "Sao chép" trong ProductTable
   - Logic: Copy product + variants + images

### 🟢 Ưu tiên THẤP (> 1 tháng)

7. Import Excel
8. Bulk Edit
9. Product History
10. Lọc theo Brand/Tags

---

## 🎯 SO SÁNH VỚI CÁC MODULE KHÁC

| Tính năng | Orders | Members | **Products** | Ghi chú |
|-----------|--------|---------|--------------|---------|
| Stats Cards | ✅ (8 cards) | ✅ (4 cards) | ❌ | **Products cần bổ sung** |
| Bộ lọc | ✅ (8 tiêu chí) | ✅ (8 tiêu chí) | ✅ (9 tiêu chí) | Products tốt nhất |
| Checkbox + Bulk | ✅ | ✅ | ❌ | **Products cần bổ sung** |
| Export Excel | ✅ | ❌ | ❌ | Orders có, 2 cái kia chưa |
| Pagination | ✅ | ✅ | ✅ | All good |
| Empty State | ✅ | ✅ | ✅ | All good |
| Loading State | ✅ | ✅ | ✅ | All good |
| Form Tabs | ✅ (4 tabs) | ✅ (2 tabs) | ✅ (7 tabs) | **Products nhiều nhất** |
| Rich Editor | ❌ | ❌ | ✅ | **Products có advantage** |
| Image Upload | ❌ | ❌ | ✅ | **Products có advantage** |

**Kết luận so sánh:**
- **Products có điểm mạnh:** Bộ lọc tốt nhất (9 tiêu chí), Form phức tạp nhất (7 tabs), Image management
- **Products có điểm yếu:** Thiếu Stats, thiếu Bulk Actions

---

## 💡 ĐỀ XUẤT CẢI TIẾN CỤTHỂ

### A. ProductTable Enhancement

```tsx
// File: src/admin/features/product/ProductTable.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductListItem } from '@/lib/types';

export function ProductTable({ products }: { products: ProductListItem[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const allSelected = products.length > 0 && selectedIds.size === products.length;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map(p => p.id)));
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleBulkDelete() {
    if (!confirm(`Xóa ${selectedIds.size} sản phẩm đã chọn?`)) return;
    setBulkLoading(true);
    try {
      const promises = [...selectedIds].map(id =>
        fetch(`/admin/api/products/${id}`, { method: 'DELETE' })
      );
      await Promise.allSettled(promises);
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi'); }
    finally { setBulkLoading(false); }
  }

  async function handleBulkToggleActive(isActive: boolean) {
    if (!confirm(`${isActive ? 'Công khai' : 'Ẩn'} ${selectedIds.size} sản phẩm?`)) return;
    setBulkLoading(true);
    try {
      const promises = [...selectedIds].map(id =>
        fetch(`/admin/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive }),
        })
      );
      await Promise.allSettled(promises);
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi'); }
    finally { setBulkLoading(false); }
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-3 mb-2 py-2 px-3">
          <span className="fw-semibold">Đã chọn: <strong>{selectedIds.size}</strong> sản phẩm</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success" onClick={() => handleBulkToggleActive(true)} disabled={bulkLoading}>
              <i className="bi bi-eye me-1"></i>Công khai
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => handleBulkToggleActive(false)} disabled={bulkLoading}>
              <i className="bi bi-eye-slash me-1"></i>Ẩn
            </button>
            <button className="btn btn-sm btn-danger" onClick={handleBulkDelete} disabled={bulkLoading}>
              <i className="bi bi-trash me-1"></i>Xóa
            </button>
          </div>
          <button className="btn btn-sm btn-light ms-auto" onClick={() => setSelectedIds(new Set())}>
            <i className="bi bi-x-lg me-1"></i>Bỏ chọn
          </button>
        </div>
      )}

      <table className="table table-bordered">
        <thead>
          <tr>
            <th style={{ width: 40 }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            </th>
            <th>STT</th>
            {/* ... other columns */}
            <th>Giá bán</th> {/* NEW COLUMN */}
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr key={p.id}>
              <td>
                <input type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggle(p.id)} />
              </td>
              <td>{idx + 1}</td>
              {/* ... other cells */}
              <td className="text-end">
                <div className="fw-semibold text-danger">
                  {formatPrice(p.salePrice)}
                </div>
                {p.promoPrice > 0 && p.promoPrice < p.salePrice && (
                  <div className="small text-muted text-decoration-line-through">
                    {formatPrice(p.promoPrice)}
                  </div>
                )}
              </td>
              <td>
                {/* ... actions */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
```

### B. ProductsPage Stats Addition

```tsx
// File: src/admin/layout/products/ProductsPage.tsx

// Thêm vào Promise.all
const [result, categories, stats] = await Promise.all([
  // ... existing
  dbSafe(() => productService.getProductStats(), {
    total: 0,
    active: 0,
    inactive: 0,
    featured: 0,
  }),
]);

// Thêm JSX trước bộ lọc
{!dbError && (
  <div className="row g-3 mb-3">
    <div className="col-md-3 col-6">
      <div className="dashboard-stat dashboard-stat--total">
        <div className="dashboard-stat__value">{stats.total}</div>
        <div className="dashboard-stat__label">Tổng sản phẩm</div>
      </div>
    </div>
    <div className="col-md-3 col-6">
      <div className="dashboard-stat dashboard-stat--active">
        <div className="dashboard-stat__value">{stats.active}</div>
        <div className="dashboard-stat__label">Đang công khai</div>
      </div>
    </div>
    <div className="col-md-3 col-6">
      <div className="dashboard-stat dashboard-stat--inactive">
        <div className="dashboard-stat__value">{stats.inactive}</div>
        <div className="dashboard-stat__label">Đang ẩn</div>
      </div>
    </div>
    <div className="col-md-3 col-6">
      <div className="dashboard-stat dashboard-stat--featured">
        <div className="dashboard-stat__value">{stats.featured}</div>
        <div className="dashboard-stat__label">Nổi bật</div>
      </div>
    </div>
  </div>
)}
```

---

## 🎉 KẾT LUẬN

### Tổng đánh giá: **85-90%** ✅

**Điểm mạnh:**
- ✅ Code structure tốt
- ✅ Bộ lọc mạnh nhất (9 tiêu chí)
- ✅ Form phức tạp nhất (7 tabs)
- ✅ Image management tốt
- ✅ Rich text editor

**Điểm yếu chính:**
- ❌ Thiếu Stats Cards
- ❌ Thiếu Checkbox + Bulk Actions
- ❌ Thiếu cột Giá bán
- ❌ Thiếu Export Excel

**Khuyến nghị:**
1. Ưu tiên bổ sung 3 tính năng: **Stats + Bulk Actions + Giá bán** (1 tuần)
2. Sau đó thêm Export Excel (1 tuần)
3. Các tính năng khác có thể làm sau

**So với Orders & Members:**
- Products: 85-90%
- Orders: 85-90%
- Members: 85-90%

**Tất cả 3 module đều ở mức XUẤT SẮC và gần hoàn thiện!** 🎉

