export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { MemberForm } from '@/admin/features/member/MemberForm';

export const metadata: Metadata = { title: 'Thêm thành viên mới' };

export default function NewMemberPage() {
  return <MemberForm />;
}