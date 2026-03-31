import { catalogNewsLevelRepository } from '@/server/repositories/catalog-news-level.repository';
import { validateCatalogNewsLevel, type CatalogNewsLevelInput } from '@/server/validators/catalog-news-level.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const catalogNewsLevelService = {
  async getAll() {
    return catalogNewsLevelRepository.findAll();
  },

  async getById(id: string) {
    return catalogNewsLevelRepository.findById(id);
  },

  async create(input: Record<string, unknown>) {
    const result = validateCatalogNewsLevel(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogNewsLevelRepository.create(result.data);
  },

  async update(id: string, input: Record<string, unknown>) {
    const current = await catalogNewsLevelRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy mức độ tin tức');
    }
    const result = validateCatalogNewsLevel({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogNewsLevelRepository.update(id, result.data);
  },

  async delete(id: string) {
    const current = await catalogNewsLevelRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy mức độ tin tức');
    }
    return catalogNewsLevelRepository.delete(id);
  },
};
