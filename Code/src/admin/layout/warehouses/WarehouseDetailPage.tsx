import { notFound } from 'next/navigation';
import { warehouseService } from '@/server/services/warehouse.service';
import { WarehouseDetailClient } from '@/admin/features/warehouses/WarehouseDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chi tiết kho hàng' };

export default async function WarehouseDetailPage({ params }: Props) {
  const { id } = await params;

  let warehouse;
  let stats;
  try {
    [warehouse, stats] = await Promise.all([
      warehouseService.getWarehouseById(id),
      warehouseService.getShipmentStats(id),
    ]);
  } catch {
    notFound();
  }

  return <WarehouseDetailClient warehouse={warehouse as Parameters<typeof WarehouseDetailClient>[0]['warehouse']} stats={stats} />;
}
