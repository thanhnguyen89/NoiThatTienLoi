import { notFound } from 'next/navigation';
import { catalogEmbedCodeService } from '@/server/services/catalog-embed-code.service';
import { DynamicCatalogEmbedCodeFormClient } from '@/admin/components/CatalogEmbedCodeFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa mã nhúng' };

export default async function EditCatalogEmbedCodePage({ params }: Props) {
  const { id } = await params;
  let embedCode = await catalogEmbedCodeService.getEmbedCodeById(id);
  if (!embedCode) notFound();

  return (
    <DynamicCatalogEmbedCodeFormClient
      embedCode={{
        id: embedCode.id,
        title: embedCode.title,
        positionId: embedCode.positionId,
        embedCode: embedCode.embedCode,
        note: embedCode.note,
        isActive: embedCode.isActive,
      }}
    />
  );
}
