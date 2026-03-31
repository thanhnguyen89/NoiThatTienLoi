import { systemConfigService } from '@/server/services/system-config.service';
import { SystemConfigFormWrapper } from '@/admin/components/SystemConfigFormWrapper';

export const metadata = { title: 'Chỉnh sửa cấu hình hệ thống' };

export default async function EditSystemConfigPage() {
  let config: Awaited<ReturnType<typeof systemConfigService.getConfig>> = null;
  try {
    config = await systemConfigService.getConfig();
  } catch {}

  return <SystemConfigFormWrapper config={config ?? undefined} />;
}
