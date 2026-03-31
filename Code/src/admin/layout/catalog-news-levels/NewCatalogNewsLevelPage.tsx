import { DynamicCatalogNewsLevelFormClient } from '@/admin/components/CatalogNewsLevelFormWrapper';

export const metadata = { title: 'Thêm mức độ tin tức mới' };

export default async function NewCatalogNewsLevelPage() {
  return <DynamicCatalogNewsLevelFormClient />;
}
