import { memberRepository, type PaginatedMembers } from '@/server/repositories/member.repository';
import { validateMember, validateMemberUpdate, validateMemberAddress } from '@/server/validators/member.validator';
import { NotFoundError, ValidationError, ConflictError } from '@/server/errors';

export const memberService = {
  async getAllMembers(opts?: {
    search?: string;
    isActive?: string;
    emailVerified?: string;
    phoneVerified?: string;
    gender?: string;
    dateFrom?: string;
    dateTo?: string;
    hasOrder?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedMembers> {
    return memberRepository.findAll({
      search: opts?.search,
      isActive: opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined,
      emailVerified: opts?.emailVerified === 'verified' ? true : opts?.emailVerified === 'unverified' ? false : undefined,
      phoneVerified: opts?.phoneVerified === 'verified' ? true : opts?.phoneVerified === 'unverified' ? false : undefined,
      gender: opts?.gender || undefined,
      dateFrom: opts?.dateFrom || undefined,
      dateTo: opts?.dateTo || undefined,
      hasOrder: opts?.hasOrder === 'yes' ? true : opts?.hasOrder === 'no' ? false : undefined,
      page: opts?.page,
      pageSize: opts?.pageSize,
    });
  },

  async getStatusCounts() {
    return memberRepository.getStatusCounts();
  },

  async getMemberById(id: string) {
    const member = await memberRepository.findById(id);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');
    return member;
  },

  async createMember(input: Record<string, unknown>) {
    const result = validateMember(input);
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu thành viên không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = result.data;

    if (data.email) {
      const existing = await memberRepository.findByEmail(data.email);
      if (existing) throw new ConflictError('Email đã được sử dụng');
    }

    if (data.phone) {
      const existing = await memberRepository.findByPhone(data.phone);
      if (existing) throw new ConflictError('Số điện thoại đã được sử dụng');
    }

    return memberRepository.create({
      ...data,
      passwordHash: input.password as string | undefined,
    });
  },

  async updateMember(id: string, input: Record<string, unknown>) {
    const existing = await memberRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy thành viên');

    const result = validateMemberUpdate(input);
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu cập nhật không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = result.data;

    if (data.email && data.email !== existing.email) {
      const dup = await memberRepository.findByEmail(data.email);
      if (dup) throw new ConflictError('Email đã được sử dụng');
    }

    if (data.phone && data.phone !== existing.phone) {
      const dup = await memberRepository.findByPhone(data.phone);
      if (dup) throw new ConflictError('Số điện thoại đã được sử dụng');
    }

    return memberRepository.update(id, {
      ...data,
      passwordHash: input.password as string | undefined,
    });
  },

  async toggleMemberActive(id: string) {
    const member = await memberRepository.findById(id);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');
    return memberRepository.toggleActive(id);
  },

  async deleteMember(id: string) {
    const member = await memberRepository.findById(id);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');
    return memberRepository.softDelete(id);
  },

  async getMemberOrders(id: string) {
    const member = await memberRepository.findById(id);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');
    return memberRepository.getMemberOrders(id);
  },

  async getMemberStats(id: string) {
    const member = await memberRepository.findById(id);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');
    return memberRepository.getMemberStats(id);
  },

  // ── Addresses ──

  async createAddress(memberId: string, input: Record<string, unknown>) {
    const member = await memberRepository.findById(memberId);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');

    const result = validateMemberAddress({ ...input, memberId });
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu địa chỉ không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    return memberRepository.createAddress(memberId, result.data);
  },

  async updateAddress(addressId: string, memberId: string, input: Record<string, unknown>) {
    const member = await memberRepository.findById(memberId);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');

    const result = validateMemberAddress({ ...input, memberId });
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu cập nhật không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    return memberRepository.updateAddress(addressId, memberId, result.data);
  },

  async deleteAddress(addressId: string, memberId: string) {
    const member = await memberRepository.findById(memberId);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');
    return memberRepository.deleteAddress(addressId);
  },

  async setDefaultAddress(addressId: string, memberId: string) {
    const member = await memberRepository.findById(memberId);
    if (!member) throw new NotFoundError('Không tìm thấy thành viên');
    return memberRepository.setDefaultAddress(addressId, memberId);
  },
};
