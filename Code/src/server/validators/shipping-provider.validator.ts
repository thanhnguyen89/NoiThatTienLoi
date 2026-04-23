import { z } from 'zod';

// ============================================================
// SHIPPING PROVIDER SCHEMAS
// ============================================================

const urlRegex = /^https?:\/\/.+/i;

export const shippingProviderSchema = z.object({
  code: z.string().max(100).nullable().optional(),
  name: z.string().min(1, 'Tên đơn vị là bắt buộc').max(255),
  phone: z.string().max(50).nullable().optional(),
  website: z.string().max(255).nullable().optional().refine(
    (val) => !val || urlRegex.test(val),
    { message: 'Website phải bắt đầu bằng http:// hoặc https://' }
  ),
  note: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  serviceTypes: z.array(z.string()).optional().default([]),
  vehicles: z.array(z.string()).optional().default([]),
});

export type ShippingProviderInput = z.infer<typeof shippingProviderSchema>;

export const shippingProviderUpdateSchema = shippingProviderSchema.partial().extend({
  code: z.string().max(100).nullable().optional(),
});

export type ShippingProviderUpdateInput = z.infer<typeof shippingProviderUpdateSchema>;

// ──────────────────────────────────────────────
// Validate helpers
// ──────────────────────────────────────────────

export function validateShippingProvider(data: unknown) {
  return shippingProviderSchema.safeParse(data);
}

export function validateShippingProviderUpdate(data: unknown) {
  return shippingProviderUpdateSchema.safeParse(data);
}