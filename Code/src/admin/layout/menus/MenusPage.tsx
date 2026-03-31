export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { menuService } from '@/server/services/menu.service';
import { MenuTable } from '@/admin/features/menu/MenuTable';
import { MenuFilters } from '@/admin/features/menu/MenuFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; menuTypeId?: string }>;
}

export const metadata = { title: 'Quản lý Menu' };

export default async function MenusPage({ searchParams }: Props) {
  const sp = await searchParams;
  let menus: Awaited<ReturnType<typeof menuService.getAllMenus>> = [];
  let dbError = false;

  try {
    menus = await menuService.getAllMenus();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      menus = menus.filter((m) =>
        m.name && m.name.toLowerCase().includes(kw)
      );
    }
    if (sp.menuTypeId) {
      const tid = BigInt(sp.menuTypeId);
      menus = menus.filter((m) => m.menuTypeId === tid);
    }
    if (sp.status === 'active') {
      menus = menus.filter((m) => m.isActive);
    } else if (sp.status === 'inactive') {
      menus = menus.filter((m) => !m.isActive);
    }
  } catch { dbError = true; }

  return (
    <>
      <div className="card mb-3">
        <div className="card-header-custom">
          THÔNG TIN TÌM KIẾM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <MenuFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              defaultMenuTypeId={sp.menuTypeId || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH MENU
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/menus/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <MenuTable menus={menus} />
        </div>
      </div>
    </>
  );
}
