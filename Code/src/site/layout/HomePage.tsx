import type { Metadata } from 'next';
import { productService } from '@/server/services/product.service';
import { categoryService } from '@/server/services/category.service';
import { newsService } from '@/server/services/news.service';
import { sliderService } from '@/server/services/slider.service';
import { dbSafe } from '@/lib/db-safe';
import { HomeSlider } from '@/site/features/home/HomeSlider';
import { FlashSales } from '@/site/features/home/FlashSales';
import { CategoryGrid } from '@/site/features/home/CategoryGrid';
import { BestSellers } from '@/site/features/home/BestSellers';
import { TodaySuggestion } from '@/site/features/home/TodaySuggestion';
import { HomeNews } from '@/site/features/home/HomeNews';
import { SearchKeywords } from '@/site/features/home/SearchKeywords';
import { FooterContent } from '@/site/features/home/FooterContent';

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
