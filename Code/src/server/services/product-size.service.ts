import { productSizeRepository } from '@/server/repositories/product-size.repository';
import { validateProductSize, type ProductSizeInput } from '@/server/validators/product-size.validator';
import { NotFoundError, ValidationError, DuplicateError, ConflictError } from '@/server/errors';

export const productSizeService = {
  async getAllSizes() {
    return productSizeRepository.findAll();
  },

  async getSizeById(id: string) {
    return productSizeRepository.findById(id);
  },

  async createSize(input: Record<string, unknown>) {
    const result = validateProductSize(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const existing = await productSizeRepository.findBySizeLabel(result.data.sizeLabel);
    if (existing) {
      throw new DuplicateError('Kích thước', result.data.sizeLabel);
    }

    return productSizeRepository.create(result.data);
  },

  async updateSize(id: string, input: Record<string, unknown>) {
    const current = await productSizeRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy kích thước');
    }

    const result = validateProductSize({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    if (result.data.sizeLabel !== current.sizeLabel) {
      const existing = await productSizeRepository.findBySizeLabel(result.data.sizeLabel);
      if (existing) {
        throw new DuplicateError('Kích thước', result.data.sizeLabel);
      }
    }

    return productSizeRepository.update(id, result.data);
  },

  async deleteSize(id: string) {
    const current = await productSizeRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy kích thước');
    }

    const hasVariants = await productSizeRepository.hasVariants(id);
    if (hasVariants) {
      throw new ConflictError('Không thể xóa kích thước đang có biến thể sản phẩm');
    }

    return productSizeRepository.delete(id);
  },
};
