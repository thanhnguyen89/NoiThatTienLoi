'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrderStatusLabel,
  getPaymentStatusLabel,
  getCustomerTypeLabel,
} from '@/server/validators/order.validator';
import { OrderStatusModal } from './OrderStatusModal';
import { canTransitionStatus, getAvailableStatuses } from './OrderStatusValidator';

function formatPrice(value: unknown): string {
  if (value == null) return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date: Date | string | null, includeTime = false) {
  if (!date) return '—';
  const d = new Date(date);
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  if (!includeTime) return dateStr;
  return `${dateStr} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const statusColorMap: Record<string, string> = {
  pending: 'bg-warning text-dark',
  confirmed: 'bg-primary',
  processing: 'bg-info',
  shipping: 'bg-purple',
  delivered: 'bg-success',
  completed: 'bg-success',
  cancelled: 'bg-danger',
  returned: 'bg-orange',
};

const paymentColorMap: Record<string, string> = {
  unpaid: 'bg-danger',
  partially_paid: 'bg-warning text-dark',
  paid: 'bg-success',
  refunded: 'bg-secondary',
  partially_refunded: 'bg-warning text-dark',
};

interface OrderItem {
  id: string;
  productName: string | null;
  variantName: string | null;
  sku: string | null;
  sizeLabel: string | null;
  colorName: string | null;
  quantity: number;
  unitSalePrice: number;
  unitFinalPrice: number;
  lineDiscountAmount: number;
  lineTotalAmount: number;
}

interface OrderShipment {
  id: string;
  warehouseId: string | null;
  warehouse?: { id: string; name: string; code: string } | null;
  shippingProviderId: string | null;
  shippingProvider?: { id: string; name: string; code: string } | null;
  shippingMethod: string;
  shippingServiceType: string | null;
  shippingCost: number;
  extraCost: number;
  discountAmount: number;
  finalShippingCost: number;
  providerOrderCode: string | null;
  trackingCode: string | null;
  shippedAt: Date | string | null;
  deliveredAt: Date | string | null;
  note: string | null;
}

interface OrderHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByType: string | null;
  changedById: string | null;
  note: string | null;
  createdAt: Date | string;
}

interface Order {
  id: string;
  orderNo: string;
  customerType: string;
  memberId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  shippingContactName: string | null;
  shippingContactPhone: string | null;
  shippingContactEmail: string | null;
  shippingFullAddress: string | null;
  billingFullAddress: string | null;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  otherFeeAmount: number;
  taxAmount: number;
  grandTotalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  orderStatus: string;
  paymentStatus: string;
  customerNote: string | null;
  internalNote: string | null;
  placedAt: Date | string | null;
  createdAt: Date | string;
  items?: OrderItem[];
  shipments?: OrderShipment[];
  histories?: OrderHistory[];
}

interface Props {
  order: Order;
  canEdit?: boolean;
}

export function OrderDetailClient({ order, canEdit = true }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [updating, setUpdating] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState(order.orderStatus);
  const [newPaymentStatus, setNewPaymentStatus] = useState(order.paymentStatus);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const items = order.items || [];
  const shipments = order.shipments || [];
  const histories = (order.histories || []).slice().reverse();

  async function handleUpdateStatus() {
    // Validate status transition
    if (!canTransitionStatus(order.orderStatus, newOrderStatus)) {
      alert(`Không thể chuyển từ "${getOrderStatusLabel(order.orderStatus)}" sang "${getOrderStatusLabel(newOrderStatus)}". Vui lòng chọn trạng thái hợp lệ.`);
      return;
    }

    if (!confirm(`Cập nhật trạng thái đơn thành "${getOrderStatusLabel(newOrderStatus)}"?`)) return;
    setUpdating(true);
    try {
      const res = await fetch(`/admin/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newOrderStatus, internalNote: statusNote }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      setStatusNote('');
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setUpdating(false); }
  }

  async function handleUpdatePaymentStatus() {
    if (!confirm(`Cập nhật thanh toán thành "${getPaymentStatusLabel(newPaymentStatus)}"?`)) return;
    setUpdating(true);
    try {
      const res = await fetch(`/admin/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newPaymentStatus }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setUpdating(false); }
  }

  const availableStatuses = getAvailableStatuses(order.orderStatus);

  return (
    <div>
      {/* Status Modal */}
      {showStatusModal && (
        <OrderStatusModal
          orderId={order.id}
          orderNo={order.orderNo}
          currentStatus={order.orderStatus}
          onClose={() => setShowStatusModal(false)}
        />
      )}

      {/* Breadcrumb */}
      <div className="rk-breadcrumb mb-3">
        <a href="/admin/orders">Quản lý đơn hàng</a>
        <span className="rk-breadcrumb__sep">›</span>
        <span className="rk-breadcrumb__current">{order.orderNo}</span>
      </div>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0">Đơn hàng #{order.orderNo}</h5>
          <div className="small text-muted mt-1">
            Ngày đặt: <strong>{formatDate(order.placedAt || order.createdAt, true)}</strong>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowStatusModal(true)}
            disabled={availableStatuses.length === 0}
            title={availableStatuses.length === 0 ? 'Không thể thay đổi trạng thái' : 'Thay đổi trạng thái nhanh'}
          >
            <i className="bi bi-arrow-repeat me-1"></i>Đổi trạng thái
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/orders')}>
            <i className="bi bi-x-lg me-1"></i>Đóng
          </button>
          <a href={`/admin/orders/${order.id}?action=edit`} className="btn btn-sm btn-primary">
            <i className="bi bi-pencil-fill me-1"></i>Sửa đơn hàng
          </a>
        </div>
      </div>

      {/* Badges */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <span className={`badge ${statusColorMap[order.orderStatus] || 'bg-secondary'} fs-6`}>
          {getOrderStatusLabel(order.orderStatus)}
        </span>
        <span className={`badge ${paymentColorMap[order.paymentStatus] || 'bg-secondary'}`}>
          {getPaymentStatusLabel(order.paymentStatus)}
        </span>
        <span className={`badge ${order.customerType === 'member' ? 'bg-primary' : 'bg-secondary'}`}>
          {getCustomerTypeLabel(order.customerType)}
        </span>
        {order.memberId && (
          <span className="badge bg-info">
            <i className="bi bi-person-fill me-1"></i>Thành viên #{order.memberId}
          </span>
        )}
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="bi bi-info-circle me-1"></i>Tổng quan
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            <i className="bi bi-box-seam me-1"></i>Sản phẩm ({items.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'shipping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipping')}
          >
            <i className="bi bi-truck me-1"></i>Vận chuyển ({shipments.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="bi bi-clock-history me-1"></i>Lịch sử ({histories.length})
          </button>
        </li>
      </ul>

      {/* TAB: Tổng quan */}
      {activeTab === 'overview' && (
        <div className="row g-3">
          {/* Thông tin khách hàng */}
          <div className="col-md-6">
            <div className="order-detail-section">
              <div className="order-detail-section-title">
                <i className="bi bi-person-fill me-1"></i>Thông tin khách hàng
              </div>
              <div className="order-address-card">
                <div className="mb-2">
                  <strong>{order.customerName || '—'}</strong>
                </div>
                {order.customerPhone && (
                  <div className="mb-1">
                    <i className="bi bi-telephone me-2 text-muted"></i>
                    {order.customerPhone}
                  </div>
                )}
                {order.customerEmail && (
                  <div className="mb-1">
                    <i className="bi bi-envelope me-2 text-muted"></i>
                    {order.customerEmail}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Thông tin giao hàng */}
          <div className="col-md-6">
            <div className="order-detail-section">
              <div className="order-detail-section-title">
                <i className="bi bi-geo-alt-fill me-1"></i>Địa chỉ giao hàng
              </div>
              <div className="order-address-card">
                {order.shippingContactName && (
                  <div className="mb-1"><strong>{order.shippingContactName}</strong></div>
                )}
                {order.shippingContactPhone && (
                  <div className="mb-1 text-muted small">{order.shippingContactPhone}</div>
                )}
                {order.shippingFullAddress ? (
                  <div className="mt-2 text-muted">{order.shippingFullAddress}</div>
                ) : (
                  <div className="text-muted">Chưa có địa chỉ</div>
                )}
              </div>
            </div>
          </div>

          {/* Thông tin thanh toán */}
          <div className="col-md-6">
            <div className="order-detail-section">
              <div className="order-detail-section-title">
                <i className="bi bi-credit-card me-1"></i>Thông tin thanh toán
              </div>
              <div className="order-address-card">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Tiền hàng:</span>
                  <span>{formatPrice(order.subtotalAmount)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Giảm giá:</span>
                  <span className="text-success">- {formatPrice(order.discountAmount)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Phí vận chuyển:</span>
                  <span>+ {formatPrice(order.shippingAmount)}</span>
                </div>
                {(order.otherFeeAmount > 0 || order.taxAmount > 0) && (
                  <>
                    {order.otherFeeAmount > 0 && (
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Phụ phí:</span>
                        <span>+ {formatPrice(order.otherFeeAmount)}</span>
                      </div>
                    )}
                    {order.taxAmount > 0 && (
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Thuế:</span>
                        <span>+ {formatPrice(order.taxAmount)}</span>
                      </div>
                    )}
                  </>
                )}
                <hr className="my-2" />
                <div className="d-flex justify-content-between fw-bold text-danger mb-2">
                  <span>Tổng cộng:</span>
                  <span>{formatPrice(order.grandTotalAmount)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Đã đặt cọc:</span>
                  <span className="text-success">{formatPrice(order.depositAmount)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Còn lại:</span>
                  <span className="text-warning fw-semibold">{formatPrice(order.remainingAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cập nhật trạng thái */}
          <div className="col-md-6">
            <div className="order-detail-section">
              <div className="order-detail-section-title">
                <i className="bi bi-gear me-1"></i>Cập nhật trạng thái
              </div>
              <div className="order-address-card">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Trạng thái đơn hàng</label>
                  <div className="row">
                    <div className="col-md-9">
                        <select
                          className="form-select form-select-sm"
                          value={newOrderStatus}
                          onChange={(e) => setNewOrderStatus(e.target.value)}
                          disabled={updating}
                        >
                          <option value="pending">Chờ xử lý</option>
                          <option value="confirmed">Đã xác nhận</option>
                          <option value="processing">Đang xử lý</option>
                          <option value="shipping">Đang giao</option>
                          <option value="delivered">Đã giao</option>
                          <option value="completed">Hoàn thành</option>
                          <option value="cancelled">Đã hủy</option>
                          <option value="returned">Hoàn trả</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                      <button
                      className="btn btn-sm btn-primary"
                      onClick={handleUpdateStatus}
                      disabled={updating || newOrderStatus === order.orderStatus}
                    >
                      {updating ? <span className="spinner-border spinner-border-sm"></span> : null}
                      <i className="bi bi-check2 me-1"></i>Cập nhật
                    </button>
                    </div>
                  </div>
                </div>
                  <label className="form-label small fw-semibold">Trạng thái thanh toán</label>
                <div className="row mb-3">
                  <div className="col-md-9">
                      <select
                        className="form-select form-select-sm"
                        value={newPaymentStatus}
                        onChange={(e) => setNewPaymentStatus(e.target.value)}
                        disabled={updating}
                      >
                        <option value="unpaid">Chưa thanh toán</option>
                        <option value="partially_paid">Thanh toán 1 phần</option>
                        <option value="paid">Đã thanh toán</option>
                        <option value="refunded">Đã hoàn tiền</option>
                        <option value="partially_refunded">Hoàn tiền 1 phần</option>
                      </select>
                  </div>
                   <div className="col-md-3">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={handleUpdatePaymentStatus}
                      disabled={updating || newPaymentStatus === order.paymentStatus}
                    >
                      {updating ? <span className="spinner-border spinner-border-sm"></span> : null}
                      <i className="bi bi-check2 me-1"></i>Cập nhật
                    </button>
                   </div>
                </div>
                <div>
                  <label className="form-label small fw-semibold">Ghi chú nội bộ</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Nhập ghi chú khi cập nhật trạng thái..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          {(order.customerNote || order.internalNote) && (
            <div className="col-12">
              <div className="order-detail-section">
                <div className="order-detail-section-title">
                  <i className="bi bi-sticky me-1"></i>Ghi chú
                </div>
                <div className="d-flex flex-column gap-2">
                  {order.customerNote && (
                    <div className="alert alert-info mb-0 py-2">
                      <strong>Ghi chú khách hàng:</strong> {order.customerNote}
                    </div>
                  )}
                  {order.internalNote && (
                    <div className="alert alert-secondary mb-0 py-2">
                      <strong>Ghi chú nội bộ:</strong> {order.internalNote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Sản phẩm */}
      {activeTab === 'items' && (
        <div>
          {items.length === 0 ? (
            <div className="rk-empty">
              <i className="bi bi-box-seam"></i>
              Chưa có sản phẩm nào trong đơn hàng.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered order-items-table mb-0">
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: 40 }}>STT</th>
                    <th>Sản phẩm</th>
                    <th style={{ width: 100 }}>SKU</th>
                    <th style={{ width: 100 }}>Biến thể</th>
                    <th className="text-center" style={{ width: 60 }}>SL</th>
                    <th className="text-end" style={{ width: 120 }}>Đơn giá</th>
                    <th className="text-end" style={{ width: 100 }}>Giảm giá</th>
                    <th className="text-end" style={{ width: 120 }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>
                        <div className="fw-semibold small">{item.productName || '—'}</div>
                      </td>
                      <td><code className="small">{item.sku || '—'}</code></td>
                      <td className="small">
                        {item.sizeLabel && <span className="badge bg-secondary me-1">{item.sizeLabel}</span>}
                        {item.colorName && <span className="badge bg-secondary">{item.colorName}</span>}
                        {item.variantName && !item.sizeLabel && !item.colorName && (
                          <span className="text-muted">{item.variantName}</span>
                        )}
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-end">{formatPrice(item.unitSalePrice)}</td>
                      <td className="text-end text-success">- {formatPrice(item.lineDiscountAmount)}</td>
                      <td className="text-end fw-semibold text-danger">{formatPrice(item.lineTotalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="text-end fw-semibold">Tổng tiền hàng:</td>
                    <td colSpan={2} className="text-end fw-semibold text-danger">
                      {formatPrice(order.subtotalAmount - order.discountAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Vận chuyển */}
      {activeTab === 'shipping' && (
        <div>
          {shipments.length === 0 ? (
            <div className="rk-empty">
              <i className="bi bi-truck"></i>
              Chưa có thông tin vận chuyển.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {shipments.map((shipment, idx) => (
                <div key={shipment.id} className="card">
                  <div className="card-header-custom">
                    <span className="badge bg-purple me-2">Lô #{idx + 1}</span>
                    {shipment.shippingProvider?.name && (
                      <span className="fw-semibold">{shipment.shippingProvider.name}</span>
                    )}
                    <div className="header-icons">
                      {shipment.trackingCode && (
                        <span className="small text-muted">
                          <i className="bi bi-qr-code me-1"></i>
                          {shipment.trackingCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="card-body p-2">
                    <div className="row g-2">
                      {shipment.warehouse && (
                        <div className="col-md-4">
                          <div className="small text-muted">Kho xuất hàng</div>
                          <div className="fw-semibold small">{shipment.warehouse.name}</div>
                        </div>
                      )}
                      {shipment.shippingProvider && (
                        <div className="col-md-4">
                          <div className="small text-muted">Đơn vị vận chuyển</div>
                          <div className="fw-semibold small">{shipment.shippingProvider.name}</div>
                        </div>
                      )}
                      <div className="col-md-4">
                        <div className="small text-muted">Phương tiện</div>
                        <div className="fw-semibold small">
                          {shipment.shippingMethod === 'motorbike' ? 'Xe máy' :
                           shipment.shippingMethod === 'van' ? 'Xe van' :
                           shipment.shippingMethod === 'truck' ? 'Xe tải' :
                           shipment.shippingMethod === 'pickup' ? 'Pickup' : '—'}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="small text-muted">Phí vận chuyển</div>
                        <div className="fw-semibold small text-danger">{formatPrice(shipment.finalShippingCost)}</div>
                      </div>
                      {shipment.shippedAt && (
                        <div className="col-md-4">
                          <div className="small text-muted">Ngày xuất kho</div>
                          <div className="fw-semibold small">{formatDate(shipment.shippedAt, true)}</div>
                        </div>
                      )}
                      {shipment.deliveredAt ? (
                        <div className="col-md-4">
                          <div className="small text-muted">Đã giao lúc</div>
                          <div className="fw-semibold small text-success">{formatDate(shipment.deliveredAt, true)}</div>
                        </div>
                      ) : (
                        <div className="col-md-4">
                          <div className="small text-muted">Dự kiến giao</div>
                          <div className="fw-semibold small text-warning">Chưa giao</div>
                        </div>
                      )}
                      {shipment.trackingCode && (
                        <div className="col-12">
                          <div className="small text-muted">Mã vận đơn</div>
                          <div className="fw-semibold small">
                            <code>{shipment.trackingCode}</code>
                          </div>
                        </div>
                      )}
                      {shipment.note && (
                        <div className="col-12">
                          <div className="small text-muted">Ghi chú</div>
                          <div className="fw-semibold small">{shipment.note}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Lịch sử */}
      {activeTab === 'history' && (
        <div>
          {histories.length === 0 ? (
            <div className="rk-empty">
              <i className="bi bi-clock-history"></i>
              Chưa có lịch sử thay đổi.
            </div>
          ) : (
            <div className="order-timeline">
              {histories.map((h) => (
                <div key={h.id} className="order-timeline-item">
                  <div className="order-timeline-time">
                    <i className="bi bi-clock me-1"></i>
                    {formatDate(h.createdAt, true)}
                  </div>
                  <div className="order-timeline-title">
                    {h.fromStatus ? (
                      <>
                        <span className={`badge ${statusColorMap[h.fromStatus] || 'bg-secondary'} me-1`} style={{ fontSize: 10 }}>
                          {getOrderStatusLabel(h.fromStatus)}
                        </span>
                        <i className="bi bi-arrow-right mx-1 text-muted"></i>
                        <span className={`badge ${statusColorMap[h.toStatus] || 'bg-secondary'} ms-1`} style={{ fontSize: 10 }}>
                          {getOrderStatusLabel(h.toStatus)}
                        </span>
                      </>
                    ) : (
                      <span className={`badge ${statusColorMap[h.toStatus] || 'bg-secondary'}`}>
                        {getOrderStatusLabel(h.toStatus)}
                      </span>
                    )}
                  </div>
                  <div className="order-timeline-body">
                    Bởi: <strong>{h.changedByType || 'system'}</strong>
                    {h.changedById && ` (#${h.changedById})`}
                  </div>
                  {h.note && (
                    <div className="order-timeline-note">
                      <i className="bi bi-sticky me-1"></i>{h.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Form cập nhật trạng thái */}
          {canEdit && (
            <div className="mt-4 p-3 border rounded bg-light">
              <div className="fw-semibold mb-2">
                <i className="bi bi-pencil-square me-1"></i>Cập nhật trạng thái
              </div>
              <div className="d-flex gap-2 mb-2">
                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: 200 }}
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value)}
                  disabled={updating}
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="shipping">Đang giao</option>
                  <option value="delivered">Đã giao</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                  <option value="returned">Hoàn trả</option>
                </select>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleUpdateStatus}
                  disabled={updating || newOrderStatus === order.orderStatus}
                >
                  {updating ? <span className="spinner-border spinner-border-sm"></span> : null}
                  <i className="bi bi-check2 me-1"></i>Cập nhật
                </button>
              </div>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Ghi chú (tùy chọn)..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}