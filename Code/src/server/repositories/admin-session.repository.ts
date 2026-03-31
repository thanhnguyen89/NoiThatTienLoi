import { prisma } from '@/lib/prisma';

export const adminSessionRepository = {
  async findByToken(token: string) {
    return prisma.adminSession.findUnique({
      where: { token },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });
  },

  async findByRefreshToken(refreshToken: string) {
    return prisma.adminSession.findFirst({
      where: { refreshToken },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });
  },

  async create(data: {
    userId: string;
    token: string;
    refreshToken?: string;
    deviceInfo?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }) {
    return prisma.adminSession.create({
      data,
    });
  },

  async deleteByToken(token: string) {
    return prisma.adminSession.deleteMany({ where: { token } });
  },

  async deleteByUserId(userId: string) {
    return prisma.adminSession.deleteMany({ where: { userId } });
  },

  async deleteExpired() {
    return prisma.adminSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },
};
