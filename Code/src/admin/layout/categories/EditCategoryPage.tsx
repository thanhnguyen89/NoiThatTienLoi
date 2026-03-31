import { notFound } from 'next/navigation';
import { categoryService } from '@/server/services/category.service';
import { DynamicCategoryFormClient } from '@/admin/components/FormWrapper';
import type { CategoryDetail } from '@/lib/types';

interface Props { params: Promise<{ id: string }>; }
export const metadata = { title: 'Chỉnh sửa danh mục' };

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  let category: CategoryDetail | null = null;
  let categories: Array<{ id: string; name: string }> = [];
  try {
    [category, categories] = await Promise.all([
      categoryService.getCategoryById(id) as Promise<CategoryDetail | null>,
      categoryService.getAdminCategories() as Promise<Array<{ id: string; name: string }>>,
    ]);
  } catch {}
  if (!category) notFound();

  return <DynamicCategoryFormClient category={category as CategoryDetail} parentCategories={categories ?? []} />;
}
