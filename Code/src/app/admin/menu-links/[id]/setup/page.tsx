import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { menuService } from '@/server/services/menu.service';
import { menuLinkService } from '@/server/services/menu-link.service';
import { getMenuTypeLabel } from '@/server/validators/menu.validator';
import dynamic from 'next/dynamic';
import type { MenuLinkNode } from '@/admin/features/menu-link/MenuLinkTree';

const MenuLinkSetupPage = dynamic(
  () => import('@/admin/layout/menu-links/MenuLinkSetupPage').then((m) => m.MenuLinkSetupPage),
  {
    loading: () => (
      <div className="container-fluid py-4 text-center">
        <span className="spinner-border text-primary"></span> Dang tai...
      </div>
    ),
  }
);

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isSafeInteger(num)) return { title: 'Thiết lập liên kết menu' };

  try {
    const menus = await menuService.getAllMenus();
    const menu = menus.find((m) => m.menuTypeId === BigInt(id));
    const label = menu ? getMenuTypeLabel(menu.menuTypeId) : id;
    return { title: `Thiết lập liên kết ${label}` };
  } catch {
    return { title: 'Thiết lập liên kết menu' };
  }
}

export default async function MenuLinkSetupRoutePage({ params }: Props) {
  const { id } = await params;
  const num = Number(id);

  if (!Number.isSafeInteger(num)) {
    notFound();
  }

  let menuName = `Menu ID ${id}`;
  let dbError = false;

  try {
    const menus = await menuService.getAllMenus();
    const menu = menus.find((m) => m.menuTypeId === BigInt(id));
    if (menu) {
      menuName = `${menu.name || getMenuTypeLabel(menu.menuTypeId)}`;
    }
  } catch {
    dbError = true;
  }

  let menuLinks: Awaited<ReturnType<typeof menuLinkService.getMenuLinksByMenuId>> = [];
  try {
    menuLinks = await menuLinkService.getMenuLinksByMenuId(id);
  } catch {
    // empty on error
  }

  if (dbError) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Khong the ket noi database. Vui long kiem tra PostgreSQL.
        </div>
      </div>
    );
  }

  return (
    <MenuLinkSetupPage
      menuId={id}
      menuName={menuName}
      initialLinks={menuLinks as MenuLinkNode[]}
    />
  );
}
