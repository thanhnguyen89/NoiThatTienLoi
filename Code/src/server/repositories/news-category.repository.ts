import { prisma } from '@/lib/prisma';
import type { NewsCategoryInput } from '@/server/validators/news-category.validator';

const newsCategoryListSelect = {
  id: true,
  parentId: true,
  title: true,
  summary: true,
  imageUrl: true,
  seName: true,
  isShowHome: true,
  isActive: true,
  sortOrder: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
} as const;

type RawResult = Awaited<ReturnType<typeof prisma.newsCategory.findFirst>>;

function serialize(r: RawResult): Exclude<RawResult, null> | null {
  if (!r) return r;
  return {
    ...r,
    sortOrder: r.sortOrder != null ? Number(r.sortOrder) : null,
    viewCount: r.viewCount != null ? Number(r.viewCount) : null,
  } as Exclude<RawResult, null>;
}

export interface PaginatedNewsCategories {
  data: ReturnType<typeof newsCategoryRepository.findAll>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const newsCategoryRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; dateFrom?: string; dateTo?: string }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { seName: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.dateFrom) {
      where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), gte: new Date(opts.dateFrom) };
    }
    if (opts?.dateTo) {
      const to = new Date(opts.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), lte: to };
    }

    const [rows, total] = await Promise.all([
      prisma.newsCategory.findMany({
        where,
        select: newsCategoryListSelect,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.newsCategory.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({ ...r, sortOrder: r.sortOrder != null ? Number(r.sortOrder) : null, viewCount: r.viewCount != null ? Number(r.viewCount) : null })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    const rows = await prisma.newsCategory.findMany({
      where: { isDeleted: false },
      select: newsCategoryListSelect,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => ({ ...r, sortOrder: r.sortOrder != null ? Number(r.sortOrder) : null, viewCount: r.viewCount != null ? Number(r.viewCount) : null }));
  },

  async findById(id: string) {
    const row = await prisma.newsCategory.findFirst({
      where: { id, isDeleted: false },
    });
    return serialize(row);
  },

  async create(data: NewsCategoryInput, userId: string) {
    const row = await prisma.newsCategory.create({
      data: {
        parentId: data.parentId,
        title: data.title,
        summary: data.summary,
        content: data.content,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder != null ? BigInt(data.sortOrder) : null,
        isShowHome: data.isShowHome,
        seName: data.seName,
        metaKeywords: data.metaKeywords,
        metaDescription: data.metaDescription,
        metaTitle: data.metaTitle,
        isActive: data.isActive,
        slugRedirect: data.slugRedirect,
        isRedirect: data.isRedirect,
        isMobile: data.isMobile,
        viewCount: data.viewCount != null ? BigInt(data.viewCount) : null,
        seoCanonical: data.seoCanonical,
        seoNoindex: data.seoNoindex,
        createdBy: userId,
        isDeleted: false,
      } as Parameters<typeof prisma.newsCategory.create>[0]['data'],
    });
    return serialize(row);
  },

  async update(id: string, data: NewsCategoryInput, userId: string) {
    const row = await prisma.newsCategory.update({
      where: { id },
      data: {
        parentId: data.parentId,
        title: data.title,
        summary: data.summary,
        content: data.content,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder != null ? BigInt(data.sortOrder) : null,
        isShowHome: data.isShowHome,
        seName: data.seName,
        metaKeywords: data.metaKeywords,
        metaDescription: data.metaDescription,
        metaTitle: data.metaTitle,
        isActive: data.isActive,
        slugRedirect: data.slugRedirect,
        isRedirect: data.isRedirect,
        isMobile: data.isMobile,
        viewCount: data.viewCount != null ? BigInt(data.viewCount) : null,
        seoCanonical: data.seoCanonical,
        seoNoindex: data.seoNoindex,
        updatedBy: userId,
      } as Parameters<typeof prisma.newsCategory.update>[0]['data'],
    });
    return serialize(row);
  },

  async softDelete(id: string, userId: string) {
    await prisma.newsCategory.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date(),
      },
    });
  },
};