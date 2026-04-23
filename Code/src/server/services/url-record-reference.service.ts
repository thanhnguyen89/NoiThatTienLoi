import { urlRecordReferenceRepository } from '@/server/repositories/url-record-reference.repository';
import { validateUrlRecordReference, type UrlRecordReferenceInput } from '@/server/validators/url-record-reference.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const urlRecordReferenceService = {
  async getAll(opts?: { page?: number; pageSize?: number; search?: string; isActive?: string }) {
    const isActive = opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined;
    return urlRecordReferenceRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      search: opts?.search,
      isActive,
    });
  },

  async getAllList() {
    return urlRecordReferenceRepository.findAll();
  },

  async getById(id: string) {
    return urlRecordReferenceRepository.findById(id);
  },

  async getByEntityName(entityName: string) {
    return urlRecordReferenceRepository.findByEntityName(entityName);
  },

  async create(input: Record<string, unknown>) {
    const result = validateUrlRecordReference(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return urlRecordReferenceRepository.create(result.data);
  },

  async update(id: string, input: Record<string, unknown>) {
    const current = await urlRecordReferenceRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy bản ghi');
    }
    const result = validateUrlRecordReference({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return urlRecordReferenceRepository.update(id, result.data);
  },

  async delete(id: string) {
    const current = await urlRecordReferenceRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy bản ghi');
    }
    return urlRecordReferenceRepository.delete(id);
  },

  // UrlRecord operations - được gọi từ product/category service
  async syncUrlRecord(entityId: bigint, entityName: string, slug: string, createdBy?: string) {
    const existing = await urlRecordReferenceRepository.findByEntityName(entityName);
    if (!existing) {
      console.warn(`[syncUrlRecord] Không tìm thấy UrlRecordReference cho entityName: ${entityName}`);
      return null;
    }
    return urlRecordReferenceRepository.createUrlRecord({
      entityId,
      entityName,
      slug,
      createdBy,
    });
  },

  async updateUrlRecord(entityId: bigint, entityName: string, newSlug: string, updatedBy?: string) {
    return urlRecordReferenceRepository.updateUrlRecord(entityId, entityName, newSlug, updatedBy);
  },

  async deleteUrlRecord(entityId: bigint, entityName: string, deletedBy?: string) {
    return urlRecordReferenceRepository.deleteUrlRecord(entityId, entityName, deletedBy);
  },

  async findBySlug(slug: string) {
    return urlRecordReferenceRepository.findBySlug(slug);
  },
};