import { notFound } from 'next/navigation';
import { newsCategoryService } from '@/server/services/news-category.service';
import { DynamicNewsCategoryFormClient } from '@/admin/components/NewsCategoryFormWrapper';

interface Props { params: Promise<{ id: string }>; }
export const metadata = { title: 'Chỉnh sửa danh mục tin tức' };

export default async function EditNewsCategoryPage({ params }: Props) {
  const { id } = await params;
  let newsCategory = null;
  try {
    newsCategory = await newsCategoryService.getCategoryById(id);
  } catch {}
  if (!newsCategory) notFound();

  return <DynamicNewsCategoryFormClient newsCategory={newsCategory as any} />;
}
