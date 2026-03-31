import { newsCategoryRepository } from '@/server/repositories/news-category.repository';
import { validateNewsCategory } from '@/server/validators/news-category.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const newsCategoryService = {
  async getAllCategories() {
    return newsCategoryRepository.findAll();
  },

  async getCategoryById(id: string) {
    const cat = await newsCategoryRepository.findById(id);
    if (!cat) throw new NotFoundError('Không tìm thấy danh mục tin tức');
    return cat;
  },

  async createCategory(input: Record<string, unknown>) {
    const result = validateNewsCategory(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return newsCategoryRepository.create(result.data);
  },

  async updateCategory(id: string, input: Record<string, unknown>) {
    const existing = await newsCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy danh mục tin tức');

    const result = validateNewsCategory({ ...existing, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return newsCategoryRepository.update(id, result.data);
  },

  async deleteCategory(id: string) {
    const existing = await newsCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy danh mục tin tức');
    return newsCategoryRepository.delete(id);
  },
};
