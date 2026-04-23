import { prisma } from '@/lib/prisma';
import type { CatalogEmbedCodeInput } from '@/server/validators/catalog-embed-code.validator';

const catalogEmbedCodeListSelect = {
  id: true,
  title: true,
  positionId: true,
  embedCode: true,
  note: true,
  isActive: true,
  createdBy: true,
  createdAt: true,
  updatedBy: true,
  updatedAt: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
} as const;

type RawResult = Awaited<ReturnType<typeof prisma.catalogEmbedCode.findFirst>>;

function serialize(r: RawResult): Exclude<RawResult, null> | null {
  if (!r) return r;
  return {
    ...r,
    positionId: r.positionId != null ? Number(r.positionId) : null,
  } as Exclude<RawResult, null>;
}

function serializeMany<T extends RawResult>(rows: T[]): T[] {
  return rows.map((r) => serialize(r) as T);
}

export interface PaginatedCatalogEmbedCodes {
  data: ReturnType<typeof catalogEmbedCodeRepository.findAll>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const catalogEmbedCodeRepository = {
  async findAllPaginated(opts?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { embedCode: { contains: opts.search, mode: 'insensitive' } },
        { note: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;

    const [rows, total] = await Promise.all([
      prisma.catalogEmbedCode.findMany({
        where,
        select: catalogEmbedCodeListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.catalogEmbedCode.count({ where }),
    ]);

    return {
      data: serializeMany(rows),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findAll() {
    const rows = await prisma.catalogEmbedCode.findMany({
      where: { isDeleted: false },
      select: catalogEmbedCodeListSelect,
      orderBy: { createdAt: 'desc' },
    });
    return serializeMany(rows);
  },

  async findById(id: string) {
    const row = await prisma.catalogEmbedCode.findFirst({
      where: { id, isDeleted: false },
      select: catalogEmbedCodeListSelect,
    });
    return serialize(row);
  },

  async create(data: CatalogEmbedCodeInput, userId: string) {
    const row = await prisma.catalogEmbedCode.create({
      data: {
        title: data.title,
        positionId: data.positionId != null ? BigInt(data.positionId) : null,
        embedCode: data.embedCode,
        note: data.note,
        isActive: data.isActive,
        createdBy: userId,
        isDeleted: false,
      } as Parameters<typeof prisma.catalogEmbedCode.create>[0]['data'],
      select: catalogEmbedCodeListSelect,
    });
    return serialize(row);
  },

  async update(id: string, data: Partial<CatalogEmbedCodeInput>, userId: string) {
    const row = await prisma.catalogEmbedCode.update({
      where: { id, isDeleted: false },
      data: {
        ...data,
        updatedBy: userId,
        positionId: data.positionId != null ? BigInt(data.positionId) : null,
      } as Parameters<typeof prisma.catalogEmbedCode.update>[0]['data'],
      select: catalogEmbedCodeListSelect,
    });
    return serialize(row);
  },

  async softDelete(id: string, userId: string) {
    await prisma.catalogEmbedCode.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date(),
      },
    });
  },
};
