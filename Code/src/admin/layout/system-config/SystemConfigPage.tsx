export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { systemConfigService } from '@/server/services/system-config.service';
import { SystemConfigTable } from '@/admin/features/system-config/SystemConfigTable';

export const metadata = { title: 'Cấu hình hệ thống' };

export default async function SystemConfigPage() {
  let config: Awaited<ReturnType<typeof systemConfigService.getConfig>> = null;
  try {
    config = await systemConfigService.getConfig();
  } catch {}

  return (
    <>
      {/* DANH SÁCH CẤU HÌNH */}
      <div className="card">
        <div className="card-header-custom">
          CẤU HÌNH HỆ THỐNG
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          {/* Nút cấu hình */}
          <div className="mb-2">
            <Link href="/admin/system-config/edit" className="btn-add">
              <i className="bi bi-gear me-1"></i>{config ? 'Chỉnh sửa cấu hình' : 'Cấu hình'}
            </Link>
          </div>

          <SystemConfigTable config={config} />
        </div>
      </div>
    </>
  );
}
