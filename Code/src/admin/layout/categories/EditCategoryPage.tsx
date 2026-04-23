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
    const [cat, catResult] = await Promise.all([
      categoryService.getCategoryById(id),
      categoryService.getAdminCategories(),
    ]);
    category = cat as CategoryDetail | null;
    categories = Array.isArray(catResult) ? catResult : (catResult?.data ?? []);
  } catch {}
  if (!category) notFound();

  return <DynamicCategoryFormClient category={category as CategoryDetail} parentCategories={categories} />;
}
