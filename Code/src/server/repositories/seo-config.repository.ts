import { prisma } from '@/lib/prisma';
import type { SeoConfigInput } from '@/server/validators/seo-config.validator';

const seoConfigListSelect = {
  id: true,
  pageName: true,
  title: true,
  seName: true,
  metaTitle: true,
  isActive: true,
  seoNoindex: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
};

export interface PaginatedSeoConfigs {
  data: Awaited<ReturnType<typeof seoConfigRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const seoConfigRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; keyword?: string }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where = opts?.keyword ? {
      OR: [
        { seName: { contains: opts.keyword, mode: 'insensitive' as const } },
        { title: { contains: opts.keyword, mode: 'insensitive' as const } },
        { pageName: { contains: opts.keyword, mode: 'insensitive' as const } },
        { metaTitle: { contains: opts.keyword, mode: 'insensitive' as const } },
      ],
      isDeleted: false,
    } : { isDeleted: false };

    const [result, total] = await Promise.all([
      prisma.seoConfig.findMany({
        where,
        select: seoConfigListSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.seoConfig.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll(keyword?: string) {
    const where = keyword ? {
      OR: [
        { seName: { contains: keyword, mode: 'insensitive' as const } },
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { pageName: { contains: keyword, mode: 'insensitive' as const } },
        { metaTitle: { contains: keyword, mode: 'insensitive' as const } },
      ],
      isDeleted: false,
    } : { isDeleted: false };

    return prisma.seoConfig.findMany({
      where,
      select: seoConfigListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async findBySeName(seName: string) {
    return prisma.seoConfig.findFirst({ where: { seName, isDeleted: false } });
  },

  async findById(id: string) {
    return prisma.seoConfig.findUnique({
      where: { id, isDeleted: false },
      select: {
        ...seoConfigListSelect,
        contentBefore: true,
        contentAfter: true,
        image: true,
        metaKeywords: true,
        metaDescription: true,
        seoCanonical: true,
      },
    });
  },

  async create(data: SeoConfigInput, createdBy?: string) {
    return prisma.seoConfig.create({
      data: {
        ...data,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: seoConfigListSelect,
    });
  },

  async update(id: string, data: Partial<SeoConfigInput>, updatedBy?: string) {
    return prisma.seoConfig.update({
      where: { id, isDeleted: false },
      data: {
        ...data,
        updatedBy: updatedBy ?? null,
      },
      select: seoConfigListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.seoConfig.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
      select: seoConfigListSelect,
    });
  },
};
