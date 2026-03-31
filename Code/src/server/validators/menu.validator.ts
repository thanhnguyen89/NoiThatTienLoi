import { z } from 'zod';

const VALID_MENU_TYPE_IDS = [1, 2, 3, 4] as const;

export const menuSchema = z.object({
  name: z.string().max(1000).optional().nullable(),
  menuTypeId: z.coerce.number().int().refine((v) => VALID_MENU_TYPE_IDS.includes(v as typeof VALID_MENU_TYPE_IDS[number]), {
    message: 'Loại menu phải là 1 (Menu Top), 2 (Menu Footer), 3 (Menu Left) hoặc 4 (Menu Right)',
  }).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type MenuInput = z.infer<typeof menuSchema>;
export type MenuTypeId = (typeof VALID_MENU_TYPE_IDS)[number];

export const MENU_TYPE_LABELS: Record<MenuTypeId, string> = {
  1: 'Menu Top',
  2: 'Menu Footer',
  3: 'Menu Left',
  4: 'Menu Right',
};

export function getMenuTypeLabel(id: number | bigint | null | undefined): string {
  if (id == null) return '—';
  const n = typeof id === 'bigint' ? Number(id) : id;
  return MENU_TYPE_LABELS[n as MenuTypeId] ?? `Loại ${n}`;
}

export function validateMenu(data: unknown) {
  return menuSchema.safeParse(data);
}
