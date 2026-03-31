import { notFound } from 'next/navigation';
import { urlRecordService } from '@/server/services/url-record.service';
import { DynamicUrlRecordFormClient } from '@/admin/features/url-record/UrlRecordFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chinh sua UrlRecord' };

export default async function EditUrlRecordPage({ params }: Props) {
  const { id } = await params;
  let record = await urlRecordService.getUrlRecordById(id);
  if (!record) notFound();

  return (
    <DynamicUrlRecordFormClient
      record={{
        id: record.id,
        entityId: record.entityId,
        entityName: record.entityName,
        slug: record.slug,
        isActive: record.isActive,
        isDeleted: record.isDeleted,
        deletedUserId: record.deletedUserId,
        deletedDate: record.deletedDate,
        slugRedirect: record.slugRedirect,
        isRedirect: record.isRedirect,
        errorCode: record.errorCode,
      }}
    />
  );
}
