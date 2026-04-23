import { z } from 'zod';

// ============================================================
// SHIPPING PROVIDER PRICING SCHEMA
// ============================================================

export const shippingProviderPricingSchema = z.object({
  shippingProviderId: z.string().min(1),
  vehicle: z.string().default('motorbike'),
  serviceType: z.string().default('standard'),
  minWeight: z.number().min(0).optional().nullable(),
  maxWeight: z.number().min(0).optional().nullable(),
  minDistance: z.number().min(0).optional().nullable(),
  maxDistance: z.number().min(0).optional().nullable(),
  baseCost: z.number().min(0).default(0),
  costPerKm: z.number().min(0).default(0),
  costPerKg: z.number().min(0).default(0),
  minCost: z.number().min(0).default(0),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  // Phụ phí theo dòng (không bắt buộc)
  surchargeAmount: z.number().min(0).optional().nullable(),
  surchargeLabel: z.string().optional().nullable(),
});

export type ShippingProviderPricingInput = z.infer<typeof shippingProviderPricingSchema>;

export function validateShippingProviderPricing(data: unknown) {
  return shippingProviderPricingSchema.safeParse(data);
}
