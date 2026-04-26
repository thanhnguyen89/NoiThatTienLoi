import { prisma } from '@/lib/prisma';
import type { NewsInput } from '@/server/validators/news.validator';

const newsListSelect = {
  id: true,
  title: true,
  summary: true,
  image: true,
  seName: true,
  isPublished: true,
  isShowHome: true,
  isActive: true,
  isNew: true,
  viewCount: true,
  commentCount: true,
  likeCount: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
  authorName: true,
  isRedirect: true,
  slugRedirect: true,
  // 28 fields mới
  authorId: true,
  authorEmail: true,
  authorAvatar: true,
  tags: true,
  categoryName: true,
  categorySlug: true,
  readingTime: true,
  featuredImage: true,
  featuredImageAlt: true,
  featuredImageCaption: true,
  galleryImages: true,
  videoUrl: true,
  videoThumbnail: true,
  audioUrl: true,
  relatedNewsIds: true,
  externalUrl: true,
  isExternalLink: true,
  openInNewTab: true,
  isFeatured: true,
  isBreakingNews: true,
  isPinned: true,
  expiryDate: true,
  scheduledPublishDate: true,
  lastModifiedBy: true,
  revisionNumber: true,
  contentFormat: true,
  customCss: true,
  customJs: true,
  jsonData: true,
} as const;

function toPlain<T extends object>(row: T): T {
  return JSON.parse(JSON.stringify(row, (_, v) => typeof v === 'bigint' ? Number(v) : v));
}

export interface PaginatedNews {
  data: ReturnType<typeof newsRepository.findAll>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const newsRepository = {
  async findAllPaginated(opts?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isPublished?: boolean;
    isShowHome?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { 
      OR: [
        { isDeleted: false },
        { isDeleted: null }
      ]
    };
    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { seName: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isPublished !== undefined) where.isPublished = opts.isPublished;
    if (opts?.isShowHome !== undefined) where.isShowHome = opts.isShowHome;
    if (opts?.dateFrom) {
      where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), gte: new Date(opts.dateFrom) };
    }
    if (opts?.dateTo) {
      const to = new Date(opts.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), lte: to };
    }

    const [result, total] = await Promise.all([
      prisma.newsContent.findMany({
        where,
        select: newsListSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.newsContent.count({ where }),
    ]);

    return {
      data: toPlain(result),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    const result = await prisma.newsContent.findMany({
      where: { 
        OR: [
          { isDeleted: false },
          { isDeleted: null }
        ]
      },
      select: newsListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return toPlain(result);
  },

  async findById(id: string) {
    const result = await prisma.newsContent.findFirst({
      where: { 
        id,
        OR: [
          { isDeleted: false },
          { isDeleted: null }
        ]
      },
    });
    return result ? toPlain(result) : null;
  },

  async create(data: NewsInput, userId: string) {
    const result = await prisma.newsContent.create({
      data: {
        ...data,
        isRemoved: data.isRemoved ?? false,
        viewCount: data.viewCount != null ? BigInt(data.viewCount) : BigInt(0),
        commentCount: data.commentCount != null ? BigInt(data.commentCount) : BigInt(0),
        likeCount: data.likeCount != null ? BigInt(data.likeCount) : BigInt(0),
        wordCount: data.wordCount != null ? BigInt(data.wordCount) : null,
        readingTime: data.readingTime != null ? BigInt(data.readingTime) : null,
        revisionNumber: data.revisionNumber != null ? BigInt(data.revisionNumber) : BigInt(0),
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        scheduledPublishDate: data.scheduledPublishDate ? new Date(data.scheduledPublishDate) : null,
        createdBy: userId,
        isDeleted: false,
      } as Parameters<typeof prisma.newsContent.create>[0]['data'],
    });
    return toPlain(result);
  },

  async update(id: string, data: Partial<NewsInput>, userId: string) {
    const result = await prisma.newsContent.update({
      where: { id },
      data: {
        ...data,
        viewCount: data.viewCount != null ? BigInt(data.viewCount) : undefined,
        commentCount: data.commentCount != null ? BigInt(data.commentCount) : undefined,
        likeCount: data.likeCount != null ? BigInt(data.likeCount) : undefined,
        wordCount: data.wordCount != null ? BigInt(data.wordCount) : undefined,
        readingTime: data.readingTime != null ? BigInt(data.readingTime) : undefined,
        revisionNumber: data.revisionNumber != null ? BigInt(data.revisionNumber) : undefined,
        publishedAt: data.publishedAt !== undefined ? (data.publishedAt ? new Date(data.publishedAt) : null) : undefined,
        expiryDate: data.expiryDate !== undefined ? (data.expiryDate ? new Date(data.expiryDate) : null) : undefined,
        scheduledPublishDate: data.scheduledPublishDate !== undefined ? (data.scheduledPublishDate ? new Date(data.scheduledPublishDate) : null) : undefined,
        updatedBy: userId,
      } as Parameters<typeof prisma.newsContent.update>[0]['data'],
    });
    return toPlain(result);
  },

  async softDelete(id: string, userId: string) {
    const result = await prisma.newsContent.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date(),
      },
    });
    return toPlain(result);
  },
};
