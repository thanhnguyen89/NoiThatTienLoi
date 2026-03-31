import { prisma } from '@/lib/prisma';
import type { ProductColorInput } from '@/server/validators/product-color.validator';

const productColorListSelect = {
  id: true,
  colorName: true,
  colorCode: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  _count: {
    select: { variants: true },
  },
};

export const productColorRepository = {
  async findAll() {
    return prisma.productColor.findMany({
      select: productColorListSelect,
      orderBy: [{ sortOrder: 'asc' }, { colorName: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.productColor.findUnique({
      where: { id },
      select: productColorListSelect,
    });
  },

  async findByColorName(colorName: string) {
    return prisma.productColor.findUnique({
      where: { colorName },
      select: productColorListSelect,
    });
  },

  async create(data: ProductColorInput) {
    return prisma.productColor.create({
      data,
      select: productColorListSelect,
    });
  },

  async update(id: string, data: Partial<ProductColorInput>) {
    return prisma.productColor.update({
      where: { id },
      data,
      select: productColorListSelect,
    });
  },

  async delete(id: string) {
    return prisma.productColor.delete({ where: { id } });
  },

  async hasVariants(id: string) {
    const count = await prisma.productVariant.count({ where: { productColorId: id } });
    return count > 0;
  },
};
