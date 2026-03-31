import { prisma } from '@/lib/prisma';
import type { UrlRecordInput } from '@/server/validators/url-record.validator';

const urlRecordListSelect = {
  id: true,
  entityId: true,
  entityName: true,
  slug: true,
  isActive: true,
  isDeleted: true,
  deletedUserId: true,
  deletedDate: true,
  slugRedirect: true,
  isRedirect: true,
  errorCode: true,
};

export const urlRecordRepository = {
  async findAll() {
    return prisma.urlRecord.findMany({
      select: urlRecordListSelect,
      orderBy: { isActive: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.urlRecord.findUnique({
      where: { id },
      select: urlRecordListSelect,
    });
  },

  async findBySlug(slug: string) {
    return prisma.urlRecord.findUnique({
      where: { slug },
      select: urlRecordListSelect,
    });
  },

  async create(data: UrlRecordInput) {
    return prisma.urlRecord.create({
      data: {
        entityId: data.entityId ?? null,
        entityName: data.entityName ?? null,
        slug: data.slug ?? null,
        isActive: data.isActive ?? null,
        isDeleted: data.isDeleted ?? null,
        deletedUserId: data.deletedUserId ?? null,
        deletedDate: data.deletedDate ? new Date(data.deletedDate) : null,
        slugRedirect: data.slugRedirect ?? null,
        isRedirect: data.isRedirect ?? null,
        errorCode: data.errorCode ?? null,
      },
      select: urlRecordListSelect,
    });
  },

  async update(id: string, data: Partial<UrlRecordInput>) {
    return prisma.urlRecord.update({
      where: { id },
      data: {
        ...(data.entityId !== undefined && { entityId: data.entityId }),
        ...(data.entityName !== undefined && { entityName: data.entityName }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isDeleted !== undefined && { isDeleted: data.isDeleted }),
        ...(data.deletedUserId !== undefined && { deletedUserId: data.deletedUserId }),
        ...(data.deletedDate !== undefined && {
          deletedDate: data.deletedDate ? new Date(data.deletedDate) : null,
        }),
        ...(data.slugRedirect !== undefined && { slugRedirect: data.slugRedirect }),
        ...(data.isRedirect !== undefined && { isRedirect: data.isRedirect }),
        ...(data.errorCode !== undefined && { errorCode: data.errorCode }),
      },
      select: urlRecordListSelect,
    });
  },

  async delete(id: string) {
    return prisma.urlRecord.delete({ where: { id } });
  },
};
