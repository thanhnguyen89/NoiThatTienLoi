import { z } from 'zod';

export const systemConfigGeneralSchema = z.object({
  uploadPath: z.string().max(500).optional().nullable(),
  accessTimeFrom: z.string().max(50).optional().nullable(),
  accessTimeTo: z.string().max(50).optional().nullable(),
  displayRowCount: z.coerce.number().min(1).max(100).optional().nullable(),
  pageTitle: z.string().max(1000).optional().nullable(),
  keywords: z.string().max(1000).optional().nullable(),
  metaDescription: z.string().max(1000).optional().nullable(),
  socialFacebook: z.string().max(500).optional().nullable(),
  socialZalo: z.string().max(500).optional().nullable(),
  socialTwitter: z.string().max(500).optional().nullable(),
  socialYouTube: z.string().max(500).optional().nullable(),
  socialTiktok: z.string().max(500).optional().nullable(),
});

export const systemConfigMailSchema = z.object({
  mailFrom: z.string().email().max(255).optional().nullable(),
  mailFromName: z.string().max(255).optional().nullable(),
  mailHost: z.string().max(255).optional().nullable(),
  mailPort: z.coerce.number().min(1).max(65535).optional().nullable(),
  mailUsername: z.string().max(255).optional().nullable(),
  mailSecure: z.boolean().optional(),
});

export const systemConfigInfoSchema = z.object({
  unitName: z.string().max(500).optional().nullable(),
  unitShortName: z.string().max(100).optional().nullable(),
  unitAddress: z.string().max(1000).optional().nullable(),
  unitPhone: z.string().max(50).optional().nullable(),
  unitFax: z.string().max(50).optional().nullable(),
  unitEmail: z.string().email().max(255).optional().nullable(),
  unitWebsite: z.string().max(255).optional().nullable(),
  copyright: z.string().max(1000).optional().nullable(),
  websiteContent: z.string().optional().nullable(),
});

export const systemConfigSchema = z.object({
  general: systemConfigGeneralSchema,
  mail: systemConfigMailSchema,
  info: systemConfigInfoSchema,
});

export type SystemConfigGeneralInput = z.infer<typeof systemConfigGeneralSchema>;
export type SystemConfigMailInput = z.infer<typeof systemConfigMailSchema>;
export type SystemConfigInfoInput = z.infer<typeof systemConfigInfoSchema>;
export type SystemConfigInput = z.infer<typeof systemConfigSchema>;
export type SystemConfigMailPasswordInput = { newPassword: string };

export function validateSystemConfig(data: unknown) {
  return systemConfigSchema.safeParse(data);
}

export function validateMailPassword(data: unknown) {
  return z.object({ newPassword: z.string().min(1).max(500) }).safeParse(data);
}
