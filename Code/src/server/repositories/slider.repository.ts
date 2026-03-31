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
};

export const sliderRepository = {
  async findAll() {
    return prisma.slider.findMany({
      select: sliderListSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async findById(id: string) {
    return prisma.slider.findUnique({
      where: { id },
      select: sliderListSelect,
    });
  },

  async create(data: SliderInput) {
    return prisma.slider.create({
      data,
      select: sliderListSelect,
    });
  },

  async update(id: string, data: Partial<SliderInput>) {
    return prisma.slider.update({
      where: { id },
      data,
      select: sliderListSelect,
    });
  },

  async delete(id: string) {
    return prisma.slider.delete({ where: { id } });
  },
};
