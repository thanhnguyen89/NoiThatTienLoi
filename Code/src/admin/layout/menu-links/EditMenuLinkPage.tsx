import { notFound } from 'next/navigation';
import { menuLinkService } from '@/server/services/menu-link.service';
import { DynamicMenuLinkFormClient } from '@/admin/features/menu-link/MenuLinkFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chinh sua menu link' };

export default async function EditMenuLinkPage({ params }: Props) {
  const { id } = await params;
  const menuLink = await menuLinkService.getMenuLinkById(id);
  if (!menuLink) notFound();

  return (
    <DynamicMenuLinkFormClient
      menuLink={{
        id: menuLink.id,
        title: menuLink.title,
        slug: menuLink.slug,
        target: menuLink.target,
        menuId: menuLink.menuId,
        icon: menuLink.icon,
        parentId: menuLink.parentId,
        entityId: menuLink.entityId,
        entityName: menuLink.entityName,
        nofollow: menuLink.nofollow,
        level: menuLink.level,
        sortOrder: menuLink.sortOrder,
      }}
    />
  );
}
