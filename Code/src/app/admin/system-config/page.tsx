export const dynamic = 'force-dynamic';
import { systemConfigService } from '@/server/services/system-config.service';
import { SystemConfigClient } from '@/admin/features/system-config/SystemConfigClient';

export const metadata = { title: 'Cấu hình hệ thống' };

interface SystemConfigData {
  general: Record<string, unknown>;
  mail: Record<string, unknown>;
  info: Record<string, unknown>;
}

export default async function SystemConfigPage() {
  let initialConfig: SystemConfigData | null = null;
  try {
    initialConfig = await systemConfigService.getConfig() as SystemConfigData | null;
  } catch {}

  return <SystemConfigClient initialConfig={initialConfig} />;
}
