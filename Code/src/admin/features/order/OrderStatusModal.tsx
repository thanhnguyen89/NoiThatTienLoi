'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  canTransitionStatus,
  getAvailableStatuses,
  ORDER_STATUS_LABELS,
  getTransitionWarning,
} from './OrderStatusValidator';

interface OrderStatusModalProps {
  orderId: string;
  orderNo: string;
  currentStatus: string;
  onClose: () => void;
}

export function OrderStatusModal({
  orderId,
  orderNo,
  currentStatus,
  onClose,
}: OrderStatusModalProps) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [updating, setUpdating] = useState(false);

  const availableStatuses = getAvailableStatuses(currentStatus);

  async function handleSubmit() {
    if (newStatus === currentStatus) {
      alert('Vui lòng chọn trạng thái mới');
      return;
    }

    if (!canTransitionStatus(currentStatus, newStatus)) {
      alert(`Không thể chuyển từ "${ORDER_STATUS_LABELS[currentStatus]}" sang "${ORDER_STATUS_LABELS[newStatus]}"`);
      return;
    }

    const warning = getTransitionWarning(currentStatus, newStatus);
    if (warning && !confirm(warning)) {
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/admin/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus: newStatus,
          internalNote: note || undefined,
          sendEmail,
          sendSMS,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Lỗi khi cập nhật trạng thái');
        return;
      }

      alert('Cập nhật trạng thái thành công!');
      onClose();
      router.refresh();
    } catch (error) {
      alert('Lỗi kết nối');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-arrow-repeat me-2"></i>
              Thay đổi trạng thái đơn hàng
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={updating}
            ></button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">Đơn hàng:</label>
              <div className="text-primary">#{orderNo}</div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Trạng thái hiện tại:</label>
              <div>
                <span className={`badge bg-${ORDER_STATUS_LABELS[currentStatus] ? 'primary' : 'secondary'}`}>
                  {ORDER_STATUS_LABELS[currentStatus] || currentStatus}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Trạng thái mới: *</label>
              <select
                className="form-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={updating}
              >
                <option value={currentStatus}>
                  {ORDER_STATUS_LABELS[currentStatus] || currentStatus}
                </option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABELS[status] || status}
                  </option>
                ))}
              </select>
              {availableStatuses.length === 0 && (
                <small className="text-muted">
                  Không thể chuyển sang trạng thái khác từ trạng thái hiện tại.
                </small>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Ghi chú:</label>
              <textarea
                className="form-control"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú về việc thay đổi trạng thái..."
                disabled={updating}
              />
            </div>

            <div className="mb-2">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={updating}
                />
                <label className="form-check-label" htmlFor="sendEmail">
                  <i className="bi bi-envelope me-1"></i>
                  Gửi email thông báo cho khách hàng
                </label>
              </div>
            </div>

            <div className="mb-0">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="sendSMS"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  disabled={updating}
                />
                <label className="form-check-label" htmlFor="sendSMS">
                  <i className="bi bi-phone me-1"></i>
                  Gửi SMS thông báo
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={updating}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={updating || newStatus === currentStatus}
            >
              {updating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <i className="bi bi-check2 me-1"></i>
                  Xác nhận thay đổi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
