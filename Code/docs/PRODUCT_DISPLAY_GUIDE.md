# 📦 Hướng Dẫn Hiển Thị Sản Phẩm với Discount % và Progress Bar

## 📋 Tổng Quan

Hệ thống đã được cập nhật để hỗ trợ đầy đủ việc hiển thị sản phẩm như trong thiết kế UI, bao gồm:
- ✅ Tính % giảm giá tự động
- ✅ Progress bar cho flash sale / best seller
- ✅ Format số lượng bán theo tháng
- ✅ Quản lý mục tiêu flash sale

---

## 🗂️ Các Thay Đổi Đã Thực Hiện

### 1. **Database Schema**

#### Trường mới: `flashSaleTarget`
```prisma
model Product {
  // ... các trường khác
  soldCount      Int   @default(0)
  flashSaleTarget Int?  @default(0) // Mục tiêu số lượng bán cho flash sale
}
```

**Lưu ý:** Đã chạy `prisma db push` để cập nhật database.

---

### 2. **Utility Functions**

File: [`src/lib/utils.ts`](../src/lib/utils.ts)

#### 2.1. Tính % Giảm Giá
```typescript
/**
 * Tính phần trăm giảm giá
 */
export function calcDiscountPercent(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}
```

**Cách dùng:**
```typescript
const discountPercent = calcDiscountPercent(1590000, 2220000); // => 28
```

#### 2.2. Tính Progress Bar %
```typescript
/**
 * Tính progress bar cho flash sale hoặc best seller
 * @param soldCount - Số lượng đã bán
 * @param target - Mục tiêu bán (flashSaleTarget)
 * @returns Phần trăm progress (0-100)
 */
export function calcProgressPercent(soldCount: number, target: number): number {
  if (!target || target <= 0) return 0;
  const percent = Math.round((soldCount / target) * 100);
  return Math.min(percent, 100); // Giới hạn tối đa 100%
}
```

**Cách dùng:**
```typescript
const progressPercent = calcProgressPercent(1500, 2550); // => 59
```

#### 2.3. Format Số Lượng Bán Theo Tháng
```typescript
/**
 * Format số lượng bán theo tháng
 * @param soldCount - Tổng số lượng đã bán
 * @param monthsActive - Số tháng sản phẩm đã active
 * @returns "2.1k/tháng" hoặc "150/tháng"
 */
export function formatSoldPerMonth(soldCount: number, monthsActive: number = 1): string {
  const perMonth = soldCount / Math.max(monthsActive, 1);
  if (perMonth >= 1000) {
    return (perMonth / 1000).toFixed(1) + 'k/tháng';
  }
  return Math.round(perMonth) + '/tháng';
}

/**
 * Tính số tháng từ ngày tạo đến hiện tại
 */
export function calcMonthsSince(date: Date): number {
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return Math.max(months, 1); // Ít nhất 1 tháng
}
```

**Cách dùng:**
```typescript
const monthsActive = calcMonthsSince(new Date('2024-01-01'));
const soldPerMonth = formatSoldPerMonth(2100, monthsActive); // => "2.1k/tháng"
```

---

### 3. **Component ProductCard**

File: [`src/components/ProductCard.tsx`](../src/components/ProductCard.tsx)

Component hiển thị thẻ sản phẩm với đầy đủ thông tin:

```typescript
import { calcDiscountPercent, calcProgressPercent, formatSoldPerMonth, calcMonthsSince } from '@/lib/utils';

export default function ProductCard({ product }: ProductCardProps) {
  // Tính discount %
  const discountPercent = comparePrice ? calcDiscountPercent(price, comparePrice) : 0;

  // Tính progress bar
  const progressPercent = flashSaleTarget
    ? calcProgressPercent(soldCount, flashSaleTarget)
    : Math.min((soldCount / 100) * 10, 100);

  // Format số lượng bán
  const monthsActive = calcMonthsSince(new Date(createdAt));
  const soldPerMonth = formatSoldPerMonth(soldCount, monthsActive);

  // Màu progress bar
  const getProgressColor = (percent: number) => {
    if (percent >= 70) return 'bg-orange-500';
    if (percent >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // ... JSX
}
```

**Props Interface:**
```typescript
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    thumbnail: string | null;
    price: number; // Giá cuối cùng
    comparePrice: number | null; // Giá gốc (để gạch)
    avgRating: number;
    reviewCount: number;
    soldCount: number;
    flashSaleTarget?: number | null;
    createdAt: Date;
  };
}
```

---

### 4. **Admin Panel - Quản Lý Sản Phẩm**

File: [`src/admin/features/product/ProductForm.tsx`](../src/admin/features/product/ProductForm.tsx)

#### Trường mới trong form:
```typescript
const [form, setForm] = useState({
  // ... các trường khác
  isFlashSale: product?.isFlashSale ?? false,
  flashSaleTarget: String(product?.flashSaleTarget ?? ''),
});
```

#### UI trong Admin Panel:
- Khi bật "Flash Sale", hiển thị trường nhập "Mục tiêu Flash Sale"
- Placeholder: "VD: 1000"
- Helper text: "Số lượng mục tiêu bán để tính progress bar"

![Admin Flash Sale Target](https://via.placeholder.com/600x200/eff6ff/1d4ed8?text=Flash+Sale+Target+Field)

---

### 5. **Types & Service**

#### Types ([`src/lib/types.ts`](../src/lib/types.ts)):
```typescript
export interface ProductListItem {
  // ... các field khác
  isFlashSale: boolean;
  flashSaleTarget?: number | null; // ← Trường mới
  soldCount: number;
  // ...
}
```

#### Service ([`src/server/services/product.service.ts`](../src/server/services/product.service.ts)):
```typescript
function toListItem(raw: AnyRow): ProductListItem {
  return {
    // ... các field khác
    isFlashSale: raw.isFlashSale,
    flashSaleTarget: raw.flashSaleTarget || null, // ← Include trong response
    soldCount: raw.soldCount,
    // ...
  };
}
```

---

## 🌱 Seed Data Mẫu

File: [`prisma/seed-products-with-variants.ts`](../prisma/seed-products-with-variants.ts)

### Chạy seed:
```bash
cd NoiThatTienLoi/Code
npx tsx prisma/seed-products-with-variants.ts
```

### Dữ liệu mẫu:
- **5-8 sản phẩm** với giá và discount thực tế
- **Variants** (size + color) cho mỗi sản phẩm
- **Ratings** (4.6 - 4.9) và reviews (13 - 234)
- **Sold count** (850 - 2100) với `flashSaleTarget` tương ứng
- **Progress bar** từ 18% - 92%

---

## 📊 Ví Dụ Sử Dụng

### 1. Hiển Thị Discount Badge
```tsx
{discountPercent > 0 && (
  <div className="badge bg-red-500">
    -{discountPercent}%
  </div>
)}
```

### 2. Hiển Thị Giá
```tsx
<div className="flex gap-2">
  <span className="text-red-600">{formatPrice(price)}</span>
  {comparePrice && (
    <span className="line-through text-gray-400">
      {formatPrice(comparePrice)}
    </span>
  )}
</div>
```

### 3. Progress Bar
```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className={`h-full rounded-full ${getProgressColor(progressPercent)}`}
    style={{ width: `${progressPercent}%` }}
  />
</div>
<div className="text-xs text-gray-500 mt-1">
  {progressPercent}%
</div>
```

### 4. Số Lượng Bán
```tsx
<div className="flex items-center gap-2">
  <svg className="w-4 h-4 text-gray-400">...</svg>
  <span className="text-xs">{soldPerMonth}</span>
</div>
```

---

## 🎨 UI Mapping

| UI Element | Database Field | Calculation |
|------------|----------------|-------------|
| **Discount Badge** (-38%) | `comparePrice`, `promoPrice` | `calcDiscountPercent(price, comparePrice)` |
| **Giá gốc** (gạch ngang) | `ProductVariant.salePrice` | Từ variant default/first |
| **Giá khuyến mãi** (đỏ) | `ProductVariant.promoPrice` | Từ variant default/first |
| **Rating** (4.7 ⭐) | `Product.avgRating` | Trực tiếp |
| **Reviews** (89) | `Product.reviewCount` | Trực tiếp |
| **Sold** (2.1k/tháng) | `Product.soldCount`, `createdAt` | `formatSoldPerMonth()` |
| **Progress Bar** (72%) | `soldCount`, `flashSaleTarget` | `calcProgressPercent()` |

---

## 🔄 Luồng Dữ Liệu

```
Database (products + product_variants)
    ↓
ProductRepository (findMany)
    ↓
ProductService (toListItem + tính giá)
    ↓
API Response (GET /api/products)
    ↓
Frontend Component (ProductCard)
    ↓
Utility Functions (calc discount, progress, format)
    ↓
UI Display
```

---

## ✅ Checklist Hoàn Thành

- [x] Thêm trường `flashSaleTarget` vào Product model
- [x] Chạy migration (`prisma db push`)
- [x] Viết utility functions cho discount % và progress bar
- [x] Cập nhật TypeScript types
- [x] Cập nhật product service để include `flashSaleTarget`
- [x] Thêm field vào Admin form
- [x] Tạo component ProductCard demo
- [x] Seed dữ liệu mẫu
- [x] Viết documentation

---

## 📝 Ghi Chú Quan Trọng

### Progress Bar Logic
Có 2 cách tính progress bar:

**Option 1: Dùng `flashSaleTarget` (Khuyến nghị)**
```typescript
const progressPercent = calcProgressPercent(soldCount, flashSaleTarget);
```

**Option 2: Fallback khi không có target**
```typescript
const progressPercent = Math.min((soldCount / 100) * 10, 100);
// Mỗi 100 sold = 10%
```

### Color Scheme cho Progress Bar
- **≥ 70%**: Cam (`bg-orange-500`) - Gần đạt mục tiêu
- **40-69%**: Vàng (`bg-yellow-500`) - Trung bình
- **< 40%**: Đỏ (`bg-red-500`) - Cần thúc đẩy

---

## 🚀 Deployment Checklist

Trước khi deploy production:

1. ✅ Chạy `prisma generate` để update Prisma Client
2. ✅ Verify migration đã apply trên production DB
3. ✅ Test component ProductCard với dữ liệu thực
4. ✅ Kiểm tra responsive design
5. ✅ Verify performance với nhiều sản phẩm (100+)

---

## 📞 Support

Nếu có vấn đề:
1. Check console log trong browser
2. Verify database có field `flashSaleTarget`
3. Check API response có include `flashSaleTarget`
4. Verify utility functions import đúng

---

**Ngày cập nhật:** 2026-04-17
**Version:** 1.0.0
**Author:** Claude Code Assistant
