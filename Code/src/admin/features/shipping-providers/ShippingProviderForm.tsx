'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ============================================================
// TYPES
// ============================================================

interface ShippingProviderDetail {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  website: string | null;
  note: string | null;
  isActive: boolean;
  serviceTypes?: string[];
  vehicles?: string[];
  surcharges?: unknown;
  discountPolicies?: unknown;
}

// Dòng bảng giá — dùng internal field names
interface PricingRow {
  id: string;
  minDistance: number;
  maxDistance: number;
  serviceType: string;
  vehicle: string;
  baseCost: number;
  surchargeAmount: number;
  surchargeLabel: string;
  note: string;
  isActive: boolean;
}

interface Props {
  provider?: ShippingProviderDetail;
}

// ============================================================
// CONSTANTS
// ============================================================

const SERVICE_TYPES = [
  { value: 'standard', label: 'Tiêu chuẩn' },
  { value: 'express', label: 'Nhanh' },
  { value: 'same_day', label: 'Trong ngày' },
  { value: 'scheduled', label: 'Hẹn lịch' },
];

const VEHICLE_LABELS: Record<string, string> = {
  motorbike: 'Xe máy',
  van: 'Xe van',
  truck: 'Xe tải',
  airplane: 'Máy bay',
};

type TabKey = 'info' | 'pricing';

// ============================================================
// COMPONENT
// ============================================================

export function ShippingProviderForm({ provider }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = !!provider;

  const [activeTab, setActiveTab] = useState<TabKey>(
    searchParams.get('tab') === 'pricing' ? 'pricing' : 'info'
  );

  // ── Info form state ──
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    code: provider?.code || '',
    name: provider?.name || '',
    phone: provider?.phone || '',
    website: provider?.website || '',
    note: provider?.note || '',
    isActive: provider?.isActive ?? true,
    serviceTypes: provider?.serviceTypes || [] as string[],
    vehicles: provider?.vehicles || [] as string[],
  });

  // ── Pricing state ──
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState('');
  const [pricingVehicle, setPricingVehicle] = useState(() => {
    // Initialize với first vehicle từ provider (nếu có)
    if (provider?.vehicles && provider.vehicles.length > 0) {
      return provider.vehicles[0];
    }
    return '';
  });

  // ── Phụ phí state ──
  const [surcharges, setSurcharges] = useState(() => {
    if (provider?.surcharges && Array.isArray(provider.surcharges)) {
      return provider.surcharges as Array<{ key: string; label: string; amount: number }>;
    }
    return [
      { key: 'after_hours', label: 'Giao ngoài giờ (18h–22h)', amount: 0 },
      { key: 'weekend', label: 'Giao cuối tuần', amount: 0 },
      { key: 'bulky', label: 'Hàng cồng kềnh (>50kg)', amount: 0 },
      { key: 'cod', label: 'Thu hộ COD', amount: 0 },
    ];
  });

  // ── Chính sách giảm giá state ──
  const [discountPolicies, setDiscountPolicies] = useState(() => {
    if (provider?.discountPolicies && Array.isArray(provider.discountPolicies)) {
      return provider.discountPolicies as Array<{ id: number; threshold: number; discount: number }>;
    }
    return [
      { id: 1, threshold: 50, discount: 5 },
      { id: 2, threshold: 100, discount: 10 },
      { id: 3, threshold: 200, discount: 15 },
    ];
  });

  // ── Auto-select first vehicle ──
  useEffect(() => {
    const firstVehicle = form.vehicles[0];
    if (firstVehicle && firstVehicle !== pricingVehicle) {
      setPricingVehicle(firstVehicle);
    }
  }, [form.vehicles]);

  // ── Load pricing when tab/vehicle changes ──
  useEffect(() => {
    if (activeTab === 'pricing' && isEdit && provider && pricingVehicle) {
      loadPricing(pricingVehicle);
    }
  }, [activeTab, pricingVehicle, isEdit, provider]);

  // ── Load pricing from API ──
  async function loadPricing(vehicleFilter: string) {
    if (!provider) return;
    setPricingLoading(true);
    try {
      const res = await fetch(
        `/admin/api/shipping-providers/${provider.id}/pricing?vehicle=${encodeURIComponent(vehicleFilter)}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const loaded: PricingRow[] = json.data.map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ''),
          minDistance: Number(r.minDistance ?? 0),
          maxDistance: Number(r.maxDistance ?? 0),
          serviceType: String(r.serviceType ?? 'standard'),
          vehicle: String(r.vehicle ?? vehicleFilter),
          baseCost: Number(r.baseCost ?? 0),
          surchargeAmount: Number(r.surchargeAmount ?? 0),
          surchargeLabel: String(r.surchargeLabel ?? ''),
          note: String(r.note ?? ''),
          isActive: Boolean(r.isActive ?? true),
        }));
        setPricing(loaded);
      }
    } catch (err) {
      console.error('Load pricing error:', err);
    }
    finally { setPricingLoading(false); }
  }

  // ── Add distance range row ──
  function addPricingRow() {
    setPricing(prev => {
      const serviceTypes = form.serviceTypes.length > 0 ? form.serviceTypes : ['standard'];
      const maxTo = prev.length > 0 ? Math.max(...prev.map(r => r.maxDistance)) : 0;
      const newRows: PricingRow[] = serviceTypes.map(st => ({
        id: `new-${Date.now()}-${st}`,
        minDistance: maxTo,
        maxDistance: maxTo + 5,
        serviceType: st,
        vehicle: pricingVehicle,
        baseCost: 0,
        surchargeAmount: 0,
        surchargeLabel: '',
        note: '',
        isActive: true,
      }));
      return [...prev, ...newRows];
    });
  }

  // ── Delete all rows for a distance range ──
  function deletePricingRow(minD: number, maxD: number) {
    setPricing(prev => prev.filter(r => !(r.minDistance === minD && r.maxDistance === maxD)));
  }

  // ── Update distance range ──
  function updateDistanceRange(minD: number, maxD: number, field: 'minDistance' | 'maxDistance', value: number) {
    setPricing(prev => prev.map(r =>
      r.minDistance === minD && r.maxDistance === maxD
        ? { ...r, [field]: value }
        : r
    ));
  }

  // ── Update baseCost for a specific cell ──
  function updateBaseCost(minD: number, maxD: number, serviceType: string, value: number) {
    setPricing(prev => {
      // Kiểm tra xem row đã tồn tại chưa
      const existingRow = prev.find(r =>
        r.minDistance === minD && r.maxDistance === maxD && r.serviceType === serviceType
      );

      if (existingRow) {
        // Update row đã tồn tại
        return prev.map(r =>
          r.minDistance === minD && r.maxDistance === maxD && r.serviceType === serviceType
            ? { ...r, baseCost: value }
            : r
        );
      } else {
        // Tạo row mới nếu chưa tồn tại
        const newRow: PricingRow = {
          id: `new-${Date.now()}-${serviceType}`,
          minDistance: minD,
          maxDistance: maxD,
          serviceType: serviceType,
          vehicle: pricingVehicle,
          baseCost: value,
          surchargeAmount: 0,
          surchargeLabel: '',
          note: '',
          isActive: true,
        };
        return [...prev, newRow];
      }
    });
  }

  // ── Save bảng giá ──
  async function handlePricingSave() {
    if (!provider) return;
    setPricingSaving(true);
    setPricingError('');
    try {
      const rows = pricing.map(r => ({
        shippingProviderId: provider.id,
        minDistance: r.minDistance,
        maxDistance: r.maxDistance,
        serviceType: r.serviceType,
        vehicle: r.vehicle,
        baseCost: r.baseCost,
        costPerKm: 0,
        costPerKg: 0,
        minCost: 0,
        surchargeAmount: r.surchargeAmount,
        surchargeLabel: r.surchargeLabel,
        note: r.note,
        isActive: true,
      }));

      const res = await fetch(`/admin/api/shipping-providers/${provider.id}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          vehicle: pricingVehicle,
          surcharges,
          discountPolicies,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPricingError(json.error || json.errors?.message || 'Lỗi khi lưu bảng giá');
        return;
      }
      await loadPricing(pricingVehicle);
    } catch { setPricingError('Lỗi kết nối'); }
    finally { setPricingSaving(false); }
  }

  // ── Save info ──
  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm(p => ({ ...p, [name]: v }));
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  function handleServiceTypeChange(value: string, checked: boolean) {
    setForm(p => ({
      ...p,
      serviceTypes: checked
        ? [...p.serviceTypes, value]
        : p.serviceTypes.filter(v => v !== value),
    }));
  }

  function handleVehicleChange(value: string, checked: boolean) {
    if (!checked && provider && pricingVehicle === value) {
      fetch(`/admin/api/shipping-providers/${provider.id}/pricing?vehicle=${encodeURIComponent(value)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    setForm(p => ({
      ...p,
      vehicles: checked
        ? [...p.vehicles, value]
        : p.vehicles.filter(v => v !== value),
    }));
    if (!checked && pricingVehicle === value) {
      setPricingVehicle('');
      setPricing([]);
    }
  }

  async function handleSaveAll() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        code: form.code.trim() || null,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        note: form.note.trim() || null,
        isActive: form.isActive,
        serviceTypes: form.serviceTypes,
        vehicles: form.vehicles,
      };

      const infoUrl = isEdit ? `/admin/api/shipping-providers/${provider!.id}` : '/admin/api/shipping-providers';
      const infoRes = await fetch(infoUrl, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const infoJson = await infoRes.json();
      if (!infoRes.ok) {
        if (infoJson.errors) {
          const fe: Record<string, string> = {};
          Object.entries(infoJson.errors).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? (v as string[])[0] : String(v); });
          setErrors(fe);
        } else setGlobalError(infoJson.error || 'Lỗi khi lưu thông tin');
        return;
      }

      if (provider && pricingVehicle && pricing.length > 0) {
        const rows = pricing.map(r => ({
          shippingProviderId: provider.id,
          minDistance: r.minDistance,
          maxDistance: r.maxDistance,
          serviceType: r.serviceType,
          vehicle: r.vehicle,
          baseCost: r.baseCost,
          costPerKm: 0,
          costPerKg: 0,
          minCost: 0,
          surchargeAmount: r.surchargeAmount,
          surchargeLabel: r.surchargeLabel,
          note: r.note,
          isActive: true,
        }));
        const pricingRes = await fetch(`/admin/api/shipping-providers/${provider.id}/pricing`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows, vehicle: pricingVehicle }),
        });
        const pricingJson = await pricingRes.json();
        if (!pricingRes.ok) {
          setPricingError(pricingJson.error || 'Lỗi khi lưu bảng giá');
          return;
        }
      }

      router.push('/admin/shipping-providers');
      router.refresh();
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  // ── Group pricing by distance for display ──
  const pricingByDistance = pricing.reduce<Record<string, { from: number; to: number; rows: PricingRow[] }>>((acc, r) => {
    const key = `${r.minDistance}-${r.maxDistance}`;
    if (!acc[key]) acc[key] = { from: r.minDistance, to: r.maxDistance, rows: [] };
    acc[key].rows.push(r);
    return acc;
  }, {});

  const distanceKeys = Object.keys(pricingByDistance).sort(
    (a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0])
  );

  const providerServiceTypes = form.serviceTypes.length > 0 ? form.serviceTypes : ['standard'];

  const serviceTypeLabel: Record<string, string> = {
    standard: 'Tiêu chuẩn',
    express: 'Nhanh',
    same_day: 'Trong ngày',
    scheduled: 'Hẹn lịch',
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div>
      {globalError && <div className="alert alert-danger py-2 mb-3">{globalError}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/shipping-providers">Đơn vị vận chuyển</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Sửa' : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => router.push('/admin/shipping-providers')} disabled={loading}>Hủy</button>
          <button type="button" className="btn btn-success btn-sm" onClick={handleSaveAll} disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : <><i className="bi bi-check-lg me-1"></i>Lưu</>}
          </button>
        </div>
      </div>

      {/* Tabs (edit only) */}
      {isEdit && (
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button type="button" className={`nav-link${activeTab === 'info' ? ' active' : ''}`} onClick={() => setActiveTab('info')}>
              <i className="bi bi-info-circle me-1"></i>Thông tin
            </button>
          </li>
          <li className="nav-item">
            <button type="button" className={`nav-link${activeTab === 'pricing' ? ' active' : ''}`} onClick={() => setActiveTab('pricing')}>
              <i className="bi bi-currency-dollar me-1"></i>Bảng giá
            </button>
          </li>
        </ul>
      )}

      {/* ── TAB: THÔNG TIN ── */}
      {activeTab === 'info' && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="card mb-3">
              <div className="card-header fw-semibold">Thông tin cơ bản</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Mã đơn vị</label>
                  <input name="code" value={form.code} onChange={handle} placeholder="VD: GHN, GHTK, VTP"
                    className={`form-control form-control-sm ${errors.code ? 'is-invalid' : ''}`} />
                  {errors.code && <div className="invalid-feedback d-block">{errors.code}</div>}
                  <small className="text-muted">Mã viết tắt của đơn vị vận chuyển</small>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Tên đơn vị <span className="text-danger">*</span></label>
                  <input name="name" value={form.name} onChange={handle} placeholder="VD: Giao Hàng Nhanh"
                    className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`} />
                  {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Số điện thoại</label>
                    <input name="phone" value={form.phone} onChange={handle} placeholder="VD: 1900-xxxx"
                      className="form-control form-control-sm" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Website</label>
                    <input name="website" type="url" value={form.website} onChange={handle} placeholder="https://ghn.vn"
                      className={`form-control form-control-sm ${errors.website ? 'is-invalid' : ''}`} />
                    {errors.website && <div className="invalid-feedback d-block">{errors.website}</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header fw-semibold">Dịch vụ cung cấp</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Loại dịch vụ</label>
                  <div>
                    {SERVICE_TYPES.map(st => (
                      <div className="form-check form-check-inline" key={st.value}>
                        <input className="form-check-input" type="checkbox" id={`st-${st.value}`}
                          checked={form.serviceTypes.includes(st.value)}
                          onChange={e => handleServiceTypeChange(st.value, e.target.checked)} />
                        <label className="form-check-label small" htmlFor={`st-${st.value}`}>{st.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label small fw-semibold">Phương tiện hỗ trợ</label>
                  <div>
                    {[
                      { value: 'motorbike', label: 'Xe máy' },
                      { value: 'van', label: 'Xe van' },
                      { value: 'truck', label: 'Xe tải' },
                      { value: 'airplane', label: 'Máy bay' },
                    ].map(v => (
                      <div className="form-check form-check-inline" key={v.value}>
                        <input className="form-check-input" type="checkbox" id={`v-${v.value}`}
                          checked={form.vehicles.includes(v.value)}
                          onChange={e => handleVehicleChange(v.value, e.target.checked)} />
                        <label className="form-check-label small" htmlFor={`v-${v.value}`}>{v.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header fw-semibold">Ghi chú</div>
              <div className="card-body">
                <textarea name="note" value={form.note} onChange={handle} rows={3}
                  placeholder="VD: Đối tác tin cậy từ năm 2020, hỗ trợ COD..."
                  className="form-control form-control-sm" />
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card mb-3">
              <div className="card-header fw-semibold">Trạng thái</div>
              <div className="card-body">
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" name="isActive" id="isActive"
                    checked={form.isActive} onChange={handle} />
                  <label className="form-check-label" htmlFor="isActive">Đang hợp tác</label>
                </div>
                <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                  {form.isActive ? '● Hoạt động' : '● Tạm ngưng'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: BẢNG GIÁ ── */}
      {activeTab === 'pricing' && (
        <div>
          {/* Info bar */}
          <div className="d-flex align-items-center gap-4 mb-3 px-1 py-2" style={{ background: '#f8f9fa', borderRadius: 4, fontSize: 13 }}>
            <div>
              <span className="text-muted me-1">Loại dịch vụ:</span>
              {providerServiceTypes.map(st => (
                <span key={st} className="badge bg-info me-1">{serviceTypeLabel[st] ?? st}</span>
              ))}
            </div>
            {form.vehicles.length > 0 ? (
              <div className="d-flex align-items-center gap-1">
                <span className="text-muted">Phương tiện:</span>
                <select className="form-select form-select-sm" style={{ width: 'auto', fontSize: 13 }}
                  value={pricingVehicle} onChange={e => setPricingVehicle(e.target.value)}>
                  {form.vehicles.map(v => (
                    <option key={v} value={v}>{VEHICLE_LABELS[v] ?? v}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-warning small">
                <i className="bi bi-exclamation-circle me-1"></i>Chưa chọn phương tiện ở tab Thông tin
              </span>
            )}
          </div>

          {form.vehicles.length === 0 ? (
            <div className="alert alert-warning mb-3">
              <i className="bi bi-exclamation-triangle me-1"></i>
              Vui lòng chọn ít nhất một phương tiện ở tab <strong>Thông tin</strong> trước khi thiết lập bảng giá.
            </div>
          ) : (
            <>
              {pricingError && <div className="alert alert-danger py-2 mb-3">{pricingError}</div>}

              {pricingLoading ? (
                <div className="text-center py-4">
                  <span className="spinner-border spinner-border-sm"></span> Đang tải...
                </div>
              ) : (
                <>
                  {/* Bảng giá */}
                  <div className="card mb-3">
                    <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
                      BẢNG GIÁ — {VEHICLE_LABELS[pricingVehicle] ?? pricingVehicle}
                      <button type="button" className="btn btn-sm btn-success" onClick={handlePricingSave} disabled={pricingSaving}>
                        {pricingSaving
                          ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</>
                          : <><i className="bi bi-check-lg me-1"></i>Lưu bảng giá</>}
                      </button>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered mb-0">
                          <thead className="table-light text-center">
                            <tr>
                              <th style={{ minWidth: 140 }}>Khoảng cách</th>
                              {providerServiceTypes.map(st => (
                                <th key={st}>{serviceTypeLabel[st] ?? st}</th>
                              ))}
                              <th style={{ width: 40 }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {distanceKeys.length === 0 ? (
                              <tr>
                                <td colSpan={providerServiceTypes.length + 2} className="text-center text-muted py-4">
                                  Nhấn &quot;Thêm khoảng cách&quot; để bắt đầu cấu hình bảng giá
                                </td>
                              </tr>
                            ) : distanceKeys.map(key => {
                              const { from, to, rows } = pricingByDistance[key];
                              return (
                                <tr key={key}>
                                  {/* Khoảng cách inputs */}
                                  <td>
                                    <div className="d-flex align-items-center gap-1">
                                      <input type="number" className="form-control form-control-sm"
                                        style={{ width: 60 }} value={from} min={0}
                                        onChange={e => updateDistanceRange(from, to, 'minDistance', Number(e.target.value))} />
                                      <span>–</span>
                                      <input type="number" className="form-control form-control-sm"
                                        style={{ width: 60 }} value={to} min={0}
                                        onChange={e => updateDistanceRange(from, to, 'maxDistance', Number(e.target.value))} />
                                      <span>km</span>
                                    </div>
                                  </td>
                                  {/* Giá theo serviceType */}
                                  {providerServiceTypes.map(st => {
                                    // Tìm row cho serviceType này
                                    const row = rows.find(r => r.serviceType === st);
                                    return (
                                      <td key={st} className="text-center">
                                        <input type="number" className="form-control form-control-sm"
                                          placeholder="Giá" value={row ? row.baseCost : ''} min={0}
                                          onChange={e => updateBaseCost(from, to, st, Number(e.target.value))} />
                                      </td>
                                    );
                                  })}
                                  {/* Delete */}
                                  <td>
                                    <button className="btn btn-sm btn-outline-danger"
                                      onClick={() => deletePricingRow(from, to)}>
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-2">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={addPricingRow}>
                          <i className="bi bi-plus-lg me-1"></i>Thêm khoảng cách
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phụ phí */}
                  <div className="card mb-3">
                    <div className="card-header fw-semibold">PHỤ PHÍ</div>
                    <div className="card-body">
                      <div className="row g-3">
                        {surcharges.map(s => (
                          <div className="col-md-6" key={s.key}>
                            <label className="form-label small text-muted">{s.label}</label>
                            <div className="input-group input-group-sm">
                              <input type="number" className="form-control" placeholder="0" min={0}
                                value={s.amount || ''}
                                onChange={e => setSurcharges(prev =>
                                  prev.map(x => x.key === s.key ? { ...x, amount: Number(e.target.value) } : x)
                                )} />
                              <span className="input-group-text">đ</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Chính sách giảm giá */}
                  <div className="card mb-3">
                    <div className="card-header fw-semibold">CHÍNH SÁCH GIẢM GIÁ</div>
                    <div className="card-body">
                      {discountPolicies.map(p => (
                        <div className="row g-2 mb-2 align-items-center" key={p.id}>
                          <div className="col-4">
                            <label className="form-label small mb-0 fw-normal">
                              Từ {p.threshold} đơn/tháng (giảm):
                            </label>
                          </div>
                          <div className="col-8">
                            <div className="input-group input-group-sm">
                              <input type="number" className="form-control" min={0} max={100}
                                value={p.discount || ''}
                                onChange={e => setDiscountPolicies(prev =>
                                  prev.map(x => x.id === p.id ? { ...x, discount: Number(e.target.value) } : x)
                                )} />
                              <span className="input-group-text">%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
