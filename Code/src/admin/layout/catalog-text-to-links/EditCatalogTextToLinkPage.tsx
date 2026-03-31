import { notFound } from 'next/navigation';
import { catalogTextToLinkService } from '@/server/services/catalog-text-to-link.service';
import { categoryService } from '@/server/services/category.service';
import { DynamicCatalogTextToLinkFormClient } from '@/admin/components/CatalogTextToLinkFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa text to link' };

export default async function EditCatalogTextToLinkPage({ params }: Props) {
  const { id } = await params;
  let [item, categories] = await Promise.all([
    catalogTextToLinkService.getById(id),
    categoryService.getAdminCategories() as Promise<Array<{ id: string; name: string }>>,
  ]);
  if (!item) notFound();

  return (
    <DynamicCatalogTextToLinkFormClient
      categories={categories}
      item={{
        id: item.id,
        categoryId: item.categoryId,
        keyword: item.keyword,
        priority: item.priority,
        link: item.link,
        matchCount: item.matchCount,
        domain: item.domain,
        refAttribute: item.refAttribute,
        otherAttribute: item.otherAttribute,
        frUnique: item.frUnique,
        matchLinks: item.matchLinks,
        isActive: item.isActive,
      }}
    />
  );
}
