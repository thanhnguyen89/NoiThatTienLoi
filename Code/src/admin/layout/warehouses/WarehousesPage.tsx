export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { warehouseService } from '@/server/services/warehouse.service';
import { WarehouseTable } from '@/admin/features/warehouses/WarehouseTable';
import { WarehouseFilters } from '@/admin/features/warehouses/WarehouseFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; region?: string; province?: string; page?: string }>;
}

export const metadata = { title: 'Quản lý kho hàng' };

export default async function WarehousesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10)) : 1;
  let dbError = false;
  let counts = { total: 0, active: 0, inactive: 0, north: 0, central: 0, south: 0 };

  let result = {
    data: [] as Awaited<ReturnType<typeof warehouseService.getAllWarehouses>>['data'],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 }
  };

  try {
    [result, counts] = await Promise.all([
      warehouseService.getAllWarehouses({
        search: sp.search,
        isActive: sp.status,
        region: sp.region,
        page,
        pageSize: 20,
      }),
      warehouseService.getStatusCounts(),
    ]);
  } catch (error) {
    console.error('Error loading warehouses:', error);
    dbError = true;
  }

  return (
    <>
      {/* Stats row */}
      <div className="row g-3 mb-3">
        <div className="col-md-2">
          <div className="card border-primary">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Tổng số kho</div>
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
              <div className="small text-muted">Tạm đóng</div>
              <div className="fw-bold fs-5 text-secondary">{counts.inactive}</div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-info">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Miền Bắc</div>
              <div className="fw-bold fs-5 text-info">{counts.north}</div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-primary">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Miền Trung</div>
              <div className="fw-bold fs-5 text-primary">{counts.central}</div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-warning">
            <div className="card-body py-2 px-3 text-center">
              <div className="small text-muted">Miền Nam</div>
              <div className="fw-bold fs-5 text-warning">{counts.south}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-header-custom">
          THÔNG TIN TÌM KIẾM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <WarehouseFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              defaultRegion={sp.region || ''}
              defaultProvince={sp.province || ''}
            />
          </Suspense>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH KHO HÀNG
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/warehouses/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm kho
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <WarehouseTable warehouses={result.data} pagination={result.pagination} />
        </div>
      </div>
    </>
  );
}
