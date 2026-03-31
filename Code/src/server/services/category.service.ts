import { categoryRepository } from '@/server/repositories/category.repository';
import { validateCategory, type CategoryInput } from '@/server/validators/category.validator';
import { createSlug } from '@/lib/utils';
import type { CategoryTree } from '@/lib/types';
import { NotFoundError, ValidationError, DuplicateError, ConflictError } from '@/server/errors';

export const categoryService = {
  async getCategoryTree(): Promise<CategoryTree[]> {
    const categories = await categoryRepository.findAll(true);
    return categories as unknown as CategoryTree[];
  },

  async getAllCategories() {
    return categoryRepository.findAll(false);
  },

  async getAdminCategories() {
    return categoryRepository.findAllFlat();
  },

  async getCategoryById(id: string) {
    return categoryRepository.findById(id);
  },

  async getCategoryBySlug(slug: string) {
    return categoryRepository.findBySlug(slug);
  },

  async createCategory(input: Record<string, unknown>) {
    if (!input.slug && input.name) {
      input.slug = createSlug(input.name as string);
    }

    if (!input.code && input.name) {
      input.code = (input.name as string).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    }

    const result = validateCategory(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const existing = await categoryRepository.findBySlug(result.data.slug);
    if (existing) {
      throw new DuplicateError('Slug', result.data.slug);
    }

    return categoryRepository.create(result.data);
  },

  async updateCategory(id: string, input: Record<string, unknown>) {
    const current = await categoryRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }

    if (input.name && !input.slug) {
      input.slug = createSlug(input.name as string);
    }

    if (input.name && !input.code) {
      input.code = (input.name as string).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    }

    const result = validateCategory({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    if (result.data.slug !== current.slug) {
      const existing = await categoryRepository.findBySlug(result.data.slug);
      if (existing) {
        throw new DuplicateError('Slug', result.data.slug);
      }
    }

    return categoryRepository.update(id, result.data);
  },

  async deleteCategory(id: string) {
    const current = await categoryRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }

    const hasChildren = await categoryRepository.hasChildren(id);
    if (hasChildren) {
      throw new ConflictError('Không thể xóa danh mục có danh mục con');
    }

    const hasProducts = await categoryRepository.hasProducts(id);
    if (hasProducts) {
      throw new ConflictError('Không thể xóa danh mục đang có sản phẩm');
    }

    return categoryRepository.delete(id);
  },
};
