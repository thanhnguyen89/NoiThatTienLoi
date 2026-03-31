import type { Metadata } from 'next';
import '@/admin/assets/styles/admin.css';

export const metadata: Metadata = {
  title: 'Đăng nhập | Nội Thất Tiện Lợi',
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
