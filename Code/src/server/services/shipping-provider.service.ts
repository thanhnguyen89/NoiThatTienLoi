import { shippingProviderRepository } from '@/server/repositories/shipping-provider.repository';
import { validateShippingProvider, validateShippingProviderUpdate, type ShippingProviderInput } from '@/server/validators/shipping-provider.validator';
import { NotFoundError, ValidationError, DuplicateError } from '@/server/errors';

// ============================================================
// SHIPPING PROVIDER SERVICE
// ============================================================

export const shippingProviderService = {
  // ── Get list ──
  async getAllProviders(opts?: {
    search?: string;
    isActive?: string;
    serviceType?: string;
    page?: number;
    pageSize?: number;
  }) {
    const isActive = opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined;
    return shippingProviderRepository.findAll({
      search: opts?.search,
      isActive,
      serviceType: opts?.serviceType || undefined,
      page: opts?.page,
      pageSize: opts?.pageSize,
    });
  },

  // ── Get detail ──
  async getProviderById(id: string) {
    const provider = await shippingProviderRepository.findById(id);
    if (!provider) throw new NotFoundError('Không tìm thấy đơn vị vận chuyển');
    return provider;
  },

  // ── Create ──
  async createProvider(input: Record<string, unknown>) {
    const result = validateShippingProvider(input);
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = result.data;

    // Check duplicate code
    if (data.code) {
      const existing = await shippingProviderRepository.findByCode(data.code);
      if (existing) throw new DuplicateError('Mã đơn vị', data.code);
    }

    return shippingProviderRepository.create(data);
  },

  // ── Update ──
  async updateProvider(id: string, input: Record<string, unknown>) {
    const current = await shippingProviderRepository.findById(id);
    if (!current) throw new NotFoundError('Không tìm thấy đơn vị vận chuyển');

    const result = validateShippingProviderUpdate({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu cập nhật không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = result.data;

    // Check duplicate code (if changing code)
    if (data.code && data.code !== current.code) {
      const existing = await shippingProviderRepository.findByCode(data.code);
      if (existing) throw new DuplicateError('Mã đơn vị', data.code);
    }

    return shippingProviderRepository.update(id, data);
  },

  // ── Toggle active ──
  async toggleProviderActive(id: string) {
    const provider = await shippingProviderRepository.findById(id);
    if (!provider) throw new NotFoundError('Không tìm thấy đơn vị vận chuyển');
    return shippingProviderRepository.toggleActive(id);
  },

  // ── Set active (for bulk) ──
  async setProviderActive(id: string, active: boolean) {
    const provider = await shippingProviderRepository.findById(id);
    if (!provider) throw new NotFoundError('Không tìm thấy đơn vị vận chuyển');
    return shippingProviderRepository.setActive(id, active);
  },

  // ── Delete (soft) ──
  async deleteProvider(id: string) {
    const provider = await shippingProviderRepository.findById(id);
    if (!provider) throw new NotFoundError('Không tìm thấy đơn vị vận chuyển');
    return shippingProviderRepository.softDelete(id);
  },

  // ── Status counts ──
  async getStatusCounts() {
    return shippingProviderRepository.getStatusCounts();
  },

  // ── Get all active (for dropdown) ──
  async getActiveProviders() {
    return shippingProviderRepository.findAllActive();
  },

  // ── Export all for Excel ──
  async exportAllProviders(opts?: {
    search?: string;
    isActive?: string;
    serviceType?: string;
  }) {
    const isActive = opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined;
    return shippingProviderRepository.findAllForExport({
      search: opts?.search,
      isActive,
      serviceType: opts?.serviceType || undefined,
    });
  },

  // ── Get shipments by provider ──
  async getShipmentsByProvider(providerId: string, opts?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    return shippingProviderRepository.findShipmentsByProvider(providerId, opts);
  },

  // ── Get stats ──
  async getProviderStats(providerId: string) {
    const provider = await shippingProviderRepository.findById(providerId);
    if (!provider) throw new NotFoundError('Không tìm thấy đơn vị vận chuyển');
    return shippingProviderRepository.getProviderStats(providerId);
  },

  // ── Get all providers for comparison ──
  async getAllForComparison() {
    return shippingProviderRepository.findAllForComparison();
  },
};