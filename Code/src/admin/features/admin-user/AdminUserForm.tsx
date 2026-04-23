'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';

interface RoleItem {
  id: string;
  name: string;
  code: string;
}

interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  roleId: string;
  isActive: boolean | null;
  isSuperAdmin: boolean | null;
}

interface Props {
  roles: RoleItem[];
  user?: AdminUserItem;
}

export function AdminUserForm({ roles, user }: Props) {
  const router = useRouter();
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    address: user?.address || '',
    avatar: user?.avatar || '',
    roleId: user?.roleId || '',
    isActive: user?.isActive ?? true,
    isSuperAdmin: user?.isSuperAdmin ?? false,
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
    if (!isEdit && !form.password.trim()) e.password = 'Mật khẩu là bắt buộc';
    if (!form.username.trim()) e.username = 'Username là bắt buộc';
    if (!form.email.trim()) e.email = 'Email là bắt buộc';
    if (!form.roleId) e.roleId = 'Vai trò là bắt buộc';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        email: form.email.trim(),
        fullName: form.fullName.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        avatar: form.avatar || null,
        roleId: form.roleId,
        isActive: form.isActive,
        isSuperAdmin: form.isSuperAdmin,
      };
      if (form.password.trim()) payload.password = form.password;

      const url = isEdit ? `/admin/api/admin-users/${user.id}` : '/admin/api/admin-users';
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
      router.push('/admin/admin-users');
      router.refresh();
    } catch { setGlobalError('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      {globalError && <div className="alert alert-danger py-2">{globalError}</div>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link href="/admin">eCommerce</Link></li>
            <li className="breadcrumb-item"><Link href="/admin/admin-users">Người dùng</Link></li>
            <li className="breadcrumb-item active">{isEdit ? user.username : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/admin-users')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo người dùng'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin tài khoản</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Username <span className="text-danger">*</span></label>
                    <input name="username" value={form.username} onChange={handle} className={`form-control form-control-sm ${errors.username ? 'is-invalid' : ''}`} disabled={isEdit} />
                    {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email <span className="text-danger">*</span></label>
                    <input name="email" type="email" value={form.email} onChange={handle} className={`form-control form-control-sm ${errors.email ? 'is-invalid' : ''}`} />
                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                  </div>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">{isEdit ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'} <span className="text-danger">{!isEdit ? '*' : ''}</span></label>
                    <input name="password" type="password" value={form.password} onChange={handle} className={`form-control form-control-sm ${errors.password ? 'is-invalid' : ''}`} placeholder={isEdit ? 'Để trống nếu không đổi mật khẩu' : ''} />
                    {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Họ tên</label>
                    <input name="fullName" value={form.fullName} onChange={handle} className="form-control form-control-sm" />
                  </div>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Số điện thoại</label>
                    <input name="phone" value={form.phone} onChange={handle} className="form-control form-control-sm" />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Vai trò <span className="text-danger">*</span></label>
                    <select name="roleId" value={form.roleId} onChange={handle} className={`form-select form-select-sm ${errors.roleId ? 'is-invalid' : ''}`}>
                      <option value="">— Chọn vai trò —</option>
                      {Array.isArray(roles) && roles.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                    </select>
                    {errors.roleId && <div className="invalid-feedback d-block">{errors.roleId}</div>}
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Địa chỉ</label>
                <textarea name="address" value={form.address} onChange={handle} className="form-control form-control-sm" rows={2} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-3">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Avatar</div>
            <div className="card-body">
              <SingleImageUploader
                value={form.avatar}
                onChange={(url) => setForm((p) => ({ ...p, avatar: url }))}
                label="Chọn avatar"
              />
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="isActive" id="isActive" checked={form.isActive} onChange={handle} />
                <label className="form-check-label" htmlFor="isActive">Hoạt động</label>
              </div>
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="isSuperAdmin" id="isSuperAdmin" checked={form.isSuperAdmin} onChange={handle} />
                <label className="form-check-label" htmlFor="isSuperAdmin">Super Admin</label>
              </div>
              <span className={`badge ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
