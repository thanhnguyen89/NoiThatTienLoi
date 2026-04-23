import { z } from 'zod';

export const urlRecordReferenceSchema = z.object({
  entityName: z.string().optional().nullable(),
  controllerName: z.string().optional().nullable(),
  actionName: z.string().optional().nullable(),
  urlPattern: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
});

export type UrlRecordReferenceInput = z.infer<typeof urlRecordReferenceSchema>;

export function validateUrlRecordReference(data: unknown) {
  return urlRecordReferenceSchema.safeParse(data);
}