import { productColorRepository } from '@/server/repositories/product-color.repository';
import { validateProductColor, type ProductColorInput } from '@/server/validators/product-color.validator';
import { NotFoundError, ValidationError, DuplicateError, ConflictError } from '@/server/errors';

export const productColorService = {
  async getAllColors(opts?: { page?: number; pageSize?: number; search?: string; isActive?: string }) {
    const isActive = opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined;
    return productColorRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      search: opts?.search,
      isActive,
    });
  },

  async getColorById(id: string) {
    return productColorRepository.findById(id);
  },

  async createColor(input: Record<string, unknown>) {
    const result = validateProductColor(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const existing = await productColorRepository.findByColorName(result.data.colorName);
    if (existing) {
      throw new DuplicateError('Màu sắc', result.data.colorName);
    }

    return productColorRepository.create(result.data);
  },

  async updateColor(id: string, input: Record<string, unknown>) {
    const current = await productColorRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy màu sắc');
    }

    const result = validateProductColor({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    if (result.data.colorName !== current.colorName) {
      const existing = await productColorRepository.findByColorName(result.data.colorName);
      if (existing) {
        throw new DuplicateError('Màu sắc', result.data.colorName);
      }
    }

    return productColorRepository.update(id, result.data);
  },

  async deleteColor(id: string) {
    const current = await productColorRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy màu sắc');
    }

    const hasVariants = await productColorRepository.hasVariants(id);
    if (hasVariants) {
      throw new ConflictError('Không thể xóa màu sắc đang có biến thể sản phẩm');
    }

    return productColorRepository.delete(id);
  },
};
