import { prisma } from '@/lib/prisma';
import type { SystemConfigInput } from '@/server/validators/system-config.validator';

export const systemConfigRepository = {
  async findFirst() {
    return prisma.systemConfig.findFirst();
  },

  async upsert(id: string | undefined, data: SystemConfigInput) {
    if (id) {
      return prisma.systemConfig.update({
        where: { id },
        data: data as Parameters<typeof prisma.systemConfig.update>[0]['data'],
      });
    }
    return prisma.systemConfig.create({
      data: data as Parameters<typeof prisma.systemConfig.create>[0]['data'],
    });
  },
};
