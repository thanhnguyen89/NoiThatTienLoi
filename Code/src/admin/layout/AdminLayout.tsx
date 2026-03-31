import { AdminTopNav } from '@/admin/components/AdminTopNav';
import { BootstrapInit } from '@/admin/components/BootstrapInit';
import { AuthGuard } from '@/admin/components/AuthGuard';
import '@/admin/assets/styles/admin.css';

export const metadata = {
  title: { default: 'Admin', template: '%s | Admin - Nội Thất Tiện Lợi' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BootstrapInit />
      <AuthGuard>
        <AdminTopNav />
        <div className="container-fluid py-3 px-4">
          {children}
        </div>
      </AuthGuard>
    </>
  );
}
