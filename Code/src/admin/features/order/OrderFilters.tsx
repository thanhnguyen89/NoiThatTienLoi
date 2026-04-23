'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface Props {
  defaultSearch: string;
  defaultStatus: string;
  defaultPaymentStatus: string;
  defaultCustomerType: string;
  defaultDateFrom: string;
  defaultDateTo: string;
  defaultPriceMin?: string;
  defaultPriceMax?: string;
  defaultWarehouse?: string;
  defaultShippingProvider?: string;
  warehouses?: Array<{ id: string; name: string }>;
  shippingProviders?: Array<{ id: string; name: string }>;
}

export function OrderFilters({
  defaultSearch,
  defaultStatus,
  defaultPaymentStatus,
  defaultCustomerType,
  defaultDateFrom,
  defaultDateTo,
  defaultPriceMin,
  defaultPriceMax,
  defaultWarehouse,
  defaultShippingProvider,
  warehouses = [],
  shippingProviders = [],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(defaultSearch);
  const [status, setStatus] = useState(defaultStatus);
  const [paymentStatus, setPaymentStatus] = useState(defaultPaymentStatus);
  const [customerType, setCustomerType] = useState(defaultCustomerType);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [priceMin, setPriceMin] = useState(defaultPriceMin || '');
  const [priceMax, setPriceMax] = useState(defaultPriceMax || '');
  const [warehouse, setWarehouse] = useState(defaultWarehouse || '');
  const [shippingProvider, setShippingProvider] = useState(defaultShippingProvider || '');

  const push = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSearch = () => {
    push({
      search: search.trim() || undefined,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      customerType: customerType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
      warehouse: warehouse || undefined,
      shippingProvider: shippingProvider || undefined,
    });
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setPaymentStatus('');
    setCustomerType('');
    setDateFrom('');
    setDateTo('');
    setPriceMin('');
    setPriceMax('');
    setWarehouse('');
    setShippingProvider('');
    push({
      search: undefined,
      status: undefined,
      paymentStatus: undefined,
      customerType: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      priceMin: undefined,
      priceMax: undefined,
      warehouse: undefined,
      shippingProvider: undefined,
    });
  };

  return (
    <div>
      <div className="row g-2 align-items-end">
        <div className="col-md-4">
          <label className="form-label">Từ khóa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Mã đơn, tên, SĐT, email..."
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Trạng thái</label>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
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
        <div className="col-md-4">
          <label className="form-label">Thanh toán</label>
          <select
            className="form-select form-select-sm"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="unpaid">Chưa thanh toán</option>
            <option value="partially_paid">Thanh toán 1 phần</option>
            <option value="paid">Đã thanh toán</option>
            <option value="refunded">Đã hoàn tiền</option>
            <option value="partially_refunded">Hoàn tiền 1 phần</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Loại khách</label>
          <select
            className="form-select form-select-sm"
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="member">Thành viên</option>
            <option value="guest">Khách</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Từ ngày</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Đến ngày</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Tổng tiền từ (VNĐ)</label>
          <input
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="0"
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Tổng tiền đến (VNĐ)</label>
          <input
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="999999999"
            className="form-control form-control-sm"
          />
        </div>
        {warehouses.length > 0 && (
          <div className="col-md-6">
            <label className="form-label">Kho xuất hàng</label>
            <select
              className="form-select form-select-sm"
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            >
              <option value="">Tất cả</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {shippingProviders.length > 0 && (
          <div className="col-md-6">
            <label className="form-label">Đơn vị vận chuyển</label>
            <select
              className="form-select form-select-sm"
              value={shippingProvider}
              onChange={(e) => setShippingProvider(e.target.value)}
            >
              <option value="">Tất cả</option>
              {shippingProviders.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="row mt-2">
        <div className="col-md-12 d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-search"
            onClick={handleSearch}
          >
            <i className="bi bi-search me-1"></i>Tìm kiếm
          </button>
          <button
            type="button"
            className="btn btn-sm btn-reset"
            onClick={handleReset}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </div>
  );
}
