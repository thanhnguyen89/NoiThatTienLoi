import { prisma } from '@/lib/prisma';
import type { UrlRecordInput } from '@/server/validators/url-record.validator';

const urlRecordListSelect = {
  id: true,
  entityId: true,
  entityName: true,
  slug: true,
  isActive: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
  slugRedirect: true,
  isRedirect: true,
  errorCode: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
};

export interface PaginatedUrlRecords {
  data: Awaited<ReturnType<typeof urlRecordRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const urlRecordRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { slug: { contains: opts.search, mode: 'insensitive' } },
        { entityName: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.urlRecord.findMany({
        where,
        select: urlRecordListSelect,
        orderBy: { isActive: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.urlRecord.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.urlRecord.findMany({
      where: { isDeleted: false },
      select: urlRecordListSelect,
      orderBy: { isActive: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.urlRecord.findUnique({
      where: { id, isDeleted: false },
      select: urlRecordListSelect,
    });
  },

  async findBySlug(slug: string) {
    return prisma.urlRecord.findUnique({
      where: { slug, isDeleted: false },
      select: urlRecordListSelect,
    });
  },

  async create(data: UrlRecordInput, createdBy?: string) {
    return prisma.urlRecord.create({
      data: {
        entityId: data.entityId ?? null,
        entityName: data.entityName ?? null,
        slug: data.slug ?? null,
        isActive: data.isActive ?? null,
        isDeleted: false,
        deletedBy: null,
        deletedAt: null,
        slugRedirect: data.slugRedirect ?? null,
        isRedirect: data.isRedirect ?? null,
        errorCode: data.errorCode ?? null,
        createdBy: createdBy ?? null,
        updatedBy: null,
      },
      select: urlRecordListSelect,
    });
  },

  async update(id: string, data: Partial<UrlRecordInput>, updatedBy?: string) {
    return prisma.urlRecord.update({
      where: { id, isDeleted: false },
      data: {
        ...(data.entityId !== undefined && { entityId: data.entityId }),
        ...(data.entityName !== undefined && { entityName: data.entityName }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isDeleted !== undefined && { isDeleted: data.isDeleted }),
        ...(data.deletedUserId !== undefined && { deletedBy: data.deletedUserId }),
        ...(data.deletedDate !== undefined && {
          deletedAt: data.deletedDate ? new Date(data.deletedDate) : null,
        }),
        ...(data.slugRedirect !== undefined && { slugRedirect: data.slugRedirect }),
        ...(data.isRedirect !== undefined && { isRedirect: data.isRedirect }),
        ...(data.errorCode !== undefined && { errorCode: data.errorCode }),
        updatedBy: updatedBy ?? null,
      },
      select: urlRecordListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.urlRecord.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
      select: urlRecordListSelect,
    });
  },
};
