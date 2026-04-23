export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { OrderForm } from '@/admin/features/order/OrderForm';

export const metadata: Metadata = { title: 'Tạo đơn hàng mới' };

export default async function NewOrderPage() {
  return <OrderForm />;
}