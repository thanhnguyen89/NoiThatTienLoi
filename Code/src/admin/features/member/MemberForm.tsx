'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getGenderLabel } from '@/server/validators/member.validator';

interface MemberDetail {
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
}

interface Props {
  member?: MemberDetail;
}

type TabId = 'basic' | 'account';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'account', label: 'Tài khoản & Trạng thái' },
];

export function MemberForm({ member }: Props) {
  const router = useRouter();
  const isEdit = !!member;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    fullName: member?.fullName || '',
    email: member?.email || '',
    phone: member?.phone || '',
    password: '',
    dateOfBirth: member?.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '',
    gender: member?.gender || '',
    isActive: member?.isActive ?? true,
    emailVerified: !!member?.emailVerifiedAt,
    phoneVerified: !!member?.phoneVerifiedAt,
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Bắt buộc nhập họ tên';
    if (!form.email.trim()) e.email = 'Bắt buộc nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ';
    if (form.password && form.password.length < 8) e.password = 'Mật khẩu tối thiểu 8 ký tự';
    if (Object.keys(e).length) { setErrors(e); setActiveTab('basic'); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;
      if (form.emailVerified) payload.emailVerifiedAt = new Date().toISOString();
      if (form.phoneVerified) payload.phoneVerifiedAt = new Date().toISOString();

      const url = isEdit ? `/admin/api/members/${member.id}` : '/admin/api/members';
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
        } else {
          setGlobalError(json.error || 'Lỗi');
        }
        return;
      }
      router.push('/admin/members');
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
            <li className="breadcrumb-item"><Link href="/admin">Dashboard</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/members">Thành viên</Link></li>
            <li className="breadcrumb-item active">{isEdit ? (member.fullName || member.email || 'Sửa') : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push('/admin/members')} disabled={loading}>
            <i className="bi bi-arrow-left me-1"></i>Quay lại
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo thành viên'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        {TABS.map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button type="button" className={`nav-link ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="row g-3">
        <div className="col-12 col-lg-9">

          {/* === THÔNG TIN CƠ BẢN === */}
          {activeTab === 'basic' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Thông tin cá nhân</div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Họ tên <span className="text-danger">*</span></label>
                    <input name="fullName" value={form.fullName} onChange={handle}
                      placeholder="Nguyễn Văn A" className={`form-control form-control-sm ${errors.fullName ? 'is-invalid' : ''}`} />
                    {errors.fullName && <div className="invalid-feedback d-block">{errors.fullName}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Email <span className="text-danger">*</span></label>
                    <input name="email" type="email" value={form.email} onChange={handle}
                      placeholder="email@example.com" className={`form-control form-control-sm ${errors.email ? 'is-invalid' : ''}`} />
                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Số điện thoại</label>
                    <input name="phone" value={form.phone} onChange={handle}
                      placeholder="0912345678" className="form-control form-control-sm" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Ngày sinh</label>
                    <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handle}
                      className="form-control form-control-sm" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Giới tính</label>
                    <select name="gender" value={form.gender} onChange={handle} className="form-select form-select-sm">
                      <option value="">—</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">
                      {isEdit ? 'Mật khẩu mới' : 'Mật khẩu'} {isEdit && <span className="text-muted">(để trống nếu không đổi)</span>}
                    </label>
                    <input name="password" type="password" value={form.password} onChange={handle}
                      placeholder={isEdit ? 'Nhập mật khẩu mới để thay đổi' : 'Ít nhất 8 ký tự'}
                      className={`form-control form-control-sm ${errors.password ? 'is-invalid' : ''}`} />
                    {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === TÀI KHOẢN & TRẠNG THÁI === */}
          {activeTab === 'account' && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Tài khoản & Trạng thái</div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="form-check form-switch mb-3">
                      <input className="form-check-input" type="checkbox" name="isActive"
                        id="isActive" checked={form.isActive} onChange={handle} />
                      <label className="form-check-label fw-semibold" htmlFor="isActive">
                        Tài khoản hoạt động
                      </label>
                    </div>
                    <div className="text-muted small">
                      {form.isActive ? 'Thành viên có thể đăng nhập và sử dụng dịch vụ.' : 'Thành viên bị khóa, không thể đăng nhập.'}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded">
                      <div className="form-check mb-2">
                        <input className="form-check-input" type="checkbox" name="emailVerified"
                          id="emailVerified" checked={form.emailVerified} onChange={handle} />
                        <label className="form-check-label" htmlFor="emailVerified">
                          <i className="bi bi-envelope-check me-1"></i>Xác minh email
                        </label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" name="phoneVerified"
                          id="phoneVerified" checked={form.phoneVerified} onChange={handle} />
                        <label className="form-check-label" htmlFor="phoneVerified">
                          <i className="bi bi-phone-check me-1"></i>Xác minh SĐT
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {isEdit && member && (
                  <div className="mt-3 p-3 bg-light rounded">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Ngày đăng ký:</span>
                      <span className="small">{new Date(member.emailVerifiedAt || member.createdAt || Date.now()).toLocaleString('vi-VN')}</span>
                    </div>
                    {member.emailVerifiedAt && (
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted small">Email xác minh:</span>
                        <span className="small">{new Date(member.emailVerifiedAt).toLocaleString('vi-VN')}</span>
                      </div>
                    )}
                    {member.phoneVerifiedAt && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted small">SĐT xác minh:</span>
                        <span className="small">{new Date(member.phoneVerifiedAt).toLocaleString('vi-VN')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT - Trạng thái tổng quan */}
        <div className="col-12 col-lg-3">
          <div className="card">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              {isEdit && member ? (
                <>
                  <div className="mb-2">
                    <span className="text-muted small">Trạng thái:</span>
                    <span className={`badge ms-2 ${form.isActive ? 'bg-success' : 'bg-danger'}`}>
                      {form.isActive ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted small">Email:</span>
                    <span className={`badge ms-2 ${form.emailVerified ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: 10 }}>
                      {form.emailVerified ? 'Đã xác minh' : 'Chưa'}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted small">SĐT:</span>
                    <span className={`badge ms-2 ${form.phoneVerified ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: 10 }}>
                      {form.phoneVerified ? 'Đã xác minh' : 'Chưa'}
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="mb-2">
                    <span className="text-muted small">ID:</span>
                    <code className="ms-1" style={{ fontSize: 10 }}>#{member.id.slice(-6).toUpperCase()}</code>
                  </div>
                </>
              ) : (
                <div className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  Thành viên mới sẽ được tạo với trạng thái mặc định: <strong>Hoạt động</strong>.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
