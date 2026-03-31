import { newsCategoryService } from '@/server/services/news-category.service';
import { DynamicNewsCategoryFormClient } from '@/admin/components/NewsCategoryFormWrapper';

export const metadata = { title: 'Thêm danh mục tin tức mới' };

export default async function NewNewsCategoryPage() {
  return <DynamicNewsCategoryFormClient />;
}
