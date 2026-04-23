export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { orderService } from '@/server/services/order.service';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const order = await orderService.getOrderById(id);
    return { title: `Đơn hàng ${order.orderNo}` };
  } catch {
    return { title: 'Chi tiết đơn hàng' };
  }
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  let order: Awaited<ReturnType<typeof orderService.getOrderById>> | null = null;
  let dbError = false;

  try {
    order = await orderService.getOrderById(id);
  } catch {
    dbError = true;
  }

  if (dbError || !order) {
    return (
      <div className="card">
        <div className="card-header-custom">Chi tiết đơn hàng</div>
        <div className="card-body">
          <div className="alert alert-danger mb-0">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Không tìm thấy đơn hàng hoặc không thể kết nối database.
          </div>
        </div>
      </div>
    );
  }

  // Dynamically import the client component
  const { OrderDetailClient } = await import('@/admin/features/order/OrderDetailClient');

  return (
    <div className="card">
      <div className="card-body p-3">
        <OrderDetailClient order={order as Parameters<typeof OrderDetailClient>[0]['order']} canEdit={true} />
      </div>
    </div>
  );
}