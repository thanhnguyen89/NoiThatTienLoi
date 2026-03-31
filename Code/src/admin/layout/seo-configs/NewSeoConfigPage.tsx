import { DynamicSeoConfigFormClient } from '@/admin/components/SeoConfigFormWrapper';

export const metadata = { title: 'Thêm cấu hình SEO mới' };

export default async function NewSeoConfigPage() {
  return <DynamicSeoConfigFormClient />;
}
