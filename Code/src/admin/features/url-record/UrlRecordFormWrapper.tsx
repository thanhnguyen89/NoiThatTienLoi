'use client';

import dynamic from 'next/dynamic';

const DynamicUrlRecordForm = dynamic(
  () => import('@/admin/features/url-record/UrlRecordForm').then(m => m.UrlRecordForm),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: 400,
        background: '#f9f9f9',
        border: '1px solid #dee2e6',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6c757d',
      }}>
        Dang tai...
      </div>
    ),
  }
);

interface UrlRecordDetail {
  id: string;
  entityId: bigint | null;
  entityName: string | null;
  slug: string | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
  deletedUserId: string | null;
  deletedDate: Date | string | null;
  slugRedirect: string | null;
  isRedirect: boolean | null;
  errorCode: string | null;
}

interface Props {
  record?: UrlRecordDetail;
}

export function DynamicUrlRecordFormClient(props: Props) {
  return <DynamicUrlRecordForm {...props} />;
}
