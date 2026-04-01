import { z } from 'zod';

export const menuLinkTargetEnum = z.enum(['_self', '_blank', '_parent', '_top']);

export const menuLinkSchema = z.object({
  // slug = URL field trong form (DB column)
  title: z.string().max(1000).optional().nullable(),
  slug: z.string().max(2000).optional().nullable(),
  target: menuLinkTargetEnum.optional().nullable(),
  menuId: z.union([z.number(), z.bigint()]).optional().nullable(),
  icon: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  entityId: z.union([z.number(), z.bigint()]).optional().nullable(),
  entityName: z.string().max(1000).optional().nullable(),
  nofollow: z.boolean().optional().nullable(),
  level: z.number().int().optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
});

export type MenuLinkInput = z.infer<typeof menuLinkSchema>;
export type MenuLinkTarget = z.infer<typeof menuLinkTargetEnum>;

export const reorderMenuLinksSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int(),
    parentId: z.string().optional().nullable(),
  })),
});

export type ReorderMenuLinksInput = z.infer<typeof reorderMenuLinksSchema>;

export function validateMenuLink(data: unknown) {
  return menuLinkSchema.safeParse(data);
}

export function validateReorderMenuLinks(data: unknown) {
  return reorderMenuLinksSchema.safeParse(data);
}
