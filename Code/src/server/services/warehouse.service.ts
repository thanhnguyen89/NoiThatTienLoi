import { warehouseRepository } from '@/server/repositories/warehouse.repository';
import { validateWarehouse, validateWarehouseUpdate, type WarehouseInput } from '@/server/validators/warehouse.validator';
import { NotFoundError, ValidationError, DuplicateError } from '@/server/errors';

// ============================================================
// WAREHOUSE SERVICE
// ============================================================

function buildFullAddress(data: {
  addressLine?: string;
  wardName?: string | null;
  districtName?: string | null;
  provinceName?: string | null;
}): string {
  const parts: string[] = [];
  if (data.addressLine) parts.push(data.addressLine);
  if (data.wardName) parts.push(data.wardName);
  if (data.districtName) parts.push(data.districtName);
  if (data.provinceName) parts.push(data.provinceName);
  return parts.join(', ');
}

function autoGenerateCode(count: number): string {
  return `WH-${String(count + 1).padStart(3, '0')}`;
}

export const warehouseService = {
  // ── Get list ──
  async getAllWarehouses(opts?: {
    search?: string;
    isActive?: string;
    region?: string;
    page?: number;
    pageSize?: number;
  }) {
    const isActive =
      opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined;
    return warehouseRepository.findAll({
      search: opts?.search,
      isActive,
      region: (opts?.region as 'north' | 'central' | 'south') || undefined,
      page: opts?.page,
      pageSize: opts?.pageSize,
    });
  },

  // ── Get detail ──
  async getWarehouseById(id: string) {
    const warehouse = await warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundError('Không tìm thấy kho hàng');
    return warehouse;
  },

  // ── Create ──
  async createWarehouse(input: Record<string, unknown>) {
    const result = validateWarehouse(input);
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = result.data;

    // Auto-generate fullAddress
    const fullAddress = buildFullAddress({
      addressLine: data.addressLine,
      wardName: data.wardName,
      districtName: data.districtName,
      provinceName: data.provinceName,
    });

    // Auto-generate code if not provided
    let code = data.code;
    if (!code) {
      const counts = await warehouseRepository.getStatusCounts();
      code = autoGenerateCode(counts.total);
    }

    // Check duplicate code
    if (code) {
      const existing = await warehouseRepository.findByCode(code);
      if (existing) throw new DuplicateError('Mã kho', code);
    }

    return warehouseRepository.create({
      ...data,
      code,
      fullAddress,
    } as WarehouseInput);
  },

  // ── Update ──
  async updateWarehouse(id: string, input: Record<string, unknown>) {
    const current = await warehouseRepository.findById(id);
    if (!current) throw new NotFoundError('Không tìm thấy kho hàng');

    const result = validateWarehouseUpdate({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu cập nhật không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = result.data;

    // Auto-generate fullAddress
    const fullAddress = buildFullAddress({
      addressLine: data.addressLine,
      wardName: data.wardName,
      districtName: data.districtName,
      provinceName: data.provinceName,
    });

    // Check duplicate code (if changing code)
    if (data.code && data.code !== current.code) {
      const existing = await warehouseRepository.findByCode(data.code);
      if (existing) throw new DuplicateError('Mã kho', data.code);
    }

    return warehouseRepository.update(id, {
      ...data,
      fullAddress,
    } as Partial<WarehouseInput>);
  },

  // ── Toggle active ──
  async toggleWarehouseActive(id: string) {
    const warehouse = await warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundError('Không tìm thấy kho hàng');
    return warehouseRepository.toggleActive(id);
  },

  // ── Delete (soft) ──
  async deleteWarehouse(id: string) {
    const warehouse = await warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundError('Không tìm thấy kho hàng');
    return warehouseRepository.toggleActive(id); // soft delete = set isActive = false
  },

  // ── Status counts ──
  async getStatusCounts() {
    return warehouseRepository.getStatusCounts();
  },

  // ── Shipment stats ──
  async getShipmentStats(warehouseId: string) {
    const warehouse = await warehouseRepository.findById(warehouseId);
    if (!warehouse) throw new NotFoundError('Không tìm thấy kho hàng');
    return warehouseRepository.getShipmentStats(warehouseId);
  },

  // ── Get all active (for dropdown) ──
  async getActiveWarehouses() {
    return warehouseRepository.findAllActive();
  },

  // ── Get all for export (no pagination) ──
  async getAllWarehousesForExport(opts?: {
    search?: string;
    isActive?: string;
    region?: string;
  }) {
    const isActive =
      opts?.isActive === 'active' ? true : opts?.isActive === 'inactive' ? false : undefined;
    return warehouseRepository.findAllForExport({
      search: opts?.search,
      isActive,
      region: (opts?.region as 'north' | 'central' | 'south') || undefined,
    });
  },

  // ── Get paginated shipments ──
  async getShipmentsByWarehouse(warehouseId: string, opts?: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const warehouse = await warehouseRepository.findById(warehouseId);
    if (!warehouse) throw new NotFoundError('Không tìm thấy kho hàng');
    return warehouseRepository.findShipmentsByWarehouse(warehouseId, opts);
  },

  // ── Get detailed warehouse stats ──
  async getWarehouseDetailedStats(warehouseId: string) {
    const warehouse = await warehouseRepository.findById(warehouseId);
    if (!warehouse) throw new NotFoundError('Không tìm thấy kho hàng');
    return warehouseRepository.getWarehouseDetailedStats(warehouseId);
  },

  // ── Get top delivery areas ──
  async getTopDeliveryAreas(warehouseId: string) {
    const warehouse = await warehouseRepository.findById(warehouseId);
    if (!warehouse) throw new NotFoundError('Không tìm thấy kho hàng');
    return warehouseRepository.getTopDeliveryAreas(warehouseId);
  },
};