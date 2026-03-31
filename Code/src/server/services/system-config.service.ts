import { systemConfigRepository } from '@/server/repositories/system-config.repository';
import { validateSystemConfig } from '@/server/validators/system-config.validator';
import { ValidationError } from '@/server/errors';

export const systemConfigService = {
  async getConfig() {
    return systemConfigRepository.findFirst();
  },

  async saveConfig(input: Record<string, unknown>) {
    const result = validateSystemConfig(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const existing = await systemConfigRepository.findFirst();
    return systemConfigRepository.upsert(existing?.id, result.data);
  },
};
