export const dynamic = 'force-dynamic';
import { inquiryService } from '@/server/services/inquiry.service';
import { parsePageParam } from '@/lib/utils';
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS } from '@/lib/constants';
import { AdminPagination } from '@/admin/shared/AdminPagination';
import { dbSafe } from '@/lib/db-safe';
import type { PaginatedResult } from '@/lib/types';

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý yêu cầu tư vấn' };

type Inquiry = { id: string; name: string; phone: string; type: string; status: string; createdAt: Date; product: { name: string } | null };

const emptyResult: PaginatedResult<Inquiry> = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function InquiriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const result = await dbSafe(
    () => inquiryService.getInquiries({ page, status: sp.status }) as Promise<PaginatedResult<Inquiry>>,
    emptyResult
  );

  const dbError = result.data.length === 0 && result.pagination.total === 0;

  const statusBadgeClass: Record<string, string> = {
    NEW: 'admin-badge--info',
    PROCESSING: 'admin-badge--warning',
    COMPLETED: 'admin-badge--success',
    CANCELLED: 'admin-badge--error',
  };

  return (
    <div className="admin-table-wrapper">
      <div className="admin-table-header">
        <h1>Yêu cầu tư vấn ({result.pagination.total})</h1>
      </div>
      {dbError && (
        <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: 13 }}>
          ⚠ Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
        </div>
      )}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Khách hàng</th><th>SĐT</th><th>Loại</th>
            <th>Sản phẩm</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((inquiry) => (
            <tr key={inquiry.id}>
              <td>{inquiry.name}</td>
              <td>{inquiry.phone}</td>
              <td>{INQUIRY_TYPE_LABELS[inquiry.type] || inquiry.type}</td>
              <td>{inquiry.product?.name || '—'}</td>
              <td>
                <span className={`admin-badge ${statusBadgeClass[inquiry.status] || ''}`}>
                  {INQUIRY_STATUS_LABELS[inquiry.status] || inquiry.status}
                </span>
              </td>
              <td>{new Date(inquiry.createdAt).toLocaleDateString('vi-VN')}</td>
              <td><button className="btn-admin btn-admin--ghost btn-admin--sm">Chi tiết</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <AdminPagination pagination={result.pagination} baseUrl="/admin/inquiries" />
    </div>
  );
}
