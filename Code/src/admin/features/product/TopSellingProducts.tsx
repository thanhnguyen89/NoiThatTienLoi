'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProductListItem } from '@/lib/types';

interface TopSellingItem {
  product: ProductListItem | null;
  totalSold: number;
}

interface TopSellingProductsProps {
  limit?: number;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function TopSellingProducts({ limit = 10 }: TopSellingProductsProps) {
  const [products, setProducts] = useState<TopSellingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopSelling() {
      try {
        setLoading(true);
        const response = await fetch(`/admin/api/products/top-selling?limit=${limit}`);
        const json = await response.json();

        if (json.success) {
          setProducts(json.data);
          setError(null);
        } else {
          setError(json.error || 'Không thể tải danh sách');
        }
      } catch (err) {
        setError('Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    }

    fetchTopSelling();
  }, [limit]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header-custom">
          SẢN PHẨM BÁN CHẠY NHẤT
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header-custom">
          SẢN PHẨM BÁN CHẠY NHẤT
        </div>
        <div className="card-body">
          <div className="alert alert-danger mb-0">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="card">
        <div className="card-header-custom">
          SẢN PHẨM BÁN CHẠY NHẤT
        </div>
        <div className="card-body text-center py-4">
          <i className="bi bi-box-seam fs-1 text-muted mb-2"></i>
          <p className="text-muted">Chưa có sản phẩm nào được bán</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header-custom">
        SẢN PHẨM BÁN CHẠY NHẤT (TOP {limit})
        <div className="header-icons">
          <i className="bi bi-dash-lg"></i>
          <i className="bi bi-fullscreen"></i>
        </div>
      </div>
      <div className="card-body p-2">
        <div className="table-responsive">
          <table className="table table-bordered table-hover mb-0">
            <thead>
              <tr>
                <th className="text-center" style={{ width: 50 }}>Top</th>
                <th style={{ width: 60 }}>Hình</th>
                <th>Tên sản phẩm</th>
                <th style={{ width: 100 }}>SKU</th>
                <th style={{ width: 120 }}>Danh mục</th>
                <th style={{ width: 130 }}>Giá bán</th>
                <th className="text-center" style={{ width: 120 }}>
                  <i className="bi bi-fire text-danger"></i> Đã bán
                </th>
                <th className="text-center" style={{ width: 80 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, idx) => {
                const product = item.product;
                if (!product) return null;

                return (
                  <tr key={product.id}>
                    <td className="text-center">
                      <span className={`badge ${idx < 3 ? 'bg-danger' : 'bg-secondary'}`}>
                        #{idx + 1}
                      </span>
                    </td>
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
                      <div className="fw-semibold small">{product.name}</div>
                      {product.brand && (
                        <div className="text-muted" style={{ fontSize: 11 }}>{product.brand}</div>
                      )}
                    </td>
                    <td><code className="small">{product.sku || '—'}</code></td>
                    <td>{product.category.name}</td>
                    <td>
                      {product.price !== null && product.price !== undefined ? (
                        <span className="fw-semibold small">{formatPrice(product.price)}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="badge bg-success fs-6">{item.totalSold}</span>
                    </td>
                    <td className="text-center">
                      <Link href={`/admin/products/${product.id}/edit`} className="btn-edit">
                        <i className="bi bi-pencil-fill"></i>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
