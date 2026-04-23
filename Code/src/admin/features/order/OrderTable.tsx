'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  getOrderStatusLabel,
  getPaymentStatusLabel,
  getCustomerTypeLabel,
} from '@/server/validators/order.validator';
import type { OrderListItem } from '@/server/repositories/order.repository';

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

function formatDate(date: Date | string | null) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

export function OrderTable({ orders = [] }: { orders: OrderListItem[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleDelete(item: OrderListItem) {
    if (!confirm(`Xóa đơn hàng "${item.orderNo}"?`)) return;
    setDeletingIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(`/admin/api/orders/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingIds((prev) => { const n = new Set(prev); n.delete(item.id); return n; }); }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Xóa ${selectedIds.size} đơn hàng đã chọn?`)) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        [...selectedIds].map((id) =>
          fetch(`/admin/api/orders/${id}`, { method: 'DELETE' }).then((r) => r.json())
        )
      );
      const failed = results.filter((r) => r.status === 'rejected' || !((r as PromiseFulfilledResult<{ success: boolean }>).value?.success));
      if (failed.length > 0) {
        alert(`Đã xóa ${results.length - failed.length}/${results.length} đơn. Một số đơn xóa thất bại.`);
      }
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setBulkLoading(false); }
  }

  async function handleBulkChangeStatus() {
    if (!bulkStatus || selectedIds.size === 0) return;
    if (!confirm(`Cập nhật trạng thái "${getOrderStatusLabel(bulkStatus)}" cho ${selectedIds.size} đơn đã chọn?`)) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        [...selectedIds].map((id) =>
          fetch(`/admin/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderStatus: bulkStatus }),
          }).then((r) => r.json())
        )
      );
      const failed = results.filter((r) => r.status === 'rejected' || !((r as PromiseFulfilledResult<{ success: boolean }>).value?.success));
      if (failed.length > 0) {
        alert(`Đã cập nhật ${results.length - failed.length}/${results.length} đơn.`);
      }
      setSelectedIds(new Set());
      setBulkStatus('');
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setBulkLoading(false); }
  }

  if (!orders.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-receipt fs-1 d-block mb-2"></i>
              Không tìm thấy đơn hàng nào.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-3 mb-2 py-2 px-3 flex-wrap">
          <span className="fw-semibold">Đã chọn: <strong>{selectedIds.size}</strong> đơn hàng</span>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: 160 }}
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">— Chọn trạng thái —</option>
              <option value="pending">Chờ xử lý</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="processing">Đang xử lý</option>
              <option value="shipping">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <button
              className="btn btn-sm btn-primary"
              disabled={!bulkStatus || bulkLoading}
              onClick={handleBulkChangeStatus}
            >
              {bulkLoading ? <span className="spinner-border spinner-border-sm"></span> : null}
              <i className="bi bi-check2 me-1"></i>Đổi trạng thái
            </button>
            <button
              className="btn btn-sm btn-danger"
              disabled={bulkLoading}
              onClick={handleBulkDelete}
            >
              {bulkLoading ? <span className="spinner-border spinner-border-sm"></span> : null}
              <i className="bi bi-trash me-1"></i>Xóa đã chọn
            </button>
          </div>
          <button
            className="btn btn-sm btn-light ms-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            <i className="bi bi-x-lg me-1"></i>Bỏ chọn
          </button>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-bordered mb-0 w-100">
          <thead>
            <tr>
              <th className="text-center" style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </th>
              <th className="text-center" style={{ width: 50 }}>STT</th>
              <th style={{ width: 150 }}>Mã đơn</th>
              <th>Khách hàng</th>
              <th style={{ width: 90 }}>Loại</th>
              <th className="text-end" style={{ width: 130 }}>Tổng tiền</th>
              <th className="text-end" style={{ width: 110 }}>Đặt cọc</th>
              <th className="text-end" style={{ width: 110 }}>Còn lại</th>
              <th style={{ width: 120 }}>Trạng thái</th>
              <th style={{ width: 120 }}>Thanh toán</th>
              <th style={{ width: 140 }}>Ngày đặt</th>
              <th className="text-center" style={{ width: 150 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((item, idx) => (
              <tr key={item.id} className={selectedIds.has(item.id) ? 'table-active' : ''}>
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggle(item.id)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </td>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <code className="small fw-semibold">{item.orderNo}</code>
                </td>
                <td>
                  <div className="fw-semibold small">{item.customerName || '—'}</div>
                  {item.customerPhone && (
                    <div className="small text-muted">{item.customerPhone}</div>
                  )}
                  {item.customerEmail && (
                    <div className="small text-muted" style={{ fontSize: 11 }}>{item.customerEmail}</div>
                  )}
                </td>
                <td>
                  <span className={`badge ${item.customerType === 'member' ? 'bg-primary' : 'bg-secondary'}`}>
                    {getCustomerTypeLabel(item.customerType)}
                  </span>
                </td>
                <td className="text-end fw-semibold text-danger" style={{ fontWeight: 700}}>
                  {formatPrice(item.grandTotalAmount)}
                </td>
                <td className="text-end text-success" style={{ fontSize: 12 }}>
                  {formatPrice(item.depositAmount)}
                </td>
                <td className="text-end text-warning" style={{ fontSize: 12 }}>
                  {formatPrice(item.remainingAmount)}
                </td>
                <td>
                  <span className={`badge ${statusColorMap[item.orderStatus] || 'bg-secondary'}`}>
                    {getOrderStatusLabel(item.orderStatus)}
                  </span>
                </td>
                <td>
                  <span className={`badge ${paymentColorMap[item.paymentStatus] || 'bg-secondary'}`}>
                    {getPaymentStatusLabel(item.paymentStatus)}
                  </span>
                </td>
                <td className="small">{formatDate(item.placedAt || item.createdAt)}</td>
                <td className="text-center">
                  <a
                    href={`/admin/orders/${item.id}`}
                    className="btn btn-sm btn-detail btn-reset me-1"
                    title="Chi tiết"
                  >
                    <i className="bi bi-eye-fill"></i>
                  </a>
                  <a
                    href={`/admin/orders/${item.id}?action=edit`}
                    className="btn btn-sm btn-edit me-1"
                    title="Sửa"
                  >
                    <i className="bi bi-pencil-fill"></i>
                  </a>
                  <button
                    className="btn btn-sm btn-del"
                    title="Xóa"
                    onClick={() => handleDelete(item)}
                    disabled={deletingIds.has(item.id)}
                  >
                    {deletingIds.has(item.id) ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className="bi bi-trash-fill"></i>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
