import { shippingProviderPricingRepository } from '@/server/repositories/shipping-provider-pricing.repository';
import { shippingProviderRepository } from '@/server/repositories/shipping-provider.repository';
import { validateShippingProviderPricing, type ShippingProviderPricingInput } from '@/server/validators/shipping-provider-pricing.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

// ============================================================
// SHIPPING PROVIDER PRICING SERVICE
// ============================================================

export const shippingProviderPricingService = {
  // ── Get all pricing rows for a provider ──
  async getPricingByProvider(providerId: string, vehicle?: string | null) {
    const provider = await shippingProviderRepository.findById(providerId);
    if (!provider) throw new NotFoundError('Không tìm thấy đơn vị vận chuyển');
    return shippingProviderPricingRepository.findByProvider(providerId, vehicle || undefined);
  },

  // ── Create a pricing row ──
  async createPricing(input: Record<string, unknown>) {
    const result = validateShippingProviderPricing(input);
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }
    return shippingProviderPricingRepository.create(result.data);
  },

  // ── Update a pricing row ──
  async updatePricing(id: string, input: Record<string, unknown>) {
    const data = { ...input };
    delete (data as Record<string, unknown>).shippingProviderId;
    if (Object.keys(data).length === 0) return shippingProviderPricingRepository.update(id, {});
    const result = validateShippingProviderPricing({ ...data, shippingProviderId: '' });
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu cập nhật không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }
    return shippingProviderPricingRepository.update(id, result.data);
  },

  // ── Delete a pricing row ──
  async deletePricing(id: string) {
    return shippingProviderPricingRepository.delete(id);
  },

  // ── Replace all pricing rows for a provider + vehicle ──
  async replaceAllPricing(
    providerId: string,
    vehicle: string,
    rows: unknown[],
    surcharges?: unknown,
    discountPolicies?: unknown
  ) {
    const provider = await shippingProviderRepository.findById(providerId);
    if (!provider) throw new NotFoundError('Không tìm thấy đơn vị vận chuyển');

    const parsed = rows.map((r) => {
      const result = validateShippingProviderPricing({ ...r as Record<string, unknown>, shippingProviderId: providerId });
      if (!result.success) {
        throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
      }
      return result.data;
    });

    await shippingProviderPricingRepository.replaceAll(providerId, vehicle, parsed);

    // Lưu phụ phí + chính sách giảm giá vào shipping provider
    if (surcharges !== undefined || discountPolicies !== undefined) {
      await shippingProviderRepository.updatePricingMeta(providerId, surcharges, discountPolicies);
    }
  },
};