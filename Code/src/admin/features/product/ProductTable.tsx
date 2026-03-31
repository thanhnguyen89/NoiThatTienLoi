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

export function ProductTable({ products }: ProductTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  if (products.length === 0) {
    return (
      <div className="admin-empty">
        <i className="bi bi-box-seam fs-1 d-block mb-2"></i>
        <p>Không tìm thấy sản phẩm nào.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-bordered mb-0 w-100">
        <thead>
          <tr>
            <th className="text-center" style={{ width: 50 }}>STT</th>
            <th style={{ width: 60 }}>Hình</th>
            <th>Tên sản phẩm</th>
            <th style={{ width: 100 }}>SKU</th>
            <th style={{ width: 120 }}>Danh mục</th>
            <th className="text-center" style={{ width: 80 }}>Biến thể</th>
            <th style={{ width: 110 }}>Ngày tạo</th>
            <th className="text-center" style={{ width: 90 }}>Lượt xem</th>
            <th className="text-center" style={{ width: 80 }}>Nổi bật</th>
            <th className="text-center" style={{ width: 80 }}>Công khai</th>
            <th className="text-center" style={{ width: 100 }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, idx) => (
            <tr key={product.id}>
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
              <td>{formatDate(product.createdAt)}</td>
              <td className="text-center">{product.viewCount}</td>
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
  );
}
