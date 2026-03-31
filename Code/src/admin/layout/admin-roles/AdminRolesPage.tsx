export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { adminRoleService } from '@/server/services/admin-role.service';
import { AdminRoleTable } from '@/admin/features/admin-role/AdminRoleTable';
import { AdminRoleFilters } from '@/admin/features/admin-role/AdminRoleFilters';

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export const metadata = { title: 'Quản lý vai trò' };

export default async function AdminRolesPage({ searchParams }: Props) {
  const sp = await searchParams;
  let roles: Awaited<ReturnType<typeof adminRoleService.getAllRoles>> = [];
  let dbError = false;

  try {
    roles = await adminRoleService.getAllRoles();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      roles = roles.filter((r) =>
        (r.name && r.name.toLowerCase().includes(kw)) ||
        (r.code && r.code.toLowerCase().includes(kw))
      );
    }
  } catch { dbError = true; }

  return (
    <>
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
            <AdminRoleFilters defaultSearch={sp.search || ''} />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH VAI TRÒ
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/admin-roles/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database.
            </div>
          )}

          <AdminRoleTable roles={roles} />
        </div>
      </div>
    </>
  );
}
