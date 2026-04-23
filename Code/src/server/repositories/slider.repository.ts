import { prisma } from '@/lib/prisma';
import type { SliderInput } from '@/server/validators/slider.validator';

const sliderListSelect = {
  id: true,
  title: true,
  image: true,
  link: true,
  content: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
};

export interface PaginatedSliders {
  data: Awaited<ReturnType<typeof sliderRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const sliderRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { link: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.slider.findMany({
        where,
        select: sliderListSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.slider.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.slider.findMany({
      where: { isDeleted: false },
      select: sliderListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.slider.findUnique({
      where: { id, isDeleted: false },
      select: sliderListSelect,
    });
  },

  async create(data: SliderInput, createdBy?: string) {
    return prisma.slider.create({
      data: {
        ...data,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: sliderListSelect,
    });
  },

  async update(id: string, data: Partial<SliderInput>, updatedBy?: string) {
    return prisma.slider.update({
      where: { id, isDeleted: false },
      data: {
        ...data,
        updatedBy: updatedBy ?? null,
      },
      select: sliderListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.slider.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },
};
