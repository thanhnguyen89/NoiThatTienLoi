import { orderRepository, type PaginatedOrders } from '@/server/repositories/order.repository';
import { validateOrder, validateOrderUpdate } from '@/server/validators/order.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const orderService = {
  async getAllOrders(opts?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    customerType?: string;
    dateFrom?: string;
    dateTo?: string;
    priceMin?: number;
    priceMax?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedOrders> {
    return orderRepository.findAll(opts);
  },

  async getStatusCounts() {
    return orderRepository.getStatusCounts();
  },

  async getOrderById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new NotFoundError('Không tìm thấy đơn hàng');
    return order;
  },

  async createOrder(input: Record<string, unknown>) {
    const result = validateOrder(input);
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu đơn hàng không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }
    return orderRepository.create(result.data as Parameters<typeof orderRepository.create>[0]);
  },

  async updateOrder(id: string, input: Record<string, unknown>) {
    const existing = await orderRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy đơn hàng');

    const result = validateOrderUpdate(input);
    if (!result.success) {
      throw new ValidationError(
        'Dữ liệu cập nhật không hợp lệ',
        result.error.flatten().fieldErrors as Record<string, string[]>
      );
    }
    return orderRepository.update(id, result.data as Parameters<typeof orderRepository.update>[1]);
  },

  async updateOrderStatus(
    id: string,
    toStatus: string,
    changedByType: string,
    changedById?: string,
    note?: string
  ) {
    const existing = await orderRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy đơn hàng');
    return orderRepository.updateStatus(id, toStatus, changedByType, changedById, note);
  },

  async deleteOrder(id: string) {
    const existing = await orderRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy đơn hàng');
    return orderRepository.softDelete(id);
  },
};
