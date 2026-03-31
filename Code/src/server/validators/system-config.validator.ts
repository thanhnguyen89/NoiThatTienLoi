import { z } from 'zod';

export const systemConfigSchema = z.object({
  imageUrl: z.string().optional().nullable(),
  displayRowCount: z.coerce.number().min(1).max(100).optional().nullable(),
  pageTitle: z.string().max(1000).optional().nullable(),
  keywords: z.string().max(1000).optional().nullable(),
  metaDescription: z.string().max(1000).optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  accessTimeFrom: z.string().max(50).optional().nullable(),
  accessTimeTo: z.string().max(50).optional().nullable(),
  holidays: z.string().optional().nullable(),
});

export type SystemConfigInput = z.infer<typeof systemConfigSchema>;

export function validateSystemConfig(data: unknown) {
  return systemConfigSchema.safeParse(data);
}
