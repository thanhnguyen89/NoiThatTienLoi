import { prisma } from '@/lib/prisma';
import type { OrderInput, OrderUpdateInput } from '@/server/validators/order.validator';

export interface OrderListItem {
  id: string;
  orderNo: string;
  customerType: string;
  memberId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  orderStatus: string;
  paymentStatus: string;
  grandTotalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  placedAt: Date | null;
  createdAt: Date;
}

export interface PaginatedOrders {
  data: OrderListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const orderListSelect = {
  id: true,
  orderNo: true,
  customerType: true,
  memberId: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  orderStatus: true,
  paymentStatus: true,
  grandTotalAmount: true,
  depositAmount: true,
  remainingAmount: true,
  placedAt: true,
  createdAt: true,
} as const;

function toPlain<T extends object>(row: T): T {
  return JSON.parse(JSON.stringify(row, (_, v) => typeof v === 'bigint' ? Number(v) : v));
}

export const orderRepository = {
  async findAll(opts?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    customerType?: string;
    dateFrom?: string;
    dateTo?: string;
    priceMin?: number;
    priceMax?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedOrders> {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };

    if (opts?.search) {
      where.OR = [
        { orderNo: { contains: opts.search, mode: 'insensitive' } },
        { customerName: { contains: opts.search, mode: 'insensitive' } },
        { customerPhone: { contains: opts.search, mode: 'insensitive' } },
        { customerEmail: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.status) where.orderStatus = opts.status;
    if (opts?.paymentStatus) where.paymentStatus = opts.paymentStatus;
    if (opts?.customerType) where.customerType = opts.customerType;
    if (opts?.dateFrom) {
      where.placedAt = {
        ...((where.placedAt as Record<string, unknown>) || {}),
        gte: new Date(opts.dateFrom),
      };
    }
    if (opts?.dateTo) {
      const to = new Date(opts.dateTo);
      to.setHours(23, 59, 59, 999);
      where.placedAt = {
        ...((where.placedAt as Record<string, unknown>) || {}),
        lte: to,
      };
    }
    if (opts?.priceMin !== undefined) {
      where.grandTotalAmount = {
        ...((where.grandTotalAmount as Record<string, unknown>) || {}),
        gte: opts.priceMin,
      };
    }
    if (opts?.priceMax !== undefined) {
      where.grandTotalAmount = {
        ...((where.grandTotalAmount as Record<string, unknown>) || {}),
        lte: opts.priceMax,
      };
    }

    const [result, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: orderListSelect,
        orderBy: [{ placedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
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

  async getStatusCounts() {
    const [pending, confirmed, processing, shipping, delivered, completed, cancelled, returned] =
      await Promise.all([
        prisma.order.count({ where: { isDeleted: false, orderStatus: 'pending' } }),
        prisma.order.count({ where: { isDeleted: false, orderStatus: 'confirmed' } }),
        prisma.order.count({ where: { isDeleted: false, orderStatus: 'processing' } }),
        prisma.order.count({ where: { isDeleted: false, orderStatus: 'shipping' } }),
        prisma.order.count({ where: { isDeleted: false, orderStatus: 'delivered' } }),
        prisma.order.count({ where: { isDeleted: false, orderStatus: 'completed' } }),
        prisma.order.count({ where: { isDeleted: false, orderStatus: 'cancelled' } }),
        prisma.order.count({ where: { isDeleted: false, orderStatus: 'returned' } }),
      ]);
    return { pending, confirmed, processing, shipping, delivered, completed, cancelled, returned };
  },

  async findById(id: string) {
    const result = await prisma.order.findFirst({
      where: { id, isDeleted: false },
      include: {
        items: true,
        shipments: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            shippingProvider: { select: { id: true, name: true, code: true } },
          },
        },
        statusHistories: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return result ? toPlain(result) : null;
  },

  async create(data: OrderInput & { createdBy?: string;
    subtotalAmount?: number;
    discountAmount?: number;
    shippingAmount?: number;
    otherFeeAmount?: number;
    taxAmount?: number;
    grandTotalAmount?: number;
    depositAmount?: number;
    remainingAmount?: number;
  }) {
    const depositAmt = data.depositAmount ?? 0;
    const grandTotal = data.grandTotalAmount ?? 0;
    const remaining = grandTotal - depositAmt;

    const result = await prisma.order.create({
      data: {
        orderNo: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        customerType: data.customerType,
        memberId: data.memberId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,

        billingContactName: data.billingContactName || null,
        billingContactPhone: data.billingContactPhone || null,
        billingContactEmail: data.billingContactEmail || null,
        billingCountryCode: data.billingCountryCode || null,
        billingProvinceCode: data.billingProvinceCode || null,
        billingProvinceName: data.billingProvinceName || null,
        billingDistrictCode: data.billingDistrictCode || null,
        billingDistrictName: data.billingDistrictName || null,
        billingWardCode: data.billingWardCode || null,
        billingWardName: data.billingWardName || null,
        billingAddressLine: data.billingAddressLine || null,
        billingFullAddress: data.billingFullAddress || null,

        shippingContactName: data.shippingContactName ?? '',
        shippingContactPhone: data.shippingContactPhone ?? '',
        shippingContactEmail: data.shippingContactEmail || null,
        shippingCountryCode: data.shippingCountryCode || null,
        shippingProvinceCode: data.shippingProvinceCode || null,
        shippingProvinceName: data.shippingProvinceName || null,
        shippingDistrictCode: data.shippingDistrictCode || null,
        shippingDistrictName: data.shippingDistrictName || null,
        shippingWardCode: data.shippingWardCode || null,
        shippingWardName: data.shippingWardName || null,
        shippingAddressLine: data.shippingAddressLine ?? '',
        shippingFullAddress: data.shippingFullAddress || null,
        shippingLatitude: data.shippingLatitude || null,
        shippingLongitude: data.shippingLongitude || null,

        subtotalAmount: data.subtotalAmount ?? 0,
        discountAmount: data.discountAmount ?? 0,
        shippingAmount: data.shippingAmount ?? 0,
        otherFeeAmount: data.otherFeeAmount ?? 0,
        taxAmount: data.taxAmount ?? 0,
        grandTotalAmount: data.grandTotalAmount ?? 0,
        depositAmount: depositAmt,
        remainingAmount: remaining,

        orderStatus: data.orderStatus || 'pending',
        paymentStatus: data.paymentStatus || 'unpaid',

        customerNote: data.customerNote || null,
        internalNote: data.internalNote || null,

        placedAt: data.placedAt ? new Date(data.placedAt) : new Date(),
        createdBy: (data as unknown as { createdBy?: string }).createdBy ?? null,
        isDeleted: false,
      },
    });

    // Create initial status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: result.id,
        toStatus: result.orderStatus,
        changedByType: 'system',
        note: 'Đơn hàng được tạo',
      },
    });

    return toPlain(result);
  },

  async update(id: string, data: Partial<OrderUpdateInput>, updatedBy?: string) {
    const updateData: Record<string, unknown> = {};

    if (data.orderStatus !== undefined) updateData.orderStatus = data.orderStatus;
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.internalNote !== undefined) updateData.internalNote = data.internalNote;

    if (data.depositAmount !== undefined) {
      updateData.depositAmount = data.depositAmount;
      const current = await prisma.order.findFirst({ where: { id }, select: { grandTotalAmount: true } });
      if (current) {
        updateData.remainingAmount = Number(current.grandTotalAmount) - data.depositAmount;
      }
    }

    // Handle billing/shipping address fields
    const addressFields = [
      'billingContactName', 'billingContactPhone', 'billingContactEmail',
      'billingCountryCode', 'billingProvinceCode', 'billingProvinceName',
      'billingDistrictCode', 'billingDistrictName', 'billingWardCode',
      'billingWardName', 'billingAddressLine', 'billingFullAddress',
      'shippingContactName', 'shippingContactPhone', 'shippingContactEmail',
      'shippingCountryCode', 'shippingProvinceCode', 'shippingProvinceName',
      'shippingDistrictCode', 'shippingDistrictName', 'shippingWardCode',
      'shippingWardName', 'shippingAddressLine', 'shippingFullAddress',
      'shippingLatitude', 'shippingLongitude',
    ];
    for (const field of addressFields) {
      if (field in data) {
        updateData[field] = (data as Record<string, unknown>)[field];
      }
    }

    const result = await prisma.order.update({
      where: { id, isDeleted: false },
      data: { ...updateData, updatedBy: updatedBy ?? null },
      include: {
        items: true,
        shipments: true,
        statusHistories: { orderBy: { createdAt: 'asc' } },
      },
    });
    return toPlain(result);
  },

  async updateStatus(id: string, toStatus: string, changedByType: string, changedById?: string, note?: string) {
    const order = await prisma.order.findFirst({ where: { id, isDeleted: false } });
    if (!order) return null;

    const result = await prisma.order.update({
      where: { id },
      data: { orderStatus: toStatus as Parameters<typeof prisma.order.update>[0]['data']['orderStatus'] },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.orderStatus as Parameters<typeof prisma.orderStatusHistory.create>[0]['data']['fromStatus'],
        toStatus: toStatus as Parameters<typeof prisma.orderStatusHistory.create>[0]['data']['toStatus'],
        changedByType: changedByType as Parameters<typeof prisma.orderStatusHistory.create>[0]['data']['changedByType'],
        changedById: changedById || null,
        note: note || null,
      },
    });

    return toPlain(result);
  },

  async softDelete(id: string, deletedBy?: string) {
    const result = await prisma.order.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
    return toPlain(result);
  },
};
