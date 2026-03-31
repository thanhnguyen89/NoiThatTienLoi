import { menuRepository } from '@/server/repositories/menu.repository';
import { validateMenu } from '@/server/validators/menu.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const menuService = {
  async getAllMenus() {
    return menuRepository.findAll();
  },

  async getMenuById(id: string) {
    const menu = await menuRepository.findById(id);
    if (!menu) throw new NotFoundError('Không tìm thấy menu');
    return menu;
  },

  async createMenu(input: Record<string, unknown>) {
    const result = validateMenu(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return menuRepository.create(result.data);
  },

  async updateMenu(id: string, input: Record<string, unknown>) {
    const existing = await menuRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy menu');

    const result = validateMenu({ ...existing, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return menuRepository.update(id, result.data);
  },

  async deleteMenu(id: string) {
    const existing = await menuRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy menu');
    return menuRepository.delete(id);
  },
};
