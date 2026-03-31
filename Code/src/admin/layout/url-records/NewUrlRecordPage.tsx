import { DynamicUrlRecordFormClient } from '@/admin/features/url-record/UrlRecordFormWrapper';

export const metadata = { title: 'Them UrlRecord moi' };

export default async function NewUrlRecordPage() {
  return <DynamicUrlRecordFormClient />;
}
