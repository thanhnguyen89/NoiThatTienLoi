import { urlRecordRepository } from '@/server/repositories/url-record.repository';
import { validateUrlRecord, type UrlRecordInput } from '@/server/validators/url-record.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const urlRecordService = {
  async getAllUrlRecords() {
    return urlRecordRepository.findAll();
  },

  async getUrlRecordById(id: string) {
    return urlRecordRepository.findById(id);
  },

  async createUrlRecord(input: Record<string, unknown>) {
    const result = validateUrlRecord(input);
    if (!result.success) {
      throw new ValidationError('Du lieu khong hop le', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return urlRecordRepository.create(result.data);
  },

  async updateUrlRecord(id: string, input: Record<string, unknown>) {
    const current = await urlRecordRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Khong tim thay ban ghi');
    }
    const result = validateUrlRecord({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Du lieu khong hop le', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return urlRecordRepository.update(id, result.data);
  },

  async deleteUrlRecord(id: string) {
    const current = await urlRecordRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Khong tim thay ban ghi');
    }
    return urlRecordRepository.delete(id);
  },
};
