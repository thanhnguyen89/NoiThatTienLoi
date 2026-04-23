import { prisma } from '@/lib/prisma';
import type { ProductColorInput } from '@/server/validators/product-color.validator';

const productColorListSelect = {
  id: true,
  colorName: true,
  colorCode: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
  _count: {
    select: { variants: true },
  },
};

export interface PaginatedProductColors {
  data: Awaited<ReturnType<typeof productColorRepository.findAll>>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const productColorRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { colorName: { contains: opts.search, mode: 'insensitive' } },
        { colorCode: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [result, total] = await Promise.all([
      prisma.productColor.findMany({
        where,
        select: productColorListSelect,
        orderBy: [{ sortOrder: 'asc' }, { colorName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.productColor.count({ where }),
    ]);

    return {
      data: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    return prisma.productColor.findMany({
      where: { isDeleted: false },
      select: productColorListSelect,
      orderBy: [{ sortOrder: 'asc' }, { colorName: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.productColor.findUnique({
      where: { id, isDeleted: false },
      select: productColorListSelect,
    });
  },

  async findByColorName(colorName: string) {
    return prisma.productColor.findUnique({
      where: { colorName, isDeleted: false },
      select: productColorListSelect,
    });
  },

  async create(data: ProductColorInput, createdBy?: string) {
    return prisma.productColor.create({
      data: {
        ...data,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: productColorListSelect,
    });
  },

  async update(id: string, data: Partial<ProductColorInput>, updatedBy?: string) {
    return prisma.productColor.update({
      where: { id, isDeleted: false },
      data: {
        ...data,
        updatedBy: updatedBy ?? null,
      },
      select: productColorListSelect,
    });
  },

  async delete(id: string, deletedBy?: string) {
    return prisma.productColor.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
  },

  async hasVariants(id: string) {
    const count = await prisma.productVariant.count({ where: { productColorId: id } });
    return count > 0;
  },
};
