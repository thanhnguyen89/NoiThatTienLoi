'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminPagination } from '@/admin/shared/AdminPagination';

interface WarehouseItem {
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
  isActive: boolean;
  createdAt: Date | string | null;
  _count?: { shipments: number };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

interface Props {
  warehouses: WarehouseItem[];
  pagination: PaginationInfo;
}

export function WarehouseTable({ warehouses, pagination }: Props) {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  async function handleToggleActive(warehouse: WarehouseItem) {
    if (!confirm(`Bạn muốn ${warehouse.isActive ? 'đóng' : 'mở'} kho "${warehouse.name}"?`)) return;
    setTogglingId(warehouse.id);
    try {
      const res = await fetch(`/admin/api/warehouses/${warehouse.id}/toggle-active`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setTogglingId(null); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === warehouses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(warehouses.map(w => w.id)));
    }
  }

  async function bulkAction(action: 'activate' | 'deactivate') {
    if (!selected.size) return;
    const label = action === 'activate' ? 'kích hoạt' : 'ngưng';
    if (!confirm(`Bạn muốn ${label} ${selected.size} kho đã chọn?`)) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selected).map(id =>
          fetch(`/admin/api/warehouses/${id}/toggle-active`, { method: 'POST' }).then(r => r.json())
        )
      );
      const failed = results.filter(r => r.status === 'rejected' || !((r as PromiseFulfilledResult<{success:boolean}>).value?.success)).length;
      alert(failed ? `Đã xử lý ${selected.size - failed}/${selected.size} kho. ${failed} thất bại.` : `Đã ${label} ${selected.size} kho thành công.`);
      setSelected(new Set());
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setBulkLoading(false); }
  }

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="alert alert-warning py-2 px-3 d-flex align-items-center gap-2 mb-2">
          <span className="small fw-semibold">Đã chọn {selected.size} kho:</span>
          <button
            className="btn btn-sm btn-success"
            onClick={() => bulkAction('activate')}
            disabled={bulkLoading}
          >
            <i className="bi bi-play-fill me-1"></i>Kích hoạt
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => bulkAction('deactivate')}
            disabled={bulkLoading}
          >
            <i className="bi bi-pause-fill me-1"></i>Ngưng hoạt động
          </button>
          <button
            className="btn btn-sm btn-outline-secondary ms-auto"
            onClick={() => setSelected(new Set())}
          >
            <i className="bi bi-x-lg me-1"></i>Bỏ chọn
          </button>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-bordered mb-0 w-100">
          <thead>
            <tr>
              <th className="text-center" style={{ width: 40 }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selected.size === warehouses.length && warehouses.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th style={{ width: 100 }}>Mã kho</th>
              <th>Tên kho</th>
              <th>Địa chỉ</th>
              <th className="text-center" style={{ width: 150 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 150 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse, idx) => (
              <tr key={warehouse.id} className={selected.has(warehouse.id) ? 'table-active' : ''}>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selected.has(warehouse.id)}
                    onChange={() => toggleSelect(warehouse.id)}
                  />
                </td>
                <td>
                  <code className="small">{warehouse.code || '—'}</code>
                </td>
                <td>
                  <div className="fw-semibold small">{warehouse.name}</div>
                  {warehouse.contactName && (
                    <div className="text-muted small">
                      <i className="bi bi-person me-1"></i>{warehouse.contactName}
                    </div>
                  )}
                  {warehouse.contactPhone && (
                    <div className="text-muted small">
                      <i className="bi bi-telephone me-1"></i>{warehouse.contactPhone}
                    </div>
                  )}
                </td>
                <td>
                  <div className="small">
                    {[warehouse.addressLine, warehouse.wardName, warehouse.districtName, warehouse.provinceName]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </td>
                <td className="text-center">
                  {warehouse.isActive ? (
                    <span className="badge bg-success">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary">● Tạm đóng</span>
                  )}
                  <div className="small text-muted mt-1">
                    {warehouse._count?.shipments ?? 0} đơn xuất
                  </div>
                </td>
                <td className="text-center">
                  <Link href={`/admin/warehouses/${warehouse.id}`} className="btn btn-sm btn-detail btn-reset me-1" title="Chi tiết">
                    <i className="bi bi-eye-fill"></i>
                  </Link>
                  <Link href={`/admin/warehouses/${warehouse.id}/edit`} className="btn btn-sm btn-edit me-1" title="Sửa">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className={`btn ${warehouse.isActive ? 'btn-warning' : 'btn-success'} btn-sm`}
                    onClick={() => handleToggleActive(warehouse)}
                    disabled={togglingId === warehouse.id}
                    title={warehouse.isActive ? 'Đóng kho' : 'Mở kho'}
                    style={{ padding: '2px 6px' }}
                  >
                    {togglingId === warehouse.id ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className={`bi ${warehouse.isActive ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <AdminPagination pagination={pagination} baseUrl="/admin/warehouses" />
    </>
  );
}