import { DynamicMenuLinkFormClient } from '@/admin/features/menu-link/MenuLinkFormWrapper';

interface Props {
  searchParams: Promise<{ menuId?: string }>;
}

export const metadata = { title: 'Them menu link moi' };

export default async function NewMenuLinkPage({ searchParams }: Props) {
  const sp = await searchParams;
  return <DynamicMenuLinkFormClient defaultMenuId={sp.menuId} />;
}
