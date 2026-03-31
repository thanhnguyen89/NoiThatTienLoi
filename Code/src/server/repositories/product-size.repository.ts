import { prisma } from '@/lib/prisma';
import type { ProductSizeInput } from '@/server/validators/product-size.validator';
import { Prisma } from '@prisma/client';

function toNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (val instanceof Prisma.Decimal) return val.toNumber();
  if (typeof val === 'string') { const n = Number(val); return isNaN(n) ? null : n; }
  return null;
}

interface ProductSizeRow {
  id: string;
  sizeLabel: string;
  widthCm: Prisma.Decimal | null;
  lengthCm: Prisma.Decimal | null;
  heightCm: Prisma.Decimal | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  _count: { variants: number };
}

function serialize(row: ProductSizeRow) {
  return {
    id: row.id,
    sizeLabel: row.sizeLabel,
    widthCm: toNumber(row.widthCm),
    lengthCm: toNumber(row.lengthCm),
    heightCm: toNumber(row.heightCm),
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt,
    _count: row._count,
  };
}

const productSizeListSelect = {
  id: true,
  sizeLabel: true,
  widthCm: true,
  lengthCm: true,
  heightCm: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  _count: {
    select: { variants: true },
  },
};

export const productSizeRepository = {
  async findAll() {
    const rows = await prisma.productSize.findMany({
      select: productSizeListSelect,
      orderBy: [{ sortOrder: 'asc' }, { sizeLabel: 'asc' }],
    });
    return rows.map(serialize);
  },

  async findById(id: string) {
    const row = await prisma.productSize.findUnique({
      where: { id },
      select: productSizeListSelect,
    });
    return row ? serialize(row) : null;
  },

  async findBySizeLabel(sizeLabel: string) {
    const row = await prisma.productSize.findUnique({
      where: { sizeLabel },
      select: productSizeListSelect,
    });
    return row ? serialize(row) : null;
  },

  async create(data: ProductSizeInput) {
    const row = await prisma.productSize.create({
      data,
      select: productSizeListSelect,
    });
    return serialize(row);
  },

  async update(id: string, data: Partial<ProductSizeInput>) {
    const row = await prisma.productSize.update({
      where: { id },
      data,
      select: productSizeListSelect,
    });
    return serialize(row);
  },

  async delete(id: string) {
    return prisma.productSize.delete({ where: { id } });
  },

  async hasVariants(id: string) {
    const count = await prisma.productVariant.count({ where: { productSizeId: id } });
    return count > 0;
  },
};
