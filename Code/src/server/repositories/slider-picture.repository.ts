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

export const sliderPictureRepository = {
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
