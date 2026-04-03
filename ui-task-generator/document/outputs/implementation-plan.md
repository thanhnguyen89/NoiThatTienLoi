# Implementation Plan: Menu Management Enhancement

## Tổng quan thay đổi

Thay đổi tập trung vào **2 file chính** và **1 file phụ**:

| Priority | File | Thay đổi |
|----------|------|-----------|
| 1 | `src/admin/layout/menu-links/MenuLinksPage.tsx` | Thêm param `menuId`, filter, banner info |
| 2 | `src/admin/features/menu-link/MenuLinkFilters.tsx` | Thêm dropdown chọn menu, pre-select khi có URL param |
| 3 | `src/admin/layout/menu-links/NewMenuLinkPage.tsx` | Đọc URL param để pre-fill menuId |

---

## Bước 1: Cập nhật `MenuLinksPage.tsx`

**File**: `src/admin/layout/menu-links/MenuLinksPage.tsx`

**Thay đổi**:

1. **Import**: thêm `menuService` và `getMenuTypeLabel`
2. **Props interface**: thêm `menuId?: string` vào searchParams
3. **Filter logic**: thêm filter theo `menuId` (so sánh BigInt với BigInt)
4. **Banner info**: nếu có `menuId`, hiển thị card thông tin "Đang thiết lập liên kết cho: [Tên Menu] (Loại: [Label])"
5. **Truyền props**: thêm `defaultMenuId={sp.menuId || ''}` xuống `MenuLinkFilters`

**Code thay đổi (delta)**:

```tsx
// 1. Thêm import
import { menuService } from '@/server/services/menu.service';
import { getMenuTypeLabel } from '@/server/validators/menu.validator';

// 2. Props — thêm menuId
interface Props {
  searchParams: Promise<{ search?: string; status?: string; menuId?: string }>;
}

// 3. Trong function — lấy menu info nếu có menuId
const sp = await searchParams;
let menuName = '';
let menuTypeLabel = '';

if (sp.menuId) {
  try {
    const tid = BigInt(sp.menuId);
    const allMenus = await menuService.getAllMenus();
    const found = allMenus.find(m => m.menuTypeId === tid);
    if (found) {
      menuName = found.name || 'Không có tên';
      menuTypeLabel = getMenuTypeLabel(found.menuTypeId);
    }
  } catch { /* ignore */ }
}

// 4. Filter theo menuId
if (sp.menuId) {
  const tid = BigInt(sp.menuId);
  menuLinks = menuLinks.filter(r => r.menuId === tid);
}

// 5. Thêm banner info trước card danh sách (nếu có menuId)
// và truyền defaultMenuId xuống filter
<MenuLinkFilters
  defaultSearch={sp.search || ''}
  defaultStatus={sp.status || ''}
  defaultMenuId={sp.menuId || ''}
/>
```

---

## Bước 2: Cập nhật `MenuLinkFilters.tsx`

**File**: `src/admin/features/menu-link/MenuLinkFilters.tsx`

**Thay đổi**:

1. Thêm prop `defaultMenuId: string`
2. Thêm state `menuId`
3. Thêm dropdown chọn menu (options từ API `/admin/api/menus`)
4. Khi có `defaultMenuId`: pre-select menu, disable dropdown (context locked)
5. Update `push()` để bao gồm `menuId` khi submit

**Code thay đổi (delta)**:

```tsx
'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

interface Menu { id: string; name: string | null; menuTypeId: bigint | null; }

interface Props {
  defaultSearch: string;
  defaultStatus: string;
  defaultMenuId?: string; // THÊM
}

export function MenuLinkFilters({ defaultSearch, defaultStatus, defaultMenuId = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus);
  const [menuId, setMenuId] = useState(defaultMenuId);
  const [menuOptions, setMenuOptions] = useState<Menu[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);

  // Fetch menu list for dropdown
  useEffect(() => {
    setLoadingMenus(true);
    fetch('/admin/api/menus')
      .then(r => r.json())
      .then(j => { if (j.data) setMenuOptions(j.data); })
      .catch(() => {})
      .finally(() => setLoadingMenus(false));
  }, []);

  // Khi defaultMenuId có giá trị → disable dropdown (context lock)
  const isLocked = !!defaultMenuId;

  const push = useCallback((o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return (
    <div className="row g-2 align-items-end">
      {/* Menu dropdown — THÊM */}
      <div className="col-md-3">
        <label className="form-label">Menu</label>
        <select
          className="form-select form-select-sm"
          value={menuId}
          onChange={(e) => setMenuId(e.target.value)}
          disabled={isLocked || loadingMenus}
        >
          <option value="">— Tất cả menu —</option>
          {menuOptions.map(m => (
            <option key={m.id} value={String(m.menuTypeId)}>
              {m.name || '—'} ({getMenuTypeLabel(m.menuTypeId)})
            </option>
          ))}
        </select>
      </div>

      {/* Các control cũ giữ nguyên */}
      <div className="col-md-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} ... />
      </div>
      <div className="col-md-2">
        <select value={status} onChange={e => setStatus(e.target.value)} ...>
          ...
        </select>
      </div>
      <div className="col-md-4 d-flex gap-2">
        <button onClick={() => push({ search: search.trim() || undefined, status: status || undefined, menuId: menuId || undefined })}>
          Tìm kiếm
        </button>
        <button onClick={() => { setSearch(''); setStatus(''); setMenuId(''); push({}); }}>
          Làm mới
        </button>
      </div>
    </div>
  );
}
```

**Import cần thêm**: `getMenuTypeLabel` từ validator, `useEffect` từ react

---

## Bước 3: Cập nhật `NewMenuLinkPage.tsx`

**File**: `src/admin/layout/menu-links/NewMenuLinkPage.tsx`

**Thay đổi**: Đọc `menuId` từ URL searchParams để truyền xuống form (pre-fill)

```tsx
import { DynamicMenuLinkFormClient } from '@/admin/features/menu-link/MenuLinkFormWrapper';

interface Props {
  searchParams: Promise<{ menuId?: string }>;
}

export const metadata = { title: 'Thêm menu link mới' };

export default async function NewMenuLinkPage({ searchParams }: Props) {
  const sp = await searchParams;
  return <DynamicMenuLinkFormClient defaultMenuId={sp.menuId} />;
}
```

**Lưu ý**: Cần cập nhật `MenuLinkFormWrapper` để nhận `defaultMenuId` prop và truyền xuống `MenuLinkForm`.

**Thay đổi `MenuLinkFormWrapper`**:

```tsx
// src/admin/features/menu-link/MenuLinkFormWrapper.tsx
interface Props {
  menuLink?: MenuLinkDetail;
  defaultMenuId?: string; // THÊM
}

export function DynamicMenuLinkFormClient(props: Props) {
  return <DynamicMenuLinkForm {...props} />;
}
```

**Thay đổi `MenuLinkForm`**: Khởi tạo `menuId` từ `defaultMenuId` prop nếu có.

---

## Bước 4: Verify không cần thay đổi

Các file sau **không cần sửa** vì đã đúng:

- ✅ `src/admin/features/menu/MenuFilters.tsx` — đã có dropdown loại menu
- ✅ `src/admin/features/menu/MenuTable.tsx` — đã hiển thị label, đã có icon thiết lập
- ✅ `src/admin/layout/menus/MenusPage.tsx` — đã filter theo menuTypeId
- ✅ `src/admin/features/menu/MenuForm.tsx` — form đã đúng
- ✅ `src/server/validators/menu.validator.ts` — đã có MENU_TYPE_LABELS
- ✅ `src/server/services/menu.service.ts` — đã có getAllMenus
- ✅ API routes — đã đúng

---

## Tóm tắt files thay đổi

| # | File | Action | Lines thay đổi |
|---|------|--------|----------------|
| 1 | `src/admin/layout/menu-links/MenuLinksPage.tsx` | Modify | ~25-30 |
| 2 | `src/admin/features/menu-link/MenuLinkFilters.tsx` | Modify | ~30-40 |
| 3 | `src/admin/layout/menu-links/NewMenuLinkPage.tsx` | Modify | ~5 |
| 4 | `src/admin/features/menu-link/MenuLinkFormWrapper.tsx` | Modify | ~3 |

**Không tạo file mới.**

---

## Regressions cần test

1. **Menu list** — lọc theo loại menu còn hoạt động?
2. **Menu table** — icon thiết lập còn click được?
3. **MenuLink list** — search + status filter còn hoạt động?
4. **MenuLink form** — thêm/sửa menu link còn lưu đúng?
5. **Khi vào từ menu list** — `?menuId=X` → page hiển thị đúng menu info + filter đúng links?
