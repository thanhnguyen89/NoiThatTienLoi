import { initSearchOverlay } from '../../assets/js/search-overlay.js';

document.addEventListener('DOMContentLoaded', () => {
  initHeroSlider();
  initSearch();
  initMobileNav();
  initCartBadge();
  initGenderTabs();
  initProductRails();
  initNewsletter();
  initFloatingRail();
});

function initHeroSlider() {
  const slider = document.querySelector('[data-slider]');
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll('[data-slide]'));
  const dots = Array.from(slider.querySelectorAll('[data-slider-dot]'));
  const prev = slider.querySelector('[data-slider-prev]');
  const next = slider.querySelector('[data-slider-next]');
  const intervalMs = 4200;
  let current = 0;
  let timer;
  let startX = 0;

  if (slides.length <= 1) return;

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === current);
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === current);
    });
  }

  function start() {
    stop();
    timer = window.setInterval(() => goTo(current + 1), intervalMs);
  }

  function stop() {
    window.clearInterval(timer);
  }

  prev?.addEventListener('click', () => {
    goTo(current - 1);
    start();
  });

  next?.addEventListener('click', () => {
    goTo(current + 1);
    start();
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goTo(Number(dot.dataset.sliderDot || 0));
      start();
    });
  });

  slider.addEventListener('mouseenter', stop);
  slider.addEventListener('mouseleave', start);
  slider.addEventListener('touchstart', (event) => {
    startX = event.touches[0].clientX;
    stop();
  }, { passive: true });
  slider.addEventListener('touchend', (event) => {
    const endX = event.changedTouches[0].clientX;
    const diff = endX - startX;
    if (Math.abs(diff) > 45) {
      goTo(diff < 0 ? current + 1 : current - 1);
    }
    start();
  }, { passive: true });

  goTo(0);
  start();
}

function initSearch() {
  initSearchOverlay();
}

function initMobileNav() {
  const toggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.header-nav');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('active');
    toggle.querySelector('i')?.classList.toggle('fa-times');
  });
}

function initCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (!badge) return;

  const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
  const total = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  badge.textContent = String(total);
  badge.hidden = total === 0;
}

function initGenderTabs() {
  const tabs = Array.from(document.querySelectorAll('.cm-tab'));
  const panels = Array.from(document.querySelectorAll('[data-category-panel]'));
  if (!tabs.length) return;

  function showPanel(filter) {
    tabs.forEach((item) => {
      const isActive = item.dataset.filter === filter;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.categoryPanel === filter;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
      if (isActive) panel.scrollLeft = 0;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      showPanel(tab.dataset.filter || 'male');
    });
  });

  const activeTab = tabs.find((tab) => tab.classList.contains('is-active')) || tabs[0];
  showPanel(activeTab.dataset.filter || 'male');
}

function initProductRails() {
  const sections = Array.from(document.querySelectorAll('[data-product-section]'));
  if (!sections.length) return;

  sections.forEach((section) => {
    const rail = section.querySelector('[data-product-rail]');
    const prev = section.querySelector('[data-product-prev]');
    const next = section.querySelector('[data-product-next]');
    if (!rail || !prev || !next) return;

    const getStep = () => {
      const firstCard = rail.querySelector('.cm-product-card');
      if (!firstCard) return rail.clientWidth;

      const cardWidth = firstCard.getBoundingClientRect().width;
      const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap || window.getComputedStyle(rail).gap || '0');
      return cardWidth + gap;
    };

    const syncButtons = () => {
      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth - 2);
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= maxScroll;
    };

    prev.addEventListener('click', () => {
      rail.scrollBy({ left: -getStep(), behavior: 'smooth' });
    });

    next.addEventListener('click', () => {
      rail.scrollBy({ left: getStep(), behavior: 'smooth' });
    });

    rail.addEventListener('scroll', syncButtons, { passive: true });
    window.addEventListener('resize', syncButtons);
    syncButtons();
  });
}

function initNewsletter() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector('.newsletter-input');
    if (input) input.value = '';
  });
}

function initFloatingRail() {
  const topLink = document.querySelector('.cm-floating-rail a[href="#top"]');
  if (!topLink) return;

  topLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
