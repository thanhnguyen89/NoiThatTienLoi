import { seoConfigRepository } from '@/server/repositories/seo-config.repository';
import { validateSeoConfig, type SeoConfigInput } from '@/server/validators/seo-config.validator';
import { NotFoundError, ValidationError, DuplicateError } from '@/server/errors';

export const seoConfigService = {
  async getAllSeoConfigs(opts?: { page?: number; pageSize?: number; keyword?: string }) {
    return seoConfigRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      keyword: opts?.keyword,
    });
  },

  async getSeoConfigById(id: string) {
    return seoConfigRepository.findById(id);
  },

  async createSeoConfig(input: Record<string, unknown>) {
    const result = validateSeoConfig(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    if (result.data.seName) {
      const existing = await seoConfigRepository.findBySeName(result.data.seName);
      if (existing) {
        throw new DuplicateError('seName', result.data.seName);
      }
    }
    return seoConfigRepository.create(result.data);
  },

  async updateSeoConfig(id: string, input: Record<string, unknown>) {
    const current = await seoConfigRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy cấu hình SEO');
    }
    const result = validateSeoConfig({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    if (result.data.seName && result.data.seName !== current.seName) {
      const existing = await seoConfigRepository.findBySeName(result.data.seName);
      if (existing) {
        throw new DuplicateError('seName', result.data.seName);
      }
    }
    return seoConfigRepository.update(id, result.data);
  },

  async deleteSeoConfig(id: string) {
    const current = await seoConfigRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy cấu hình SEO');
    }
    return seoConfigRepository.delete(id);
  },
};
