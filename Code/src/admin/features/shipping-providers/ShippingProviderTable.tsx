'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ShippingProviderItem {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  website: string | null;
  note: string | null;
  isActive: boolean;
  serviceTypes: string[];
  vehicles: string[];
  createdAt: Date | string | null;
  _count?: { shipments: number };
}

interface Props {
  providers: ShippingProviderItem[];
}

function formatDate(date: Date | string | null) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function ShippingProviderTable({ providers }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleAll() {
    if (selected.size === providers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(providers.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleBulkAction(action: 'activate' | 'deactivate' | 'delete') {
    const ids = Array.from(selected);
    if (!ids.length) return;

    if (action === 'delete') {
      if (!confirm(`Xóa ${ids.length} đơn vị đã chọn?`)) return;
    } else {
      if (!confirm(`${action === 'activate' ? 'Kích hoạt' : 'Ngưng'} ${ids.length} đơn vị đã chọn?`)) return;
    }

    try {
      const res = await fetch(`/admin/api/shipping-providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
  }

  async function handleDelete(provider: ShippingProviderItem) {
    if (!confirm(`Xóa đơn vị vận chuyển "${provider.name}"?`)) return;
    setDeletingId(provider.id);
    try {
      const res = await fetch(`/admin/api/shipping-providers/${provider.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!providers.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-truck fs-1 d-block mb-2"></i>
              Chưa có đơn vị vận chuyển nào.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <>
      <div className="table-responsive">
        <table className="table table-bordered mb-0 w-100">
          <thead>
            <tr>
              <th className="text-center" style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={selected.size === providers.length && providers.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th style={{ width: 90 }}>Mã ĐV</th>
              <th>Tên đơn vị</th>
              <th>Liên hệ</th>
              <th style={{ width: 200 }}>Hiệu suất</th>
              <th className="text-center" style={{ width: 140 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.id}>
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(provider.id)}
                    onChange={() => toggleOne(provider.id)}
                  />
                </td>
                <td>
                  <code className="small fw-semibold">{provider.code || '—'}</code>
                </td>
                <td>
                  <div className="fw-semibold small">{provider.name}</div>
                  <div className="text-muted small">{formatDate(provider.createdAt)}</div>
                </td>
                <td>
                  <div className="small">
                    {provider.phone && (
                      <div><i className="bi bi-telephone me-1"></i>{provider.phone}</div>
                    )}
                    {provider.website && (
                      <div>
                        <i className="bi bi-globe me-1"></i>
                        <a href={provider.website} target="_blank" rel="noopener noreferrer">
                          {provider.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {!provider.phone && !provider.website && <span className="text-muted">—</span>}
                  </div>
                </td>
                <td>
                  {provider.isActive ? (
                    <span className="badge bg-success mb-1">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary mb-1">● Tạm ngưng</span>
                  )}
                  <div className="small text-muted mt-1">
                    <i className="bi bi-box-seam me-1"></i>
                    {provider._count?.shipments ?? 0} đơn
                  </div>
                </td>
                <td className="text-center">
                  <Link href={`/admin/shipping-providers/${provider.id}`} className="btn btn-sm btn-detail btn-reset me-1" title="Chi tiết">
                    <i className="bi bi-eye-fill"></i>
                  </Link>
                  <Link href={`/admin/shipping-providers/${provider.id}/edit`} className="btn btn-sm btn-edit me-1" title="Sửa">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn btn-sm btn-del"
                    onClick={() => handleDelete(provider)}
                    disabled={deletingId === provider.id}
                    title="Xóa"
                  >
                    {deletingId === provider.id ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className="bi bi-trash-fill"></i>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="d-flex align-items-center gap-2 mt-2 px-2 py-2" style={{ background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6' }}>
          <label className="d-flex align-items-center gap-1 small fw-semibold" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.size === providers.length && providers.length > 0}
              onChange={toggleAll}
            />
            <span>Chọn tất cả</span>
          </label>
          <div className="vr" style={{ height: 20 }}></div>
          <span className="text-muted small">Với ĐV được chọn:</span>
          <button className="btn btn-sm btn-success me-1" onClick={() => handleBulkAction('activate')} title="Kích hoạt">
            <i className="bi bi-check-circle"></i>
          </button>
          <button className="btn btn-sm btn-secondary me-1" onClick={() => handleBulkAction('deactivate')} title="Ngưng">
            <i className="bi bi-x-circle"></i>
          </button>
          <button className="btn btn-sm btn-del" onClick={() => handleBulkAction('delete')} title="Xóa">
            <i className="bi bi-trash"></i>
          </button>
        </div>
      )}
    </>
  );
}
