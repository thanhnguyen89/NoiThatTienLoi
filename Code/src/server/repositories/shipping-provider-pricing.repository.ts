import { prisma } from '@/lib/prisma';
import type { ShippingProviderPricingInput } from '@/server/validators/shipping-provider-pricing.validator';

// ============================================================
// SHIPPING PROVIDER PRICING REPOSITORY
// ============================================================

export interface ShippingProviderPricingRow {
  id: string;
  shippingProviderId: string;
  vehicle: string;
  serviceType: string;
  minWeight: number | null;
  maxWeight: number | null;
  minDistance: number | null;
  maxDistance: number | null;
  baseCost: number | null;
  costPerKm: number | null;
  costPerKg: number | null;
  minCost: number | null;
  isActive: boolean;
  sortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedBy: string | null;
  deletedAt: Date | null;
}

function toPlain<T extends object>(row: T): T {
  return JSON.parse(JSON.stringify(row, (_, v) => typeof v === 'bigint' ? Number(v) : v));
}

export const shippingProviderPricingRepository = {
  // ── List by provider ──
  async findByProvider(providerId: string, vehicle?: string) {
    const where: Record<string, unknown> = { shippingProviderId: providerId, isDeleted: false };
    if (vehicle) {
      where.vehicle = vehicle;
    }
    const result = await prisma.shippingProviderPricing.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return toPlain(result);
  },

  // ── Create ──
  async create(data: ShippingProviderPricingInput, createdBy?: string) {
    const result = await prisma.shippingProviderPricing.create({
      data: {
        shippingProviderId: data.shippingProviderId,
        vehicle: data.vehicle || 'motorbike',
        serviceType: data.serviceType || 'standard',
        minWeight: data.minWeight ?? null,
        maxWeight: data.maxWeight ?? null,
        minDistance: data.minDistance ?? null,
        maxDistance: data.maxDistance ?? null,
        baseCost: data.baseCost ?? 0,
        costPerKm: data.costPerKm ?? 0,
        costPerKg: data.costPerKg ?? 0,
        minCost: data.minCost ?? 0,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: createdBy ?? null,
        isDeleted: false,
      },
    });
    return toPlain(result);
  },

  // ── Update ──
  async update(id: string, data: Partial<ShippingProviderPricingInput>, updatedBy?: string) {
    const updateData: Record<string, unknown> = {};
    if (data.minWeight !== undefined) updateData.minWeight = data.minWeight;
    if (data.maxWeight !== undefined) updateData.maxWeight = data.maxWeight;
    if (data.minDistance !== undefined) updateData.minDistance = data.minDistance;
    if (data.maxDistance !== undefined) updateData.maxDistance = data.maxDistance;
    if (data.baseCost !== undefined) updateData.baseCost = data.baseCost;
    if (data.costPerKm !== undefined) updateData.costPerKm = data.costPerKm;
    if (data.costPerKg !== undefined) updateData.costPerKg = data.costPerKg;
    if (data.minCost !== undefined) updateData.minCost = data.minCost;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    updateData.updatedBy = updatedBy ?? null;

    const result = await prisma.shippingProviderPricing.update({
      where: { id, isDeleted: false },
      data: updateData,
    });
    return toPlain(result);
  },

  // ── Delete (soft) ──
  async delete(id: string, deletedBy?: string) {
    const result = await prisma.shippingProviderPricing.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy ?? null,
        deletedAt: new Date(),
      },
    });
    return toPlain(result);
  },

  // ── Hard delete ──
  async hardDelete(id: string) {
    await prisma.shippingProviderPricing.delete({ where: { id } });
  },

  // ── Bulk create (replace all for a provider + vehicle) ──
  async replaceAll(providerId: string, vehicle: string, rows: ShippingProviderPricingInput[], createdBy?: string) {
    await prisma.$transaction([
      // Deactivate existing rows for this provider + vehicle only
      prisma.shippingProviderPricing.updateMany({
        where: { shippingProviderId: providerId, vehicle, isDeleted: false },
        data: { isActive: false },
      }),
      // Create new ones for this vehicle
      ...rows.map((r, idx) =>
        prisma.shippingProviderPricing.create({
          data: {
            shippingProviderId: providerId,
            vehicle: r.vehicle || vehicle,
            serviceType: r.serviceType || 'standard',
            minWeight: r.minWeight ?? null,
            maxWeight: r.maxWeight ?? null,
            minDistance: r.minDistance ?? null,
            maxDistance: r.maxDistance ?? null,
            baseCost: r.baseCost ?? 0,
            costPerKm: r.costPerKm ?? 0,
            costPerKg: r.costPerKg ?? 0,
            minCost: r.minCost ?? 0,
            isActive: true,
            sortOrder: r.sortOrder ?? idx,
            createdBy: createdBy ?? null,
            isDeleted: false,
          },
        })
      ),
    ]);
  },
};