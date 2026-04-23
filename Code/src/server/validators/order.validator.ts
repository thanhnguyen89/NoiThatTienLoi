import { z } from 'zod';

// ============================================================
// ORDER SCHEMAS
// ============================================================

export const orderCustomerTypeSchema = z.enum(['member', 'guest']);
export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipping',
  'delivered',
  'completed',
  'cancelled',
  'returned',
]);
export const paymentStatusSchema = z.enum([
  'unpaid',
  'partially_paid',
  'paid',
  'refunded',
  'partially_refunded',
]);
export const shippingMethodSchema = z.enum(['motorbike', 'van', 'truck', 'pickup', 'other']);
export const shippingServiceTypeSchema = z.enum(['standard', 'express', 'same_day', 'scheduled', 'other']);
export const changedByTypeSchema = z.enum(['admin', 'system', 'customer', 'shipper']);

// ──────────────────────────────────────────────
// Order input schema (for creation)
// ──────────────────────────────────────────────

const addressFields = z.object({
  contactName: z.string().max(255).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  contactEmail: z.string().max(255).optional().nullable(),
  countryCode: z.string().max(20).optional().nullable(),
  provinceCode: z.string().max(50).optional().nullable(),
  provinceName: z.string().max(255).optional().nullable(),
  districtCode: z.string().max(50).optional().nullable(),
  districtName: z.string().max(255).optional().nullable(),
  wardCode: z.string().max(50).optional().nullable(),
  wardName: z.string().max(255).optional().nullable(),
  addressLine: z.string().max(500).optional().nullable(),
  fullAddress: z.string().max(1000).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export const orderSchema = z.object({
  // Customer info
  customerType: orderCustomerTypeSchema.default('guest'),
  memberId: z.string().optional().nullable(),
  customerName: z.string().max(255),
  customerPhone: z.string().max(50).optional().nullable(),
  customerEmail: z.string().max(255).email().optional().nullable(),

  // Billing address (optional)
  ...addressFields.shape,
  billingContactName: z.string().max(255).optional().nullable(),
  billingContactPhone: z.string().max(50).optional().nullable(),
  billingContactEmail: z.string().max(255).optional().nullable(),
  billingCountryCode: z.string().max(20).optional().nullable(),
  billingProvinceCode: z.string().max(50).optional().nullable(),
  billingProvinceName: z.string().max(255).optional().nullable(),
  billingDistrictCode: z.string().max(50).optional().nullable(),
  billingDistrictName: z.string().max(255).optional().nullable(),
  billingWardCode: z.string().max(50).optional().nullable(),
  billingWardName: z.string().max(255).optional().nullable(),
  billingAddressLine: z.string().max(500).optional().nullable(),
  billingFullAddress: z.string().max(1000).optional().nullable(),

  // Shipping address
  shippingContactName: z.string().max(255).optional().nullable(),
  shippingContactPhone: z.string().max(50).optional().nullable(),
  shippingContactEmail: z.string().max(255).optional().nullable(),
  shippingCountryCode: z.string().max(20).optional().nullable(),
  shippingProvinceCode: z.string().max(50).optional().nullable(),
  shippingProvinceName: z.string().max(255).optional().nullable(),
  shippingDistrictCode: z.string().max(50).optional().nullable(),
  shippingDistrictName: z.string().max(255).optional().nullable(),
  shippingWardCode: z.string().max(50).optional().nullable(),
  shippingWardName: z.string().max(255).optional().nullable(),
  shippingAddressLine: z.string().max(500).optional().nullable(),
  shippingFullAddress: z.string().max(1000).optional().nullable(),
  shippingLatitude: z.coerce.number().optional().nullable(),
  shippingLongitude: z.coerce.number().optional().nullable(),

  // Amounts
  subtotalAmount: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  shippingAmount: z.coerce.number().min(0).default(0),
  otherFeeAmount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  grandTotalAmount: z.coerce.number().min(0).default(0),
  depositAmount: z.coerce.number().min(0).default(0),
  remainingAmount: z.coerce.number().min(0).default(0),

  // Status
  orderStatus: orderStatusSchema.default('pending'),
  paymentStatus: paymentStatusSchema.default('unpaid'),

  // Notes
  customerNote: z.string().optional().nullable(),
  internalNote: z.string().optional().nullable(),

  // Timestamps
  placedAt: z.string().optional().nullable(),
});

export type OrderInput = z.infer<typeof orderSchema>;

// ──────────────────────────────────────────────
// Order update schema
// ──────────────────────────────────────────────

export const orderUpdateSchema = orderSchema.partial().extend({
  orderStatus: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
});

export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;

// ──────────────────────────────────────────────
// OrderItem schema
// ──────────────────────────────────────────────

export const orderItemSchema = z.object({
  orderId: z.string(),
  productId: z.coerce.number(),
  productVariantId: z.coerce.number().optional().nullable(),
  productName: z.string().max(255),
  variantName: z.string().max(255).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  sizeLabel: z.string().max(100).optional().nullable(),
  colorName: z.string().max(100).optional().nullable(),
  quantity: z.coerce.number().int().min(1),
  unitPurchasePrice: z.coerce.number().min(0).optional().nullable(),
  unitSalePrice: z.coerce.number().min(0).default(0),
  unitPromoPrice: z.coerce.number().min(0).optional().nullable(),
  unitFinalPrice: z.coerce.number().min(0).default(0),
  lineDiscountAmount: z.coerce.number().min(0).default(0),
  lineTotalAmount: z.coerce.number().min(0).default(0),
  productSnapshotJson: z.string().optional().nullable(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

// ──────────────────────────────────────────────
// OrderShipment schema
// ──────────────────────────────────────────────

export const orderShipmentSchema = z.object({
  orderId: z.string(),
  warehouseId: z.string().optional().nullable(),
  shippingProviderId: z.string().optional().nullable(),
  shippingMethod: shippingMethodSchema,
  shippingServiceType: shippingServiceTypeSchema.optional().nullable(),
  shippingCost: z.coerce.number().min(0).default(0),
  extraCost: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  finalShippingCost: z.coerce.number().min(0).default(0),
  providerOrderCode: z.string().max(100).optional().nullable(),
  trackingCode: z.string().max(100).optional().nullable(),
  shippedAt: z.string().optional().nullable(),
  deliveredAt: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  metadataJson: z.string().optional().nullable(),
});

export type OrderShipmentInput = z.infer<typeof orderShipmentSchema>;

// ──────────────────────────────────────────────
// OrderStatusHistory schema
// ──────────────────────────────────────────────

export const orderStatusHistorySchema = z.object({
  orderId: z.string(),
  fromStatus: orderStatusSchema.optional().nullable(),
  toStatus: orderStatusSchema,
  changedByType: changedByTypeSchema.optional().nullable(),
  changedById: z.coerce.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

export type OrderStatusHistoryInput = z.infer<typeof orderStatusHistorySchema>;

// ──────────────────────────────────────────────
// Helper label maps (for display)
// ──────────────────────────────────────────────

export const orderStatusLabels: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Hoàn trả',
};

export const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  partially_paid: 'Thanh toán 1 phần',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
  partially_refunded: 'Hoàn tiền 1 phần',
};

export const customerTypeLabels: Record<string, string> = {
  member: 'Thành viên',
  guest: 'Khách',
};

// ──────────────────────────────────────────────
// Validate functions
// ──────────────────────────────────────────────

export function validateOrder(data: unknown) {
  return orderSchema.safeParse(data);
}

export function validateOrderUpdate(data: unknown) {
  return orderUpdateSchema.safeParse(data);
}

export function validateOrderItem(data: unknown) {
  return orderItemSchema.safeParse(data);
}

export function validateOrderShipment(data: unknown) {
  return orderShipmentSchema.safeParse(data);
}

export function validateOrderStatusHistory(data: unknown) {
  return orderStatusHistorySchema.safeParse(data);
}

export function getOrderStatusLabel(status: string | null | undefined): string {
  return orderStatusLabels[status ?? ''] ?? '—';
}

export function getPaymentStatusLabel(status: string | null | undefined): string {
  return paymentStatusLabels[status ?? ''] ?? '—';
}

export function getCustomerTypeLabel(type: string | null | undefined): string {
  return customerTypeLabels[type ?? ''] ?? '—';
}
