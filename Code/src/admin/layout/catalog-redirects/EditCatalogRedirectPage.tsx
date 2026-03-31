import { notFound } from 'next/navigation';
import { catalogRedirectService } from '@/server/services/catalog-redirect.service';
import { DynamicCatalogRedirectFormClient } from '@/admin/components/CatalogRedirectFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa redirect' };

export default async function EditCatalogRedirectPage({ params }: Props) {
  const { id } = await params;
  let redirect = await catalogRedirectService.getRedirectById(id);
  if (!redirect) notFound();

  return (
    <DynamicCatalogRedirectFormClient
      redirect={{
        id: redirect.id,
        urlFrom: redirect.urlFrom,
        urlTo: redirect.urlTo,
        errorCode: redirect.errorCode,
        isActive: redirect.isActive,
      }}
    />
  );
}
