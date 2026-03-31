import { DynamicProductColorFormClient } from '@/admin/components/ProductColorFormWrapper';

export const metadata = { title: 'Thêm màu sắc mới' };

export default async function NewProductColorPage() {
  return <DynamicProductColorFormClient />;
}
