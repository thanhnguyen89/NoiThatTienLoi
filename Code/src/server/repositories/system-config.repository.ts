import { prisma } from '@/lib/prisma';
import type { SystemConfigInput } from '@/server/validators/system-config.validator';

export const systemConfigRepository = {
  async findFirst() {
    return prisma.systemConfig.findFirst();
  },

  async upsert(id: string | undefined, data: SystemConfigInput) {
    // Flatten general + info + mail fields for DB record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbData: any = {
      ...(data.general as any),
      ...(data.info as any),
      mailFrom: data.mail.mailFrom,
      mailFromName: data.mail.mailFromName,
      mailHost: data.mail.mailHost,
      mailPort: data.mail.mailPort,
      mailUsername: data.mail.mailUsername,
      mailSecure: data.mail.mailSecure ?? false,
      // mailPassword is NOT updated here — use changeMailPassword separately
    };

    if (id) {
      return prisma.systemConfig.update({ where: { id }, data: dbData });
    }
    return prisma.systemConfig.create({ data: dbData });
  },

  async updatePassword(id: string, newPassword: string) {
    return prisma.systemConfig.update({
      where: { id },
      data: { mailPassword: newPassword },
      select: { id: true },
    });
  },
};
