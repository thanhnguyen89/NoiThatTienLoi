import { z } from 'zod';

export const urlRecordSchema = z.object({
  entityId: z.bigint().nullable().optional(),
  entityName: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  isDeleted: z.boolean().optional().nullable(),
  deletedUserId: z.string().optional().nullable(),
  deletedDate: z.string().datetime().optional().nullable(),
  slugRedirect: z.string().optional().nullable(),
  isRedirect: z.boolean().optional().nullable(),
  errorCode: z.string().optional().nullable(),
});

export type UrlRecordInput = z.infer<typeof urlRecordSchema>;

export function validateUrlRecord(data: unknown) {
  return urlRecordSchema.safeParse(data);
}
