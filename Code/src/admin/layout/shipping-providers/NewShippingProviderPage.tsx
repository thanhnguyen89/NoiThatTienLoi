import { DynamicShippingProviderFormClient } from '@/admin/components/ShippingProviderFormWrapper';

export const metadata = { title: 'Thêm đơn vị vận chuyển mới' };

export default async function NewShippingProviderPage() {
  return <DynamicShippingProviderFormClient />;
}