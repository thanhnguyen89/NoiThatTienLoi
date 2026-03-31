'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

interface MenuOption {
  id: string;
  name: string | null;
  menuTypeId: string | null;
}

interface Props {
  defaultSearch: string;
  defaultStatus: string;
  defaultMenuId?: string;
}

function getMenuTypeLabel(id: string | null | undefined): string {
  if (!id) return '—';
  const n = Number(id);
  const labels: Record<number, string> = { 1: 'Menu Top', 2: 'Menu Footer', 3: 'Menu Left', 4: 'Menu Right' };
  return labels[n] ?? `Loai ${n}`;
}

export function MenuLinkFilters({ defaultSearch, defaultStatus, defaultMenuId = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus);
  const [menuId, setMenuId] = useState(defaultMenuId);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);

  // Khi co defaultMenuId → khong cho phep doi menu (context lock)
  const isLocked = !!defaultMenuId;

  // Fetch danh sach menu cho dropdown
  useEffect(() => {
    setLoadingMenus(true);
    fetch('/admin/api/menus')
      .then((r) => r.json())
      .then((j) => {
        if (j.data && Array.isArray(j.data)) {
          // Serialize bigint
          const serialized = j.data.map((m: Record<string, unknown>) => ({
            ...m,
            menuTypeId: m.menuTypeId != null ? String(m.menuTypeId) : null,
          }));
          setMenuOptions(serialized as MenuOption[]);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoadingMenus(false));
  }, []);

  // Sync state khi URL param thay doi
  useEffect(() => {
    setMenuId(defaultMenuId);
  }, [defaultMenuId]);

  const push = useCallback((o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return (
    <>
      <div className="row g-2 align-items-end">
        <div className="col-md-3">
          <label className="form-label">Menu</label>
          <select
            className="form-select form-select-sm"
            value={menuId}
            onChange={(e) => setMenuId(e.target.value)}
            disabled={isLocked || loadingMenus}
          >
            <option value="">— Tat ca menu —</option>
            {menuOptions.map((m) => (
              <option key={m.id} value={m.menuTypeId ?? ''}>
                {m.name || '—'} ({getMenuTypeLabel(m.menuTypeId)})
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Tu khoa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhap tieu de hoac slug..."
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">Trang thai</label>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tat ca</option>
            <option value="active">Hoat dong</option>
            <option value="inactive">Khong hoat dong</option>
          </select>
        </div>
        <div className="col-md-3 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={() => push({
              search: search.trim() || undefined,
              status: status || undefined,
              menuId: menuId || undefined,
            })}
          >
            <i className="bi bi-search me-1"></i>Tim kiem
          </button>
          <button
            type="button"
            className="btn btn-sm btn-reset"
            onClick={() => {
              setSearch('');
              setStatus('');
              setMenuId('');
              push({ search: undefined, status: undefined, menuId: undefined });
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>Lam moi
          </button>
        </div>
      </div>
    </>
  );
}
