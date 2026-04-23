'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGenderLabel } from '@/server/validators/member.validator';
import type { MemberListItem } from '@/server/repositories/member.repository';

function formatDate(date: Date | string | null) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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

interface Props {
  members: MemberListItem[];
}

export function MemberTable({ members = [] }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const allSelected = members.length > 0 && selectedIds.size === members.length;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(members.map((m) => m.id)));
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleToggleActive(item: MemberListItem) {
    if (!confirm(`${item.isActive ? 'Khóa' : 'Kích hoạt'} tài khoản "${item.fullName || item.email || item.id}"?`)) return;
    try {
      const res = await fetch(`/admin/api/members/${item.id}?action=toggle-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
  }

  async function handleDelete(item: MemberListItem) {
    if (!confirm(`Xóa thành viên "${item.fullName || item.email || item.id}"?`)) return;
    setDeletingIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(`/admin/api/members/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingIds((prev) => { const n = new Set(prev); n.delete(item.id); return n; }); }
  }

  async function handleBulkToggleActive(active: boolean) {
    if (selectedIds.size === 0) return;
    if (!confirm(`${active ? 'Kích hoạt' : 'Khóa'} ${selectedIds.size} thành viên đã chọn?`)) return;
    setLoading(true);
    try {
      const promises = [...selectedIds].map((id) =>
        fetch(`/admin/api/members/${id}?action=toggle-active`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).then((r) => r.json())
      );
      await Promise.allSettled(promises);
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setLoading(false); }
  }

  if (!members.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-people fs-1 d-block mb-2"></i>
              Không tìm thấy thành viên nào.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div>
      {selectedIds.size > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-3 mb-2 py-2 px-3 flex-wrap">
          <span className="fw-semibold">Đã chọn: <strong>{selectedIds.size}</strong> thành viên</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success" disabled={loading} onClick={() => handleBulkToggleActive(true)}>
              <i className="bi bi-check-circle me-1"></i>Kích hoạt
            </button>
            <button className="btn btn-sm btn-danger" disabled={loading} onClick={() => handleBulkToggleActive(false)}>
              <i className="bi bi-slash-circle me-1"></i>Khóa
            </button>
          </div>
          <button className="btn btn-sm btn-light ms-auto" onClick={() => setSelectedIds(new Set())}>
            <i className="bi bi-x-lg me-1"></i>Bỏ chọn
          </button>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-bordered mb-0 w-100">
          <thead>
            <tr>
              <th className="text-center" style={{ width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              </th>
              <th className="text-center" style={{ width: 50 }}>ID</th>
              <th>Thông tin thành viên</th>
              <th>Liên hệ</th>
              <th style={{ width: 120 }}>Ngày đăng ký</th>
              <th style={{ width: 150 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 150 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {members.map((item) => {
              const age = calcAge(item.dateOfBirth);
              return (
                <tr key={item.id} className={selectedIds.has(item.id) ? 'table-active' : ''}>
                  <td className="text-center">
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  </td>
                  <td className="text-center">
                    <span className="small text-muted">#{item.id.slice(-6).toUpperCase()}</span>
                  </td>
                  <td>
                    <div className="fw-semibold small">{item.fullName || '—'}</div>
                    {item.email && <div className="small text-muted">{item.email}</div>}
                    <div className="small text-muted" style={{ fontSize: 11 }}>
                      {item.gender ? `${getGenderLabel(item.gender)}` : ''}
                      {age ? `, ${age}t` : ''}
                    </div>
                  </td>
                  <td>
                    {item.phone && (
                      <div className="small">{item.phone}</div>
                    )}
                    <div className="d-flex gap-2 mt-1 flex-wrap">
                      {item.emailVerifiedAt ? (
                        <span className="badge bg-success" style={{ fontSize: 10 }}>
                          <i className="bi bi-envelope-check me-1"></i>Email OK
                        </span>
                      ) : (
                        <span className="badge bg-secondary" style={{ fontSize: 10 }}>
                          <i className="bi bi-envelope me-1"></i>Email
                        </span>
                      )}
                      {item.phoneVerifiedAt ? (
                        <span className="badge bg-success" style={{ fontSize: 10 }}>
                          <i className="bi bi-phone-check me-1"></i>SĐT OK
                        </span>
                      ) : (
                        <span className="badge bg-secondary" style={{ fontSize: 10 }}>
                          <i className="bi bi-phone me-1"></i>SĐT
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="small">{formatDate(item.createdAt)}</td>
                  <td>
                    <span className={`badge ${item.isActive ? 'bg-success' : 'bg-danger'}`}>
                      {item.isActive ? 'Hoạt động' : 'Khóa'}
                    </span>
                    {item._count?.orders !== undefined && (
                      <div className="small text-muted mt-1">
                        <i className="bi bi-receipt me-1"></i>{item._count.orders} đơn
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    <a href={`/admin/members/${item.id}`} className="btn btn-sm btn-reset me-1" title="Chi tiết">
                      <i className="bi bi-eye-fill"></i>
                    </a>
                    <a href={`/admin/members/${item.id}?action=edit`} className="btn btn-sm btn-edit me-1" title="Sửa">
                      <i className="bi bi-pencil-fill"></i>
                    </a>
                    <button
                      className={item.isActive ? 'btn btn-sm btn-del' : 'btn btn-sm btn-edit'}
                      title={item.isActive ? 'Khóa' : 'Kích hoạt'}
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? <i className="bi bi-slash-circle"></i> : <i className="bi bi-check-circle-fill"></i>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}