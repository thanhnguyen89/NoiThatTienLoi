'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isShowHome: boolean;
  viewCount: number;
  createdAt: Date;
  robots: string | null;
  parent?: { id: string; name: string } | null;
  _count: { products: number };
}

function formatDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function CategoryTable({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const allSelected = categories.length > 0 && selectedIds.size === categories.length;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(categories.map((c) => c.id)));
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleDelete(cat: CategoryItem) {
    if (!confirm(`Xóa danh mục "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      const res = await fetch(`/admin/api/categories/${cat.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Xóa ${selectedIds.size} danh mục đã chọn?\nHành động này không thể hoàn tác.`)) return;
    setBulkLoading(true);
    try {
      const promises = [...selectedIds].map((id) =>
        fetch(`/admin/api/categories/${id}`, { method: 'DELETE' }).then((r) => r.json())
      );
      await Promise.allSettled(promises);
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setBulkLoading(false); }
  }

  async function handleBulkToggleActive(active: boolean) {
    if (selectedIds.size === 0) return;
    if (!confirm(`${active ? 'Kích hoạt' : 'Ẩn'} ${selectedIds.size} danh mục đã chọn?`)) return;
    setBulkLoading(true);
    try {
      const promises = [...selectedIds].map((id) =>
        fetch(`/admin/api/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: active }),
        }).then((r) => r.json())
      );
      await Promise.allSettled(promises);
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setBulkLoading(false); }
  }

  if (!categories.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-folder2-open fs-1 d-block mb-2"></i>
              Không tìm thấy danh mục nào.
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
          <span className="fw-semibold">Đã chọn: <strong>{selectedIds.size}</strong> danh mục</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success" disabled={bulkLoading} onClick={() => handleBulkToggleActive(true)}>
              <i className="bi bi-check-circle me-1"></i>Công khai
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
              <th style={{ width: 100 }}>Mã danh mục</th>
              <th>Tên danh mục</th>
              <th style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 80 }}>Robot</th>
              <th className="text-center" style={{ width: 90 }}>Lượt xem</th>
              <th className="text-center" style={{ width: 110 }}>Thứ tự hiển thị</th>
              <th className="text-center" style={{ width: 80 }}>Công khai</th>
              <th className="text-center" style={{ width: 80 }}>Hình ảnh</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => (
              <tr key={cat.id} className={selectedIds.has(cat.id) ? 'table-active' : ''}>
                <td className="text-center">
                  <input type="checkbox" checked={selectedIds.has(cat.id)} onChange={() => toggle(cat.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </td>
                <td className="text-center">{idx + 1}</td>
                <td><code className="small">{cat.code || '—'}</code></td>
                <td>
                  <div>
                    <div className="fw-semibold small">{cat.name}</div>
                    {cat.parent?.name && (
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        <i className="bi bi-arrow-return-right me-1"></i>{cat.parent.name}
                      </div>
                    )}
                  </div>
                </td>
                <td>{formatDate(cat.createdAt)}</td>
                <td className="text-center">
                  {cat.robots ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">{cat.viewCount}</td>
                <td className="text-center">{cat.sortOrder}</td>
                <td className="text-center">
                  {cat.isActive ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/categories/${cat.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(cat)}
                    disabled={deletingId === cat.id}
                  >
                    {deletingId === cat.id ? (
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
    </>
  );
}
