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

  const parentCategoriesResult = await newsCategoryService.getAllCategories();
  const options = parentCategoriesResult.data.map((c) => ({ 
    id: c.id, 
    title: c.title,
    categoryLevel: c.categoryLevel ?? 0,
  }));

  const mappedCategory = newsCategory ? {
    ...(newsCategory as unknown as Record<string, unknown>),
    parentId: newsCategory.parentId,
    sortOrder: Number(newsCategory.sortOrder ?? 0),
    viewCount: Number(newsCategory.viewCount ?? 0),
  } : null;

  return <DynamicNewsCategoryFormClient newsCategory={mappedCategory as Parameters<typeof DynamicNewsCategoryFormClient>[0]['newsCategory']} parentCategories={options} />;
}
