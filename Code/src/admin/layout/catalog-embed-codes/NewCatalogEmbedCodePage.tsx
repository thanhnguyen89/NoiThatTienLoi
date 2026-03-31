import { DynamicCatalogEmbedCodeFormClient } from '@/admin/components/CatalogEmbedCodeFormWrapper';

export const metadata = { title: 'Thêm mã nhúng mới' };

export default async function NewCatalogEmbedCodePage() {
  return <DynamicCatalogEmbedCodeFormClient />;
}
