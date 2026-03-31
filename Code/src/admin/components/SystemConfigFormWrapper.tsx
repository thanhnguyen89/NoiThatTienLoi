'use client';

import dynamic from 'next/dynamic';

const DynamicSystemConfigForm = dynamic(
  () => import('@/admin/features/system-config/SystemConfigForm').then(m => m.SystemConfigForm),
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
        Đang tải...
      </div>
    ),
  }
);

interface SystemConfigData {
  id?: string;
  imageUrl: string | null;
  displayRowCount: number | null;
  pageTitle: string | null;
  keywords: string | null;
  metaDescription: string | null;
  logoUrl: string | null;
  accessTimeFrom: string | null;
  accessTimeTo: string | null;
  holidays: string | null;
}

interface Props {
  config?: SystemConfigData;
}

export function SystemConfigFormWrapper(props: Props) {
  return <DynamicSystemConfigForm {...props} />;
}
