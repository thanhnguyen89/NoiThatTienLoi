import { prisma } from '@/lib/prisma';
import type { WarehouseInput, WarehouseUpdateInput } from '@/server/validators/warehouse.validator';

// ============================================================
// WAREHOUSE REPOSITORY
// ============================================================

export interface WarehouseListItem {
  id: string;
  code: string | null;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  provinceName: string | null;
  districtName: string | null;
  wardName: string | null;
  addressLine: string;
  fullAddress: string | null;
  latitude: unknown;  // Float from DB → serialized as number
  longitude: unknown; // Float from DB → serialized as number
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  isDeleted: boolean | null;
  deletedBy: string | null;
  deletedAt: Date | null;
  _count?: {
    shipments: number;
  };
}

export interface WarehouseDetail extends WarehouseListItem {
  countryCode: string | null;
  provinceCode: string | null;
  districtCode: string | null;
  wardCode: string | null;
  shipments?: Array<{
    id: string;
    orderId: string;
    shippingMethod: string;
    trackingCode: string | null;
    fromFullAddress: string | null;
    toFullAddress: string | null;
    createdAt: Date;
  }>;
}

export interface PaginatedWarehouses {
  data: WarehouseListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface WarehouseStats {
  total: number;
  active: number;
  inactive: number;
  north: number;
  central: number;
  south: number;
}

const NORTH_PROVINCES = new Set([
  'hà nội', 'hải phòng', 'hải dương', 'hưng yên', 'bắc ninh', 'quảng ninh',
  'thái nguyên', 'bắc giang', 'bắc kạn', 'lạng sơn', 'cao bằng', 'hà giang',
  'tuyên quang', 'phú thọ', 'vĩnh phúc', 'sơn la', 'điện biên', 'lai châu',
  'lào cai', 'yên bái', 'thanh hóa', 'nghệ an', 'hà tĩnh', 'quảng bình',
  'quảng trị', 'thừa thiên huế', 'đắk lắk', 'đắk nông', 'gia lai', 'kon tum',
]);

const CENTRAL_PROVINCES = new Set([
  'đà nẵng', 'quảng nam', 'quảng ngãi', 'bình định', 'phú yên', 'khánh hòa',
  'ninh thuận', 'bình thuận', 'lam đồng', 'bình phước', 'tây ninh', 'bình dương',
  'đồng nai', 'bà rịa - vũng tàu',
]);

function classifyRegion(provinceName: string | null): 'north' | 'central' | 'south' | null {
  if (!provinceName) return null;
  const key = provinceName.toLowerCase();
  if (NORTH_PROVINCES.has(key)) return 'north';
  if (CENTRAL_PROVINCES.has(key)) return 'central';
  return 'south';
}

export interface ShipmentStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

const listSelect = {
  id: true,
  code: true,
  name: true,
  contactName: true,
  contactPhone: true,
  provinceName: true,
  districtName: true,
  wardName: true,
  addressLine: true,
  fullAddress: true,
  latitude: true,
  longitude: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
};

function toPlain<T extends object>(row: T): T {
  return JSON.parse(JSON.stringify(row, (_, v) => {
    if (typeof v === 'bigint') return Number(v);
    // Convert Prisma Decimal to number (Decimal has specific constructor)
    if (v !== null && typeof v === 'object' && v.constructor?.name === 'Decimal') {
      return Number(v.toString());
    }
    return v;
  })) as T;
}

export const warehouseRepository = {
  // ── List with pagination + search ──
  async findAll(opts?: {
    search?: string;
    isActive?: boolean;
    region?: 'north' | 'central' | 'south';
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedWarehouses> {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };

    if (opts?.search) {
      where.OR = [
        { code: { contains: opts.search, mode: 'insensitive' } },
        { name: { contains: opts.search, mode: 'insensitive' } },
        { addressLine: { contains: opts.search, mode: 'insensitive' } },
        { fullAddress: { contains: opts.search, mode: 'insensitive' } },
        { provinceName: { contains: opts.search, mode: 'insensitive' } },
        { contactPhone: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) {
      where.isActive = opts.isActive;
    }
    if (opts?.region) {
      const allActive = await prisma.warehouse.findMany({
        where: { ...where, isActive: true },
        select: { id: true, provinceName: true },
      });
      const filtered = allActive.filter(w => classifyRegion(w.provinceName) === opts.region);
      where.id = { in: filtered.map(w => w.id) };
    }

    const [result, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        select: {
          ...listSelect,
          _count: { select: { shipments: true } },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.warehouse.count({ where }),
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
  async findById(id: string): Promise<WarehouseDetail | null> {
    const result = await prisma.warehouse.findUnique({
      where: { id, isDeleted: false },
      select: {
        ...listSelect,
        countryCode: true,
        provinceCode: true,
        districtCode: true,
        wardCode: true,
        shipments: {
          select: {
            id: true,
            orderId: true,
            shippingMethod: true,
            trackingCode: true,
            fromFullAddress: true,
            toFullAddress: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    return result ? toPlain(result) : null;
  },

  // ── Find by code (for duplicate check) ──
  async findByCode(code: string) {
    return prisma.warehouse.findUnique({
      where: { code, isDeleted: false },
      select: { id: true, code: true },
    });
  },

  // ── Create ──
  async create(data: WarehouseInput, createdBy?: string) {
    const result = await prisma.warehouse.create({
      data: {
        code: data.code || null,
        name: data.name,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
        countryCode: data.countryCode || 'VN',
        provinceCode: data.provinceCode || null,
        provinceName: data.provinceName || null,
        districtCode: data.districtCode || null,
        districtName: data.districtName || null,
        wardCode: data.wardCode || null,
        wardName: data.wardName || null,
        addressLine: data.addressLine,
        fullAddress: data.fullAddress || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        isActive: data.isActive ?? true,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: listSelect,
    });
    return toPlain(result);
  },

  // ── Update ──
  async update(id: string, data: Partial<WarehouseUpdateInput>, updatedBy?: string) {
    const updateData: Record<string, unknown> = {};
    if (data.code !== undefined) updateData.code = data.code || null;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone || null;
    if (data.countryCode !== undefined) updateData.countryCode = data.countryCode || 'VN';
    if (data.provinceCode !== undefined) updateData.provinceCode = data.provinceCode || null;
    if (data.provinceName !== undefined) updateData.provinceName = data.provinceName || null;
    if (data.districtCode !== undefined) updateData.districtCode = data.districtCode || null;
    if (data.districtName !== undefined) updateData.districtName = data.districtName || null;
    if (data.wardCode !== undefined) updateData.wardCode = data.wardCode || null;
    if (data.wardName !== undefined) updateData.wardName = data.wardName || null;
    if (data.addressLine !== undefined) updateData.addressLine = data.addressLine;
    if (data.fullAddress !== undefined) updateData.fullAddress = data.fullAddress || null;
    if (data.latitude !== undefined) updateData.latitude = data.latitude ? parseFloat(data.latitude) : null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude ? parseFloat(data.longitude) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    updateData.updatedBy = updatedBy ?? null;

    const result = await prisma.warehouse.update({
      where: { id, isDeleted: false },
      data: updateData,
      select: listSelect,
    });
    return toPlain(result);
  },

  // ── Toggle active ──
  async toggleActive(id: string, updatedBy?: string) {
    const current = await prisma.warehouse.findUnique({
      where: { id, isDeleted: false },
      select: { isActive: true },
    });
    if (!current) return null;

    const result = await prisma.warehouse.update({
      where: { id },
      data: { isActive: !current.isActive, updatedBy: updatedBy ?? null },
      select: listSelect,
    });
    return toPlain(result);
  },

  // ── Status counts ──
  async getStatusCounts(): Promise<WarehouseStats> {
    const [total, active, inactive, allActive] = await Promise.all([
      prisma.warehouse.count({ where: { isDeleted: false } }),
      prisma.warehouse.count({ where: { isDeleted: false, isActive: true } }),
      prisma.warehouse.count({ where: { isDeleted: false, isActive: false } }),
      prisma.warehouse.findMany({
        where: { isDeleted: false, isActive: true },
        select: { provinceName: true },
      }),
    ]);

    let north = 0, central = 0, south = 0;
    for (const w of allActive) {
      const region = classifyRegion(w.provinceName);
      if (region === 'north') north++;
      else if (region === 'central') central++;
      else south++;
    }

    return { total, active, inactive, north, central, south };
  },

  // ── Shipment stats for a warehouse ──
  async getShipmentStats(warehouseId: string): Promise<ShipmentStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, thisWeek, thisMonth] = await Promise.all([
      prisma.orderShipment.count({ where: { warehouseId } }),
      prisma.orderShipment.count({
        where: { warehouseId, createdAt: { gte: startOfToday } },
      }),
      prisma.orderShipment.count({
        where: { warehouseId, createdAt: { gte: startOfWeek } },
      }),
      prisma.orderShipment.count({
        where: { warehouseId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return { total, today, thisWeek, thisMonth };
  },

  // ── Get all active (for dropdowns) ──
  async findAllActive() {
    return prisma.warehouse.findMany({
      where: { isActive: true, isDeleted: false },
      select: {
        id: true,
        code: true,
        name: true,
        fullAddress: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  // ── Get all for export (no pagination) ──
  async findAllForExport(opts?: {
    search?: string;
    isActive?: boolean;
    region?: 'north' | 'central' | 'south';
  }): Promise<WarehouseListItem[]> {
    const where: Record<string, unknown> = { isDeleted: false };
    if (opts?.search) {
      where.OR = [
        { code: { contains: opts.search, mode: 'insensitive' } },
        { name: { contains: opts.search, mode: 'insensitive' } },
        { addressLine: { contains: opts.search, mode: 'insensitive' } },
        { fullAddress: { contains: opts.search, mode: 'insensitive' } },
        { provinceName: { contains: opts.search, mode: 'insensitive' } },
        { contactPhone: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) {
      where.isActive = opts.isActive;
    }
    if (opts?.region) {
      const allActive = await prisma.warehouse.findMany({
        where: { isDeleted: false, isActive: true },
        select: { id: true, provinceName: true },
      });
      const filtered = allActive.filter(w => classifyRegion(w.provinceName) === opts.region);
      where.id = { in: filtered.map(w => w.id) };
    }
    const result = await prisma.warehouse.findMany({
      where,
      select: {
        ...listSelect,
        _count: { select: { shipments: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return toPlain(result);
  },

  // ── Paginated shipments ──
  async findShipmentsByWarehouse(warehouseId: string, opts?: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { warehouseId };
    if (opts?.dateFrom) {
      where.createdAt = { gte: new Date(opts.dateFrom) };
    }
    if (opts?.dateTo) {
      const to = new Date(opts.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), lte: to };
    }

    const [result, total] = await Promise.all([
      prisma.orderShipment.findMany({
        where,
        select: {
          id: true,
          orderId: true,
          shippingMethod: true,
          trackingCode: true,
          fromFullAddress: true,
          toFullAddress: true,
          toProvinceName: true,
          toDistrictName: true,
          shippingCost: true,
          finalShippingCost: true,
          shippedAt: true,
          deliveredAt: true,
          createdAt: true,
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

  // ── Detailed warehouse stats ──
  async getWarehouseDetailedStats(warehouseId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [total, monthShipments, yearShipments, monthCostAgg, yearCostAgg, avgCostAgg] =
      await Promise.all([
        prisma.orderShipment.count({ where: { warehouseId } }),
        prisma.orderShipment.count({
          where: { warehouseId, createdAt: { gte: startOfMonth } },
        }),
        prisma.orderShipment.count({
          where: { warehouseId, createdAt: { gte: startOfYear } },
        }),
        prisma.orderShipment.aggregate({
          where: { warehouseId, createdAt: { gte: startOfMonth } },
          _sum: { finalShippingCost: true },
        }),
        prisma.orderShipment.aggregate({
          where: { warehouseId, createdAt: { gte: startOfYear } },
          _sum: { finalShippingCost: true },
        }),
        prisma.orderShipment.aggregate({
          where: { warehouseId },
          _avg: { finalShippingCost: true },
        }),
      ]);

    // Monthly data for chart (last 12 months)
    const monthlyData: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const count = await prisma.orderShipment.count({
        where: { warehouseId, createdAt: { gte: mStart, lte: mEnd } },
      });
      monthlyData.push({
        month: `${String(mStart.getMonth() + 1).padStart(2, '0')}/${mStart.getFullYear()}`,
        count,
      });
    }

    // Avg per day this month
    const daysPassed = now.getDate();
    const avgPerDay = daysPassed > 0 ? monthShipments / daysPassed : 0;

    return {
      total,
      monthShipments,
      yearShipments,
      avgPerDay: Math.round(avgPerDay * 10) / 10,
      monthCost: Number(monthCostAgg._sum.finalShippingCost ?? 0),
      yearCost: Number(yearCostAgg._sum.finalShippingCost ?? 0),
      avgCostPerShipment: Number(avgCostAgg._avg.finalShippingCost ?? 0),
      monthlyData,
    };
  },

  // ── Top delivery areas ──
  async getTopDeliveryAreas(warehouseId: string, limit = 10) {
    const result = await prisma.orderShipment.groupBy({
      by: ['toProvinceName'],
      where: { warehouseId, toProvinceName: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const total = result.reduce((sum, r) => sum + r._count.id, 0);
    return result.map((r, idx) => ({
      rank: idx + 1,
      province: r.toProvinceName || '—',
      count: r._count.id,
      percent: total > 0 ? Math.round((r._count.id / total) * 1000) / 10 : 0,
    }));
  },
};