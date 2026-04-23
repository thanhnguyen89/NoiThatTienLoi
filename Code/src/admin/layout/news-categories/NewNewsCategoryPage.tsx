import { newsCategoryService } from '@/server/services/news-category.service';
import { DynamicNewsCategoryFormClient } from '@/admin/components/NewsCategoryFormWrapper';

export const metadata = { title: 'Thêm danh mục tin tức mới' };

export default async function NewNewsCategoryPage() {
  const parentCategories = await newsCategoryService.getAllCategories();
  const options = parentCategories.map((c) => ({ id: c.id, title: c.title }));

  return <DynamicNewsCategoryFormClient parentCategories={options} />;
}
