import { pageRepository } from '@/server/repositories/page.repository';
import { validatePage } from '@/server/validators/page.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const pageService = {
  async getAllPages() {
    return pageRepository.findAll();
  },

  async getPageById(id: string) {
    const page = await pageRepository.findById(id);
    if (!page) throw new NotFoundError('Không tìm thấy trang');
    return page;
  },

  async createPage(input: Record<string, unknown>) {
    const result = validatePage(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return pageRepository.create(result.data);
  },

  async updatePage(id: string, input: Record<string, unknown>) {
    const existing = await pageRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy trang');

    const result = validatePage({ ...existing, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return pageRepository.update(id, result.data);
  },

  async deletePage(id: string) {
    const existing = await pageRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy trang');
    return pageRepository.delete(id);
  },
};
