'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { getGenderLabel } from '@/server/validators/member.validator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function formatPrice(value: unknown): string {
  if (value == null) return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);
}

function formatDate(date: Date | string | null, includeTime = false) {
  if (!date) return '—';
  const d = new Date(date);
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return includeTime ? `${dateStr} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : dateStr;
}

function calcAge(birthday: Date | string | null) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

interface MemberAddress {
  id: string;
  contactName: string;
  contactPhone: string;
  provinceName: string | null;
  districtName: string | null;
  wardName: string | null;
  addressLine: string | null;
  fullAddress: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  note: string | null;
  isDefault: boolean;
  createdAt: Date | string;
}

interface MemberOrder {
  id: string;
  orderNo: string;
  placedAt: Date | string | null;
  grandTotalAmount: number;
  depositAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: Date | string;
}

interface MemberStats {
  totalOrders: number;
  totalSpent: number;
  completedOrders: number;
  cancelledOrders: number;
  avgOrderValue: number;
  cancelRate: number;
  firstOrderDate?: Date | string | null;
  lastOrderDate?: Date | string | null;
  monthlyData?: { month: string; amount: number; orders: number }[];
}

interface Member {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | string | null;
  gender: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | string | null;
  phoneVerifiedAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  addresses: MemberAddress[];
}

interface Props {
  member: Member;
}

export function MemberDetailClient({ member }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('info');
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    contactName: '',
    contactPhone: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    addressLine: '',
    note: '',
    isDefault: false,
  });
  const [addressLoading, setAddressLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Location data
  const [provinces, setProvinces] = useState<{ code: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ code: number; name: string }[]>([]);
  const [wards, setWards] = useState<{ code: number; name: string }[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const age = calcAge(member.dateOfBirth);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/admin/api/members/${member.id}?tab=orders`);
      const json = await res.json();
      if (json.success) setOrders(json.data || []);
    } catch { /* ignore */ }
    finally { setOrdersLoading(false); }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await fetch(`/admin/api/members/${member.id}?tab=stats`);
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch { /* ignore */ }
    finally { setStatsLoading(false); }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    if (tab === 'orders') loadOrders();
    if (tab === 'stats') loadStats();
  }

  async function handleToggleActive() {
    if (!confirm(`${member.isActive ? 'Khóa' : 'Kích hoạt'} tài khoản này?`)) return;
    setToggleLoading(true);
    try {
      const res = await fetch(`/admin/api/members/${member.id}?action=toggle-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setToggleLoading(false); }
  }

  async function handleSetDefaultAddress(addressId: string) {
    try {
      const res = await fetch(`/admin/api/members/${member.id}?action=set-default-address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
  }

  async function handleDeleteAddress(addressId: string) {
    if (!confirm('Xóa địa chỉ này?')) return;
    try {
      const res = await fetch(`/admin/api/members/${member.id}?action=address&addressId=${addressId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
  }

  async function loadProvinces() {
    try {
      const res = await fetch('/api/locations/provinces');
      const json = await res.json();
      if (json.success) {
        setProvinces(json.data);
      }
    } catch (error) {
      console.error('Error loading provinces:', error);
    }
  }

  async function loadDistricts(provinceCode: string) {
    if (!provinceCode) {
      setDistricts([]);
      setWards([]);
      return;
    }
    setLocationsLoading(true);
    try {
      const res = await fetch(`/api/locations/districts/${provinceCode}`);
      const json = await res.json();
      if (json.success) {
        setDistricts(json.data);
      }
    } catch (error) {
      console.error('Error loading districts:', error);
    } finally {
      setLocationsLoading(false);
    }
  }

  async function loadWards(districtCode: string) {
    if (!districtCode) {
      setWards([]);
      return;
    }
    setLocationsLoading(true);
    try {
      const res = await fetch(`/api/locations/wards/${districtCode}`);
      const json = await res.json();
      if (json.success) {
        setWards(json.data);
      }
    } catch (error) {
      console.error('Error loading wards:', error);
    } finally {
      setLocationsLoading(false);
    }
  }

  async function handleOpenAddAddress() {
    setEditingAddressId(null);
    setAddressForm({
      contactName: '',
      contactPhone: '',
      provinceCode: '',
      provinceName: '',
      districtCode: '',
      districtName: '',
      wardCode: '',
      wardName: '',
      addressLine: '',
      note: '',
      isDefault: false,
    });
    setDistricts([]);
    setWards([]);
    setShowAddressModal(true);
    if (provinces.length === 0) {
      await loadProvinces();
    }
  }

  async function handleOpenEditAddress(addr: MemberAddress) {
    setEditingAddressId(addr.id);
    setAddressForm({
      contactName: addr.contactName,
      contactPhone: addr.contactPhone,
      provinceCode: '',
      provinceName: addr.provinceName || '',
      districtCode: '',
      districtName: addr.districtName || '',
      wardCode: '',
      wardName: addr.wardName || '',
      addressLine: addr.addressLine || '',
      note: addr.note || '',
      isDefault: addr.isDefault,
    });
    setShowAddressModal(true);
    if (provinces.length === 0) {
      await loadProvinces();
    }
  }

  async function handleSaveAddress() {
    const errs: Record<string, string> = {};
    if (!addressForm.contactName.trim()) errs.contactName = 'Bắt buộc nhập tên người nhận';
    if (!addressForm.contactPhone.trim()) errs.contactPhone = 'Bắt buộc nhập SĐT';
    if (!addressForm.provinceCode) errs.provinceCode = 'Bắt buộc chọn Tỉnh/TP';
    if (!addressForm.districtCode) errs.districtCode = 'Bắt buộc chọn Quận/Huyện';
    if (!addressForm.wardCode) errs.wardCode = 'Bắt buộc chọn Phường/Xã';
    if (!addressForm.addressLine.trim()) errs.addressLine = 'Bắt buộc nhập địa chỉ chi tiết';
    if (Object.keys(errs).length) { alert(Object.values(errs)[0]); return; }

    setAddressLoading(true);
    try {
      const url = editingAddressId
        ? `/admin/api/members/${member.id}?action=address&addressId=${editingAddressId}`
        : `/admin/api/members/${member.id}?action=address`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: addressForm.contactName,
          contactPhone: addressForm.contactPhone,
          provinceCode: addressForm.provinceCode,
          provinceName: addressForm.provinceName,
          districtCode: addressForm.districtCode,
          districtName: addressForm.districtName,
          wardCode: addressForm.wardCode,
          wardName: addressForm.wardName,
          addressLine: addressForm.addressLine,
          note: addressForm.note,
          isDefault: addressForm.isDefault,
          fullAddress: `${addressForm.addressLine}, ${addressForm.wardName}, ${addressForm.districtName}, ${addressForm.provinceName}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      setShowAddressModal(false);
      setEditingAddressId(null);
      setAddressForm({
        contactName: '',
        contactPhone: '',
        provinceCode: '',
        provinceName: '',
        districtCode: '',
        districtName: '',
        wardCode: '',
        wardName: '',
        addressLine: '',
        note: '',
        isDefault: false,
      });
      setDistricts([]);
      setWards([]);
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setAddressLoading(false); }
  }

  const statusOrderMap: Record<string, string> = {
    pending: 'bg-warning text-dark',
    confirmed: 'bg-primary',
    processing: 'bg-info',
    shipping: 'bg-purple',
    delivered: 'bg-success',
    completed: 'bg-success',
    cancelled: 'bg-danger',
    returned: 'bg-orange',
  };

  const orderStatusLabels: Record<string, string> = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    returned: 'Hoàn trả',
  };

  return (
    <div>
      {/* Header với nút Quay lại */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => router.push('/admin/members')}
            title="Quay lại danh sách"
          >
            <i className="bi bi-arrow-left me-1"></i>Quay lại DS
          </button>
          <h5 className="mb-0">CHI TIẾT THÀNH VIÊN #{member.id.slice(-6).toUpperCase()}</h5>
        </div>
      </div>

      {/* Thông tin cơ bản */}
      <div className="card mb-3">
        <div className="card-header fw-semibold">Thông tin cơ bản</div>
        <div className="card-body">
          <div className="d-flex align-items-start gap-3">
            <div className="flex-shrink-0">
              <div
                className="bg-primary text-white d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 64, height: 64, fontSize: 24, fontWeight: 'bold' }}
              >
                {(member.fullName || member.email || '?').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-1">{member.fullName || '—'}</h6>
              <div className="text-muted small mb-1">
                <i className="bi bi-envelope me-1"></i>{member.email || '—'}
              </div>
              <div className="text-muted small mb-2">
                <i className="bi bi-phone me-1"></i>{member.phone || '—'}
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <span className={`badge ${member.isActive ? 'bg-success' : 'bg-danger'}`}>
                  {member.isActive ? '✅ Active' : '❌ Khóa'}
                </span>
                {member.emailVerifiedAt && (
                  <span className="badge bg-success">
                    <i className="bi bi-envelope-check me-1"></i>Email đã xác minh
                  </span>
                )}
                {member.phoneVerifiedAt && (
                  <span className="badge bg-success">
                    <i className="bi bi-phone-check me-1"></i>SĐT đã xác minh
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 d-flex gap-2">
              <a
                href={`/admin/members/${member.id}?action=edit`}
                className="btn btn-sm btn-outline-primary"
              >
                <i className="bi bi-pencil-fill me-1"></i>Sửa thông tin
              </a>
              <button
                className={`btn btn-sm ${member.isActive ? 'btn-warning' : 'btn-success'}`}
                onClick={handleToggleActive}
                disabled={toggleLoading}
              >
                {toggleLoading ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                <i className={`bi ${member.isActive ? 'bi-slash-circle' : 'bi-check-circle-fill'} me-1`}></i>
                {member.isActive ? 'Khóa tài khoản' : 'Kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'info' ? 'active' : ''}`} onClick={() => handleTabChange('info')}>
            <i className="bi bi-person-fill me-1"></i>Thông tin
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'addresses' ? 'active' : ''}`} onClick={() => handleTabChange('addresses')}>
            <i className="bi bi-geo-alt-fill me-1"></i>Địa chỉ ({member.addresses.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders')}>
            <i className="bi bi-receipt me-1"></i>Đơn hàng
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => handleTabChange('stats')}>
            <i className="bi bi-bar-chart-fill me-1"></i>Thống kê
          </button>
        </li>
      </ul>

      {/* TAB: Info */}
      {activeTab === 'info' && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="order-detail-section">
              <div className="order-detail-section-title">Thông tin cá nhân</div>
              <div className="order-address-card">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Họ tên:</span>
                  <strong>{member.fullName || '—'}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Email:</span>
                  <div className="d-flex align-items-center gap-2">
                    <span>{member.email || '—'}</span>
                    {member.emailVerifiedAt ? (
                      <span className="badge bg-success" style={{ fontSize: 10 }}>
                        ✅ Đã xác minh
                      </span>
                    ) : (
                      <span className="badge bg-secondary" style={{ fontSize: 10 }}>
                        Chưa xác minh
                      </span>
                    )}
                  </div>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Số điện thoại:</span>
                  <div className="d-flex align-items-center gap-2">
                    <span>{member.phone || '—'}</span>
                    {member.phoneVerifiedAt ? (
                      <span className="badge bg-success" style={{ fontSize: 10 }}>
                        ✅ Đã xác minh
                      </span>
                    ) : (
                      <span className="badge bg-secondary" style={{ fontSize: 10 }}>
                        Chưa xác minh
                      </span>
                    )}
                  </div>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Ngày sinh:</span>
                  <span>{formatDate(member.dateOfBirth)}{age ? ` (${age} tuổi)` : ''}</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Giới tính:</span>
                  <span>{getGenderLabel(member.gender)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="order-detail-section">
              <div className="order-detail-section-title">Trạng thái tài khoản</div>
              <div className="order-address-card">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Ngày đăng ký:</span>
                  <span>{formatDate(member.createdAt, true)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Email xác minh:</span>
                  <span>{member.emailVerifiedAt ? formatDate(member.emailVerifiedAt, true) : 'Chưa xác minh'}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">SĐT xác minh:</span>
                  <span>{member.phoneVerifiedAt ? formatDate(member.phoneVerifiedAt, true) : 'Chưa xác minh'}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Cập nhật cuối:</span>
                  <span>{formatDate(member.updatedAt, true)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Addresses */}
      {activeTab === 'addresses' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Danh sách địa chỉ</h6>
            <button className="btn btn-sm btn-add" onClick={handleOpenAddAddress}>
              <i className="bi bi-plus-lg me-1"></i>Thêm địa chỉ
            </button>
          </div>

          {member.addresses.length === 0 ? (
            <div className="rk-empty">
              <i className="bi bi-geo-alt"></i>
              Chưa có địa chỉ nào.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {member.addresses.map((addr) => (
                <div key={addr.id} className="card">
                  <div className="card-body p-2">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        {addr.isDefault && (
                          <span className="badge bg-warning text-dark me-2">
                            <i className="bi bi-star-fill me-1"></i>Địa chỉ mặc định
                          </span>
                        )}
                        <div className="mt-1">
                          <strong>{addr.contactName}</strong>
                          <span className="text-muted ms-2">{addr.contactPhone}</span>
                        </div>
                      </div>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleOpenEditAddress(addr)}
                          title="Sửa"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        {!addr.isDefault && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            title="Đặt làm mặc định"
                          >
                            <i className="bi bi-star"></i>
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-del"
                          onClick={() => handleDeleteAddress(addr.id)}
                          title="Xóa"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                    <div className="text-muted small">
                      <i className="bi bi-geo-alt me-1"></i>
                      {addr.addressLine}
                      {addr.wardName && `, ${addr.wardName}`}
                      {addr.districtName && `, ${addr.districtName}`}
                      {addr.provinceName && `, ${addr.provinceName}`}
                    </div>
                    {addr.note && (
                      <div className="text-muted small mt-1">
                        <i className="bi bi-sticky me-1"></i>{addr.note}
                      </div>
                    )}
                    <div className="mt-2">
                      {addr.latitude && addr.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-info"
                        >
                          <i className="bi bi-geo-alt-fill me-1"></i>
                          Xem trên bản đồ ({addr.latitude}, {addr.longitude})
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr.fullAddress || addr.addressLine || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-info"
                        >
                          <i className="bi bi-geo-alt-fill me-1"></i>
                          Xem trên bản đồ
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Orders */}
      {activeTab === 'orders' && (
        <div>
          {ordersLoading ? (
            <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span> Đang tải...</div>
          ) : orders.length === 0 ? (
            <div className="rk-empty"><i className="bi bi-receipt"></i>Chưa có đơn hàng nào.</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th className="text-center" style={{ width: 40 }}>STT</th>
                      <th>Mã đơn</th>
                      <th style={{ width: 140 }}>Ngày đặt</th>
                      <th className="text-end" style={{ width: 130 }}>Tổng tiền</th>
                      <th style={{ width: 120 }}>Trạng thái</th>
                      <th className="text-center" style={{ width: 80 }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, idx) => (
                      <tr key={o.id}>
                        <td className="text-center">{idx + 1}</td>
                        <td><code className="small">{o.orderNo}</code></td>
                        <td className="small">{formatDate(o.placedAt)}</td>
                        <td className="text-end fw-semibold text-danger">{formatPrice(o.grandTotalAmount)}</td>
                        <td>
                          <span className={`badge ${statusOrderMap[o.orderStatus] || 'bg-secondary'}`}>
                            {orderStatusLabels[o.orderStatus] || o.orderStatus}
                          </span>
                        </td>
                        <td className="text-center">
                          <a href={`/admin/orders/${o.id}`} className="btn-edit btn-sm">
                            <i className="bi bi-eye-fill"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {orders.length > 0 && (
                <div className="mt-2 p-2 bg-light rounded">
                  <strong>Tổng cộng:</strong> {orders.length} đơn hàng
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: Stats */}
      {activeTab === 'stats' && (
        <div>
          {statsLoading ? (
            <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span> Đang tải...</div>
          ) : stats ? (
            <>
              <div className="order-detail-section mb-3">
                <div className="order-detail-section-title">Tổng quan mua hàng</div>
                <div className="order-address-card">
                  {/* Hàng 1: Tổng đơn, Tổng chi tiêu, Trung bình */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-4 col-4">
                      <div className="dashboard-stat dashboard-stat--total">
                        <div className="dashboard-stat__value">{stats.totalOrders}</div>
                        <div className="dashboard-stat__label">Tổng đơn</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-4">
                      <div className="dashboard-stat dashboard-stat--completed">
                        <div className="dashboard-stat__value">{formatPrice(stats.totalSpent)}</div>
                        <div className="dashboard-stat__label">Tổng chi tiêu</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-4">
                      <div className="dashboard-stat dashboard-stat--info">
                        <div className="dashboard-stat__value">{formatPrice(stats.avgOrderValue)}</div>
                        <div className="dashboard-stat__label">Trung bình</div>
                      </div>
                    </div>
                  </div>

                  {/* Hàng 2: Hoàn thành, Đã hủy, Tỷ lệ hủy */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-4 col-4">
                      <div className="dashboard-stat dashboard-stat--delivered">
                        <div className="dashboard-stat__value">{stats.completedOrders}</div>
                        <div className="dashboard-stat__label">Hoàn thành</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-4">
                      <div className="dashboard-stat dashboard-stat--cancelled">
                        <div className="dashboard-stat__value">{stats.cancelledOrders}</div>
                        <div className="dashboard-stat__label">Đã hủy</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-4">
                      <div className="dashboard-stat dashboard-stat--warning">
                        <div className="dashboard-stat__value">{stats.cancelRate.toFixed(1)}%</div>
                        <div className="dashboard-stat__label">Tỷ lệ hủy</div>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin đơn đầu và đơn gần nhất */}
                  <div className="border-top pt-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Đơn đầu tiên:</span>
                      <strong>{stats.firstOrderDate ? formatDate(stats.firstOrderDate) : '—'}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Đơn gần nhất:</span>
                      <strong>{stats.lastOrderDate ? formatDate(stats.lastOrderDate) : '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Biểu đồ chi tiêu theo tháng */}
              <div className="order-detail-section">
                <div className="order-detail-section-title">Biểu đồ chi tiêu theo tháng (12 tháng gần nhất)</div>
                <div className="order-address-card p-3">
                  {stats.monthlyData && stats.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          style={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          style={{ fontSize: 12 }}
                          tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => {
                            if (!value) return ['—', name || ''];
                            const numValue = typeof value === 'number' ? value : Number(value);
                            if (name === 'amount') return [formatPrice(numValue), 'Doanh thu'];
                            return [numValue, 'Số đơn'];
                          }}
                          labelStyle={{ color: '#000', fontWeight: 'bold' }}
                        />
                        <Legend
                          formatter={(value) => {
                            if (value === 'amount') return 'Doanh thu (VNĐ)';
                            if (value === 'orders') return 'Số đơn hàng';
                            return value;
                          }}
                        />
                        <Bar dataKey="amount" fill="#0d6efd" name="amount" />
                        <Bar dataKey="orders" fill="#198754" name="orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-bar-chart-line fs-1 d-block mb-2"></i>
                      Chưa có dữ liệu đơn hàng
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rk-empty"><i className="bi bi-bar-chart"></i>Không có dữ liệu thống kê.</div>
          )}
        </div>
      )}

      {/* Address Modal - Outside tabs */}
      {showAddressModal && (
        <>
          <div
            className="modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1050,
              display: 'block'
            }}
            onClick={() => setShowAddressModal(false)}
          ></div>
          <div
            className="modal d-block"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 1055,
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="modal-dialog" style={{ margin: '1.75rem auto', maxWidth: 500 }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingAddressId ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h5>
                  <button className="btn-close" onClick={() => setShowAddressModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-2">
                    <label className="form-label small">Người nhận *</label>
                    <input className="form-control form-control-sm" value={addressForm.contactName}
                      onChange={(e) => setAddressForm((p) => ({ ...p, contactName: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">SĐT người nhận *</label>
                    <input className="form-control form-control-sm" value={addressForm.contactPhone}
                      onChange={(e) => setAddressForm((p) => ({ ...p, contactPhone: e.target.value }))} />
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-4">
                      <label className="form-label small">Tỉnh/TP *</label>
                      <select
                        className="form-select form-select-sm"
                        value={addressForm.provinceCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          const province = provinces.find((p) => String(p.code) === code);
                          setAddressForm((p) => ({
                            ...p,
                            provinceCode: code,
                            provinceName: province?.name || '',
                            districtCode: '',
                            districtName: '',
                            wardCode: '',
                            wardName: '',
                          }));
                          loadDistricts(code);
                        }}
                      >
                        <option value="">-- Chọn Tỉnh/TP --</option>
                        {provinces.map((prov) => (
                          <option key={prov.code} value={prov.code}>
                            {prov.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label small">Quận/Huyện *</label>
                      <select
                        className="form-select form-select-sm"
                        value={addressForm.districtCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          const district = districts.find((d) => String(d.code) === code);
                          setAddressForm((p) => ({
                            ...p,
                            districtCode: code,
                            districtName: district?.name || '',
                            wardCode: '',
                            wardName: '',
                          }));
                          loadWards(code);
                        }}
                        disabled={!addressForm.provinceCode || locationsLoading}
                      >
                        <option value="">-- Chọn Quận/Huyện --</option>
                        {districts.map((dist) => (
                          <option key={dist.code} value={dist.code}>
                            {dist.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label small">Phường/Xã *</label>
                      <select
                        className="form-select form-select-sm"
                        value={addressForm.wardCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          const ward = wards.find((w) => String(w.code) === code);
                          setAddressForm((p) => ({
                            ...p,
                            wardCode: code,
                            wardName: ward?.name || '',
                          }));
                        }}
                        disabled={!addressForm.districtCode || locationsLoading}
                      >
                        <option value="">-- Chọn Phường/Xã --</option>
                        {wards.map((ward) => (
                          <option key={ward.code} value={ward.code}>
                            {ward.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Địa chỉ chi tiết *</label>
                    <input className="form-control form-control-sm" placeholder="Số nhà, đường..."
                      value={addressForm.addressLine}
                      onChange={(e) => setAddressForm((p) => ({ ...p, addressLine: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Ghi chú</label>
                    <input className="form-control form-control-sm" placeholder="Giao hàng giờ hành chính..."
                      value={addressForm.note}
                      onChange={(e) => setAddressForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="isDefault"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm((p) => ({ ...p, isDefault: e.target.checked }))} />
                    <label className="form-check-label small" htmlFor="isDefault">Đặt làm địa chỉ mặc định</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddressModal(false)}>Hủy</button>
                  <button className="btn btn-sm btn-primary" disabled={addressLoading} onClick={handleSaveAddress}>
                    {addressLoading ? <span className="spinner-border spinner-border-sm"></span> : null}
                    <i className="bi bi-check2 me-1"></i>Lưu địa chỉ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
