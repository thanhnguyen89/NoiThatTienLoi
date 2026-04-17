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

export const metadata: Metadata = { title: 'Trang chủ - Nội Thất Tiện Lợi' };

export default async function HomePage() {
  const [flashSaleProducts, featuredProducts, categories, allNews, sliders] =
    await Promise.all([
      dbSafe(() => productService.getFlashSaleProducts(10), []),
      dbSafe(() => productService.getFeaturedProducts(15), []),
      dbSafe(() => categoryService.getCategoryTree(), []),
      dbSafe(() => newsService.getAllNews(), []),
      dbSafe(() => sliderService.getAllSliders(), []),
    ]);

  const homeNews = (allNews as { id: string; isActive: boolean; isShowHome: boolean; title: string; summary: string | null; image: string | null; seName: string }[])
    .filter((n) => n.isActive && n.isShowHome)
    .slice(0, 4);

  const activeSliders = (sliders as { id: string; title: string | null; image: string; link: string | null; isActive: boolean }[])
    .filter((s) => s.isActive)
    .slice(0, 5);

  return (
    <>
      <div className="container">
        <HomeSlider slides={activeSliders} />
        <FlashSales products={flashSaleProducts} />
        <CategoryGrid categories={categories} />
        <BestSellers products={featuredProducts} />
        <div className="banner-home-qc">
          <img src="/images/ghe-nhua.jpg" alt="Ghế nhựa khuyến mãi" />
        </div>
        <TodaySuggestion products={featuredProducts} />
        <HomeNews news={homeNews} />
        <SearchKeywords />
      </div>
      <div className="container">
        <FooterContent />
      </div>
    </>
  );
}
