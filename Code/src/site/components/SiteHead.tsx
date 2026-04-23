import type { Metadata } from 'next';

// Base CSS files dùng chung cho tất cả site pages
const BASE_CSS = [
  '/assets/css/pages/site-layout.css',
  '/assets/css/pages/header.css',
  '/assets/css/pages/footer.css',
  '/assets/css/pages/footer-content.css',
  '/assets/css/pages/mobile-nav.css',
  '/assets/css/pages/mobile-category-drawer.css',
  '/assets/css/pages/floating-contact.css',
  '/assets/css/pages/pagination.css',
  '/assets/css/pages/breadcrumb.css',
];

// CSS riêng cho trang home
const HOME_CSS = [
  '/assets/css/pages/home.css',
  '/assets/css/pages/slider.css',
  '/assets/css/pages/flash-sales.css',
  '/assets/css/pages/category.css',
  '/assets/css/pages/best-sellers.css',
  '/assets/css/pages/today-suggestion.css',
  '/assets/css/pages/home-news.css',
  '/assets/css/pages/search-keywords.css',
];

// CSS cho trang product listing
const PRODUCT_CSS = [
  '/assets/css/pages/product-card.css',
  '/assets/css/pages/product-grid.css',
  '/assets/css/pages/sort-bar.css',
];

export function SiteHead() {
  return (
    <>
      {/* Base CSS - always load */}
      {BASE_CSS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </>
  );
}

export function HomePageHead() {
  return (
    <>
      {/* Base CSS */}
      {BASE_CSS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {/* Home page CSS */}
      {HOME_CSS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {/* Home page JS */}
      <script src="/assets/js/home.js" defer></script>
      <script src="/assets/js/common.js" defer></script>
    </>
  );
}

export function ProductPageHead() {
  return (
    <>
      {/* Base CSS */}
      {BASE_CSS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {/* Product page CSS */}
      {PRODUCT_CSS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {/* Common JS */}
      <script src="/assets/js/common.js" defer></script>
    </>
  );
}

// Metadata for pages
export const homeMetadata: Metadata = {
  title: 'Trang chủ',
  other: {
    'theme-color': '#1F7A5C',
  },
};
