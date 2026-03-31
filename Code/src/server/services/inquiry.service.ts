import { inquiryRepository } from '@/server/repositories/inquiry.repository';
import type { InquiryCreateInput, InquiryFilterParams } from '@/lib/types';

export const inquiryService = {
  /**
   * Lấy danh sách inquiry (admin)
   */
  async getInquiries(params: InquiryFilterParams) {
    return inquiryRepository.findMany(params);
  },

  /**
   * Lấy chi tiết inquiry
   */
  async getInquiryById(id: string) {
    return inquiryRepository.findById(id);
  },

  /**
   * Tạo inquiry mới (public - khách gửi form)
   */
  async createInquiry(input: InquiryCreateInput) {
    return inquiryRepository.create({
      name: input.name,
      phone: input.phone,
      email: input.email,
      message: input.message,
      type: input.type || 'CONSULTATION',
      ...(input.productId ? { product: { connect: { id: input.productId } } } : {}),
    });
  },

  /**
   * Cập nhật trạng thái inquiry (admin)
   */
  async updateInquiryStatus(id: string, status: string, note?: string) {
    return inquiryRepository.update(id, { status, note });
  },

  /**
   * Xóa inquiry
   */
  async deleteInquiry(id: string) {
    return inquiryRepository.delete(id);
  },
};
