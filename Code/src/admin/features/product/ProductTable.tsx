'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ProductListItem } from '@/lib/types';

interface ProductTableProps {
  products: ProductListItem[];
}

function formatDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductTable({ products }: ProductTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const allSelected = products.length > 0 && selectedIds.size === products.length;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleDelete(product: ProductListItem) {
    if (!confirm(`Xóa sản phẩm "${product.name}"?\nHành động này không thể hoàn tác.`)) {
      return;
    }
    setDeletingId(product.id);
    try {
      const res = await fetch(`/admin/api/products/${product.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Xóa ${selectedIds.size} sản phẩm đã chọn?\nHành động này không thể hoàn tác.`)) return;
    setBulkLoading(true);
    try {
      const promises = [...selectedIds].map((id) =>
        fetch(`/admin/api/products/${id}`, { method: 'DELETE' }).then((r) => r.json())
      );
      await Promise.allSettled(promises);
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setBulkLoading(false); }
  }

  async function handleBulkToggleActive(active: boolean) {
    if (selectedIds.size === 0) return;
    if (!confirm(`${active ? 'Kích hoạt' : 'Ẩn'} ${selectedIds.size} sản phẩm đã chọn?`)) return;
    setBulkLoading(true);
    try {
      const promises = [...selectedIds].map((id) =>
        fetch(`/admin/api/products/${id}`, {
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

  if (products.length === 0) {
    return (
      <div className="admin-empty">
        <i className="bi bi-box-seam fs-1 d-block mb-2"></i>
        <p>Không tìm thấy sản phẩm nào.</p>
      </div>
    );
  }

  return (
    <div>
      {selectedIds.size > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-3 mb-2 py-2 px-3 flex-wrap">
          <span className="fw-semibold">Đã chọn: <strong>{selectedIds.size}</strong> sản phẩm</span>
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
              <th style={{ width: 60 }}>Hình</th>
              <th>Tên sản phẩm</th>
              <th style={{ width: 100 }}>SKU</th>
              <th style={{ width: 120 }}>Danh mục</th>
              <th className="text-center" style={{ width: 80 }}>Biến thể</th>
              <th style={{ width: 130 }}>Giá bán</th>
              <th style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 90 }}>Lượt xem</th>
              <th className="text-center" style={{ width: 90 }}>Đã bán</th>
              <th className="text-center" style={{ width: 80 }}>Nổi bật</th>
              <th className="text-center" style={{ width: 80 }}>Công khai</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => (
              <tr key={product.id} className={selectedIds.has(product.id) ? 'table-active' : ''}>
                <td className="text-center">
                  <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggle(product.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </td>
                <td className="text-center">{idx + 1}</td>
                <td className="text-center">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <div>
                    <div className="fw-semibold small">{product.name}</div>
                    {product.brand && (
                      <div className="text-muted" style={{ fontSize: 11 }}>{product.brand}</div>
                    )}
                  </div>
                </td>
                <td><code className="small">{product.sku || '—'}</code></td>
                <td>{product.category.name}</td>
                <td className="text-center">
                  {product.variantCount > 0 ? (
                    <span className="badge bg-secondary" style={{ fontSize: 11 }}>
                      {product.variantCount} biến thể
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {product.price !== null && product.price !== undefined ? (
                    <div>
                      <div className="fw-semibold small">{formatPrice(product.price)}</div>
                      {product.comparePrice !== null && product.comparePrice !== undefined && product.comparePrice > product.price && (
                        <div className="text-muted small" style={{ fontSize: 11 }}>
                          <del>{formatPrice(product.comparePrice)}</del>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>{formatDate(product.createdAt)}</td>
                <td className="text-center">{product.viewCount}</td>
                <td className="text-center">
                  <span className="badge bg-info">{product.soldCount}</span>
                </td>
                <td className="text-center">
                  {product.isFeatured ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  {product.isActive ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/products/${product.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(product)}
                    disabled={deletingId === product.id}
                  >
                    {deletingId === product.id ? (
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
    </div>
  );
}
