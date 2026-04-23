import { newsCategoryRepository } from '@/server/repositories/news-category.repository';
import { validateNewsCategory } from '@/server/validators/news-category.validator';
import { createSlug } from '@/lib/utils';
import { NotFoundError, ValidationError, DuplicateError } from '@/server/errors';
import { prisma } from '@/lib/prisma';

/**
 * Tính toán categoryLevel dựa trên parentId
 */
async function calculateCategoryLevel(parentId: string | null): Promise<number> {
  if (!parentId) return 0;
  const parent = await prisma.newsCategory.findUnique({
    where: { id: parentId, isDeleted: false },
    select: { categoryLevel: true },
  });
  return (parent?.categoryLevel ?? 0) + 1;
}

/**
 * Kiểm tra circular reference (không cho chọn chính nó hoặc children làm parent)
 */
async function validateParentNotCircular(categoryId: string, newParentId: string | null): Promise<void> {
  if (!newParentId) return;
  
  // Không cho chọn chính nó
  if (categoryId === newParentId) {
    throw new ValidationError('Không thể chọn chính danh mục này làm parent', { parentId: ['Circular reference detected'] });
  }

  // Kiểm tra newParentId có phải là children của categoryId không
  let currentParent = await prisma.newsCategory.findUnique({
    where: { id: newParentId, isDeleted: false },
    select: { id: true, parentId: true },
  });

  const visited = new Set<string>();
  while (currentParent) {
    if (visited.has(currentParent.id)) break; // Tránh infinite loop
    visited.add(currentParent.id);

    if (currentParent.parentId && String(currentParent.parentId) === categoryId) {
      throw new ValidationError('Không thể chọn category con làm parent', { parentId: ['Circular reference detected'] });
    }

    if (!currentParent.parentId) break;

    currentParent = await prisma.newsCategory.findUnique({
      where: { id: String(currentParent.parentId), isDeleted: false },
      select: { id: true, parentId: true },
    });
  }
}

export const newsCategoryService = {
  async getAllCategories(opts?: { page?: number; pageSize?: number; search?: string; dateFrom?: string; dateTo?: string; parentId?: string; level?: number }) {
    return newsCategoryRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      search: opts?.search,
      dateFrom: opts?.dateFrom,
      dateTo: opts?.dateTo,
      parentId: opts?.parentId,
      level: opts?.level,
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
    // Kiểm tra trùng lặp seName
    if (input.seName) {
      const existing = await prisma.newsCategory.findFirst({
        where: { seName: input.seName as string, isDeleted: false },
      });
      if (existing) {
        throw new DuplicateError('seName', input.seName as string);
      }
    }
    
    // Tính toán categoryLevel tự động
    const parentId = input.parentId as string | null;
    const categoryLevel = await calculateCategoryLevel(parentId);
    input.categoryLevel = categoryLevel;

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
    // Kiểm tra trùng lặp seName (loại trừ chính nó)
    if (input.seName) {
      const duplicate = await prisma.newsCategory.findFirst({
        where: { seName: input.seName as string, isDeleted: false, id: { not: id } },
      });
      if (duplicate) {
        throw new DuplicateError('seName', input.seName as string);
      }
    }

    // Validate circular reference nếu đổi parent
    const newParentId = input.parentId as string | null;
    if (newParentId !== undefined) {
      await validateParentNotCircular(id, newParentId);
    }

    // Tính toán lại categoryLevel nếu parentId thay đổi
    const parentId = input.parentId !== undefined ? (input.parentId as string | null) : (existing.parentId as string | null);
    const categoryLevel = await calculateCategoryLevel(parentId);
    input.categoryLevel = categoryLevel;

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
