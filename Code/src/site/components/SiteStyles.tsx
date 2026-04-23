'use client';

import { useEffect } from 'react';

const stylesheets = [
  '/assets/css/common.css',
  '/assets/css/pages/home.css',
  '/assets/css/pages/header.css',
  '/assets/css/pages/slider.css',
  '/assets/css/pages/flash-sales.css',
  '/assets/css/pages/category.css',
  '/assets/css/pages/best-sellers.css',
  '/assets/css/pages/today-suggestion.css',
  '/assets/css/pages/home-news.css',
  '/assets/css/pages/search-keywords.css',
  '/assets/css/pages/footer.css',
  '/assets/css/pages/footer-content.css',
  '/assets/css/pages/mobile-nav.css',
  '/assets/css/pages/mobile-category-drawer.css',
  '/assets/css/pages/modal-login.css',
];

export function SiteStyles() {
  useEffect(() => {
    // Load stylesheets dynamically
    const links: HTMLLinkElement[] = [];
    
    stylesheets.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      links.push(link);
    });

    // Cleanup on unmount
    return () => {
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, []);

  return null;
}
