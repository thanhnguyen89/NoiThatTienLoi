import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { ShippingProviderInput, ShippingProviderUpdateInput } from '@/server/validators/shipping-provider.validator';

// ============================================================
// SHIPPING PROVIDER REPOSITORY
// ============================================================

export interface ShippingProviderListItem {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  website: string | null;
  note: string | null;
  isActive: boolean;
  serviceTypes: string[];
  vehicles: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
  _count?: {
    shipments: number;
  };
}

export interface ShippingProviderDetail extends ShippingProviderListItem {
  note: string | null;
  serviceTypes: string[];
  vehicles: string[];
  surcharges: unknown;
  discountPolicies: unknown;
  shipments?: Array<{
    id: string;
    orderId: string;
    shippingMethod: string;
    trackingCode: string | null;
    shippingCost: unknown;
    createdAt: Date;
  }>;
}

export interface PaginatedShippingProviders {
  data: ShippingProviderListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const listSelect = {
  id: true,
  code: true,
  name: true,
  phone: true,
  website: true,
  note: true,
  isActive: true,
  serviceTypes: true,
  vehicles: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
};

function toPlain<T extends object>(row: T): T {
  return JSON.parse(JSON.stringify(row, (_, v) => typeof v === 'bigint' ? Number(v) : v));
}

export const shippingProviderRepository = {
  // ── List with pagination + search ──
  async findAll(opts?: {
    search?: string;
    isActive?: boolean;
    serviceType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedShippingProviders> {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    if (opts?.search) {
      where.OR = [
        { code: { contains: opts.search, mode: 'insensitive' } },
        { name: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search, mode: 'insensitive' } },
        { website: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) {
      where.isActive = opts.isActive;
    }
    if (opts?.serviceType) {
      where.serviceTypes = { has: opts.serviceType };
    }

    const [result, total] = await Promise.all([
      prisma.shippingProvider.findMany({
        where,
        select: {
          ...listSelect,
          _count: { select: { shipments: true } },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.shippingProvider.count({ where }),
    ]);

    return {
      data: toPlain(result),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  // ── Detail ──
  async findById(id: string): Promise<ShippingProviderDetail | null> {
    const result = await prisma.shippingProvider.findUnique({
      where: { id },
      select: {
        ...listSelect,
        note: true,
        surcharges: true,
        discountPolicies: true,
        shipments: {
          select: {
            id: true,
            orderId: true,
            shippingMethod: true,
            trackingCode: true,
            shippingCost: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    return result ? toPlain(result) : null;
  },

  // ── Find by code (for duplicate check) ──
  async findByCode(code: string) {
    return prisma.shippingProvider.findUnique({
      where: { code },
      select: { id: true, code: true },
    });
  },

  async create(data: ShippingProviderInput & { serviceTypes?: string[]; vehicles?: string[] }, createdBy?: string) {
    const result = await prisma.shippingProvider.create({
      data: {
        code: data.code || null,
        name: data.name,
        phone: data.phone || null,
        website: data.website || null,
        note: data.note || null,
        isActive: data.isActive ?? true,
        serviceTypes: data.serviceTypes || [],
        vehicles: data.vehicles || [],
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: listSelect,
    });
    return toPlain(result);
  },

  // ── Update ──
  async update(id: string, data: Partial<ShippingProviderUpdateInput> & { serviceTypes?: string[]; vehicles?: string[]; surcharges?: unknown; discountPolicies?: unknown }, updatedBy?: string) {
    const updateData: Record<string, unknown> = {};
    if (data.code !== undefined) updateData.code = data.code || null;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.note !== undefined) updateData.note = data.note || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.serviceTypes !== undefined) updateData.serviceTypes = data.serviceTypes;
    if (data.vehicles !== undefined) updateData.vehicles = data.vehicles;
    if (data.surcharges !== undefined) updateData.surcharges = data.surcharges as Prisma.InputJsonValue;
    if (data.discountPolicies !== undefined) updateData.discountPolicies = data.discountPolicies as Prisma.InputJsonValue;
    updateData.updatedBy = updatedBy ?? null;

    const result = await prisma.shippingProvider.update({
      where: { id, isDeleted: false },
      data: updateData,
      select: listSelect,
    });
    return toPlain(result);
  },

  // ── Toggle active ──
  async toggleActive(id: string) {
    const current = await prisma.shippingProvider.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!current) return null;

    const result = await prisma.shippingProvider.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: listSelect,
    });
    return toPlain(result);
  },

  // ── Set active (for bulk) ──
  async setActive(id: string, active: boolean) {
    const result = await prisma.shippingProvider.update({
      where: { id },
      data: { isActive: active },
      select: listSelect,
    });
    return toPlain(result);
  },

  // ── Soft delete ──
  async softDelete(id: string) {
    const result = await prisma.shippingProvider.update({
      where: { id },
      data: { isDeleted: true },
      select: listSelect,
    });
    return toPlain(result);
  },

  // ── Status counts with orders stats ──
  async getStatusCounts() {
    const where = { isDeleted: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, active, inactive, ordersToday, avgCostResult] = await Promise.all([
      prisma.shippingProvider.count({ where }),
      prisma.shippingProvider.count({ where: { ...where, isActive: true } }),
      prisma.shippingProvider.count({ where: { ...where, isActive: false } }),
      prisma.orderShipment.count({
        where: {
          createdAt: { gte: today },
          shippingProvider: { isDeleted: false },
        },
      }),
      prisma.orderShipment.aggregate({
        where: {
          createdAt: { gte: today },
          shippingProvider: { isDeleted: false },
        },
        _avg: { shippingCost: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      ordersToday,
      avgCost: avgCostResult._avg.shippingCost ?? 0,
    };
  },

  // ── Get all (simple, for dropdowns) ──
  async findAllActive() {
    return prisma.shippingProvider.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  // ── Get all for Excel export (no pagination) ──
  async findAllForExport(opts?: {
    search?: string;
    isActive?: boolean;
    serviceType?: string;
  }) {
    const where: Record<string, unknown> = { isDeleted: false };

    if (opts?.search) {
      where.OR = [
        { code: { contains: opts.search, mode: 'insensitive' } },
        { name: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search, mode: 'insensitive' } },
        { website: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) {
      where.isActive = opts.isActive;
    }
    if (opts?.serviceType) {
      where.serviceTypes = { has: opts.serviceType };
    }

    const result = await prisma.shippingProvider.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        website: true,
        isActive: true,
        serviceTypes: true,
        vehicles: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { shipments: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return toPlain(result);
  },

  // ── Find shipments by provider ──
  async findShipmentsByProvider(providerId: string, opts?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const where: Record<string, unknown> = {
      shippingProviderId: providerId,
    };
    if (opts?.dateFrom) {
      where.createdAt = { gte: new Date(opts.dateFrom) };
    }
    if (opts?.dateTo) {
      const to = new Date(opts.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), lte: to };
    }
    if (opts?.status && opts.status !== 'all') {
      where.order = { orderStatus: opts.status };
    }

    const [result, total, monthAgg] = await Promise.all([
      prisma.orderShipment.findMany({
        where,
        select: {
          id: true,
          orderId: true,
          shippingMethod: true,
          shippingServiceType: true,
          shippingCost: true,
          finalShippingCost: true,
          trackingCode: true,
          providerOrderCode: true,
          shippedAt: true,
          deliveredAt: true,
          createdAt: true,
          distanceKm: true,
          order: {
            select: {
              orderNo: true,
              orderStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.orderShipment.count({ where }),
      prisma.orderShipment.aggregate({
        where: { shippingProviderId: providerId, createdAt: { gte: startOfMonth } },
        _count: true,
        _sum: { finalShippingCost: true },
      }),
    ]);

    return {
      data: toPlain(result),
      monthlyCount: monthAgg._count,
      monthlyCost: Number(monthAgg._sum.finalShippingCost ?? 0),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  // ── Get provider stats ──
  async getProviderStats(providerId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalShipments,
      monthShipments,
      quarterShipments,
      yearShipments,
      monthCostAgg,
      quarterCostAgg,
      yearCostAgg,
      avgCostAgg,
      avgDistanceAgg,
      deliveredCount,
      returnedCount,
      completedWithTimes,
    ] = await Promise.all([
      // Total
      prisma.orderShipment.count({ where: { shippingProviderId: providerId } }),
      // Month
      prisma.orderShipment.count({
        where: { shippingProviderId: providerId, createdAt: { gte: startOfMonth } },
      }),
      // Quarter
      prisma.orderShipment.count({
        where: { shippingProviderId: providerId, createdAt: { gte: startOfQuarter } },
      }),
      // Year
      prisma.orderShipment.count({
        where: { shippingProviderId: providerId, createdAt: { gte: startOfYear } },
      }),
      // Month cost
      prisma.orderShipment.aggregate({
        where: { shippingProviderId: providerId, createdAt: { gte: startOfMonth } },
        _sum: { finalShippingCost: true },
      }),
      // Quarter cost
      prisma.orderShipment.aggregate({
        where: { shippingProviderId: providerId, createdAt: { gte: startOfQuarter } },
        _sum: { finalShippingCost: true },
      }),
      // Year cost
      prisma.orderShipment.aggregate({
        where: { shippingProviderId: providerId, createdAt: { gte: startOfYear } },
        _sum: { finalShippingCost: true },
      }),
      // Avg cost per shipment
      prisma.orderShipment.aggregate({
        where: { shippingProviderId: providerId },
        _avg: { finalShippingCost: true },
      }),
      // Avg distance
      prisma.orderShipment.aggregate({
        where: { shippingProviderId: providerId, distanceKm: { not: null } },
        _avg: { distanceKm: true },
      }),
      // Delivery stats via order relation
      prisma.orderShipment.count({
        where: {
          shippingProviderId: providerId,
          order: { orderStatus: { in: ['delivered', 'completed'] } },
        },
      }),
      prisma.orderShipment.count({
        where: {
          shippingProviderId: providerId,
          order: { orderStatus: 'returned' },
        },
      }),
      // Avg delivery time (shipped → delivered, completed)
      prisma.orderShipment.findMany({
        where: {
          shippingProviderId: providerId,
          shippedAt: { not: null },
          deliveredAt: { not: null },
          order: { orderStatus: { in: ['delivered', 'completed'] } },
        },
        select: { shippedAt: true, deliveredAt: true },
      }),
    ]);

    return {
      totalShipments,
      monthShipments,
      quarterShipments,
      yearShipments,
      monthCost: Number(monthCostAgg._sum.finalShippingCost ?? 0),
      quarterCost: Number(quarterCostAgg._sum.finalShippingCost ?? 0),
      yearCost: Number(yearCostAgg._sum.finalShippingCost ?? 0),
      avgCostPerShipment: Number(avgCostAgg._avg.finalShippingCost ?? 0),
      avgCostPerKm: avgDistanceAgg._avg.distanceKm ? (() => {
        const dist = Number(avgDistanceAgg._avg.distanceKm ?? 0);
        return dist > 0 ? Number(avgCostAgg._avg.finalShippingCost ?? 0) / dist : 0;
      })() : 0,
      successRate: totalShipments > 0 ? Math.round((deliveredCount / totalShipments) * 1000) / 10 : 0,
      onTimeRate: totalShipments > 0 ? Math.round(((totalShipments - returnedCount) / totalShipments) * 1000) / 10 : 0,
      avgDeliveryHours: (() => {
        if (!completedWithTimes.length) return 0;
        const totalHours = completedWithTimes.reduce((sum: number, t: { shippedAt: Date | null; deliveredAt: Date | null }) =>
          sum + (new Date(t.deliveredAt!).getTime() - new Date(t.shippedAt!).getTime()) / 3600000, 0
        );
        return Math.round(totalHours / completedWithTimes.length * 10) / 10;
      })(),
    };
  },

  // ── Find all for comparison ──
  async findAllForComparison() {
    const providers = await prisma.shippingProvider.findMany({
      where: { isActive: true, isDeleted: false },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        _count: { select: { shipments: true } },
      },
      orderBy: { name: 'asc' },
    });

    const stats = await Promise.all(
      providers.map(async (p) => {
        const agg = await prisma.orderShipment.aggregate({
          where: { shippingProviderId: p.id },
          _avg: { finalShippingCost: true },
        });
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          shipmentCount: p._count.shipments,
          avgCost: Number(agg._avg.finalShippingCost ?? 0),
        };
      })
    );

    return toPlain(stats);
  },

  // ── Update pricing meta (surcharges + discount policies) ──
  async updatePricingMeta(providerId: string, surcharges?: unknown, discountPolicies?: unknown) {
    const updateData: Record<string, unknown> = {};
    if (surcharges !== undefined) updateData.surcharges = surcharges as Prisma.InputJsonValue;
    if (discountPolicies !== undefined) updateData.discountPolicies = discountPolicies as Prisma.InputJsonValue;
    if (Object.keys(updateData).length === 0) return;
    await prisma.shippingProvider.update({
      where: { id: providerId },
      data: updateData,
    });
  },
};