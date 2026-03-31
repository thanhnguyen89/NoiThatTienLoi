import { DynamicCatalogRedirectFormClient } from '@/admin/components/CatalogRedirectFormWrapper';

export const metadata = { title: 'Thêm redirect mới' };

export default async function NewCatalogRedirectPage() {
  return <DynamicCatalogRedirectFormClient />;
}
