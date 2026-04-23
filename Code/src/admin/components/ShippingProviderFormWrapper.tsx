'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const DynamicShippingProviderForm = dynamic(
  () => import('@/admin/features/shipping-providers/ShippingProviderForm').then(m => m.ShippingProviderForm),
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

interface ShippingProviderDetail {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  website: string | null;
  note: string | null;
  isActive: boolean;
  serviceTypes?: string[];
  vehicles?: string[];
  surcharges?: unknown;
  discountPolicies?: unknown;
}

interface Props {
  provider?: ShippingProviderDetail;
}

export function DynamicShippingProviderFormClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <DynamicShippingProviderForm {...props} />
    </Suspense>
  );
}