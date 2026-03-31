import { catalogTextToLinkRepository } from '@/server/repositories/catalog-text-to-link.repository';
import { validateCatalogTextToLink, type CatalogTextToLinkInput } from '@/server/validators/catalog-text-to-link.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const catalogTextToLinkService = {
  async getAll() {
    return catalogTextToLinkRepository.findAll();
  },

  async getById(id: string) {
    return catalogTextToLinkRepository.findById(id);
  },

  async create(input: Record<string, unknown>) {
    const result = validateCatalogTextToLink(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogTextToLinkRepository.create(result.data);
  },

  async update(id: string, input: Record<string, unknown>) {
    const current = await catalogTextToLinkRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy text to link');
    }
    const result = validateCatalogTextToLink({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogTextToLinkRepository.update(id, result.data);
  },

  async delete(id: string) {
    const current = await catalogTextToLinkRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy text to link');
    }
    return catalogTextToLinkRepository.delete(id);
  },
};
