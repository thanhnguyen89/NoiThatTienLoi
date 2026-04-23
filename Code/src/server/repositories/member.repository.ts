import { prisma } from '@/lib/prisma';
import type { MemberInput, MemberUpdateInput, MemberAddressInput } from '@/server/validators/member.validator';

export interface MemberListItem {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | string | null;
  phoneVerifiedAt: Date | string | null;
  gender: string | null;
  dateOfBirth: Date | string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  _count?: {
    orders: number;
    addresses: number;
  };
}

export interface MemberDetail extends MemberListItem {
  addresses: Array<{
    id: string;
    contactName: string;
    contactPhone: string;
    provinceName: string | null;
    districtName: string | null;
    wardName: string | null;
    addressLine: string | null;
    fullAddress: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    note: string | null;
    isDefault: boolean;
    createdAt: Date;
  }>;
  ordersSummary?: {
    totalOrders: number;
    totalSpent: number;
    completedOrders: number;
    cancelledOrders: number;
    avgOrderValue: number;
    firstOrderAt: Date | string | null;
    lastOrderAt: Date | string | null;
  };
}

export interface PaginatedMembers {
  data: MemberListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const listSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  gender: true,
  dateOfBirth: true,
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

export const memberRepository = {
  async findAll(opts?: {
    search?: string;
    isActive?: boolean;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    gender?: string;
    dateFrom?: string;
    dateTo?: string;
    hasOrder?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedMembers> {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const where: Record<string, unknown> = { isDeleted: false };

    if (opts?.search) {
      where.OR = [
        { fullName: { contains: opts.search, mode: 'insensitive' } },
        { email: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search, mode: 'insensitive' } },
        { id: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;
    if (opts?.emailVerified !== undefined) {
      where.emailVerifiedAt = opts.emailVerified ? { not: null } : null;
    }
    if (opts?.phoneVerified !== undefined) {
      where.phoneVerifiedAt = opts.phoneVerified ? { not: null } : null;
    }
    if (opts?.gender) where.gender = opts.gender;
    if (opts?.dateFrom) {
      where.createdAt = {
        ...((where.createdAt as Record<string, unknown>) || {}),
        gte: new Date(opts.dateFrom),
      };
    }
    if (opts?.dateTo) {
      const to = new Date(opts.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt = {
        ...((where.createdAt as Record<string, unknown>) || {}),
        lte: to,
      };
    }
    if (opts?.hasOrder !== undefined) {
      if (opts.hasOrder) {
        where.orders = { some: {} };
      } else {
        where.orders = { none: {} };
      }
    }

    const [result, total] = await Promise.all([
      prisma.member.findMany({
        where,
        select: {
          ...listSelect,
          _count: { select: { orders: true, addresses: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.member.count({ where }),
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

  async findById(id: string): Promise<MemberDetail | null> {
    const result = await prisma.member.findUnique({
      where: { id, isDeleted: false },
      select: {
        ...listSelect,
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            contactName: true,
            contactPhone: true,
            provinceName: true,
            districtName: true,
            wardName: true,
            addressLine: true,
            fullAddress: true,
            latitude: true,
            longitude: true,
            note: true,
            isDefault: true,
            createdAt: true,
          },
        },
      },
    });
    return result ? toPlain(result) : null;
  },

  async findByEmail(email: string) {
    return prisma.member.findUnique({
      where: { email, isDeleted: false },
      select: { id: true, email: true },
    });
  },

  async findByPhone(phone: string) {
    return prisma.member.findUnique({
      where: { phone, isDeleted: false },
      select: { id: true, phone: true },
    });
  },

  async create(data: MemberInput & { passwordHash?: string }, createdBy?: string) {
    const result = await prisma.member.create({
      data: {
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        passwordHash: data.passwordHash || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        isActive: data.isActive ?? true,
        emailVerifiedAt: data.emailVerifiedAt ? new Date(data.emailVerifiedAt) : null,
        phoneVerifiedAt: data.phoneVerifiedAt ? new Date(data.phoneVerifiedAt) : null,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
      select: listSelect,
    });
    return toPlain(result);
  },

  async update(id: string, data: Partial<MemberUpdateInput & { passwordHash?: string }>, updatedBy?: string) {
    const updateData: Record<string, unknown> = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.emailVerifiedAt !== undefined) {
      updateData.emailVerifiedAt = data.emailVerifiedAt ? new Date(data.emailVerifiedAt) : null;
    }
    if (data.phoneVerifiedAt !== undefined) {
      updateData.phoneVerifiedAt = data.phoneVerifiedAt ? new Date(data.phoneVerifiedAt) : null;
    }

    const result = await prisma.member.update({
      where: { id, isDeleted: false },
      data: { ...updateData, updatedBy: updatedBy ?? null },
      select: listSelect,
    });
    return toPlain(result);
  },

  async toggleActive(id: string) {
    const member = await prisma.member.findUnique({ where: { id, isDeleted: false }, select: { isActive: true } });
    if (!member) return null;
    const result = await prisma.member.update({
      where: { id },
      data: { isActive: !member.isActive },
      select: listSelect,
    });
    return toPlain(result);
  },

  async softDelete(id: string, deletedBy?: string) {
    const result = await prisma.member.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
      select: listSelect,
    });
    return toPlain(result);
  },

  async getStatusCounts() {
    const [total, active, inactive, emailVerified, phoneVerified] = await Promise.all([
      prisma.member.count({ where: { isDeleted: false } }),
      prisma.member.count({ where: { isDeleted: false, isActive: true } }),
      prisma.member.count({ where: { isDeleted: false, isActive: false } }),
      prisma.member.count({ where: { isDeleted: false, emailVerifiedAt: { not: null } } }),
      prisma.member.count({ where: { isDeleted: false, phoneVerifiedAt: { not: null } } }),
    ]);
    return { total, active, inactive, emailVerified, phoneVerified };
  },

  async getMemberOrders(id: string) {
    return prisma.order.findMany({
      where: { memberId: id, isDeleted: false },
      select: {
        id: true,
        orderNo: true,
        placedAt: true,
        grandTotalAmount: true,
        depositAmount: true,
        remainingAmount: true,
        orderStatus: true,
        paymentStatus: true,
        createdAt: true,
      },
      orderBy: { placedAt: 'desc' },
    });
  },

  async getMemberStats(id: string) {
    const [orders, totalSpentResult, completedResult, cancelledResult, firstOrder, lastOrder, allOrders] = await Promise.all([
      prisma.order.count({ where: { memberId: id, isDeleted: false } }),
      prisma.order.aggregate({
        where: { memberId: id, isDeleted: false },
        _sum: { grandTotalAmount: true },
      }),
      prisma.order.count({ where: { memberId: id, isDeleted: false, orderStatus: 'completed' } }),
      prisma.order.count({ where: { memberId: id, isDeleted: false, orderStatus: 'cancelled' } }),
      prisma.order.findFirst({
        where: { memberId: id, isDeleted: false },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, placedAt: true },
      }),
      prisma.order.findFirst({
        where: { memberId: id, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, placedAt: true },
      }),
      prisma.order.findMany({
        where: { memberId: id, isDeleted: false },
        select: {
          createdAt: true,
          placedAt: true,
          grandTotalAmount: true,
        },
      }),
    ]);

    const totalSpent = Number(totalSpentResult._sum.grandTotalAmount) || 0;

    // Tính toán dữ liệu theo tháng (12 tháng gần nhất)
    const monthlyData: { month: string; amount: number; orders: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

      const monthOrders = allOrders.filter((order) => {
        const orderDate = new Date(order.placedAt || order.createdAt);
        return (
          orderDate.getFullYear() === date.getFullYear() &&
          orderDate.getMonth() === date.getMonth()
        );
      });

      const monthAmount = monthOrders.reduce((sum, order) => sum + Number(order.grandTotalAmount), 0);

      monthlyData.push({
        month: monthLabel,
        amount: monthAmount,
        orders: monthOrders.length,
      });
    }

    return {
      totalOrders: orders,
      totalSpent,
      completedOrders: completedResult,
      cancelledOrders: cancelledResult,
      avgOrderValue: orders > 0 ? totalSpent / orders : 0,
      cancelRate: orders > 0 ? (cancelledResult / orders) * 100 : 0,
      firstOrderDate: firstOrder?.placedAt || firstOrder?.createdAt || null,
      lastOrderDate: lastOrder?.placedAt || lastOrder?.createdAt || null,
      monthlyData,
    };
  },

  // ── MemberAddress ──

  async createAddress(memberId: string, data: MemberAddressInput) {
    const address = await prisma.memberAddress.create({
      data: {
        memberId,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        countryCode: data.countryCode || null,
        provinceCode: data.provinceCode || null,
        provinceName: data.provinceName || null,
        districtCode: data.districtCode || null,
        districtName: data.districtName || null,
        wardCode: data.wardCode || null,
        wardName: data.wardName || null,
        addressLine: data.addressLine,
        fullAddress: data.fullAddress || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        note: data.note || null,
        isDefault: data.isDefault ?? false,
      },
      select: {
        id: true,
        contactName: true,
        contactPhone: true,
        provinceName: true,
        districtName: true,
        wardName: true,
        addressLine: true,
        fullAddress: true,
        note: true,
        isDefault: true,
        createdAt: true,
      },
    });

    // If this is set as default, unset others
    if (data.isDefault) {
      await prisma.memberAddress.updateMany({
        where: { memberId, id: { not: address.id } },
        data: { isDefault: false },
      });
    }

    return toPlain(address);
  },

  async updateAddress(addressId: string, memberId: string, data: Partial<MemberAddressInput>) {
    const updateData: Record<string, unknown> = {};
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.countryCode !== undefined) updateData.countryCode = data.countryCode;
    if (data.provinceCode !== undefined) updateData.provinceCode = data.provinceCode;
    if (data.provinceName !== undefined) updateData.provinceName = data.provinceName;
    if (data.districtCode !== undefined) updateData.districtCode = data.districtCode;
    if (data.districtName !== undefined) updateData.districtName = data.districtName;
    if (data.wardCode !== undefined) updateData.wardCode = data.wardCode;
    if (data.wardName !== undefined) updateData.wardName = data.wardName;
    if (data.addressLine !== undefined) updateData.addressLine = data.addressLine;
    if (data.fullAddress !== undefined) updateData.fullAddress = data.fullAddress;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.note !== undefined) updateData.note = data.note;

    const result = await prisma.memberAddress.update({
      where: { id: addressId },
      data: updateData,
      select: {
        id: true,
        contactName: true,
        contactPhone: true,
        provinceName: true,
        districtName: true,
        wardName: true,
        addressLine: true,
        fullAddress: true,
        note: true,
        isDefault: true,
        createdAt: true,
      },
    });

    // If set as default, unset others
    if (data.isDefault) {
      await prisma.memberAddress.updateMany({
        where: { memberId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return toPlain(result);
  },

  async deleteAddress(addressId: string) {
    await prisma.memberAddress.delete({ where: { id: addressId } });
  },

  async setDefaultAddress(addressId: string, memberId: string) {
    await prisma.$transaction([
      prisma.memberAddress.updateMany({
        where: { memberId },
        data: { isDefault: false },
      }),
      prisma.memberAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);
  },
};
