import { pageRepository } from '@/server/repositories/page.repository';
import { validatePage } from '@/server/validators/page.validator';
import { createSlug } from '@/lib/utils';
import { NotFoundError, ValidationError } from '@/server/errors';

export const pageService = {
  async getAllPages(opts?: { page?: number; pageSize?: number; search?: string; isActive?: string }) {
    const isActive = opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined;
    return pageRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      search: opts?.search,
      isActive,
    });
  },

  async getPageById(id: string) {
    const page = await pageRepository.findById(id);
    if (!page) throw new NotFoundError('Không tìm thấy trang');
    return page;
  },

  async createPage(input: Record<string, unknown>, userId: string) {
    // Auto-generate slug from title if pageName is empty
    if (!input.pageName && input.title) {
      input.pageName = createSlug(input.title as string);
    }

    const result = validatePage(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // If isShowHome=true, unset existing home page
    if (result.data.isShowHome) {
      await pageRepository.unsetHomePage();
    }

    return pageRepository.create(result.data, userId);
  },

  async updatePage(id: string, input: Record<string, unknown>, userId: string) {
    const existing = await pageRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy trang');

    // Auto-generate slug from title if pageName is empty
    if (!input.pageName && input.title) {
      input.pageName = createSlug(input.title as string);
    }

    const result = validatePage({ ...existing, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // If isShowHome=true, unset existing home page (but not this page itself)
    if (result.data.isShowHome) {
      await pageRepository.unsetHomePageExcept(id);
    }

    return pageRepository.update(id, result.data, userId);
  },

  async deletePage(id: string) {
    const existing = await pageRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy trang');
    return pageRepository.delete(id);
  },
};
