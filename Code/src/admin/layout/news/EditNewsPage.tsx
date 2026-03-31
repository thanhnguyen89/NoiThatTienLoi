import { notFound } from 'next/navigation';
import { newsService } from '@/server/services/news.service';
import { DynamicNewsFormClient } from '@/admin/components/NewsFormWrapper';

interface Props { params: Promise<{ id: string }>; }
export const metadata = { title: 'Chinh sua tin tuc' };

export default async function EditNewsPage({ params }: Props) {
  const { id } = await params;
  let news: Awaited<ReturnType<typeof newsService.getNewsById>> | null = null;
  try {
    news = await newsService.getNewsById(id);
  } catch {}
  if (!news) notFound();

  return <DynamicNewsFormClient news={news} />;
}
