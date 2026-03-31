import { catalogEmbedCodeRepository } from '@/server/repositories/catalog-embed-code.repository';
import { validateCatalogEmbedCode, type CatalogEmbedCodeInput } from '@/server/validators/catalog-embed-code.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const catalogEmbedCodeService = {
  async getAllEmbedCodes() {
    return catalogEmbedCodeRepository.findAll();
  },

  async getEmbedCodeById(id: string) {
    return catalogEmbedCodeRepository.findById(id);
  },

  async createEmbedCode(input: Record<string, unknown>) {
    const result = validateCatalogEmbedCode(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogEmbedCodeRepository.create(result.data);
  },

  async updateEmbedCode(id: string, input: Record<string, unknown>) {
    const current = await catalogEmbedCodeRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy mã nhúng');
    }
    const result = validateCatalogEmbedCode({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogEmbedCodeRepository.update(id, result.data);
  },

  async deleteEmbedCode(id: string) {
    const current = await catalogEmbedCodeRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy mã nhúng');
    }
    return catalogEmbedCodeRepository.delete(id);
  },
};
