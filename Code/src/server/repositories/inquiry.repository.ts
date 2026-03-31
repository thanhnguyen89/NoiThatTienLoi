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
  product: {
    select: { id: true, name: true, slug: true },
  },
};

export const inquiryRepository = {
  async findMany(params: InquiryFilterParams) {
    const page = params.page || 1;
    const pageSize = params.pageSize || PAGINATION.ADMIN_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
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
    return prisma.inquiry.findUnique({ where: { id }, select: inquiryListSelect });
  },

  async create(data: Record<string, unknown>) {
    return prisma.inquiry.create({ data: data as never, select: inquiryListSelect });
  },

  async update(id: string, data: Record<string, unknown>) {
    return prisma.inquiry.update({ where: { id }, data: data as never, select: inquiryListSelect });
  },

  async delete(id: string) {
    return prisma.inquiry.delete({ where: { id } });
  },
};
