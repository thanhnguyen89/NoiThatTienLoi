import { DynamicWarehouseFormClient } from '@/admin/components/WarehouseFormWrapper';

export const metadata = { title: 'Thêm kho hàng mới' };

export default async function NewWarehousePage() {
  return <DynamicWarehouseFormClient />;
}
