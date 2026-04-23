import { notFound } from 'next/navigation';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import { DynamicShippingProviderFormClient } from '@/admin/components/ShippingProviderFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Sửa đơn vị vận chuyển' };

export default async function EditShippingProviderPage({ params }: Props) {
  const { id } = await params;
  let provider = await shippingProviderService.getProviderById(id);
  if (!provider) notFound();

  return (
    <DynamicShippingProviderFormClient
      provider={{
        id: provider.id,
        code: provider.code,
        name: provider.name,
        phone: provider.phone,
        website: provider.website,
        note: provider.note,
        isActive: provider.isActive,
        serviceTypes: provider.serviceTypes || [],
        vehicles: provider.vehicles || [],
        surcharges: provider.surcharges as unknown,
        discountPolicies: provider.discountPolicies as unknown,
      }}
    />
  );
}