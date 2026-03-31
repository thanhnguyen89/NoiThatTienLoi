import { categoryService } from '@/server/services/category.service';
import { DynamicCategoryFormClient } from '@/admin/components/FormWrapper';

export const metadata = { title: 'Thêm danh mục mới' };

export default async function NewCategoryPage() {
  let categories: Array<{ id: string; name: string }> = [];
  try { categories = await categoryService.getAdminCategories(); } catch {}

  return <DynamicCategoryFormClient parentCategories={categories} />;
}
