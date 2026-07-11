import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lazy init — không kết nối DB khi import, chỉ kết nối khi có query
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
    // Không connect ngay khi khởi động
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
