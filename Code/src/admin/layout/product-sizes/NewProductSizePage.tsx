import { DynamicProductSizeFormClient } from '@/admin/components/ProductSizeFormWrapper';

export const metadata = { title: 'Thêm kích thước mới' };

export default async function NewProductSizePage() {
  return <DynamicProductSizeFormClient />;
}
