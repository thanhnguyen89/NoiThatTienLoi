import { catalogRedirectRepository } from '@/server/repositories/catalog-redirect.repository';
import { validateCatalogRedirect, type CatalogRedirectInput } from '@/server/validators/catalog-redirect.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const catalogRedirectService = {
  async getAllRedirects() {
    return catalogRedirectRepository.findAll();
  },

  async getRedirectById(id: string) {
    return catalogRedirectRepository.findById(id);
  },

  async createRedirect(input: Record<string, unknown>) {
    const result = validateCatalogRedirect(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogRedirectRepository.create(result.data);
  },

  async updateRedirect(id: string, input: Record<string, unknown>) {
    const current = await catalogRedirectRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy redirect');
    }
    const result = validateCatalogRedirect({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogRedirectRepository.update(id, result.data);
  },

  async deleteRedirect(id: string) {
    const current = await catalogRedirectRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy redirect');
    }
    return catalogRedirectRepository.delete(id);
  },
};
