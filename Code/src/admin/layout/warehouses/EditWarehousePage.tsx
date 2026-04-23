import { notFound } from 'next/navigation';
import { warehouseService } from '@/server/services/warehouse.service';
import { DynamicWarehouseFormClient } from '@/admin/components/WarehouseFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Sửa kho hàng' };

export default async function EditWarehousePage({ params }: Props) {
  const { id } = await params;

  let warehouse;
  try {
    warehouse = await warehouseService.getWarehouseById(id);
  } catch {
    notFound();
  }

  return (
    <DynamicWarehouseFormClient
      warehouse={{
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        contactName: warehouse.contactName,
        contactPhone: warehouse.contactPhone,
        countryCode: warehouse.countryCode,
        provinceCode: warehouse.provinceCode,
        provinceName: warehouse.provinceName,
        districtCode: warehouse.districtCode,
        districtName: warehouse.districtName,
        wardCode: warehouse.wardCode,
        wardName: warehouse.wardName,
        addressLine: warehouse.addressLine,
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
        isActive: warehouse.isActive,
      }}
    />
  );
}
