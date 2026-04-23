export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import { ShippingProviderTable } from '@/admin/features/shipping-providers/ShippingProviderTable';
import { ShippingProviderFilters } from '@/admin/features/shipping-providers/ShippingProviderFilters';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { dbSafe } from '@/lib/db-safe';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import type { PaginatedShippingProviders } from '@/server/repositories/shipping-provider.repository';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; serviceType?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý đơn vị vận chuyển' };

const emptyResult: PaginatedShippingProviders = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function ShippingProvidersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);
  let dbError = false;
  let counts: { total: number; active: number; inactive: number; ordersToday: number; avgCost: number } = { total: 0, active: 0, inactive: 0, ordersToday: 0, avgCost: 0 };

  const [result, rawCounts] = await Promise.all([
    dbSafe(() =>
      shippingProviderService.getAllProviders({
        search: sp.search,
        isActive: sp.status,
        serviceType: sp.serviceType,
        page,
        pageSize: PAGINATION.ADMIN_PAGE_SIZE,
      }),
      emptyResult
    ),
    dbSafe(() => shippingProviderService.getStatusCounts() as Promise<typeof counts>, counts),
  ]);

  counts = { ...rawCounts, avgCost: Number(rawCounts.avgCost) };
  dbError = result.data.length === 0 && result.pagination.total === 0;

  return (
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h6 mb-0 fw-bold">QUẢN LÝ ĐƠN VỊ VẬN CHUYỂN</h1>
      </div>

      {/* Stats row */}
      <div className="row g-3 mb-3">
        <div className="col-md-2">
          <div className="card border-primary">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Tổng ĐV</div>
              <div className="fw-bold fs-5">{counts.total}</div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-success">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Hoạt động</div>
              <div className="fw-bold fs-5 text-success">{counts.active}</div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-secondary">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Tạm ngưng</div>
              <div className="fw-bold fs-5 text-secondary">{counts.inactive}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-info">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Đơn hôm nay</div>
              <div className="fw-bold fs-5 text-info">{counts.ordersToday}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card" style={{ borderColor: '#6f42c1' }}>
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Chi phí TB</div>
              <div className="fw-bold fs-5" style={{ color: '#6f42c1' }}>
                {counts.avgCost > 0 ? counts.avgCost.toLocaleString('vi-VN') + 'đ' : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-header-custom">
          BỘ LỌC &amp; TÌM KIẾM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <ShippingProviderFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              defaultServiceType={sp.serviceType || ''}
            />
          </Suspense>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH ĐƠN VỊ VẬN CHUYỂN ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <Link href="/admin/shipping-providers/new" className="btn-add mb-2">
            <i className="bi bi-plus-lg me-1"></i>Thêm mới
          </Link>
          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <ShippingProviderTable providers={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/shipping-providers" />
        </div>
      </div>
    </>
  );
}