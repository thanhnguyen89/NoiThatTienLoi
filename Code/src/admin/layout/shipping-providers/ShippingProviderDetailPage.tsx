import { notFound } from 'next/navigation';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import { ShippingProviderDetailClient } from '@/admin/features/shipping-providers/ShippingProviderDetailClient';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const provider = await shippingProviderService.getProviderById(id);
    return { title: `Chi tiết: ${provider.name}` };
  } catch {
    return { title: 'Chi tiết đơn vị vận chuyển' };
  }
}

export default async function ShippingProviderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const provider = await shippingProviderService.getProviderById(id);
  if (!provider) notFound();

  return (
    <ShippingProviderDetailClient
      provider={{
        id: provider.id,
        code: provider.code,
        name: provider.name,
        phone: provider.phone,
        website: provider.website,
        note: provider.note,
        isActive: provider.isActive,
        createdAt: provider.createdAt ?? new Date(),
        updatedAt: provider.updatedAt ?? new Date(),
        _count: provider._count,
        serviceTypes: provider.serviceTypes,
        vehicles: provider.vehicles,
        surcharges: provider.surcharges as unknown,
        discountPolicies: provider.discountPolicies as unknown,
      }}
      initialTab={sp.tab === 'pricing' ? 'pricing' : undefined}
    />
  );
}