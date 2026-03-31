import { menuLinkRepository } from '@/server/repositories/menu-link.repository';
import { validateMenuLink, validateReorderMenuLinks } from '@/server/validators/menu-link.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

function serializeMenuLink(item: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(item, (_, v) => typeof v === 'bigint' ? String(v) : v));
}

export const menuLinkService = {
  async getAllMenuLinks() {
    const items = await menuLinkRepository.findAll();
    return items.map(serializeMenuLink);
  },

  async getMenuLinksByMenuId(menuId: string) {
    const num = Number(menuId);
    if (!Number.isSafeInteger(num)) {
      throw new ValidationError('menuId khong hop le');
    }
    const items = await menuLinkRepository.findByMenuId(BigInt(menuId));
    return items.map(serializeMenuLink);
  },

  async getMenuLinkById(id: string) {
    const item = await menuLinkRepository.findById(id);
    if (!item) throw new NotFoundError('Khong tim thay menu link');
    return serializeMenuLink(item);
  },

  async createMenuLink(input: Record<string, unknown>) {
    const result = validateMenuLink(input);
    if (!result.success) {
      throw new ValidationError('Du lieu khong hop le', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // Auto-set sortOrder if not provided
    const data = result.data;
    if (data.menuId != null && data.sortOrder == null) {
      const maxOrder = await menuLinkRepository.findMaxSortOrder(
        data.menuId as bigint,
        data.parentId ?? null
      );
      data.sortOrder = maxOrder + 1;
    }

    const item = await menuLinkRepository.create(data);
    return serializeMenuLink(item);
  },

  async updateMenuLink(id: string, input: Record<string, unknown>) {
    const current = await menuLinkRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Khong tim thay menu link');
    }
    const result = validateMenuLink({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Du lieu khong hop le', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const item = await menuLinkRepository.update(id, result.data);
    return serializeMenuLink(item);
  },

  async deleteMenuLink(id: string) {
    const current = await menuLinkRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Khong tim thay menu link');
    }
    return menuLinkRepository.deleteWithChildren(id);
  },

  async reorderMenuLinks(updates: Array<{ id: string; sortOrder: number }>) {
    const result = validateReorderMenuLinks({ updates });
    if (!result.success) {
      throw new ValidationError('Du lieu khong hop le', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    await menuLinkRepository.updateSortOrders(result.data.updates);
  },
};
