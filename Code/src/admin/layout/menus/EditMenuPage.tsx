import { notFound } from 'next/navigation';
import { menuService } from '@/server/services/menu.service';
import { DynamicMenuFormClient } from '@/admin/components/MenuFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa menu' };

export default async function EditMenuPage({ params }: Props) {
  const { id } = await params;
  let menu = await menuService.getMenuById(id);
  if (!menu) notFound();

  return (
    <DynamicMenuFormClient
      menu={{
        id: menu.id,
        name: menu.name,
        menuTypeId: menu.menuTypeId,
        isActive: menu.isActive,
      }}
    />
  );
}
