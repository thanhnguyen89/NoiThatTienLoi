import { newsCategoryService } from '@/server/services/news-category.service';
import { DynamicNewsFormClient } from '@/admin/components/NewsFormWrapper';

export const metadata = { title: 'Them tin tuc moi' };

export default async function NewNewsPage() {
  const allCategories = await newsCategoryService.getAllCategories();
  const categories = allCategories.map((c: { id: string; title: string | null }) => ({
    id: c.id,
    title: c.title,
  }));
  return <DynamicNewsFormClient categories={categories} />;
}
