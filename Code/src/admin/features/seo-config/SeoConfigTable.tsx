'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SeoConfigItem {
  id: string;
  pageName: string | null;
  pageType: string | null;
  title: string | null;
  seName: string | null;
  metaTitle: string | null;
  isActive: boolean;
  seoNoindex: boolean;
  sortOrder: number;
  createdAt?: Date | null;
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  homepage: 'Trang chủ',
  category: 'Danh mục',
  product:  'Sản phẩm',
  page:     'Trang tĩnh',
  blog:     'Blog',
  contact:  'Liên hệ',
  other:    'Khác',
};

const PAGE_TYPE_COLORS: Record<string, string> = {
  homepage: 'bg-primary',
  category: 'bg-success',
  product:  'bg-info text-dark',
  page:     'bg-secondary',
  blog:     'bg-warning text-dark',
  contact:  'bg-danger',
  other:    'bg-light text-dark',
};

export function SeoConfigTable({ configs }: { configs: SeoConfigItem[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const allSelected = configs.length > 0 && selectedIds.size === configs.length;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(configs.map(c => c.id)));
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  async function handleDelete(config: SeoConfigItem) {
    if (!confirm(`Xóa cấu hình SEO "${config.title || config.pageName || 'Không tiêu đề'}"?`)) return;
    setDeletingId(config.id);
    try {
      const res  = await fetch(`/admin/api/seo-configs/${config.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Xóa ${selectedIds.size} cấu hình SEO đã chọn?\nHành động này không thể hoàn tác.`)) return;
    setBulkLoading(true);
    try {
      await Promise.allSettled([...selectedIds].map(id => fetch(`/admin/api/seo-configs/${id}`, { method: 'DELETE' })));
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setBulkLoading(false); }
  }

  async function handleBulkToggleActive(active: boolean) {
    if (!selectedIds.size) return;
    if (!confirm(`${active ? 'Kích hoạt' : 'Ẩn'} ${selectedIds.size} cấu hình SEO đã chọn?`)) return;
    setBulkLoading(true);
    try {
      await Promise.allSettled([...selectedIds].map(id =>
        fetch(`/admin/api/seo-configs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: active }) })
      ));
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setBulkLoading(false); }
  }

  if (!configs.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-search fs-1 d-block mb-2"></i>
              Chưa có cấu hình SEO nào.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-3 mb-2 py-2 px-3 flex-wrap">
          <span className="fw-semibold">Đã chọn: <strong>{selectedIds.size}</strong> cấu hình</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success" disabled={bulkLoading} onClick={() => handleBulkToggleActive(true)}>
              <i className="bi bi-check-circle me-1"></i>Kích hoạt
            </button>
            <button className="btn btn-sm btn-secondary" disabled={bulkLoading} onClick={() => handleBulkToggleActive(false)}>
              <i className="bi bi-eye-slash me-1"></i>Ẩn
            </button>
            <button className="btn btn-sm btn-danger" disabled={bulkLoading} onClick={handleBulkDelete}>
              <i className="bi bi-trash me-1"></i>Xóa
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
              <th className="text-center" style={{ width: 50 }}>STT</th>
              <th style={{ width: 110 }}>Loại trang</th>
              <th>URL / Tiêu đề</th>
              <th>Meta Title</th>
              <th className="text-center" style={{ width: 80 }}>Noindex</th>
              <th className="text-center" style={{ width: 70 }}>Thứ tự</th>
              <th className="text-center" style={{ width: 100 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config, idx) => (
              <tr key={config.id} className={selectedIds.has(config.id) ? 'table-active' : ''}>
                <td className="text-center">
                  <input type="checkbox" checked={selectedIds.has(config.id)} onChange={() => toggle(config.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </td>
                <td className="text-center">{idx + 1}</td>
                <td>
                  {config.pageType ? (
                    <span className={`badge ${PAGE_TYPE_COLORS[config.pageType] || 'bg-secondary'}`} style={{ fontSize: 11 }}>
                      {PAGE_TYPE_LABELS[config.pageType] || config.pageType}
                    </span>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </td>
                <td>
                  <div className="small fw-semibold">{config.title || '—'}</div>
                  <code className="small text-muted">{config.seName || '—'}</code>
                </td>
                <td>
                  <div className="small text-truncate" style={{ maxWidth: 220 }}>{config.metaTitle || '—'}</div>
                </td>
                <td className="text-center">
                  {config.seoNoindex ? (
                    <span className="badge bg-warning text-dark" style={{ fontSize: 11 }}>Noindex</span>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </td>
                <td className="text-center">{config.sortOrder}</td>
                <td className="text-center">
                  {config.isActive
                    ? <span className="badge bg-success">● Hoạt động</span>
                    : <span className="badge bg-secondary">● Ẩn</span>}
                </td>
                <td className="text-center">
                  <Link href={`/admin/seo-configs/${config.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button className="btn-del" onClick={() => handleDelete(config)} disabled={deletingId === config.id}>
                    {deletingId === config.id
                      ? <span className="spinner-border spinner-border-sm"></span>
                      : <i className="bi bi-trash-fill"></i>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
