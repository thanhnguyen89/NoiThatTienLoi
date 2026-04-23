'use client';

import { SystemConfigForm } from './SystemConfigForm';

interface SystemConfigData {
  general: Record<string, unknown>;
  mail: Record<string, unknown>;
  info: Record<string, unknown>;
}

interface Props {
  initialConfig: SystemConfigData | null;
}

export function SystemConfigClient({ initialConfig }: Props) {
  return <SystemConfigForm initialConfig={initialConfig as SystemConfigData | null} />;
}
