// Order Status Flow Validator
// Định nghĩa các quy tắc chuyển trạng thái hợp lệ

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered', 'returned'],
  delivered: ['completed', 'returned'],
  completed: [], // Trạng thái cuối, không chuyển được nữa
  cancelled: [], // Đã hủy, không chuyển được
  returned: ['completed'], // Sau khi xử lý trả hàng có thể hoàn thành
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Đã trả hàng',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  confirmed: 'primary',
  processing: 'info',
  shipping: 'purple',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
  returned: 'orange',
};

/**
 * Kiểm tra xem có thể chuyển từ trạng thái A sang trạng thái B không
 */
export function canTransitionStatus(from: string, to: string): boolean {
  if (from === to) return true; // Giữ nguyên trạng thái
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[from] || [];
  return allowedTransitions.includes(to);
}

/**
 * Lấy danh sách các trạng thái có thể chuyển đến từ trạng thái hiện tại
 */
export function getAvailableStatuses(currentStatus: string): string[] {
  return ORDER_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Validate và trả về lỗi nếu không thể chuyển trạng thái
 */
export function validateStatusTransition(from: string, to: string): { valid: boolean; error?: string } {
  if (from === to) {
    return { valid: true };
  }

  if (!canTransitionStatus(from, to)) {
    return {
      valid: false,
      error: `Không thể chuyển từ "${ORDER_STATUS_LABELS[from]}" sang "${ORDER_STATUS_LABELS[to]}"`,
    };
  }

  return { valid: true };
}

/**
 * Kiểm tra xem trạng thái có phải là trạng thái cuối không (không thể chuyển nữa)
 */
export function isFinalStatus(status: string): boolean {
  const transitions = ORDER_STATUS_TRANSITIONS[status] || [];
  return transitions.length === 0;
}

/**
 * Lấy thông báo cảnh báo khi chuyển trạng thái
 */
export function getTransitionWarning(from: string, to: string): string | null {
  if (to === 'cancelled') {
    return 'Hủy đơn hàng sẽ không thể hoàn tác. Bạn có chắc chắn?';
  }
  if (to === 'returned') {
    return 'Đánh dấu đơn hàng là trả hàng. Vui lòng kiểm tra và hoàn tiền cho khách hàng.';
  }
  if (to === 'completed') {
    return 'Đánh dấu đơn hàng hoàn thành. Đơn hàng sẽ không thể chỉnh sửa sau đó.';
  }
  return null;
}
