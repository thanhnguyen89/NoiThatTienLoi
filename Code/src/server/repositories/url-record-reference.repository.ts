import { prisma } from '@/lib/prisma';

const urlRecordReferenceSelect = {
  id: true,
  entityName: true,
  controllerName: true,
  actionName: true,
  urlPattern: true,
  description: true,
  isActive: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
};

export interface PaginatedUrlRecordReferences {
  data: unknown[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const urlRecordReferenceRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { entityName: { contains: opts.search, mode: 'insensitive' } },
        { controllerName: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.urlRecordReference.findMany({
        where,
        select: urlRecordReferenceSelect,
        orderBy: { entityName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.urlRecordReference.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.urlRecordReference.findMany({
      where: { isDeleted: false },
      select: urlRecordReferenceSelect,
      orderBy: { entityName: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.urlRecordReference.findUnique({
      where: { id, isDeleted: false },
      select: urlRecordReferenceSelect,
    });
  },

  async findByEntityName(entityName: string) {
    return prisma.urlRecordReference.findUnique({
      where: { entityName, isDeleted: false },
      select: urlRecordReferenceSelect,
    });
  },

  async findBySlug(slug: string) {
    return prisma.urlRecord.findFirst({
      where: { slug, isDeleted: false },
      select: {
        id: true,
        entityId: true,
        entityName: true,
        slug: true,
        isActive: true,
      },
    });
  },

  async create(data: Record<string, unknown>, createdBy?: string) {
    return prisma.urlRecordReference.create({
      data: {
        entityName: data.entityName as string | null,
        controllerName: data.controllerName as string | null,
        actionName: data.actionName as string | null,
        urlPattern: data.urlPattern as string | null,
        description: data.description as string | null,
        isActive: data.isActive as boolean | null,
        createdBy: createdBy ?? null,
      },
      select: urlRecordReferenceSelect,
    });
  },

  async update(id: string, data: Record<string, unknown>, updatedBy?: string) {
    return prisma.urlRecordReference.update({
      where: { id, isDeleted: false },
      data: {
        entityName: data.entityName as string | undefined,
        controllerName: data.controllerName as string | undefined,
        actionName: data.actionName as string | undefined,
        urlPattern: data.urlPattern as string | undefined,
        description: data.description as string | undefined,
        isActive: data.isActive as boolean | undefined,
        updatedBy: updatedBy ?? null,
      },
      select: urlRecordReferenceSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.urlRecordReference.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
      select: urlRecordReferenceSelect,
    });
  },

  // UrlRecord operations
  async createUrlRecord(data: { entityId: bigint; entityName: string; slug: string; createdBy?: string }) {
    return prisma.urlRecord.create({
      data: {
        entityId: data.entityId,
        entityName: data.entityName,
        slug: data.slug,
        isActive: true,
        isDeleted: false,
        createdBy: data.createdBy ?? null,
      },
      select: {
        id: true,
        entityId: true,
        entityName: true,
        slug: true,
        isActive: true,
      },
    });
  },

  async updateUrlRecord(entityId: bigint, entityName: string, newSlug: string, updatedBy?: string) {
    return prisma.urlRecord.updateMany({
      where: { entityId, entityName, isDeleted: false },
      data: {
        slug: newSlug,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date(),
      },
    });
  },

  async deleteUrlRecord(entityId: bigint, entityName: string, deletedBy?: string) {
    return prisma.urlRecord.updateMany({
      where: { entityId, entityName },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },
};