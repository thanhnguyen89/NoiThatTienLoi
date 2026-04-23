'use client';

import dynamic from 'next/dynamic';

const DynamicWarehouseForm = dynamic(
  () => import('@/admin/features/warehouses/WarehouseForm').then(m => m.WarehouseForm),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: 400,
        background: '#f9f9f9',
        border: '1px solid #dee2e6',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6c757d',
      }}>
        Đang tải...
      </div>
    ),
  }
);

interface WarehouseDetail {
  id: string;
  code: string | null;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  countryCode: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  wardCode: string | null;
  wardName: string | null;
  addressLine: string;
  latitude: unknown;
  longitude: unknown;
  isActive: boolean;
}

interface Props {
  warehouse?: WarehouseDetail;
}

export function DynamicWarehouseFormClient(props: Props) {
  return <DynamicWarehouseForm {...props} />;
}
