'use client';

import { useEffect, useState } from 'react';

interface SalesStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
}

interface ProductSalesStatsProps {
  productId: string;
  productName: string;
}

export function ProductSalesStats({ productId, productName }: ProductSalesStatsProps) {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch(`/admin/api/products/${productId}/sales-stats`);
        const json = await response.json();

        if (json.success) {
          setStats(json.data);
          setError(null);
        } else {
          setError(json.error || 'Không thể tải thống kê');
        }
      } catch (err) {
        setError('Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchStats();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header-custom">
          THỐNG KÊ BÁN HÀNG - {productName}
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
          THỐNG KÊ BÁN HÀNG - {productName}
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

  if (!stats) {
    return null;
  }

  return (
    <div className="card mb-3">
      <div className="card-header-custom">
        THỐNG KÊ BÁN HÀNG - {productName}
        <div className="header-icons">
          <i className="bi bi-dash-lg"></i>
          <i className="bi bi-fullscreen"></i>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-3 col-sm-6">
            <div className="card border-primary">
              <div className="card-body text-center">
                <i className="bi bi-calendar-day fs-1 text-primary mb-2"></i>
                <h5 className="card-title mb-1">Hôm nay</h5>
                <p className="fs-3 fw-bold text-primary mb-0">{stats.today}</p>
                <small className="text-muted">sản phẩm đã bán</small>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-success">
              <div className="card-body text-center">
                <i className="bi bi-calendar-week fs-1 text-success mb-2"></i>
                <h5 className="card-title mb-1">Tuần này</h5>
                <p className="fs-3 fw-bold text-success mb-0">{stats.thisWeek}</p>
                <small className="text-muted">sản phẩm đã bán</small>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-warning">
              <div className="card-body text-center">
                <i className="bi bi-calendar-month fs-1 text-warning mb-2"></i>
                <h5 className="card-title mb-1">Tháng này</h5>
                <p className="fs-3 fw-bold text-warning mb-0">{stats.thisMonth}</p>
                <small className="text-muted">sản phẩm đã bán</small>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-info">
              <div className="card-body text-center">
                <i className="bi bi-calendar-range fs-1 text-info mb-2"></i>
                <h5 className="card-title mb-1">Năm này</h5>
                <p className="fs-3 fw-bold text-info mb-0">{stats.thisYear}</p>
                <small className="text-muted">sản phẩm đã bán</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
