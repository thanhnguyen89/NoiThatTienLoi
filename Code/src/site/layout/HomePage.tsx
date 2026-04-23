import type { Metadata } from 'next';
import { productService } from '@/server/services/product.service';
import { categoryService } from '@/server/services/category.service';
import { sliderService } from '@/server/services/slider.service';
import { dbSafe } from '@/lib/db-safe';
import { HomeSlider } from '@/site/features/home/HomeSlider';
import { FlashSales } from '@/site/features/home/FlashSales';
import { CategoryGrid } from '@/site/features/home/CategoryGrid';
import { BestSellers } from '@/site/features/home/BestSellers';
import { TodaySuggestion } from '@/site/features/home/TodaySuggestion';
import { SearchKeywords } from '@/site/features/home/SearchKeywords';

export const metadata: Metadata = { title: 'Trang chủ' };

export default async function HomePage() {
  const [flashSaleProducts, featuredProducts, categories, slides] = await Promise.all([
    dbSafe(() => productService.getFlashSaleProducts(10), []),
    dbSafe(() => productService.getFeaturedProducts(20), []),
    dbSafe(() => categoryService.getCategoryTree(), []),
    dbSafe(() => sliderService.getActiveSliders(), []),
  ]);

  return (
    <div className="container">
      <HomeSlider slides={slides} />
      <FlashSales products={flashSaleProducts} />
      <CategoryGrid categories={categories} />
      <BestSellers products={featuredProducts.slice(0, 12)} />
      <TodaySuggestion products={featuredProducts} />
      <SearchKeywords />
    </div>
  );
}