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
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  isDeleted: boolean | null;
  deletedBy: string | null;
  deletedAt: Date | null;
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
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    isDeleted: row.isDeleted,
    deletedBy: row.deletedBy,
    deletedAt: row.deletedAt,
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

export interface PaginatedProductSizes {
  data: ReturnType<typeof productSizeRepository.findAll>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const productSizeRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.sizeLabel = { contains: opts.search, mode: 'insensitive' };
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [rows, total] = await Promise.all([
      prisma.productSize.findMany({
        where,
        select: productSizeListSelect,
        orderBy: [{ sortOrder: 'asc' }, { sizeLabel: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.productSize.count({ where }),
    ]);

    return {
      data: rows.map(serialize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    const rows = await prisma.productSize.findMany({
      where: { isDeleted: false },
      select: productSizeListSelect,
      orderBy: [{ sortOrder: 'asc' }, { sizeLabel: 'asc' }],
    });
    return rows.map(serialize);
  },

  async findById(id: string) {
    const row = await prisma.productSize.findUnique({
      where: { id, isDeleted: false },
      select: productSizeListSelect,
    });
    return row ? serialize(row) : null;
  },

  async findBySizeLabel(sizeLabel: string) {
    const row = await prisma.productSize.findUnique({
      where: { sizeLabel, isDeleted: false },
      select: productSizeListSelect,
    });
    return row ? serialize(row) : null;
  },

  async create(data: ProductSizeInput, createdBy?: string) {
    const row = await prisma.productSize.create({
      data: {
        ...data,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: productSizeListSelect,
    });
    return serialize(row);
  },

  async update(id: string, data: Partial<ProductSizeInput>, updatedBy?: string) {
    const row = await prisma.productSize.update({
      where: { id, isDeleted: false },
      data: {
        ...data,
        updatedBy: updatedBy ?? null,
      },
      select: productSizeListSelect,
    });
    return serialize(row);
  },

  async delete(id: string, deletedBy?: string) {
    const row = await prisma.productSize.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
      select: productSizeListSelect,
    });
    return serialize(row);
  },

  async hasVariants(id: string) {
    const count = await prisma.productVariant.count({ where: { productSizeId: id } });
    return count > 0;
  },
};
