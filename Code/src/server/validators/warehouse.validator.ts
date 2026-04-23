import { z } from 'zod';

// ============================================================
// WAREHOUSE SCHEMAS
// ============================================================

const latRegex = /^-?\d{1,2}\.\d+$/;
const lngRegex = /^-?\d{1,3}\.\d+$/;

export const warehouseSchema = z.object({
  code: z.string().max(100).nullable().optional(),
  name: z.string().min(1, 'Tên kho là bắt buộc').max(255),
  contactName: z.string().max(255).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  countryCode: z.string().max(20).nullable().optional(),
  provinceCode: z.string().max(50).nullable().optional(),
  provinceName: z.string().max(255).nullable().optional(),
  districtCode: z.string().max(50).nullable().optional(),
  districtName: z.string().max(255).nullable().optional(),
  wardCode: z.string().max(50).nullable().optional(),
  wardName: z.string().max(255).nullable().optional(),
  addressLine: z.string().min(1, 'Địa chỉ là bắt buộc').max(500),
  fullAddress: z.string().max(1000).nullable().optional(),
  latitude: z.string().nullable().optional().refine(
    (val) => !val || latRegex.test(val) || !isNaN(parseFloat(val)),
    { message: 'Latitude phải là số hợp lệ (-90 đến 90)' }
  ),
  longitude: z.string().nullable().optional().refine(
    (val) => !val || lngRegex.test(val) || !isNaN(parseFloat(val)),
    { message: 'Longitude phải là số hợp lệ (-180 đến 180)' }
  ),
  isActive: z.boolean().default(true),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;

export const warehouseUpdateSchema = warehouseSchema.partial().extend({
  code: z.string().max(100).nullable().optional(),
});

export type WarehouseUpdateInput = z.infer<typeof warehouseUpdateSchema>;

// ──────────────────────────────────────────────
// Validate helpers
// ──────────────────────────────────────────────

export function validateWarehouse(data: unknown) {
  return warehouseSchema.safeParse(data);
}

export function validateWarehouseUpdate(data: unknown) {
  return warehouseUpdateSchema.safeParse(data);
}
