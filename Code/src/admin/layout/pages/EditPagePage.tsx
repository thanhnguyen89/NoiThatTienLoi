import { notFound } from 'next/navigation';
import { pageService } from '@/server/services/page.service';
import { DynamicPageFormClient } from '@/admin/components/PageFormWrapper';

interface Props { params: Promise<{ id: string }>; }
export const metadata = { title: 'Chỉnh sửa trang' };

export default async function EditPagePage({ params }: Props) {
  const { id } = await params;
  let page: Awaited<ReturnType<typeof pageService.getPageById>> | null = null;
  try {
    page = await pageService.getPageById(id);
  } catch {}
  if (!page) notFound();

  return <DynamicPageFormClient page={page} />;
}
