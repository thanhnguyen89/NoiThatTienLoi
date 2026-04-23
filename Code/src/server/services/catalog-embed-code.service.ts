import { catalogEmbedCodeRepository } from '@/server/repositories/catalog-embed-code.repository';
import { validateCatalogEmbedCode } from '@/server/validators/catalog-embed-code.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const catalogEmbedCodeService = {
  async getAllEmbedCodes(opts?: { page?: number; pageSize?: number; search?: string; isActive?: string }) {
    const isActive = opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined;
    return catalogEmbedCodeRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      search: opts?.search,
      isActive,
    });
  },

  async getEmbedCodeById(id: string) {
    const embedCode = await catalogEmbedCodeRepository.findById(id);
    if (!embedCode) throw new NotFoundError('Không tìm thấy mã nhúng');
    return embedCode;
  },

  async createEmbedCode(input: Record<string, unknown>, userId: string) {
    const result = validateCatalogEmbedCode(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogEmbedCodeRepository.create(result.data, userId);
  },

  async updateEmbedCode(id: string, input: Record<string, unknown>, userId: string) {
    const existing = await catalogEmbedCodeRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy mã nhúng');
    const result = validateCatalogEmbedCode({ ...existing, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return catalogEmbedCodeRepository.update(id, result.data, userId);
  },

  async deleteEmbedCode(id: string, userId: string) {
    await catalogEmbedCodeRepository.softDelete(id, userId);
  },
};
