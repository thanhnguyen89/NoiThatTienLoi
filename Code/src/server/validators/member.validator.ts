import { z } from 'zod';

// ============================================================
// MEMBER SCHEMAS
// ============================================================

export const genderSchema = z.enum(['male', 'female', 'other']);
export type Gender = z.infer<typeof genderSchema>;

export const memberSchema = z.object({
  fullName: z.string().max(255, 'Họ tên tối đa 255 ký tự'),
  email: z.string().email('Email không hợp lệ').max(255).optional().nullable(),
  phone: z.string().max(50, 'SĐT tối đa 50 ký tự').optional().nullable(),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(100).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: genderSchema.optional().nullable(),
  isActive: z.boolean().default(true),
  emailVerifiedAt: z.string().optional().nullable(),
  phoneVerifiedAt: z.string().optional().nullable(),
});

export type MemberInput = z.infer<typeof memberSchema>;

export const memberUpdateSchema = memberSchema.partial().extend({
  email: z.string().email('Email không hợp lệ').max(255).optional().nullable(),
});

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;

// ──────────────────────────────────────────────
// MemberAddress schema
// ──────────────────────────────────────────────

export const memberAddressSchema = z.object({
  memberId: z.string(),
  contactName: z.string().min(1, 'Tên người nhận là bắt buộc').max(255),
  contactPhone: z.string().min(1, 'SĐT là bắt buộc').max(50),
  countryCode: z.string().max(20).optional().nullable(),
  provinceCode: z.string().max(50).optional().nullable(),
  provinceName: z.string().max(255).optional().nullable(),
  districtCode: z.string().max(50).optional().nullable(),
  districtName: z.string().max(255).optional().nullable(),
  wardCode: z.string().max(50).optional().nullable(),
  wardName: z.string().max(255).optional().nullable(),
  addressLine: z.string().min(1, 'Địa chỉ là bắt buộc').max(500),
  fullAddress: z.string().max(1000).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export type MemberAddressInput = z.infer<typeof memberAddressSchema>;

// ──────────────────────────────────────────────
// Validate helpers
// ──────────────────────────────────────────────

export function validateMember(data: unknown) {
  return memberSchema.safeParse(data);
}

export function validateMemberUpdate(data: unknown) {
  return memberUpdateSchema.safeParse(data);
}

export function validateMemberAddress(data: unknown) {
  return memberAddressSchema.safeParse(data);
}

// ──────────────────────────────────────────────
// Display labels
// ──────────────────────────────────────────────

export const genderLabels: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

export function getGenderLabel(gender: string | null | undefined): string {
  return genderLabels[gender ?? ''] ?? '—';
}