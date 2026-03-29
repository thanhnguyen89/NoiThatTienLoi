// Category page entry

document.addEventListener('DOMContentLoaded', () => {
  initCatBannerSlider();
  initSuggestionsYouSlider();
});

function initCatBannerSlider() {
  const track = document.querySelector('.cat-banner-track');
  const prevBtn = document.querySelector('.cat-banner-prev');
  const nextBtn = document.querySelector('.cat-banner-next');
  const dotsContainer = document.querySelector('.cat-banner-dots');

  if (!track || !prevBtn || !nextBtn) return;

  const slides = track.querySelectorAll('.cat-banner-slide');
  const total = slides.length;
  let current = 0;
  let autoTimer;

  // Create dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Slide ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function goTo(index) {
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    current = index;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
    resetAuto();
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 4000);
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Auto play
  resetAuto();
}

// Best Sellers Slider
function initSuggestionsYouSlider() {
  const track = document.querySelector('.bs-slider-track');
  const prevBtn = document.querySelector('.bs-slider-prev');
  const nextBtn = document.querySelector('.bs-slider-next');
  
  if (!track || !prevBtn || !nextBtn) return;
  
  const items = track.querySelectorAll('.bs-product-card');
  const itemWidth = 212; // item width + gap
  const viewport = track.parentElement;
  const visibleItems = Math.floor(viewport.offsetWidth / itemWidth);
  const maxScroll = Math.max(0, (items.length - visibleItems) * itemWidth);
  
  let currentScroll = 0;
  
  function updateSlider() {
    track.style.transform = `translateX(-${currentScroll}px)`;
  }
  
  prevBtn.addEventListener('click', () => {
    currentScroll = Math.max(0, currentScroll - itemWidth * 2);
    updateSlider();
  });
  
  nextBtn.addEventListener('click', () => {
    currentScroll = Math.min(maxScroll, currentScroll + itemWidth * 2);
    updateSlider();
  });
}