import { notFound } from 'next/navigation';
import { catalogNewsLevelService } from '@/server/services/catalog-news-level.service';
import { DynamicCatalogNewsLevelFormClient } from '@/admin/components/CatalogNewsLevelFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa mức độ tin tức' };

export default async function EditCatalogNewsLevelPage({ params }: Props) {
  const { id } = await params;
  let level = await catalogNewsLevelService.getById(id);
  if (!level) notFound();

  return (
    <DynamicCatalogNewsLevelFormClient
      level={{
        id: level.id,
        name: level.name,
        sortOrder: level.sortOrder,
        isActive: level.isActive,
      }}
    />
  );
}
