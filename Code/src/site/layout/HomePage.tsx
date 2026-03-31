import type { Metadata } from 'next';
import { productService } from '@/server/services/product.service';
import { categoryService } from '@/server/services/category.service';
import { FlashSales } from '@/site/features/home/FlashSales';
import { CategoryGrid } from '@/site/features/home/CategoryGrid';
import { BestSellers } from '@/site/features/home/BestSellers';
import { TodaySuggestion } from '@/site/features/home/TodaySuggestion';
import { dbSafe } from '@/lib/db-safe';

export const metadata: Metadata = { title: 'Trang chủ' };

export default async function HomePage() {
  const [flashSaleProducts, featuredProducts, categories] = await Promise.all([
    dbSafe(() => productService.getFlashSaleProducts(8), []),
    dbSafe(() => productService.getFeaturedProducts(12), []),
    dbSafe(() => categoryService.getCategoryTree(), []),
  ]);

  return (
    <div className="container">
      <section className="home-slider">{/* TODO: Slider */}</section>
      <FlashSales products={flashSaleProducts} />
      <CategoryGrid categories={categories} />
      <BestSellers products={featuredProducts} />
      <TodaySuggestion products={featuredProducts} />
    </div>
  );
}
