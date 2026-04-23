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
  categoryLevel: true,
} as const;

type RawResult = {
  id: string;
  parentId: bigint | null;
  title: string | null;
  summary: string | null;
  imageUrl: string | null;
  seName: string | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  sortOrder: bigint | null;
  viewCount: bigint | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  isDeleted: boolean | null;
  deletedBy: string | null;
  deletedAt: Date | null;
  categoryLevel: number | null;
  content: string | null;
  icon: string | null;
  banner: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  metaTitle: string | null;
  seoCanonical: string | null;
  seoNoindex: boolean | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  fbTitle: string | null;
  fbDescription: string | null;
  fbKeywords: string | null;
  fbHashtags: string | null;
  fbImage: string | null;
  fbLinkPosted: string | null;
  ttTitle: string | null;
  ttDescription: string | null;
  ttKeywords: string | null;
  ttHashtags: string | null;
  ttImage: string | null;
  ttLinkPosted: string | null;
  ytTitle: string | null;
  ytDescription: string | null;
  ytTags: string | null;
  ytHashtags: string | null;
  ytImage: string | null;
  ytLinkPosted: string | null;
  slugRedirect: string | null;
  isRedirect: boolean | null;
  isMobile: boolean | null;
} | null;

function serialize(r: RawResult): Exclude<RawResult, null> | null {
  if (!r) return r;
  return {
    ...r,
    parentId: r.parentId != null ? String(r.parentId) : null,
    sortOrder: r.sortOrder != null ? Number(r.sortOrder) : null,
    viewCount: r.viewCount != null ? Number(r.viewCount) : null,
  } as Exclude<RawResult, null>;
}

export interface PaginatedNewsCategories {
  data: Array<{
    id: string;
    parentId: string | null;
    title: string | null;
    summary: string | null;
    imageUrl: string | null;
    seName: string | null;
    isShowHome: boolean | null;
    isActive: boolean | null;
    sortOrder: number | null;
    viewCount: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    createdBy: string | null;
    updatedBy: string | null;
    isDeleted: boolean | null;
    deletedBy: string | null;
    deletedAt: Date | null;
    categoryLevel: number | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const newsCategoryRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; dateFrom?: string; dateTo?: string; parentId?: string; level?: number }) {
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
    if (opts?.parentId) {
      where.parentId = BigInt(opts.parentId);
    }
    if (opts?.level !== undefined) {
      where.categoryLevel = opts.level;
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
      data: rows.map((r) => ({ ...r, parentId: r.parentId != null ? String(r.parentId) : null, sortOrder: r.sortOrder != null ? Number(r.sortOrder) : null, viewCount: r.viewCount != null ? Number(r.viewCount) : null })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    const rows = await prisma.newsCategory.findMany({
      where: { isDeleted: false },
      select: newsCategoryListSelect,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => ({ ...r, parentId: r.parentId != null ? String(r.parentId) : null, sortOrder: r.sortOrder != null ? Number(r.sortOrder) : null, viewCount: r.viewCount != null ? Number(r.viewCount) : null }));
  },

  async findById(id: string) {
    const row = await prisma.newsCategory.findFirst({
      where: { id, isDeleted: false },
      select: {
        ...newsCategoryListSelect,
        content: true,
        icon: true,
        banner: true,
        metaKeywords: true,
        metaDescription: true,
        metaTitle: true,
        seoCanonical: true,
        seoNoindex: true,
        ogTitle: true,
        ogDescription: true,
        ogImage: true,
        robots: true,
        fbTitle: true,
        fbDescription: true,
        fbKeywords: true,
        fbHashtags: true,
        fbImage: true,
        fbLinkPosted: true,
        ttTitle: true,
        ttDescription: true,
        ttKeywords: true,
        ttHashtags: true,
        ttImage: true,
        ttLinkPosted: true,
        ytTitle: true,
        ytDescription: true,
        ytTags: true,
        ytHashtags: true,
        ytImage: true,
        ytLinkPosted: true,
        slugRedirect: true,
        isRedirect: true,
        isMobile: true,
        categoryLevel: true,
      },
    });
    return serialize(row);
  },

  async create(data: NewsCategoryInput, userId: string) {
    const row = await prisma.newsCategory.create({
      data: {
        parentId:        data.parentId != null && data.parentId !== '' ? BigInt(data.parentId) : null,
        categoryLevel:   data.categoryLevel ?? 0,
        title:           data.title,
        summary:         data.summary,
        content:         data.content,
        imageUrl:        data.imageUrl,
        icon:            data.icon,
        banner:          data.banner,
        sortOrder:       data.sortOrder != null ? BigInt(data.sortOrder) : null,
        isShowHome:      data.isShowHome,
        seName:          data.seName,
        metaKeywords:    data.metaKeywords,
        metaDescription: data.metaDescription,
        metaTitle:       data.metaTitle,
        seoCanonical:    data.seoCanonical,
        seoNoindex:      data.seoNoindex,
        ogTitle:         data.ogTitle,
        ogDescription:   data.ogDescription,
        ogImage:         data.ogImage,
        robots:          data.robots,
        fbTitle:         data.fbTitle,
        fbDescription:   data.fbDescription,
        fbKeywords:      data.fbKeywords,
        fbHashtags:      data.fbHashtags,
        fbImage:         data.fbImage,
        fbLinkPosted:    data.fbLinkPosted,
        ttTitle:         data.ttTitle,
        ttDescription:   data.ttDescription,
        ttKeywords:      data.ttKeywords,
        ttHashtags:      data.ttHashtags,
        ttImage:         data.ttImage,
        ttLinkPosted:    data.ttLinkPosted,
        ytTitle:         data.ytTitle,
        ytDescription:   data.ytDescription,
        ytTags:          data.ytTags,
        ytHashtags:      data.ytHashtags,
        ytImage:         data.ytImage,
        ytLinkPosted:    data.ytLinkPosted,
        isActive:        data.isActive,
        slugRedirect:    data.slugRedirect,
        isRedirect:      data.isRedirect,
        isMobile:        data.isMobile,
        viewCount:       data.viewCount != null ? BigInt(data.viewCount) : null,
        createdBy:       userId,
        isDeleted:       false,
      } as Parameters<typeof prisma.newsCategory.create>[0]['data'],
    });
    return serialize(row);
  },

  async update(id: string, data: NewsCategoryInput, userId: string) {
    const row = await prisma.newsCategory.update({
      where: { id },
      data: {
        parentId:        data.parentId != null && data.parentId !== '' ? BigInt(data.parentId) : null,
        categoryLevel:   data.categoryLevel ?? 0,
        title:           data.title,
        summary:         data.summary,
        content:         data.content,
        imageUrl:        data.imageUrl,
        icon:            data.icon,
        banner:          data.banner,
        sortOrder:       data.sortOrder != null ? BigInt(data.sortOrder) : null,
        isShowHome:      data.isShowHome,
        seName:          data.seName,
        metaKeywords:    data.metaKeywords,
        metaDescription: data.metaDescription,
        metaTitle:       data.metaTitle,
        seoCanonical:    data.seoCanonical,
        seoNoindex:      data.seoNoindex,
        ogTitle:         data.ogTitle,
        ogDescription:   data.ogDescription,
        ogImage:         data.ogImage,
        robots:          data.robots,
        fbTitle:         data.fbTitle,
        fbDescription:   data.fbDescription,
        fbKeywords:      data.fbKeywords,
        fbHashtags:      data.fbHashtags,
        fbImage:         data.fbImage,
        fbLinkPosted:    data.fbLinkPosted,
        ttTitle:         data.ttTitle,
        ttDescription:   data.ttDescription,
        ttKeywords:      data.ttKeywords,
        ttHashtags:      data.ttHashtags,
        ttImage:         data.ttImage,
        ttLinkPosted:    data.ttLinkPosted,
        ytTitle:         data.ytTitle,
        ytDescription:   data.ytDescription,
        ytTags:          data.ytTags,
        ytHashtags:      data.ytHashtags,
        ytImage:         data.ytImage,
        ytLinkPosted:    data.ytLinkPosted,
        isActive:        data.isActive,
        slugRedirect:    data.slugRedirect,
        isRedirect:      data.isRedirect,
        isMobile:        data.isMobile,
        viewCount:       data.viewCount != null ? BigInt(data.viewCount) : null,
        updatedBy:       userId,
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