import { prisma } from '@/lib/prisma';
import type { SliderPictureInput } from '@/server/validators/slider-picture.validator';

const sliderPictureListSelect = {
  id: true,
  comment: true,
  name: true,
  image: true,
  sortOrder: true,
  isActive: true,
};

export interface PaginatedSliderPictures {
  data: Awaited<ReturnType<typeof sliderPictureRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const sliderPictureRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = {};
    if (opts?.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { comment: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.sliderPicture.findMany({
        where,
        select: sliderPictureListSelect,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sliderPicture.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.sliderPicture.findMany({
      select: sliderPictureListSelect,
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.sliderPicture.findUnique({
      where: { id },
      select: sliderPictureListSelect,
    });
  },

  async create(data: SliderPictureInput) {
    return prisma.sliderPicture.create({
      data,
      select: sliderPictureListSelect,
    });
  },

  async update(id: string, data: Partial<SliderPictureInput>) {
    return prisma.sliderPicture.update({
      where: { id },
      data,
      select: sliderPictureListSelect,
    });
  },

  async delete(id: string) {
    return prisma.sliderPicture.delete({ where: { id } });
  },
};
