import { prisma } from '@/lib/prisma';
import { PAGINATION } from '@/lib/constants';
import type { InquiryFilterParams } from '@/lib/types';

const inquiryListSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  message: true,
  type: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
  product: {
    select: { id: true, name: true, slug: true },
  },
};

export const inquiryRepository = {
  async findMany(params: InquiryFilterParams) {
    const page = params.page || 1;
    const pageSize = params.pageSize || PAGINATION.ADMIN_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { isDeleted: false };
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.inquiry.findMany({
        where: where as never,
        select: inquiryListSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.inquiry.count({ where: where as never }),
    ]);

    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findById(id: string) {
    return prisma.inquiry.findUnique({ where: { id, isDeleted: false }, select: inquiryListSelect });
  },

  async create(data: Record<string, unknown>, createdBy?: string) {
    return prisma.inquiry.create({
      data: { ...data, createdBy: createdBy ?? null, isDeleted: false } as never,
      select: inquiryListSelect,
    });
  },

  async update(id: string, data: Record<string, unknown>, updatedBy?: string) {
    return prisma.inquiry.update({
      where: { id, isDeleted: false },
      data: { ...data, updatedBy: updatedBy ?? null } as never,
      select: inquiryListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.inquiry.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },
};
