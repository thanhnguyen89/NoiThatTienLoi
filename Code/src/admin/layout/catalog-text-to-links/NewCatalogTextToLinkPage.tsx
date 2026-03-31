import { categoryService } from '@/server/services/category.service';
import { DynamicCatalogTextToLinkFormClient } from '@/admin/components/CatalogTextToLinkFormWrapper';

export const metadata = { title: 'Thêm text to link mới' };

export default async function NewCatalogTextToLinkPage() {
  let categories: Array<{ id: string; name: string }> = [];
  try { categories = await categoryService.getAdminCategories() as Array<{ id: string; name: string }>; } catch {}

  return <DynamicCatalogTextToLinkFormClient categories={categories} />;
}
