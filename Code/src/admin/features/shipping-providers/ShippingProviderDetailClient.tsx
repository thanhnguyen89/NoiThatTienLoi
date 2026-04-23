'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface ShippingProviderDetail {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  website: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: { shipments: number };
  serviceTypes?: string[];
  vehicles?: string[];
  surcharges?: unknown;
  discountPolicies?: unknown;
}

interface Props {
  provider: ShippingProviderDetail;
  initialTab?: 'info' | 'pricing' | 'orders' | 'stats';
}

interface PricingRow {
  id: string; minDistance: number; maxDistance: number; serviceType: string;
  baseCost: number; surchargeAmount: number; surchargeLabel: string | null;
  note: string | null; isActive: boolean;
}

interface ShipmentRow {
  id: string; orderId: string; shippingMethod: string; shippingServiceType: string | null;
  finalShippingCost: number; trackingCode: string | null; providerOrderCode: string | null;
  createdAt: string;
  order: { orderNo: string; orderStatus: string };
}

interface ProviderStats {
  totalShipments: number; monthShipments: number; quarterShipments: number; yearShipments: number;
  monthCost: number; quarterCost: number; yearCost: number;
  avgCostPerShipment: number; avgCostPerKm: number;
  successRate: number; onTimeRate: number; avgDeliveryHours: number;
}

interface CompareProvider {
  id: string; code: string | null; name: string; shipmentCount: number; avgCost: number;
}

type TabKey = 'info' | 'pricing' | 'orders' | 'stats';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  standard: 'Tiêu chuẩn', express: 'Nhanh', same_day: 'Trong ngày', scheduled: 'Hẹn lịch', other: 'Khác',
};
const VEHICLE_LABELS: Record<string, string> = {
  motorbike: 'Xe máy', van: 'Xe van', truck: 'Xe tải', airplane: 'Máy bay',
};
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý',
  shipping: 'Đang giao', delivered: 'Đã giao', completed: 'Hoàn thành', cancelled: 'Đã hủy', returned: 'Trả hàng',
};
const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-warning text-dark', confirmed: 'bg-info', processing: 'bg-primary',
  shipping: 'bg-secondary', delivered: 'bg-success', completed: 'bg-success',
  cancelled: 'bg-danger', returned: 'bg-dark',
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function formatPrice(n: number | null | undefined): string {
  if (!n || n === 0) return '—';
  return n.toLocaleString('vi-VN') + 'đ';
}
function formatPriceCompact(n: number | null | undefined): string {
  if (!n || n === 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString('vi-VN');
}
function formatDistance(from: number, to: number): string {
  if (to === 0 && from > 0) return `> ${from} km`;
  return `${from}–${to} km`;
}

export function ShippingProviderDetailClient({ provider, initialTab }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'info');

  // Pricing
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);

  // Shipments
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [shipmentsPagination, setShipmentsPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [ordersDateFrom, setOrdersDateFrom] = useState('');
  const [ordersDateTo, setOrdersDateTo] = useState('');
  const [ordersStatus, setOrdersStatus] = useState('');
  const [monthlySummary, setMonthlySummary] = useState({ count: 0, cost: 0 });

  // Pricing vehicle filter
  const [pricingVehicle, setPricingVehicle] = useState(() => {
    if (provider?.vehicles && provider.vehicles.length > 0) return provider.vehicles[0];
    return '';
  });

  // Stats
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [comparison, setComparison] = useState<CompareProvider[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  async function loadPricing() {
    setPricingLoading(true);
    try {
      const url = pricingVehicle
        ? `/admin/api/shipping-providers/${provider.id}/pricing?vehicle=${encodeURIComponent(pricingVehicle)}`
        : `/admin/api/shipping-providers/${provider.id}/pricing`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setPricing(json.data);
    } catch {}
    finally { setPricingLoading(false); }
  }

  // Load pricing whenever vehicle filter changes
  useEffect(() => {
    if (activeTab === 'pricing') loadPricing();
  }, [activeTab, pricingVehicle]);

  async function loadShipments(page = 1) {
    setShipmentsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (ordersDateFrom) params.set('dateFrom', ordersDateFrom);
      if (ordersDateTo) params.set('dateTo', ordersDateTo);
      if (ordersStatus) params.set('status', ordersStatus);
      const res = await fetch(`/admin/api/shipping-providers/${provider.id}/shipments?${params}`);
      const json = await res.json();
      if (json.success) {
        setShipments(json.data);
        setShipmentsPagination(json.pagination);
        setMonthlySummary({ count: json.monthlyCount ?? 0, cost: json.monthlyCost ?? 0 });
      }
    } catch {}
    finally { setShipmentsLoading(false); }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await fetch(`/admin/api/shipping-providers/${provider.id}/stats`);
      const json = await res.json();
      if (json.success) { setStats(json.data.stats); setComparison(json.data.comparison); }
    } catch {}
    finally { setStatsLoading(false); }
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    if (tab === 'orders' && shipments.length === 0) loadShipments();
    if (tab === 'stats' && !stats) loadStats();
  }

  const providerServiceTypes = provider.serviceTypes?.length ? provider.serviceTypes : ['standard'];

  function renderPageNumbers(current: number, total: number): (number | '...')[] | null {
    if (total <= 1) return null;
    const pages: (number | '...')[] = [];
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
    else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'info', label: 'Thông tin', icon: 'bi-card-text' },
    { key: 'pricing', label: 'Bảng giá', icon: 'bi-currency-dollar' },
    { key: 'orders', label: 'Đơn hàng', icon: 'bi-box-seam' },
    { key: 'stats', label: 'Thống kê', icon: 'bi-bar-chart' },
  ];

  return (
    <>
      {/* Back header */}
      <div className="mb-3">
        <Link href="/admin/shipping-providers" className="btn btn-sm btn-secondary">
          <i className="bi bi-arrow-left me-1"></i>Quay lại danh sách
        </Link>
      </div>

      {/* Provider info bar */}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <span className="fw-semibold me-2">CHI TIẾT:</span>
            <code className="me-1">{provider.code || '—'}</code>
            <span className="text-muted">—</span>
            <span className="fw-semibold ms-1">{provider.name}</span>
          </div>
          <div className="d-flex gap-2">
            <Link href={`/admin/shipping-providers/${provider.id}/edit?tab=info`} className="btn btn-sm btn-primary">
              <i className="bi bi-pencil me-1"></i>Sửa thông tin
            </Link>
            <Link href={`/admin/shipping-providers/${provider.id}/edit?tab=pricing`} className="btn btn-sm btn-success">
              <i className="bi bi-currency-dollar me-1"></i>Sửa bảng giá
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <ul className="nav nav-tabs">
          {tabs.map((tab) => (
            <li className="nav-item" key={tab.key}>
              <button className={`nav-link${activeTab === tab.key ? ' active' : ''}`} onClick={() => handleTabChange(tab.key)} type="button">
                <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="tab-content p-3">

          {/* ── TAB: THÔNG TIN ── */}
          {activeTab === 'info' && (
            <div>
              <div className="order-detail-section">
                <div className="order-detail-section-title">THÔNG TIN CƠ BẢN</div>
                <div className="row">
                  <div className="col-md-6">
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr><td className="text-muted" style={{ width: 160 }}>Mã đơn vị</td><td><code>{provider.code || '—'}</code></td></tr>
                        <tr><td className="text-muted">Tên đầy đủ</td><td className="fw-semibold">{provider.name}</td></tr>
                        <tr><td className="text-muted">Hotline</td><td>{provider.phone || '—'}</td></tr>
                        <tr><td className="text-muted">Website</td><td>{provider.website ? <a href={provider.website} target="_blank" rel="noopener noreferrer">{provider.website}</a> : '—'}</td></tr>
                        <tr><td className="text-muted">Trạng thái</td><td>{provider.isActive ? <span className="badge bg-success">● Đang hợp tác</span> : <span className="badge bg-secondary">● Ngưng hợp tác</span>}</td></tr>
                        <tr><td className="text-muted">Ngày tạo</td><td>{formatDate(provider.createdAt)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="order-detail-section">
                <div className="order-detail-section-title">DỊCH VỤ CUNG CẤP</div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-2">
                      <span className="text-muted small">Loại dịch vụ:</span>
                      <div className="mt-1">
                        {provider.serviceTypes?.length ? provider.serviceTypes.map((st) => (
                          <span key={st} className="badge bg-info me-1 mb-1">{SERVICE_TYPE_LABELS[st] ?? st}</span>
                        )) : <span className="text-muted small">—</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted small">Phương tiện hỗ trợ:</span>
                      <div className="mt-1">
                        {provider.vehicles?.length ? provider.vehicles.map((v) => (
                          <span key={v} className="badge bg-secondary me-1 mb-1">{VEHICLE_LABELS[v] ?? v}</span>
                        )) : <span className="text-muted small">—</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {provider.note && (
                <div className="order-detail-section">
                  <div className="order-detail-section-title">GHI CHÚ</div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginBottom: 0, fontSize: 13 }}>{provider.note}</pre>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: BẢNG GIÁ (read-only) ── */}
          {activeTab === 'pricing' && (
            <div>
              {pricingLoading ? (
                <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span> Đang tải...</div>
              ) : pricing.length === 0 ? (
                <div className="alert alert-info mb-0">
                  <i className="bi bi-info-circle me-1"></i>Chưa có bảng giá. <Link href={`/admin/shipping-providers/${provider.id}/edit?tab=pricing`} className="alert-link">Nhấn để thêm.</Link>
                </div>
              ) : (
                <>
                  {/* BẢNG GIÁ THEO KHOẢNG CÁCH */}
                  <div className="order-detail-section">
                    <div className="order-detail-section-title">BẢNG GIÁ THEO KHOẢNG CÁCH</div>
                    {provider.vehicles && provider.vehicles.length > 0 && (
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="text-muted small">Phương tiện:</span>
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 'auto' }}
                          value={pricingVehicle}
                          onChange={(e) => setPricingVehicle(e.target.value)}
                        >
                          <option value="">Tất cả</option>
                          {provider.vehicles.map(v => (
                            <option key={v} value={v}>{VEHICLE_LABELS[v] ?? v}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="table-light text-center">
                          <tr>
                            <th style={{ minWidth: 140 }}>Khoảng cách</th>
                            {providerServiceTypes.map((st) => (
                              <th key={st}>{SERVICE_TYPE_LABELS[st] ?? st}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const byDist = pricing.reduce<Record<string, PricingRow[]>>((acc, r) => {
                              const k = `${r.minDistance}-${r.maxDistance}`;
                              if (!acc[k]) acc[k] = [];
                              acc[k].push(r);
                              return acc;
                            }, {});
                            return Object.keys(byDist)
                              .sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]))
                              .map((key) => {
                                const rows = byDist[key];
                                const [from, to] = key.split('-').map(Number);
                                return (
                                  <tr key={key}>
                                    <td><span className="fw-semibold">{formatDistance(from, to)}</span></td>
                                    {providerServiceTypes.map((st) => {
                                      const row = rows.find((r) => r.serviceType === st);
                                      return (
                                        <td key={st} className="text-center">
                                          <span className={!row?.baseCost ? 'text-muted' : ''}>
                                            {row && row.baseCost > 0 ? formatPrice(Number(row.baseCost)) : '—'}
                                          </span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PHỤ PHÍ */}
                  <div className="order-detail-section">
                    <div className="order-detail-section-title">PHỤ PHÍ</div>
                    {(() => {
                      const surchargeList = Array.isArray(provider.surcharges)
                        ? provider.surcharges as Array<{ key: string; label: string; amount: number }>
                        : null;
                      if (!surchargeList || surchargeList.length === 0) {
                        return <p className="text-muted small mb-0">Chưa có cấu hình phụ phí.</p>;
                      }
                      return (
                        <ul className="mb-0 small">
                          {surchargeList.filter(s => s.amount > 0).map((s) => (
                            <li key={s.key}>
                              {s.label}: <strong>+{formatPrice(s.amount)}</strong>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>

                  {/* CHÍNH SÁCH GIẢM GIÁ */}
                  <div className="order-detail-section">
                    <div className="order-detail-section-title">CHÍNH SÁCH GIẢM GIÁ</div>
                    {(() => {
                      const policyList = Array.isArray(provider.discountPolicies)
                        ? provider.discountPolicies as Array<{ id: number; threshold: number; discount: number }>
                        : null;
                      if (!policyList || policyList.length === 0) {
                        return <p className="text-muted small mb-0">Chưa có cấu hình chính sách giảm giá.</p>;
                      }
                      return (
                        <ul className="mb-0 small">
                          {policyList.filter(p => p.discount > 0).map((p) => (
                            <li key={p.id}>
                              Từ <strong>{p.threshold} đơn/tháng</strong>: Giảm <strong>{p.discount}%</strong>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: ĐƠN HÀNG ── */}
          {activeTab === 'orders' && (
            <div>
              <div className="card mb-3" style={{ border: '1px solid #dee2e6' }}>
                <div className="card-body py-2 px-3">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-3">
                      <label className="form-label small">Từ ngày</label>
                      <input type="date" className="form-control form-control-sm" value={ordersDateFrom} onChange={(e) => setOrdersDateFrom(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Đến ngày</label>
                      <input type="date" className="form-control form-control-sm" value={ordersDateTo} onChange={(e) => setOrdersDateTo(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Trạng thái</label>
                      <select className="form-control form-control-sm" value={ordersStatus} onChange={(e) => setOrdersStatus(e.target.value)}>
                        <option value="">Tất cả</option>
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="processing">Đang xử lý</option>
                        <option value="shipping">Đang giao</option>
                        <option value="delivered">Đã giao</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                        <option value="returned">Trả hàng</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <button className="btn btn-sm btn-primary me-1" onClick={() => loadShipments(1)}><i className="bi bi-funnel me-1"></i>Lọc</button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => { setOrdersDateFrom(''); setOrdersDateTo(''); setOrdersStatus(''); loadShipments(1); }}><i className="bi bi-x-lg me-1"></i>Xóa lọc</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly summary */}
              <div className="alert alert-secondary py-2 px-3 mb-3 d-flex justify-content-between align-items-center">
                <span>Tổng đơn (tháng này): <strong>{monthlySummary.count}</strong></span>
                <span>Tổng chi phí: <strong className="text-danger">{formatPrice(monthlySummary.cost)}</strong></span>
              </div>

              <p className="text-muted small">Danh sách đơn hàng sử dụng đơn vị vận chuyển này. Số vận đơn: <strong>{provider._count?.shipments ?? 0}</strong></p>

              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th className="text-center" style={{ width: 50 }}>STT</th>
                      <th style={{ width: 140 }}>Mã đơn</th>
                      <th style={{ width: 140 }}>Ngày tạo</th>
                      <th style={{ width: 120 }}>Chi phí</th>
                      <th>Trạng thái</th>
                      <th style={{ width: 140 }}>Mã vận đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipmentsLoading ? (
                      <tr><td colSpan={6} className="text-center py-3"><span className="spinner-border spinner-border-sm"></span></td></tr>
                    ) : shipments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted py-4">Chưa có đơn hàng nào</td></tr>
                    ) : shipments.map((s, i) => (
                      <tr key={s.id}>
                        <td className="text-center">{(shipmentsPagination.page - 1) * shipmentsPagination.pageSize + i + 1}</td>
                        <td><code>{s.order.orderNo}</code></td>
                        <td>{formatDate(s.createdAt)}</td>
                        <td>{formatPrice(Number(s.finalShippingCost))}</td>
                        <td><span className={`badge ${ORDER_STATUS_BADGE[s.order.orderStatus] || 'bg-secondary'}`}>{ORDER_STATUS_LABELS[s.order.orderStatus] || s.order.orderStatus}</span></td>
                        <td>{s.trackingCode || s.providerOrderCode || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="small text-muted">Tổng đơn: {shipmentsPagination.total}</div>
                {shipmentsPagination.totalPages > 1 && (
                  <div className="d-flex gap-1">
                    {renderPageNumbers(shipmentsPagination.page, shipmentsPagination.totalPages)?.map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-1">…</span>
                      ) : (
                        <button key={p} className={`btn btn-sm ${p === shipmentsPagination.page ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => loadShipments(p as number)}>{p}</button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: THỐNG KÊ ── */}
          {activeTab === 'stats' && (
            <div>
              {statsLoading ? (
                <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span> Đang tải...</div>
              ) : !stats ? (
                <div className="text-center text-muted py-4">Không có dữ liệu thống kê</div>
              ) : (
                <>
                  {/* TỔNG QUAN SỬ DỤNG */}
                  <div className="order-detail-section">
                    <div className="order-detail-section-title">TỔNG QUAN SỬ DỤNG</div>
                    <div className="row g-3">
                      {[
                        { label: 'Tháng này', count: stats.monthShipments, cost: stats.monthCost },
                        { label: 'Quý này', count: stats.quarterShipments, cost: stats.quarterCost },
                        { label: 'Năm nay', count: stats.yearShipments, cost: stats.yearCost },
                      ].map((item) => (
                        <div className="col-md-4" key={item.label}>
                          <div className="dashboard-stat dashboard-stat--total">
                            <div className="dashboard-stat__value">{item.count}</div>
                            <div className="dashboard-stat__label">{item.label}</div>
                            <div className="small text-muted mt-1">{formatPriceCompact(item.cost)}đ</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* HIỆU SUẤT GIAO HÀNG */}
                  <div className="order-detail-section">
                    <div className="order-detail-section-title">HIỆU SUẤT GIAO HÀNG</div>
                    <div className="row g-3">
                      {[
                        { value: stats.successRate + '%', label: 'Tỷ lệ giao thành công', icon: 'bi-check-circle text-success' },
                        { value: stats.avgDeliveryHours > 0 ? stats.avgDeliveryHours + 'h' : '—', label: 'Thời gian giao TB', icon: 'bi-clock text-primary' },
                        { value: '—', label: 'Đánh giá TB ⭐', icon: 'bi-star text-warning' },
                      ].map((item) => (
                        <div className="col-md-4" key={item.label}>
                          <div className="dashboard-stat">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <i className={`bi ${item.icon}`}></i>
                              <div className="dashboard-stat__value">{item.value}</div>
                            </div>
                            <div className="dashboard-stat__label">{item.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="row g-3 mt-1">
                      {[
                        { value: stats.onTimeRate + '%', label: 'Giao đúng hạn', icon: 'bi-calendar-check text-info' },
                        { value: '—', label: 'Hoàn hàng', icon: 'bi-arrow-return-circle text-danger' },
                        { value: '—', label: 'Thất lạc', icon: 'bi-exclamation-triangle text-dark' },
                      ].map((item) => (
                        <div className="col-md-4" key={item.label}>
                          <div className="dashboard-stat">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <i className={`bi ${item.icon}`}></i>
                              <div className="dashboard-stat__value">{item.value}</div>
                            </div>
                            <div className="dashboard-stat__label">{item.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CHI PHÍ TRUNG BÌNH */}
                  <div className="order-detail-section">
                    <div className="order-detail-section-title">CHI PHÍ TRUNG BÌNH</div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="dashboard-stat">
                          <div className="dashboard-stat__value">{formatPrice(stats.avgCostPerShipment)}</div>
                          <div className="dashboard-stat__label">Mỗi đơn</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="dashboard-stat dashboard-stat--email">
                          <div className="dashboard-stat__value">{formatPrice(stats.avgCostPerKm)}</div>
                          <div className="dashboard-stat__label">Mỗi km</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SO SÁNH */}
                  <div className="order-detail-section">
                    <div className="order-detail-section-title">SO SÁNH VỚI CÁC ĐƠN VỊ KHÁC</div>
                    {comparison.length === 0 ? (
                      <p className="text-muted small mb-0">Chưa có đủ dữ liệu so sánh.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered mb-0">
                          <thead className="table-light text-center">
                            <tr>
                              <th>#</th>
                              <th className="text-start">Đơn vị</th>
                              <th>Số vận đơn</th>
                              <th>Chi phí TB / đơn</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparison.map((p, i) => (
                              <tr key={p.id} className={p.id === provider.id ? 'table-primary' : ''}>
                                <td className="text-center">{i + 1}</td>
                                <td className="text-start">
                                  <code>{p.code || '—'}</code>{' '}<span className="fw-semibold">{p.name}</span>
                                  {p.id === provider.id && <span className="badge bg-primary ms-1">Đang xem</span>}
                                </td>
                                <td className="text-center">{p.shipmentCount}</td>
                                <td className="text-center">{formatPrice(p.avgCost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
