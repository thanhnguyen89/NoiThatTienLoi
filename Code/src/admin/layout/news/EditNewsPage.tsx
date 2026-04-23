import { notFound } from 'next/navigation';
import { newsService } from '@/server/services/news.service';
import { newsCategoryService } from '@/server/services/news-category.service';
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

  const allCategories = await newsCategoryService.getAllCategories();
  const categories = allCategories.map((c: { id: string; title: string | null }) => ({
    id: c.id,
    title: c.title,
  }));

  return <DynamicNewsFormClient news={news as Parameters<typeof DynamicNewsFormClient>[0]['news']} categories={categories} />;
}
