import { systemConfigRepository } from '@/server/repositories/system-config.repository';
import { validateSystemConfig, validateMailPassword } from '@/server/validators/system-config.validator';
import { ValidationError } from '@/server/errors';
import type { SystemConfigInput } from '@/server/validators/system-config.validator';

export const systemConfigService = {
  async getConfig() {
    const config = await systemConfigRepository.findFirst();
    if (!config) return null;
    // Map DB row → API response shape (không trả mailPassword)
    return {
      general: {
        uploadPath: config.uploadPath,
        accessTimeFrom: config.accessTimeFrom,
        accessTimeTo: config.accessTimeTo,
        displayRowCount: config.displayRowCount,
        pageTitle: config.pageTitle,
        keywords: config.keywords,
        metaDescription: config.metaDescription,
        socialFacebook: config.socialFacebook,
        socialZalo: config.socialZalo,
        socialTwitter: config.socialTwitter,
        socialYouTube: config.socialYouTube,
        socialTiktok: config.socialTiktok,
      },
      mail: {
        mailFrom: config.mailFrom,
        mailFromName: config.mailFromName,
        mailHost: config.mailHost,
        mailPort: config.mailPort,
        mailUsername: config.mailUsername,
        mailSecure: config.mailSecure,
        // KHÔNG bao giờ trả password về client
      },
      info: {
        unitName: config.unitName,
        unitShortName: config.unitShortName,
        unitAddress: config.unitAddress,
        unitPhone: config.unitPhone,
        unitFax: config.unitFax,
        unitEmail: config.unitEmail,
        unitWebsite: config.unitWebsite,
        copyright: config.copyright,
        websiteContent: config.websiteContent,
      },
    };
  },

  async saveConfig(input: Record<string, unknown>) {
    const result = validateSystemConfig(input);
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }
    const data = result.data as SystemConfigInput;
    const existing = await systemConfigRepository.findFirst();
    return systemConfigRepository.upsert(existing?.id, data);
  },

  async changeMailPassword(input: Record<string, unknown>) {
    const result = validateMailPassword(input);
    if (!result.success) {
      throw new ValidationError(
        'Mật khẩu không hợp lệ',
        { newPassword: ['Mật khẩu là bắt buộc'] }
      );
    }
    const existing = await systemConfigRepository.findFirst();
    if (!existing) throw new ValidationError('Chưa có cấu hình', {});
    return systemConfigRepository.updatePassword(existing.id, result.data.newPassword);
  },
};
