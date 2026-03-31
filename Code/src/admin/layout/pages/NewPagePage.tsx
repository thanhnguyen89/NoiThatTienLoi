import { DynamicPageFormClient } from '@/admin/components/PageFormWrapper';

export const metadata = { title: 'Thêm trang mới' };

export default async function NewPagePage() {
  return <DynamicPageFormClient />;
}
