export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { memberService } from '@/server/services/member.service';
import { parsePageParam } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { MemberTable } from '@/admin/features/member/MemberTable';
import { MemberFilters } from '@/admin/features/member/MemberFilters';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedMembers } from '@/server/repositories/member.repository';

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    isActive?: string;
    emailVerified?: string;
    phoneVerified?: string;
    gender?: string;
    dateFrom?: string;
    dateTo?: string;
    hasOrder?: string;
  }>;
}

export const metadata = { title: 'Quản lý thành viên' };

const emptyResult: PaginatedMembers = {
  data: [],
  pagination: { page: 1, pageSize: PAGINATION.ADMIN_PAGE_SIZE, total: 0, totalPages: 0 },
};

export default async function MembersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const [result, statusCounts] = await Promise.all([
    dbSafe(() =>
      memberService.getAllMembers({
        page,
        pageSize: PAGINATION.ADMIN_PAGE_SIZE,
        search: sp.search || undefined,
        isActive: sp.isActive || undefined,
        emailVerified: sp.emailVerified || undefined,
        phoneVerified: sp.phoneVerified || undefined,
        gender: sp.gender || undefined,
        dateFrom: sp.dateFrom || undefined,
        dateTo: sp.dateTo || undefined,
        hasOrder: sp.hasOrder || undefined,
      }),
      emptyResult
    ),
    dbSafe(() => memberService.getStatusCounts() as Promise<Record<string, number>>, {}),
  ]);

  const dbError = result.data.length === 0 && result.pagination.total === 0;

  return (
    <>
      {/* THỐNG KÊ NHANH */}
      {!dbError && (
        <div className="row g-3 mb-3">
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--total">
              <div className="dashboard-stat__value">{statusCounts.total ?? 0}</div>
              <div className="dashboard-stat__label">Tổng thành viên</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--active">
              <div className="dashboard-stat__value">{statusCounts.active ?? 0}</div>
              <div className="dashboard-stat__label">Hoạt động</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--inactive">
              <div className="dashboard-stat__value">{statusCounts.inactive ?? 0}</div>
              <div className="dashboard-stat__label">Khóa</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="dashboard-stat dashboard-stat--email">
              <div className="dashboard-stat__value">{statusCounts.emailVerified ?? 0}</div>
              <div className="dashboard-stat__label">Email xác minh</div>
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
            <MemberFilters
              defaultSearch={sp.search || ''}
              defaultIsActive={sp.isActive || ''}
              defaultEmailVerified={sp.emailVerified || ''}
              defaultPhoneVerified={sp.phoneVerified || ''}
              defaultGender={sp.gender || ''}
              defaultDateFrom={sp.dateFrom || ''}
              defaultDateTo={sp.dateTo || ''}
              defaultHasOrder={sp.hasOrder || ''}
            />
          </Suspense>
        </div>
      </div>

      {/* DANH SÁCH THÀNH VIÊN */}
      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH THÀNH VIÊN ({result.pagination.total})
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2 d-flex gap-2 flex-wrap">
            <Link href="/admin/members/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm thành viên
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <MemberTable members={result.data} />

          <AdminPagination pagination={result.pagination} baseUrl="/admin/members" />
        </div>
      </div>
    </>
  );
}
