import { newsCategoryService } from '@/server/services/news-category.service';
import { DynamicNewsCategoryFormClient } from '@/admin/components/NewsCategoryFormWrapper';

export const metadata = { title: 'Thêm danh mục tin tức mới' };

export default async function NewNewsCategoryPage() {
  const result = await newsCategoryService.getAllCategories();
  const options = result.data.map((c) => ({ 
    id: c.id, 
    title: c.title,
    categoryLevel: c.categoryLevel ?? 0,
  }));

  return <DynamicNewsCategoryFormClient parentCategories={options} />;
}
