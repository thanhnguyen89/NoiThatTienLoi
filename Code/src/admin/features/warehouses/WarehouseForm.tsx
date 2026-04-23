'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface WarehouseDetail {
  id: string;
  code: string | null;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  countryCode: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  wardCode: string | null;
  wardName: string | null;
  addressLine: string;
  latitude: unknown;
  longitude: unknown;
  isActive: boolean;
}

interface Props {
  warehouse?: WarehouseDetail;
}

interface Location {
  code: string;
  name: string;
}

export function WarehouseForm({ warehouse }: Props) {
  const router = useRouter();
  const isEdit = !!warehouse;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const [provinces, setProvinces] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [wards, setWards] = useState<Location[]>([]);

  const [form, setForm] = useState({
    code: warehouse?.code || '',
    name: warehouse?.name || '',
    contactName: warehouse?.contactName || '',
    contactPhone: warehouse?.contactPhone || '',
    provinceCode: warehouse?.provinceCode || '',
    provinceName: warehouse?.provinceName || '',
    districtCode: warehouse?.districtCode || '',
    districtName: warehouse?.districtName || '',
    wardCode: warehouse?.wardCode || '',
    wardName: warehouse?.wardName || '',
    addressLine: warehouse?.addressLine || '',
    latitude: String(warehouse?.latitude ?? ''),
    longitude: String(warehouse?.longitude ?? ''),
    isActive: warehouse?.isActive ?? true,
  });

  // Fetch provinces on mount
  useEffect(() => {
    fetch('/api/locations/provinces')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setProvinces(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
    if (form.provinceCode) {
      fetch(`/api/locations/districts/${form.provinceCode}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setDistricts(data.data);
          }
        })
        .catch(() => {});
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [form.provinceCode]);

  // Fetch wards when district changes
  useEffect(() => {
    if (form.districtCode) {
      fetch(`/api/locations/wards/${form.districtCode}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setWards(data.data);
          }
        })
        .catch(() => {});
    } else {
      setWards([]);
    }
  }, [form.districtCode]);

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    // Handle cascading dropdowns
    if (name === 'provinceCode') {
      const selectedProvince = provinces.find(p => p.code === value);
      setForm((p) => ({
        ...p,
        provinceCode: value,
        provinceName: selectedProvince?.name || '',
        districtCode: '',
        districtName: '',
        wardCode: '',
        wardName: '',
      }));
    } else if (name === 'districtCode') {
      const selectedDistrict = districts.find(d => d.code === value);
      setForm((p) => ({
        ...p,
        districtCode: value,
        districtName: selectedDistrict?.name || '',
        wardCode: '',
        wardName: '',
      }));
    } else if (name === 'wardCode') {
      const selectedWard = wards.find(w => w.code === value);
      setForm((p) => ({
        ...p,
        wardCode: value,
        wardName: selectedWard?.name || '',
      }));
    } else {
      setForm((p) => ({ ...p, [name]: v }));
    }

    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  async function handleGeocoding() {
    const fullAddress = [form.addressLine, form.wardName, form.districtName, form.provinceName]
      .filter(Boolean)
      .join(', ');

    if (!fullAddress) {
      alert('Vui lòng nhập đầy đủ địa chỉ trước khi lấy tọa độ');
      return;
    }

    setGeocoding(true);
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'WarehouseManagement/1.0'
        }
      });
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setForm(p => ({
          ...p,
          latitude: lat,
          longitude: lon,
        }));
        alert('Đã lấy tọa độ GPS thành công!');
      } else {
        alert('Không tìm thấy tọa độ cho địa chỉ này. Vui lòng nhập thủ công.');
      }
    } catch (err) {
      alert('Lỗi khi lấy tọa độ. Vui lòng thử lại hoặc nhập thủ công.');
    } finally {
      setGeocoding(false);
    }
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Bắt buộc';
    if (!form.addressLine.trim()) e.addressLine = 'Bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        code: form.code.trim() || null,
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        provinceCode: form.provinceCode || null,
        provinceName: form.provinceName.trim() || null,
        districtCode: form.districtCode || null,
        districtName: form.districtName.trim() || null,
        wardCode: form.wardCode || null,
        wardName: form.wardName.trim() || null,
        addressLine: form.addressLine.trim(),
        latitude: form.latitude.trim() || null,
        longitude: form.longitude.trim() || null,
        isActive: form.isActive,
      };
      const url = isEdit ? `/admin/api/warehouses/${warehouse.id}` : '/admin/api/warehouses';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.errors) {
          const fe: Record<string, string> = {};
          Object.entries(json.errors).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? (v as string[])[0] : String(v); });
          setErrors(fe);
        } else setGlobalError(json.error || 'Lỗi');
        return;
      }
      router.push('/admin/warehouses');
      router.refresh();
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}

      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/warehouses">Kho hàng</Link></li>
            <li className="breadcrumb-item active">{isEdit ? 'Sửa' : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/warehouses')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo kho'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          {/* Thông tin cơ bản */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin kho</div>
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Mã kho</label>
                  <input
                    name="code"
                    value={form.code}
                    onChange={handle}
                    placeholder="VD: WH-001 (để trống để tự động)"
                    className="form-control form-control-sm"
                  />
                  <div className="form-text small">Để trống để tự động sinh mã</div>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Tên kho <span className="text-danger">*</span></label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handle}
                    placeholder="VD: Kho trung tâm Quận 9"
                    className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                    autoFocus
                  />
                  {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Người quản lý</label>
                  <input
                    name="contactName"
                    value={form.contactName}
                    onChange={handle}
                    placeholder="VD: Nguyễn Văn A"
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">SĐT liên hệ</label>
                  <input
                    name="contactPhone"
                    value={form.contactPhone}
                    onChange={handle}
                    placeholder="VD: 0901234567"
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Địa chỉ kho</div>
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-4">
                  <label className="form-label small fw-semibold">Tỉnh/TP <span className="text-danger">*</span></label>
                  <select
                    name="provinceCode"
                    value={form.provinceCode}
                    onChange={handle}
                    className="form-select form-select-sm"
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Quận/Huyện <span className="text-danger">*</span></label>
                  <select
                    name="districtCode"
                    value={form.districtCode}
                    onChange={handle}
                    className="form-select form-select-sm"
                    disabled={!form.provinceCode}
                  >
                    <option value="">Chọn quận/huyện</option>
                    {districts.map(d => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-4">
                  <label className="form-label small fw-semibold">Phường/Xã <span className="text-danger">*</span></label>
                  <select
                    name="wardCode"
                    value={form.wardCode}
                    onChange={handle}
                    className="form-select form-select-sm"
                    disabled={!form.districtCode}
                  >
                    <option value="">Chọn phường/xã</option>
                    {wards.map(w => (
                      <option key={w.code} value={w.code}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Địa chỉ chi tiết <span className="text-danger">*</span></label>
                <textarea
                  name="addressLine"
                  value={form.addressLine}
                  onChange={handle}
                  rows={2}
                  placeholder="VD: 123 Đường ABC, Khu công nghiệp XYZ"
                  className={`form-control form-control-sm ${errors.addressLine ? 'is-invalid' : ''}`}
                />
                {errors.addressLine && <div className="invalid-feedback d-block">{errors.addressLine}</div>}
              </div>
              <div className="mb-0">
                <label className="form-label small fw-semibold">Địa chỉ đầy đủ (readonly)</label>
                <input
                  type="text"
                  value={[form.addressLine, form.wardName, form.districtName, form.provinceName]
                    .filter(Boolean)
                    .join(', ') || 'Chưa có địa chỉ đầy đủ'}
                  readOnly
                  className="form-control form-control-sm bg-light"
                />
                <div className="form-text small">Địa chỉ này được tạo tự động từ các trường trên</div>
              </div>
            </div>
          </div>

          {/* GPS */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Tọa độ GPS</div>
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Latitude</label>
                  <input
                    name="latitude"
                    value={form.latitude}
                    onChange={handle}
                    placeholder="VD: 10.8231"
                    className="form-control form-control-sm"
                  />
                  <div className="form-text small">Tọa độ vĩ độ (-90 đến 90)</div>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Longitude</label>
                  <input
                    name="longitude"
                    value={form.longitude}
                    onChange={handle}
                    placeholder="VD: 106.7569"
                    className="form-control form-control-sm"
                  />
                  <div className="form-text small">Tọa độ kinh độ (-180 đến 180)</div>
                </div>
              </div>
              <div className="d-flex gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleGeocoding}
                  disabled={geocoding || loading}
                >
                  {geocoding ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span>Đang lấy tọa độ...</>
                  ) : (
                    <><i className="bi bi-geo-alt-fill me-1"></i>Lấy tọa độ từ địa chỉ</>
                  )}
                </button>
                {form.latitude && form.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-secondary"
                  >
                    <i className="bi bi-map me-1"></i>Xem trên Google Maps
                  </a>
                )}
              </div>

              {/* Map Preview */}
              {form.latitude && form.longitude && (
                <div className="border rounded overflow-hidden" style={{ height: 250 }}>
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.longitude)-0.01},${Number(form.latitude)-0.01},${Number(form.longitude)+0.01},${Number(form.latitude)+0.01}&layer=mapnik&marker=${form.latitude},${form.longitude}`}
                    style={{ border: 0 }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={form.isActive}
                  onChange={handle}
                />
                <label className="form-check-label" htmlFor="isActive">Kích hoạt kho</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Hoạt động' : '● Tạm đóng'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
