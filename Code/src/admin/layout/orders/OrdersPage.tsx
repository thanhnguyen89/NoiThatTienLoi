export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { orderService } from '@/server/services/order.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { OrderTable } from '@/admin/features/order/OrderTable';
import { OrderFilters } from '@/admin/features/order/OrderFilters';
import { OrderExportButton } from '@/admin/features/order/OrderExportButton';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedOrders } from '@/server/repositories/order.repository';

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    paymentStatus?: string;
    customerType?: string;
    dateFrom?: string;
    dateTo?: string;
    priceMin?: string;
    priceMax?: string;
  }>;
}

export const metadata = { title: 'Quản lý đơn hàng' };

const emptyResult: PaginatedOrders = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const [result, statusCounts] = await Promise.all([
    dbSafe(() =>
      orderService.getAllOrders({
        page,
        pageSize: PAGINATION.ADMIN_PAGE_SIZE,
        search: sp.search || undefined,
        status: sp.status || undefined,
        paymentStatus: sp.paymentStatus || undefined,
        customerType: sp.customerType || undefined,
        dateFrom: sp.dateFrom || undefined,
        dateTo: sp.dateTo || undefined,
        priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
        priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      }),
      emptyResult
    ),
    dbSafe(() => orderService.getStatusCounts() as Promise<Record<string, number>>, {}),
  ]);

  const dbError = result.data.length === 0 && result.pagination.total === 0;

  return (
    <>
      {/* THỐNG KÊ NHANH */}
      {!dbError && (
        <div className="row g-3 mb-3">
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--pending">
              <div className="dashboard-stat__value">{statusCounts.pending ?? 0}</div>
              <div className="dashboard-stat__label">Chờ xử lý</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--confirmed">
              <div className="dashboard-stat__value">{statusCounts.confirmed ?? 0}</div>
              <div className="dashboard-stat__label">Đã xác nhận</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--shipping">
              <div className="dashboard-stat__value">{statusCounts.shipping ?? 0}</div>
              <div className="dashboard-stat__label">Đang giao</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--delivered">
              <div className="dashboard-stat__value">{statusCounts.delivered ?? 0}</div>
              <div className="dashboard-stat__label">Đã giao</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--completed">
              <div className="dashboard-stat__value">{statusCounts.completed ?? 0}</div>
              <div className="dashboard-stat__label">Hoàn thành</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--cancelled">
              <div className="dashboard-stat__value">{statusCounts.cancelled ?? 0}</div>
              <div className="dashboard-stat__label">Đã hủy</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--returned">
              <div className="dashboard-stat__value">{statusCounts.returned ?? 0}</div>
              <div className="dashboard-stat__label">Hoàn trả</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--total">
              <div className="dashboard-stat__value">
                {result.pagination.total}
              </div>
              <div className="dashboard-stat__label">Tổng đơn</div>
            </div>
          </div>
        </div>
      )}

      {/* THÔNG TIN TÌM KIẾM */}
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
            <OrderFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
              defaultPaymentStatus={sp.paymentStatus || ''}
              defaultCustomerType={sp.customerType || ''}
              defaultDateFrom={sp.dateFrom || ''}
              defaultDateTo={sp.dateTo || ''}
              defaultPriceMin={sp.priceMin || ''}
              defaultPriceMax={sp.priceMax || ''}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SÁCH ĐƠN HÀNG */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH ĐƠN HÀNG ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2 d-flex gap-2 flex-wrap justify-content-between">
            <div className="d-flex gap-2">
              <Link href="/admin/orders/new" className="btn-add">
                <i className="bi bi-plus-lg me-1"></i>Tạo đơn mới
              </Link>
            </div>
            <div className="d-flex gap-2">
              <OrderExportButton
                filters={{
                  search: sp.search,
                  status: sp.status,
                  paymentStatus: sp.paymentStatus,
                  customerType: sp.customerType,
                  dateFrom: sp.dateFrom,
                  dateTo: sp.dateTo,
                  priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
                  priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
                }}
              />
            </div>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <OrderTable orders={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/orders" />
        </div>
      </div>
    </>
  );
}
