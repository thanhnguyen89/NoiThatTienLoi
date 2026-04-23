import { newsCategoryRepository } from '@/server/repositories/news-category.repository';
import { validateNewsCategory } from '@/server/validators/news-category.validator';
import { createSlug } from '@/lib/utils';
import { NotFoundError, ValidationError } from '@/server/errors';

export const newsCategoryService = {
  async getAllCategories(opts?: { page?: number; pageSize?: number; search?: string; dateFrom?: string; dateTo?: string }) {
    return newsCategoryRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      search: opts?.search,
      dateFrom: opts?.dateFrom,
      dateTo: opts?.dateTo,
    });
  },

  async getCategoryById(id: string) {
    const cat = await newsCategoryRepository.findById(id);
    if (!cat) throw new NotFoundError('Không tìm thấy danh mục tin tức');
    return cat;
  },

  async createCategory(input: Record<string, unknown>, userId: string) {
    if (!input.seName && input.title) {
      input.seName = createSlug(input.title as string);
    }
    const result = validateNewsCategory(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return newsCategoryRepository.create(result.data, userId);
  },

  async updateCategory(id: string, input: Record<string, unknown>, userId: string) {
    const existing = await newsCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy danh mục tin tức');
    if (!input.seName && input.title) {
      input.seName = createSlug(input.title as string);
    }
    const result = validateNewsCategory({ ...existing, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return newsCategoryRepository.update(id, result.data, userId);
  },

  async deleteCategory(id: string, userId: string) {
    const existing = await newsCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy danh mục tin tức');
    return newsCategoryRepository.softDelete(id, userId);
  },
};
