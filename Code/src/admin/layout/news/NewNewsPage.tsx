import { DynamicNewsFormClient } from '@/admin/components/NewsFormWrapper';

export const metadata = { title: 'Them tin tuc moi' };

export default async function NewNewsPage() {
  return <DynamicNewsFormClient />;
}
