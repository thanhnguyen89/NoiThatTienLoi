export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { memberService } from '@/server/services/member.service';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const member = await memberService.getMemberById(id);
    return { title: `Thành viên ${member.fullName || member.email || id}` };
  } catch {
    return { title: 'Chi tiết thành viên' };
  }
}

export default async function MemberDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  let member: Awaited<ReturnType<typeof memberService.getMemberById>> | null = null;
  let dbError = false;

  try {
    member = await memberService.getMemberById(id);
  } catch {
    dbError = true;
  }

  if (dbError || !member) {
    return (
      <div className="card">
        <div className="card-header-custom">Chi tiết thành viên</div>
        <div className="card-body">
          <div className="alert alert-danger mb-0">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Không tìm thấy thành viên hoặc không thể kết nối database.
          </div>
        </div>
      </div>
    );
  }

  // Nếu action=edit, hiển thị form chỉnh sửa
  if (sp.action === 'edit') {
    const { MemberForm } = await import('@/admin/features/member/MemberForm');
    return <MemberForm member={member} />;
  }

  // Ngược lại, hiển thị chi tiết
  const { MemberDetailClient } = await import('@/admin/features/member/MemberDetailClient');

  return (
    <div className="card">
      <div className="card-body p-3">
        <MemberDetailClient member={member} />
      </div>
    </div>
  );
}
