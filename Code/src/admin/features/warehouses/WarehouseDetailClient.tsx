'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { AdminPagination } from '@/admin/shared/AdminPagination';

// Dynamic import for map to avoid SSR issues
const WarehouseMap = dynamic(() => import('./WarehouseMap'), { ssr: false });

interface OrderInfo {
  orderNo: string | null;
  orderStatus: string | null;
}

interface Shipment {
  id: string;
  orderId: string;
  shippingMethod: string;
  trackingCode: string | null;
  fromFullAddress: string | null;
  toFullAddress: string | null;
  toProvinceName: string | null;
  toDistrictName: string | null;
  shippingCost: unknown;
  finalShippingCost: unknown;
  shippedAt: Date | string | null;
  deliveredAt: Date | string | null;
  createdAt: Date | string;
  order?: OrderInfo | null;
}

interface WarehouseDetail {
  id: string;
  code: string | null;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  provinceName: string | null;
  districtName: string | null;
  wardName: string | null;
  addressLine: string;
  fullAddress: string | null;
  latitude: unknown;
  longitude: unknown;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  shipments?: Shipment[];
  _count?: { shipments: number };
}

interface ShipmentStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface DetailedStats {
  total: number;
  monthShipments: number;
  yearShipments: number;
  avgPerDay: number;
  monthCost: number;
  yearCost: number;
  avgCostPerShipment: number;
  monthlyData: { month: string; count: number }[];
}

interface TopArea {
  rank: number;
  province: string;
  count: number;
  percent: number;
}

interface Props {
  warehouse: WarehouseDetail;
  stats?: ShipmentStats;
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateShort(date: Date | string) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatCurrency(amount: unknown) {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(n) || n === null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

type Tab = 'info' | 'shipments' | 'stats' | 'map';

// ── Đơn xuất tab component ──
function ShipmentsTab({ warehouseId }: { warehouseId: string }) {
  const router = useRouter();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstDay.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  const fetchShipments = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/admin/api/warehouses/${warehouseId}/shipments?${params}`);
      const json = await res.json();
      if (json.success) {
        setShipments(json.data || []);
        setPagination(json.pagination || { page: 1, total: 0, totalPages: 1 });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [warehouseId, dateFrom, dateTo]);

  useEffect(() => {
    fetchShipments(1);
  }, [fetchShipments]);

  function renderPages() {
    const { page, totalPages } = pagination;
    if (totalPages <= 1) return null;
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div>
      <div className="row g-2 mb-3 align-items-end">
        <div className="col-md-3">
          <label className="form-label small mb-1">Từ ngày</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Đến ngày</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <button
            className="btn btn-sm btn-search w-100"
            onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchShipments(1); }}
          >
            <i className="bi bi-funnel me-1"></i>Lọc
          </button>
        </div>
        <div className="col-md-4 text-end">
          <span className="small text-muted">
            Tổng: <strong>{pagination.total}</strong> lô xuất
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span></div>
      ) : !shipments.length ? (
        <div className="text-center text-muted py-4">
          <i className="bi bi-box-seam fs-1 d-block mb-2"></i>
          Chưa có lô xuất nào trong khoảng thời gian này.
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th className="text-center" style={{ width: 40 }}>STT</th>
                  <th>Mã đơn</th>
                  <th>Phương thức</th>
                  <th>Mã vận đơn</th>
                  <th>Địa chỉ giao</th>
                  <th>Phí vận chuyển</th>
                  <th>Ngày xuất</th>
                  <th className="text-center" style={{ width: 60 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="text-center">{(pagination.page - 1) * 20 + idx + 1}</td>
                    <td><code className="small">{s.order?.orderNo || s.orderId.slice(0, 8)}...</code></td>
                    <td>{s.shippingMethod}</td>
                    <td>{s.trackingCode || '—'}</td>
                    <td className="small">{[s.toDistrictName, s.toProvinceName].filter(Boolean).join(', ') || s.toFullAddress || '—'}</td>
                    <td className="text-end">{formatCurrency(s.finalShippingCost)}</td>
                    <td>{formatDateShort(s.createdAt)}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-detail py-0 px-1" title="Xem">
                        <i className="bi bi-eye-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            pagination={pagination}
            onPageChange={(page) => fetchShipments(page)}
          />
        </>
      )}
    </div>
  );
}

// ── Thống kê tab component ──
function StatsTab({ warehouseId, todayCount }: { warehouseId: string; todayCount?: number }) {
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [topAreas, setTopAreas] = useState<TopArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/admin/api/warehouses/${warehouseId}/stats`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStats(json.data.detailedStats);
          setTopAreas(json.data.topAreas || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [warehouseId]);

  if (loading) {
    return <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span></div>;
  }

  if (!stats) {
    return <div className="text-center text-muted py-4">Không có dữ liệu thống kê.</div>;
  }

  return (
    <div>
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card border-primary">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Hôm nay</div>
              <div className="fw-bold fs-5">{todayCount ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-success">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Tháng này</div>
              <div className="fw-bold fs-5 text-success">{stats.monthShipments}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-info">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Năm nay</div>
              <div className="fw-bold fs-5 text-info">{stats.yearShipments}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-secondary">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Tổng cộng</div>
              <div className="fw-bold fs-5">{stats.total}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">TB/ngày (tháng)</div>
              <div className="fw-bold">{stats.avgPerDay}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Chi phí tháng</div>
              <div className="fw-bold">{formatCurrency(stats.monthCost)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Chi phí năm</div>
              <div className="fw-bold">{formatCurrency(stats.yearCost)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">TB/phí vận chuyển</div>
              <div className="fw-bold">{formatCurrency(stats.avgCostPerShipment)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="card mb-3">
        <div className="card-header-custom">
          BIỂU ĐỒ XUẤT KHO THEO THÁNG
        </div>
        <div className="card-body">
          <MonthlyChart data={stats.monthlyData} />
        </div>
      </div>

      {/* TOP delivery areas */}
      <div className="card">
        <div className="card-header-custom">
          TOP KHU VỰC GIAO HÀNG
        </div>
        <div className="card-body py-2">
          {!topAreas.length ? (
            <div className="text-center text-muted py-3">Chưa có dữ liệu khu vực giao hàng.</div>
          ) : (
            <div className="list-group list-group-flush">
              {topAreas.map(area => (
                <div key={area.rank} className="list-group-item d-flex align-items-center py-2 px-0">
                  <span className={`badge me-2 ${area.rank <= 3 ? `bg-${['warning', 'secondary', 'info'][area.rank - 1]}` : 'bg-light text-dark'}`}
                    style={{ minWidth: 24, textAlign: 'center' }}>
                    {area.rank}
                  </span>
                  <span className="flex-grow-1 small">{area.province}</span>
                  <span className="badge bg-primary me-2">{area.count} đơn</span>
                  <span className="text-muted small" style={{ minWidth: 50, textAlign: 'right' }}>{area.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Monthly data table ──
function MonthlyChart({ data }: { data: { month: string; count: number }[] }) {
  if (!data?.length) return <div className="text-center text-muted py-3">Không có dữ liệu.</div>;

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="table-responsive">
      <table className="table table-sm table-bordered mb-0">
        <thead>
          <tr>
            <th className="text-center" style={{ width: 40 }}>#</th>
            <th>Tháng</th>
            <th className="text-center" style={{ width: 120 }}>Số đơn</th>
            <th style={{ width: 200 }}>Xu hướng</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.month}>
              <td className="text-center text-muted">{i + 1}</td>
              <td><strong>{d.month}</strong></td>
              <td className="text-center fw-bold">{d.count}</td>
              <td>
                <div className="progress m-1" style={{ height: 20 }}>
                  <div
                    className={`progress-bar ${i === data.length - 1 ? 'bg-primary' : 'bg-secondary'}`}
                    role="progressbar"
                    style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                    aria-valuenow={d.count}
                    aria-valuemin={0}
                    aria-valuemax={maxCount}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main detail client ──
export function WarehouseDetailClient({ warehouse, stats }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [toggling, setToggling] = useState(false);

  async function handleToggleActive() {
    if (!confirm(`Bạn muốn ${warehouse.isActive ? 'đóng' : 'mở'} kho "${warehouse.name}"?`)) return;
    setToggling(true);
    try {
      const res = await fetch(`/admin/api/warehouses/${warehouse.id}/toggle-active`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setToggling(false); }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'info', label: 'Thông tin', icon: 'bi-info-circle' },
    { id: 'shipments', label: 'Đơn xuất', icon: 'bi-box-seam' },
    { id: 'stats', label: 'Thống kê', icon: 'bi-bar-chart' },
    { id: 'map', label: 'Bản đồ', icon: 'bi-geo-alt' },
  ];

  return (
    <>
      {/* Back + header */}
      <div className="mb-3">
        <Link href="/admin/warehouses" className="btn btn-sm btn-secondary">
          <i className="bi bi-arrow-left me-1"></i>Quay lại danh sách
        </Link>
      </div>

      {/* Provider info card */}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span className="fw-semibold">
            {warehouse.code ? <code className="me-2">{warehouse.code}</code> : ''}
            {warehouse.name}
          </span>
          <div className="d-flex gap-2">
            <Link href={`/admin/warehouses/${warehouse.id}/edit`} className="btn btn-sm btn-primary">
              <i className="bi bi-pencil me-1"></i>Sửa
            </Link>
            <button
              className={`btn btn-sm ${warehouse.isActive ? 'btn-warning' : 'btn-success'}`}
              onClick={handleToggleActive}
              disabled={toggling}
            >
              {toggling ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <>
                  <i className={`bi ${warehouse.isActive ? 'bi-pause-fill' : 'bi-play-fill'} me-1`}></i>
                  {warehouse.isActive ? 'Đóng kho' : 'Mở kho'}
                </>
              )}
            </button>
          </div>
        </div>
        <div className="card-body py-2 px-3">
          <span className={`badge ${warehouse.isActive ? 'bg-success' : 'bg-secondary'}`}>
            {warehouse.isActive ? '● Hoạt động' : '● Tạm đóng'}
          </span>
          {stats && (
            <>
              <span className="badge bg-secondary ms-2">
                <i className="bi bi-box-seam me-1"></i>Tổng: {stats.total}
              </span>
              <span className="badge bg-info ms-1">
                <i className="bi bi-calendar-day me-1"></i>Hôm nay: {stats.today}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="card-header px-0">
          <ul className="nav nav-tabs card-header-tabs">
            {tabs.map(tab => (
              <li className="nav-item" key={tab.id}>
                <button
                  className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={`${tab.icon} me-1`}></i>{tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {/* TAB: THÔNG TIN */}
          {activeTab === 'info' && (
            <div className="row">
              <div className="col-12 col-lg-8">
                <h6 className="text-muted mb-2">THÔNG TIN CƠ BẢN</h6>
                <table className="table table-sm table-borderless mb-4">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: 160 }}>Mã kho</td>
                      <td><code>{warehouse.code || '—'}</code></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Tên kho</td>
                      <td className="fw-semibold">{warehouse.name}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Người quản lý</td>
                      <td>{warehouse.contactName || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">SĐT liên hệ</td>
                      <td>{warehouse.contactPhone || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Trạng thái</td>
                      <td>
                        {warehouse.isActive ? (
                          <span className="badge bg-success">● Hoạt động</span>
                        ) : (
                          <span className="badge bg-secondary">● Tạm đóng</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <h6 className="text-muted mb-2">ĐỊA CHỈ KHO</h6>
                <table className="table table-sm table-borderless mb-4">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: 160 }}>Tỉnh/TP</td>
                      <td>{warehouse.provinceName || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Quận/Huyện</td>
                      <td>{warehouse.districtName || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Phường/Xã</td>
                      <td>{warehouse.wardName || '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Địa chỉ</td>
                      <td>
                        {[warehouse.addressLine, warehouse.wardName, warehouse.districtName, warehouse.provinceName]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                    </tr>
                    {String(warehouse.latitude ?? '') && String(warehouse.longitude ?? '') && (
                      <tr>
                        <td className="text-muted">Tọa độ GPS</td>
                        <td>
                          <code>{String(warehouse.latitude)}, {String(warehouse.longitude)}</code>
                          <a
                            href={`https://www.google.com/maps?q=${warehouse.latitude},${warehouse.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary ms-2"
                          >
                            <i className="bi bi-geo-alt-fill me-1"></i>Xem trên Google Maps
                          </a>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <h6 className="text-muted mb-2">THÔNG TIN BỔ SUNG</h6>
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: 160 }}>Ngày tạo</td>
                      <td>{formatDate(warehouse.createdAt)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Cập nhật lần cuối</td>
                      <td>{formatDate(warehouse.updatedAt)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ĐƠN XUẤT */}
          {activeTab === 'shipments' && (
            <ShipmentsTab warehouseId={warehouse.id} />
          )}

          {/* TAB: THỐNG KÊ */}
          {activeTab === 'stats' && (
            <StatsTab warehouseId={warehouse.id} todayCount={stats?.today} />
          )}

          {/* TAB: BẢN ĐỒ */}
          {activeTab === 'map' && (
            <div>
              {String(warehouse.latitude || '') && String(warehouse.longitude || '') ? (
                <WarehouseMap
                  warehouseId={warehouse.id}
                  warehouseName={warehouse.name}
                  warehouseAddress={[warehouse.addressLine, warehouse.wardName, warehouse.districtName, warehouse.provinceName].filter(Boolean).join(', ')}
                  latitude={Number(warehouse.latitude)}
                  longitude={Number(warehouse.longitude)}
                />
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-geo-alt fs-1 d-block mb-2"></i>
                  Kho chưa có tọa độ GPS. Vui lòng cập nhật thông tin kho để xem bản đồ.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
