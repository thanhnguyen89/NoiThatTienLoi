'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AddressInfo {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  addressLine: string;
  fullAddress: string;
}

interface CartItem {
  productId: string;
  productName: string;
  sku: string | null;
  variantId: string | null;
  variantName: string | null;
  sizeLabel: string | null;
  colorName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface ShippingInfo {
  warehouseId: string;
  shippingProviderId: string;
  shippingMethod: string;
  shippingServiceType: string;
  shippingCost: number;
  extraCost: number;
  discountAmount: number;
  finalShippingCost: number;
  note: string;
}

const STEPS = [
  { id: 1, label: 'Khách hàng' },
  { id: 2, label: 'Sản phẩm' },
  { id: 3, label: 'Vận chuyển' },
  { id: 4, label: 'Xác nhận' },
];

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function OrderStepBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="order-step-bar">
      {STEPS.map((step) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;
        return (
          <div
            key={step.id}
            className={`order-step-item ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
          >
            <div className="order-step-circle">
              {isDone ? <i className="bi bi-check"></i> : step.id}
            </div>
            <div className="order-step-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}

interface Member {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface ShippingProvider {
  id: string;
  name: string;
  code: string;
}

interface OrderFormProps {
  // optional: pass existing order to edit
  orderId?: string;
  initialData?: any;
}

export function OrderForm({ orderId, initialData }: OrderFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!orderId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Customer
  const [customerType, setCustomerType] = useState<'member' | 'guest'>('guest');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Member search
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [searchingMember, setSearchingMember] = useState(false);

  // Step 1: Shipping address
  const [shippingContactName, setShippingContactName] = useState('');
  const [shippingContactPhone, setShippingContactPhone] = useState('');
  const [shippingProvince, setShippingProvince] = useState('');
  const [shippingDistrict, setShippingDistrict] = useState('');
  const [shippingWard, setShippingWard] = useState('');
  const [shippingAddressLine, setShippingAddressLine] = useState('');
  const [shippingNote, setShippingNote] = useState('');

  // Step 2: Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Array<{
    id: string; name: string; sku: string | null; salePrice: number;
    variants?: Array<{ id: string; variantName: string; sku: string; salePrice: number; stockQty: number }>;
  }>>([]);
  const [searching, setSearching] = useState(false);

  // Step 3: Shipping
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [shippingMethod, setShippingMethod] = useState('van');
  const [shippingCost, setShippingCost] = useState(0);
  const [extraCost, setExtraCost] = useState(0);
  const [shippingNoteForm, setShippingNoteForm] = useState('');

  // Step 4: Confirm
  const [depositAmount, setDepositAmount] = useState(0);
  const [orderNote, setOrderNote] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const grandTotal = subtotal + shippingCost + extraCost;
  const remaining = grandTotal - depositAmount;

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!customerName.trim()) errs.customerName = 'Họ tên bắt buộc';
      if (!shippingContactName.trim()) errs.shippingContactName = 'Người nhận bắt buộc';
      if (!shippingContactPhone.trim()) errs.shippingContactPhone = 'SĐT người nhận bắt buộc';
      if (!shippingProvince) errs.province = 'Tỉnh/TP bắt buộc';
      if (!shippingDistrict) errs.district = 'Quận/Huyện bắt buộc';
      if (!shippingAddressLine.trim()) errs.addressLine = 'Địa chỉ bắt buộc';
    }
    if (s === 2) {
      if (cartItems.length === 0) errs.cart = 'Phải chọn ít nhất 1 sản phẩm';
    }
    if (s === 3) {
      if (!selectedWarehouse) errs.warehouse = 'Phải chọn kho xuất hàng';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  }

  async function handleSubmit() {
    if (!validateStep(step)) return;
    if (!confirm('Tạo đơn hàng này?')) return;

    setSubmitting(true);
    try {
      const payload = {
        customerType,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        shippingContactName,
        shippingContactPhone,
        shippingContactEmail: customerEmail || null,
        shippingProvinceCode: '',
        shippingProvinceName: shippingProvince,
        shippingDistrictCode: '',
        shippingDistrictName: shippingDistrict,
        shippingWardCode: '',
        shippingWardName: shippingWard,
        shippingAddressLine,
        shippingFullAddress: `${shippingAddressLine}, ${shippingWard}, ${shippingDistrict}, ${shippingProvince}`,
        subtotalAmount: subtotal,
        discountAmount: 0,
        shippingAmount: shippingCost,
        otherFeeAmount: extraCost,
        taxAmount: 0,
        grandTotalAmount: grandTotal,
        depositAmount,
        remainingAmount: remaining,
        orderStatus: 'pending',
        paymentStatus: depositAmount > 0 ? 'partially_paid' : 'unpaid',
        customerNote: shippingNote || null,
        internalNote: internalNote || null,
        placedAt: new Date().toISOString(),
      };

      const res = await fetch('/admin/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Lỗi khi tạo đơn hàng');
        return;
      }
      alert('Tạo đơn hàng thành công!');
      router.push('/admin/orders');
      router.refresh();
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  }

  async function searchProducts() {
    if (!productSearch.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/admin/api/products?search=${encodeURIComponent(productSearch)}&pageSize=10`);
      const json = await res.json();
      if (json.success) {
        setProductResults(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  function addProductToCart(product: CartItem) {
    const existing = cartItems.find(
      (c) => c.productId === product.productId && c.variantId === product.variantId
    );
    if (existing) {
      setCartItems((prev) =>
        prev.map((c) =>
          c.productId === product.productId && c.variantId === product.variantId
            ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice }
            : c
        )
      );
    } else {
      setCartItems((prev) => [...prev, { ...product }]);
    }
  }

  function removeCartItem(productId: string, variantId: string | null) {
    setCartItems((prev) =>
      prev.filter((c) => !(c.productId === productId && c.variantId === variantId))
    );
  }

  function updateCartQty(productId: string, variantId: string | null, qty: number) {
    if (qty <= 0) {
      removeCartItem(productId, variantId);
      return;
    }
    setCartItems((prev) =>
      prev.map((c) =>
        c.productId === productId && c.variantId === variantId
          ? { ...c, quantity: qty, lineTotal: qty * c.unitPrice }
          : c
      )
    );
  }

  return (
    <div className="card">
      <div className="card-header-custom">
        {orderId ? 'SỬA ĐƠN HÀNG' : 'TẠO ĐƠN HÀNG MỚI'}
        <div className="header-icons">
          <Link href="/admin/orders" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i>Quay lại
          </Link>
        </div>
      </div>
      <div className="card-body p-3">
        <OrderStepBar currentStep={step} />

        {errors.cart && (
          <div className="alert alert-danger py-2 mb-3">{errors.cart}</div>
        )}

        {/* STEP 1: Customer */}
        {step === 1 && (
          <div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="order-detail-section">
                  <div className="order-detail-section-title">Thông tin khách hàng</div>
                  <div className="mb-3">
                    <label className="form-label">Loại khách</label>
                    <div className="d-flex gap-3">
                      <label className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          name="customerType"
                          value="guest"
                          checked={customerType === 'guest'}
                          onChange={() => setCustomerType('guest')}
                        />
                        <span className="form-check-label">Khách vãng lai</span>
                      </label>
                      <label className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          name="customerType"
                          value="member"
                          checked={customerType === 'member'}
                          onChange={() => setCustomerType('member')}
                        />
                        <span className="form-check-label">Thành viên</span>
                      </label>
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Họ tên *</label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${errors.customerName ? 'is-invalid' : ''}`}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                    />
                    {errors.customerName && <div className="invalid-feedback">{errors.customerName}</div>}
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0901234567"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="order-detail-section">
                  <div className="order-detail-section-title">Địa chỉ giao hàng</div>
                  <div className="mb-2">
                    <label className="form-label">Người nhận *</label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${errors.shippingContactName ? 'is-invalid' : ''}`}
                      value={shippingContactName}
                      onChange={(e) => setShippingContactName(e.target.value)}
                      placeholder="Tên người nhận"
                    />
                    {errors.shippingContactName && <div className="invalid-feedback">{errors.shippingContactName}</div>}
                  </div>
                  <div className="mb-2">
                    <label className="form-label">SĐT người nhận *</label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${errors.shippingContactPhone ? 'is-invalid' : ''}`}
                      value={shippingContactPhone}
                      onChange={(e) => setShippingContactPhone(e.target.value)}
                      placeholder="0901234567"
                    />
                    {errors.shippingContactPhone && <div className="invalid-feedback">{errors.shippingContactPhone}</div>}
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-md-4">
                      <label className="form-label">Tỉnh/TP *</label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${errors.province ? 'is-invalid' : ''}`}
                        value={shippingProvince}
                        onChange={(e) => setShippingProvince(e.target.value)}
                        placeholder="TP.HCM"
                      />
                      {errors.province && <div className="invalid-feedback">{errors.province}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Quận/Huyện *</label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${errors.district ? 'is-invalid' : ''}`}
                        value={shippingDistrict}
                        onChange={(e) => setShippingDistrict(e.target.value)}
                        placeholder="Quận 1"
                      />
                      {errors.district && <div className="invalid-feedback">{errors.district}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Phường/Xã</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={shippingWard}
                        onChange={(e) => setShippingWard(e.target.value)}
                        placeholder="Phường Bến Nghé"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Địa chỉ chi tiết *</label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${errors.addressLine ? 'is-invalid' : ''}`}
                      value={shippingAddressLine}
                      onChange={(e) => setShippingAddressLine(e.target.value)}
                      placeholder="123 Đường ABC, số nhà..."
                    />
                    {errors.addressLine && <div className="invalid-feedback">{errors.addressLine}</div>}
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Ghi chú giao hàng</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={shippingNote}
                      onChange={(e) => setShippingNote(e.target.value)}
                      placeholder="Giao hàng giờ hành chính..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <button className="btn btn-primary btn-sm" onClick={handleNext}>
                Tiếp theo: Sản phẩm <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Products */}
        {step === 2 && (
          <div>
            <div className="row g-3">
              <div className="col-md-5">
                <div className="order-detail-section">
                  <div className="order-detail-section-title">Tìm kiếm sản phẩm</div>
                  <div className="mb-2">
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
                        placeholder="Tên hoặc SKU sản phẩm..."
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={searchProducts}
                        disabled={searching}
                      >
                        {searching ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-search"></i>}
                      </button>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {productResults.map((p) => (
                      <div key={p.id} className="card p-2">
                        <div className="fw-semibold small mb-1">{p.name}</div>
                        <div className="small text-muted mb-2">
                          SKU: {p.sku || '—'} — Giá: <strong className="text-danger">{formatPrice(p.salePrice)}</strong>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-primary w-100"
                          onClick={() => addProductToCart({
                            productId: p.id,
                            productName: p.name,
                            sku: p.sku,
                            variantId: null,
                            variantName: null,
                            sizeLabel: null,
                            colorName: null,
                            quantity: 1,
                            unitPrice: p.salePrice,
                            lineTotal: p.salePrice,
                          })}
                        >
                          <i className="bi bi-plus me-1"></i>Thêm vào đơn
                        </button>
                      </div>
                    ))}
                    {productResults.length === 0 && productSearch && !searching && (
                      <div className="text-muted small text-center py-3">Không tìm thấy sản phẩm nào.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-7">
                <div className="order-detail-section">
                  <div className="order-detail-section-title">Sản phẩm đã chọn ({cartItems.length})</div>
                  {cartItems.length === 0 ? (
                    <div className="rk-empty py-4">
                      <i className="bi bi-cart3"></i>
                      Chưa chọn sản phẩm nào.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0 order-items-table">
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Sản phẩm</th>
                            <th className="text-center">SL</th>
                            <th className="text-end">Đơn giá</th>
                            <th className="text-end">Thành tiền</th>
                            <th style={{ width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartItems.map((item, idx) => (
                            <tr key={`${item.productId}-${item.variantId}`}>
                              <td className="text-center">{idx + 1}</td>
                              <td>
                                <div className="small fw-semibold">{item.productName}</div>
                                <div className="small text-muted">
                                  {item.sku ? `SKU: ${item.sku}` : ''}
                                  {item.sizeLabel && ` | ${item.sizeLabel}`}
                                  {item.colorName && ` | ${item.colorName}`}
                                </div>
                              </td>
                              <td className="text-center" style={{ width: 80 }}>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  style={{ width: 60 }}
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateCartQty(item.productId, item.variantId, Number(e.target.value))}
                                />
                              </td>
                              <td className="text-end">{formatPrice(item.unitPrice)}</td>
                              <td className="text-end fw-semibold text-danger">{formatPrice(item.lineTotal)}</td>
                              <td className="text-center">
                                <button
                                  className="btn btn-sm btn-link text-danger p-0"
                                  onClick={() => removeCartItem(item.productId, item.variantId)}
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-end py-2 fw-semibold text-danger">
                        Tổng tiền hàng: {formatPrice(subtotal)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3 gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setStep(1)}>
                <i className="bi bi-arrow-left me-1"></i>Quay lại
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleNext}>
                Tiếp theo: Vận chuyển <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Shipping */}
        {step === 3 && (
          <div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="order-detail-section">
                  <div className="order-detail-section-title">Thông tin vận chuyển</div>
                  <div className="mb-3">
                    <label className="form-label">Kho xuất hàng *</label>
                    <select
                      className={`form-select form-select-sm ${errors.warehouse ? 'is-invalid' : ''}`}
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                    >
                      <option value="">— Chọn kho —</option>
                      <option value="warehouse-1">Kho Trung tâm Q9</option>
                      <option value="warehouse-2">Kho Bình Thạnh</option>
                    </select>
                    {errors.warehouse && <div className="invalid-feedback">{errors.warehouse}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Đơn vị vận chuyển</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                    >
                      <option value="">— Chọn đơn vị —</option>
                      <option value="ghn">Giao Hàng Nhanh (GHN)</option>
                      <option value="ghtk">Giao Hàng Tiết Kiệm (GHTK)</option>
                      <option value="vtpost">Viettel Post</option>
                      <option value="self">Tự vận chuyển</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phương tiện</label>
                    <div className="d-flex gap-3 flex-wrap">
                      {[
                        { value: 'motorbike', label: 'Xe máy' },
                        { value: 'van', label: 'Xe van' },
                        { value: 'truck', label: 'Xe tải' },
                      ].map((opt) => (
                        <label key={opt.value} className="form-check">
                          <input
                            type="radio"
                            className="form-check-input"
                            name="shippingMethod"
                            value={opt.value}
                            checked={shippingMethod === opt.value}
                            onChange={() => setShippingMethod(opt.value)}
                          />
                          <span className="form-check-label">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Ghi chú vận chuyển</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={shippingNoteForm}
                      onChange={(e) => setShippingNoteForm(e.target.value)}
                      placeholder="Ghi chú thêm cho đơn vị vận chuyển..."
                    />
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="order-detail-section">
                  <div className="order-detail-section-title">Chi phí vận chuyển</div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label">Phí vận chuyển (VNĐ)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Phụ phí (VNĐ)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={extraCost}
                        onChange={(e) => setExtraCost(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                  </div>
                  <div className="order-price-block">
                    <div className="order-price-row">
                      <span>Phí vận chuyển:</span>
                      <span>{formatPrice(shippingCost)}</span>
                    </div>
                    <div className="order-price-row">
                      <span>Phụ phí:</span>
                      <span>{formatPrice(extraCost)}</span>
                    </div>
                    <div className="order-price-row is-total">
                      <span>Tổng phí ship:</span>
                      <span>{formatPrice(shippingCost + extraCost)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3 gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setStep(2)}>
                <i className="bi bi-arrow-left me-1"></i>Quay lại
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleNext}>
                Tiếp theo: Xác nhận <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm */}
        {step === 4 && (
          <div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="order-detail-section">
                  <div className="order-detail-section-title">Tóm tắt đơn hàng</div>
                  <div className="order-address-card">
                    <div className="mb-2"><strong>Khách hàng:</strong> {customerName}</div>
                    <div className="mb-1 text-muted small">SĐT: {shippingContactPhone}</div>
                    <div className="mb-2 text-muted small">
                      Địa chỉ: {shippingAddressLine}
                      {shippingWard && `, ${shippingWard}`}
                      {shippingDistrict && `, ${shippingDistrict}`}
                      {shippingProvince && `, ${shippingProvince}`}
                    </div>
                    <div className="mb-1 small">
                      <strong>Sản phẩm:</strong> {cartItems.length} sản phẩm
                    </div>
                    {selectedProvider && (
                      <div className="mb-1 small">
                        <strong>Vận chuyển:</strong> {selectedProvider}
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-detail-section mt-3">
                  <div className="order-detail-section-title">Ghi chú</div>
                  <div className="mb-2">
                    <label className="form-label small">Ghi chú khách hàng</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="Ghi chú từ khách hàng..."
                    />
                  </div>
                  <div>
                    <label className="form-label small">Ghi chú nội bộ</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Ghi chú nội bộ..."
                    />
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="order-detail-section">
                  <div className="order-detail-section-title">Tổng tiền</div>
                  <div className="order-price-block">
                    <div className="order-price-row">
                      <span>Tiền hàng:</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="order-price-row text-success">
                      <span>Giảm giá:</span>
                      <span>- {formatPrice(0)}</span>
                    </div>
                    <div className="order-price-row">
                      <span>Phí vận chuyển:</span>
                      <span>+ {formatPrice(shippingCost)}</span>
                    </div>
                    {extraCost > 0 && (
                      <div className="order-price-row">
                        <span>Phụ phí:</span>
                        <span>+ {formatPrice(extraCost)}</span>
                      </div>
                    )}
                    <div className="order-price-row is-total">
                      <span>TỔNG CỘNG:</span>
                      <span>{formatPrice(grandTotal)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="mb-2">
                      <label className="form-label small">Số tiền đặt cọc (VNĐ)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        min={0}
                        max={grandTotal}
                      />
                    </div>
                    <div className="d-flex justify-content-between fw-semibold">
                      <span>Còn lại phải thanh toán:</span>
                      <span className="text-warning">{formatPrice(remaining)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3 gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setStep(3)}>
                <i className="bi bi-arrow-left me-1"></i>Quay lại
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="spinner-border spinner-border-sm me-1"></span>
                ) : (
                  <i className="bi bi-check2 me-1"></i>
                )}
                Tạo đơn hàng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
