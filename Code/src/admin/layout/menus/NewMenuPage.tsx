import { DynamicMenuFormClient } from '@/admin/components/MenuFormWrapper';

export const metadata = { title: 'Thêm menu mới' };

export default async function NewMenuPage() {
  return <DynamicMenuFormClient />;
}
