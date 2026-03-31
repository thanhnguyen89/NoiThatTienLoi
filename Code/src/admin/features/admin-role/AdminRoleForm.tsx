'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RESOURCES, RESOURCE_LABELS, ACTIONS, ACTION_LABELS } from '@/lib/auth/permissions';

interface PermissionItem {
  id: string;
  action: string;
  resource: string;
  description: string | null;
}

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number | null;
  rolePermissions?: string[];
}

interface Props {
  roles: RoleItem[];
  permissions: PermissionItem[];
  role?: RoleItem;
}

// Group permissions by resource
function groupPermissions(permissions: PermissionItem[]) {
  const groups: Record<string, PermissionItem[]> = {};
  for (const p of permissions) {
    if (!groups[p.resource]) groups[p.resource] = [];
    groups[p.resource].push(p);
  }
  return groups;
}

export function AdminRoleForm({ roles, permissions, role }: Props) {
  const router = useRouter();
  const isEdit = !!role;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    name: role?.name || '',
    code: role?.code || '',
    description: role?.description || '',
    sortOrder: String(role?.sortOrder ?? 0),
    isActive: role?.isActive ?? true,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(() => {
    if (role?.rolePermissions) return new Set(role.rolePermissions);
    return new Set<string>();
  });

  const permissionGroups = groupPermissions(permissions);

  function togglePermission(permId: string) {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  function toggleAllForResource(resource: string) {
    const resourcePerms = permissionGroups[resource] || [];
    const allSelected = resourcePerms.every((p) => selectedPermissions.has(p.id));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        resourcePerms.forEach((p) => next.delete(p.id));
      } else {
        resourcePerms.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    setGlobalError('');
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Tên vai trò là bắt buộc';
    if (!form.code.trim()) e.code = 'Mã vai trò là bắt buộc';
    else if (!/^[A-Z][A-Z0-9_]*$/.test(form.code)) e.code = 'Mã: chữ in hoa, số, gạch dưới';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setGlobalError('');
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        permissionIds: Array.from(selectedPermissions),
      };

      const url = isEdit ? `/admin/api/admin-roles/${role.id}` : '/admin/api/admin-roles';
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
      router.push('/admin/admin-roles');
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
            <li className="breadcrumb-item"><Link href="/admin/admin-roles">Vai trò</Link></li>
            <li className="breadcrumb-item active">{isEdit ? role.name : 'Thêm mới'}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => router.push('/admin/admin-roles')} disabled={loading}>Hủy</button>
          <button type="submit" className="btn btn-success btn-sm" disabled={loading || role?.isSystem}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : isEdit ? 'Cập nhật' : 'Tạo vai trò'}
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-9">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Thông tin vai trò</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tên vai trò <span className="text-danger">*</span></label>
                    <input name="name" value={form.name} onChange={handle}
                      className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                      disabled={role?.isSystem} />
                    {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mã vai trò <span className="text-danger">*</span></label>
                    <input name="code" value={form.code} onChange={handle}
                      className={`form-control form-control-sm ${errors.code ? 'is-invalid' : ''}`}
                      placeholder="VD: EDITOR, VIEWER"
                      disabled={role?.isSystem} />
                    {errors.code && <div className="invalid-feedback d-block">{errors.code}</div>}
                  </div>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mô tả</label>
                    <textarea name="description" value={form.description} onChange={handle}
                      rows={2} className="form-control form-control-sm" disabled={role?.isSystem} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Thứ tự</label>
                    <input name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handle}
                      className="form-control form-control-sm" disabled={role?.isSystem} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="card mb-3">
            <div className="card-header fw-semibold">Phân quyền</div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Module</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="text-center" style={{ width: '20%' }}>
                          {ACTION_LABELS[a]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RESOURCES.map((resource) => {
                      const resourcePerms = permissionGroups[resource] || [];
                      if (resourcePerms.length === 0) return null;
                      const allSelected = resourcePerms.every((p) => selectedPermissions.has(p.id));
                      const someSelected = resourcePerms.some((p) => selectedPermissions.has(p.id));
                      return (
                        <tr key={resource}>
                          <td>
                            <span className="fw-semibold small">{RESOURCE_LABELS[resource]}</span>
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 ms-2"
                              style={{ fontSize: 10 }}
                              onClick={() => toggleAllForResource(resource)}
                              disabled={role?.isSystem}
                            >
                              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                          </td>
                          {ACTIONS.map((action) => {
                            const perm = resourcePerms.find((p) => p.action === action);
                            if (!perm) return <td key={action} className="text-center text-muted">—</td>;
                            return (
                              <td key={action} className="text-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedPermissions.has(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                  disabled={role?.isSystem}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-3">
          <div className="card mb-3">
            <div className="card-header fw-semibold">Trạng thái</div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" name="isActive"
                  id="isActive" checked={form.isActive} onChange={handle} disabled={role?.isSystem} />
                <label className="form-check-label" htmlFor="isActive">Hoạt động</label>
              </div>
              {role?.isSystem && (
                <div className="alert alert-warning py-2 mb-0" style={{ fontSize: 12 }}>
                  <i className="bi bi-shield-fill me-1"></i>
                  Vai trò hệ thống, không thể sửa.
                </div>
              )}
              <span className={`badge mt-2 ${form.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {form.isActive ? '● Active' : '● Inactive'}
              </span>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-semibold">Tổng quyền đã chọn</div>
            <div className="card-body">
              <div className="small">
                <div><strong>{selectedPermissions.size}</strong> / {permissions.length} quyền</div>
                <div className="progress mt-2" style={{ height: 6 }}>
                  <div className="progress-bar bg-primary"
                    style={{ width: permissions.length > 0 ? `${(selectedPermissions.size / permissions.length) * 100}%` : '0%' }}>
                  </div>
                </div>
                <div className="text-muted mt-2" style={{ fontSize: 11 }}>
                  {RESOURCES.map((r) => {
                    const rp = permissionGroups[r] || [];
                    const sel = rp.filter((p) => selectedPermissions.has(p.id)).length;
                    if (sel === 0) return null;
                    return (
                      <div key={r} className="d-flex justify-content-between">
                        <span>{RESOURCE_LABELS[r]}</span>
                        <span className="text-primary">{sel}/{rp.length}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
